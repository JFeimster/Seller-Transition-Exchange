import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { businesses, sellers, transitionActivity, transitionActionItems, transitionEvidenceReviews, transitionWorkflowCheckpoints } from "../../../db/schema";
import { actionStatuses, defaultTransitionActions, transactionStages } from "../../lib/transaction-os";

type Body = { action?: string; actionId?: number; checkpointId?: number; evidenceId?: number; payload?: Record<string, unknown> };
const adminEmail = () => (process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com").toLowerCase();
const error = (message: string, status: number, correlationId: string) => Response.json({ error: message, correlationId }, { status });
const parse = <T>(value: string | null, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };

async function audit(db: Awaited<ReturnType<typeof getDb>>, values: { sellerId?: number | null; businessId?: number | null; actorId: string; actorRole: string; eventType: string; entityType: string; entityId: string | number; statusBefore?: string | null; statusAfter?: string | null; summary: string; correlationId: string }) {
  await db.insert(transitionActivity).values({ sellerId: values.sellerId ?? null, businessId: values.businessId ?? null, actorId: values.actorId, actorRole: values.actorRole, eventType: values.eventType, entityType: values.entityType, entityId: String(values.entityId), statusBefore: values.statusBefore ?? null, statusAfter: values.statusAfter ?? null, summary: values.summary, correlationId: values.correlationId });
}

async function canonicalContext(db: Awaited<ReturnType<typeof getDb>>, email: string) {
  const [seller] = await db.select().from(sellers).where(eq(sellers.userId, email)).orderBy(desc(sellers.updatedAt)).limit(1);
  const [business] = seller ? await db.select().from(businesses).where(eq(businesses.sellerId, seller.id)).orderBy(desc(businesses.updatedAt)).limit(1) : [];
  return { seller, business };
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const user = await getChatGPTUser(); if (!user) return error("Sign in is required.", 401, correlationId);
    const url = new URL(request.url); const view = url.searchParams.get("view") ?? "seller"; const db = await getDb(); const isAdmin = user.email.toLowerCase() === adminEmail();
    if (view === "admin") {
      if (!isAdmin) return error("Admin authorization required.", 403, correlationId);
      const [actions, evidence, activity] = await Promise.all([
        db.select().from(transitionActionItems).orderBy(desc(transitionActionItems.updatedAt)).limit(100),
        db.select().from(transitionEvidenceReviews).orderBy(desc(transitionEvidenceReviews.updatedAt)).limit(100),
        db.select().from(transitionActivity).orderBy(desc(transitionActivity.createdAt)).limit(100),
      ]);
      return Response.json({ actions, evidence: evidence.map((row) => ({ ...row, sourceLineage: parse(row.sourceLineage, {}), reviewerNotes: row.reviewerNotes ?? "" })), activity, correlationId });
    }
    const { seller, business } = await canonicalContext(db, user.email);
    if (!seller || !business) return Response.json({ seller: null, business: null, checkpoints: [], actions: [], evidence: [], activity: [], nextAction: null, correlationId });
    const [checkpoints, actions, evidence, activity] = await Promise.all([
      db.select().from(transitionWorkflowCheckpoints).where(eq(transitionWorkflowCheckpoints.sellerId, seller.id)).orderBy(transitionWorkflowCheckpoints.stage),
      db.select().from(transitionActionItems).where(eq(transitionActionItems.sellerId, seller.id)).orderBy(transitionActionItems.stage, transitionActionItems.createdAt),
      db.select().from(transitionEvidenceReviews).where(eq(transitionEvidenceReviews.sellerId, seller.id)).orderBy(desc(transitionEvidenceReviews.updatedAt)),
      db.select().from(transitionActivity).where(eq(transitionActivity.sellerId, seller.id)).orderBy(desc(transitionActivity.createdAt)).limit(50),
    ]);
    const nextAction = actions.find((item) => !["Completed", "Archived"].includes(item.status)) ?? null;
    return Response.json({ seller: { id: seller.id, verificationStatus: seller.verificationStatus, transitionGoal: seller.transitionGoal, confidentialityPreference: seller.confidentialityPreference }, business: { id: business.id, industry: business.industry, anonymousName: business.anonymousName, verificationStatus: business.verificationStatus }, checkpoints, actions, evidence: evidence.map((row) => ({ ...row, sourceLineage: parse(row.sourceLineage, {}) })), activity, nextAction, correlationId });
  } catch { return error("Transition records are temporarily unavailable. No status or approval was inferred.", 503, correlationId); }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) return error("JSON content type is required.", 415, correlationId);
    if (Number(request.headers.get("content-length") ?? 0) > 64_000) return error("Transition requests are limited to 64 KB.", 413, correlationId);
    const user = await getChatGPTUser(); if (!user) return error("Sign in is required.", 401, correlationId);
    const body = await request.json() as Body; const action = body.action ?? ""; const payload = body.payload ?? {}; const db = await getDb(); const isAdmin = user.email.toLowerCase() === adminEmail();
    const { seller, business } = await canonicalContext(db, user.email);
    if (!seller || !business) return error("Save the canonical seller and business records before opening the operating workspace.", 409, correlationId);
    if (action === "ensure_workspace") {
      const existing = await db.select().from(transitionWorkflowCheckpoints).where(eq(transitionWorkflowCheckpoints.sellerId, seller.id));
      if (!existing.length) await db.insert(transitionWorkflowCheckpoints).values(transactionStages.map((stage) => ({ sellerId: seller.id, businessId: business.id, ownerUserId: user.email, stage, status: stage === "Explore" ? "In Progress" : "Not Started", nextMilestone: stage === "Explore" ? "Confirm transition objective" : "Await prior-stage evidence" })));
      const actionRows = await db.select().from(transitionActionItems).where(eq(transitionActionItems.sellerId, seller.id));
      if (!actionRows.length) await db.insert(transitionActionItems).values(defaultTransitionActions.map((item, index) => ({ sellerId: seller.id, businessId: business.id, ownerUserId: user.email, stage: item.stage, title: item.title, module: item.module, route: item.route, priority: index + 1, evidenceStatus: item.evidence, status: index === 0 ? "In Progress" : "Not Started", sourceLineage: JSON.stringify({ source: "Platform default", classification: item.evidence }) })));
      await audit(db, { sellerId: seller.id, businessId: business.id, actorId: user.email, actorRole: "Seller", eventType: "transition_plan.created", entityType: "TransitionWorkspace", entityId: seller.id, statusAfter: "In Progress", summary: "Canonical transition workspace initialized", correlationId });
      return Response.json({ status: "ready", correlationId }, { status: 201 });
    }
    if (action === "update_action") {
      const id = Number(body.actionId ?? 0); const [row] = await db.select().from(transitionActionItems).where(eq(transitionActionItems.id, id)).limit(1); if (!row || (!isAdmin && row.ownerUserId !== user.email)) return error("Transition action is not available to the current account.", 403, correlationId);
      const status = String(payload.status ?? row.status); if (!actionStatuses.includes(status as typeof actionStatuses[number])) return error("Unsupported action status.", 400, correlationId);
      const [next] = await db.update(transitionActionItems).set({ status, requiredInput: payload.requiredInput === undefined ? row.requiredInput : String(payload.requiredInput), updatedAt: new Date().toISOString() }).where(eq(transitionActionItems.id, id)).returning();
      await audit(db, { sellerId: row.sellerId, businessId: row.businessId, actorId: user.email, actorRole: isAdmin ? "Admin" : "Seller", eventType: "transition_plan.updated", entityType: "ActionItem", entityId: id, statusBefore: row.status, statusAfter: next.status, summary: `Action updated: ${row.title}`, correlationId });
      return Response.json({ action: next, correlationId });
    }
    if (action === "create_evidence") {
      const field = String(payload.fieldPath ?? "").trim(); if (!field) return error("An evidence field is required.", 400, correlationId);
      const [row] = await db.insert(transitionEvidenceReviews).values({ sellerId: seller.id, businessId: business.id, ownerUserId: user.email, entityType: String(payload.entityType ?? "Business"), entityId: String(payload.entityId ?? business.id), fieldPath: field, evidenceStatus: String(payload.evidenceStatus ?? "Seller Provided"), sourceLineage: JSON.stringify({ sourceType: String(payload.sourceType ?? "Seller Provided"), sourceReference: String(payload.sourceReference ?? ""), observedAt: new Date().toISOString() }), reviewStatus: "Needs Review" }).returning();
      await audit(db, { sellerId: seller.id, businessId: business.id, actorId: user.email, actorRole: "Seller", eventType: "business.updated", entityType: "EvidenceReview", entityId: row.id, statusAfter: row.reviewStatus, summary: `Evidence review added for ${field}`, correlationId });
      return Response.json({ evidence: { ...row, sourceLineage: parse(row.sourceLineage, {}) }, correlationId }, { status: 201 });
    }
    if (action === "review_evidence") {
      if (!isAdmin) return error("Admin authorization required.", 403, correlationId); const id = Number(body.evidenceId ?? 0); const [row] = await db.select().from(transitionEvidenceReviews).where(eq(transitionEvidenceReviews.id, id)).limit(1); if (!row) return error("Evidence review not found.", 404, correlationId); const evidenceStatus = String(payload.evidenceStatus ?? row.evidenceStatus); const reviewStatus = String(payload.reviewStatus ?? "Reviewed"); const [next] = await db.update(transitionEvidenceReviews).set({ evidenceStatus, reviewStatus, reviewerId: user.email, reviewerNotes: String(payload.reviewerNotes ?? ""), reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(transitionEvidenceReviews.id, id)).returning(); await audit(db, { sellerId: row.sellerId, businessId: row.businessId, actorId: user.email, actorRole: "Admin", eventType: "business.updated", entityType: "EvidenceReview", entityId: id, statusBefore: row.reviewStatus, statusAfter: next.reviewStatus, summary: `Evidence review ${reviewStatus.toLowerCase()}`, correlationId }); return Response.json({ evidence: { ...next, sourceLineage: parse(next.sourceLineage, {}) }, correlationId });
    }
    return error("Unsupported transition workspace action.", 400, correlationId);
  } catch { return error("The transition workspace action could not be completed. No permission, approval, or disclosure state changed.", 503, correlationId); }
}
