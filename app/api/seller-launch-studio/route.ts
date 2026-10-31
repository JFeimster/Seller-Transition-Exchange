import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { businesses, generatedMaterialAuditEvents, generatedMaterials, sellers } from "../../../db/schema";
import { buildGeneratedMaterial, detectUnsupportedClaims, materialGate, MATERIAL_TYPES, reviewMaterialConfidentiality, type MaterialType } from "../../lib/seller-launch-studio";

type Body = { action?: string; materialId?: number; payload?: Record<string, unknown> };
const adminEmail = () => (process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com").toLowerCase();
const error = (message: string, status: number, correlationId: string) => Response.json({ error: message, correlationId }, { status });
const parse = <T>(input: string | null, fallback: T): T => { try { return input ? JSON.parse(input) as T : fallback; } catch { return fallback; } };
const safeMaterial = (row: typeof generatedMaterials.$inferSelect) => ({ ...row, sourceEntityIds: parse(row.sourceEntityIds, {}), sourceVersions: parse(row.sourceVersions, {}), claimManifest: parse(row.claimManifest, []), confidentialityReview: parse(row.confidentialityReview, {}), unsupportedClaims: parse(row.unsupportedClaims, []) });

async function audit(db: Awaited<ReturnType<typeof getDb>>, rowId: number | null, user: string, role: string, eventType: string, before: string | null, after: string | null, reason: string, correlationId: string) {
  await db.insert(generatedMaterialAuditEvents).values({ generatedMaterialId: rowId, actorUserId: user, actorRole: role, eventType, statusBefore: before, statusAfter: after, reason, correlationId });
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const user = await getChatGPTUser(); if (!user) return error("Sign in is required.", 401, correlationId);
    const url = new URL(request.url); const materialId = Number(url.searchParams.get("materialId") ?? 0); const isAdmin = user.email.toLowerCase() === adminEmail(); const db = await getDb();
    let rows = isAdmin && url.searchParams.get("view") === "admin" ? await db.select().from(generatedMaterials).orderBy(desc(generatedMaterials.updatedAt)).limit(100) : await db.select().from(generatedMaterials).where(eq(generatedMaterials.ownerUserId, user.email)).orderBy(desc(generatedMaterials.updatedAt)).limit(100);
    if (materialId) rows = rows.filter((row) => row.id === materialId);
    if (materialId && !rows.length) return error("Generated material not found.", 404, correlationId);
    const events = materialId ? await db.select().from(generatedMaterialAuditEvents).where(eq(generatedMaterialAuditEvents.generatedMaterialId, materialId)).orderBy(desc(generatedMaterialAuditEvents.createdAt)).limit(100) : [];
    return Response.json({ materials: rows.map(safeMaterial), events, materialTypes: MATERIAL_TYPES, correlationId });
  } catch { return error("Seller Launch Studio storage is temporarily unavailable.", 503, correlationId); }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) return error("JSON content type is required.", 415, correlationId);
    if (Number(request.headers.get("content-length") ?? 0) > 128_000) return error("Launch Studio requests are limited to 128 KB.", 413, correlationId);
    const user = await getChatGPTUser(); if (!user) return error("Sign in is required.", 401, correlationId);
    const body = await request.json() as Body; const action = body.action ?? ""; const payload = body.payload ?? {}; const db = await getDb(); const isAdmin = user.email.toLowerCase() === adminEmail();
    if (action === "generate") {
      const materialType = String(payload.materialType ?? "Anonymous Teaser") as MaterialType;
      if (!MATERIAL_TYPES.includes(materialType)) return error("Select a supported material type.", 400, correlationId);
      const [seller] = await db.select().from(sellers).where(eq(sellers.userId, user.email)).orderBy(desc(sellers.updatedAt)).limit(1);
      const [business] = seller ? await db.select().from(businesses).where(eq(businesses.sellerId, seller.id)).orderBy(desc(businesses.updatedAt)).limit(1) : [];
      if (!seller || !business) return error("Save the canonical seller and business records before generating materials.", 409, correlationId);
      const visibility = String(payload.visibilityLevel ?? seller.confidentialityPreference ?? "Seller Only");
      const built = buildGeneratedMaterial({ materialType, seller, business, visibility, audience: String(payload.audience ?? "Seller Only"), sourceEntityIds: { seller: seller.id, business: business.id, listing: payload.listingId ?? null, mandate: payload.mandateId ?? null, transitionPlan: payload.transitionPlanId ?? null, financingRequest: payload.financingRequestId ?? null }, sourceVersions: { seller: seller.updatedAt, business: business.updatedAt } });
      const [row] = await db.insert(generatedMaterials).values({ sellerId: seller.id, businessId: business.id, listingId: Number(payload.listingId) || null, mandateId: Number(payload.mandateId) || null, transitionPlanId: Number(payload.transitionPlanId) || null, financingRequestId: Number(payload.financingRequestId) || null, ownerUserId: user.email, materialType, title: built.title, audience: built.audience, visibilityLevel: built.visibilityLevel, content: built.content, claimManifest: JSON.stringify(built.claimManifest), sourceEntityIds: JSON.stringify(built.sourceEntityIds), sourceVersions: JSON.stringify(built.sourceVersions), confidentialityReview: JSON.stringify(built.confidentialityReview), unsupportedClaims: JSON.stringify(built.unsupportedClaims), generatedBy: user.email }).returning();
      await audit(db, row.id, user.email, "Seller", "generated_material.created", null, row.draftStatus, "Evidence-grounded draft generated from canonical records", correlationId);
      return Response.json({ material: safeMaterial(row), correlationId }, { status: 201 });
    }
    const id = Number(body.materialId ?? 0); if (!id) return error("A generated material is required.", 400, correlationId);
    const [row] = await db.select().from(generatedMaterials).where(eq(generatedMaterials.id, id)).limit(1); if (!row) return error("Generated material not found.", 404, correlationId);
    if (!isAdmin && row.ownerUserId !== user.email) return error("This material is not available to the current account.", 403, correlationId);
    if (action === "save_draft") {
      const content = String(payload.content ?? row.content); const businessRows = await db.select().from(businesses).where(eq(businesses.id, row.businessId)).limit(1); const confidentiality = reviewMaterialConfidentiality(content, row.visibilityLevel, businessRows[0] ?? {}); const unsupported = detectUnsupportedClaims(content);
      const [next] = await db.update(generatedMaterials).set({ content, confidentialityReview: JSON.stringify(confidentiality), unsupportedClaims: JSON.stringify(unsupported), draftStatus: "Draft", sellerApproval: "Not Started", adminApproval: "Not Started", version: row.version + 1, updatedAt: new Date().toISOString() }).where(eq(generatedMaterials.id, id)).returning();
      await audit(db, id, user.email, isAdmin ? "Admin" : "Seller", "generated_material.edited", row.draftStatus, "Draft", "Content changed; approvals reset", correlationId); return Response.json({ material: safeMaterial(next), correlationId });
    }
    if (action === "seller_approve") {
      if (row.ownerUserId !== user.email) return error("Seller authorization required.", 403, correlationId);
      const unsupported = parse<string[]>(row.unsupportedClaims, []); const confidentiality = parse<{ classification?: string }>(row.confidentialityReview, {});
      if (unsupported.length || confidentiality.classification === "Blocked") return error("Resolve claim or confidentiality review items before seller approval.", 409, correlationId);
      const [next] = await db.update(generatedMaterials).set({ sellerApproval: "Approved", draftStatus: "Admin Review", updatedAt: new Date().toISOString() }).where(eq(generatedMaterials.id, id)).returning(); await audit(db, id, user.email, "Seller", "generated_material.seller_approved", row.draftStatus, "Admin Review", "Seller approved current version", correlationId); return Response.json({ material: safeMaterial(next), correlationId });
    }
    if (action === "admin_decision") {
      if (!isAdmin) return error("Admin authorization required.", 403, correlationId); const decision = payload.decision === "Approved" ? "Approved" : "Revision Requested"; const gate = materialGate({ unsupportedClaims: parse(row.unsupportedClaims, []), confidentialityReview: parse(row.confidentialityReview, { classification: "Needs Review" }), sellerApproval: row.sellerApproval, adminApproval: decision }); const [next] = await db.update(generatedMaterials).set({ adminApproval: decision, draftStatus: gate.status, updatedAt: new Date().toISOString() }).where(eq(generatedMaterials.id, id)).returning(); await audit(db, id, user.email, "Admin", "generated_material.admin_decision", row.draftStatus, gate.status, String(payload.reason ?? gate.reason), correlationId); return Response.json({ material: safeMaterial(next), gate, correlationId });
    }
    if (action === "archive") { const [next] = await db.update(generatedMaterials).set({ draftStatus: "Archived", updatedAt: new Date().toISOString() }).where(eq(generatedMaterials.id, id)).returning(); await audit(db, id, user.email, isAdmin ? "Admin" : "Seller", "generated_material.archived", row.draftStatus, "Archived", String(payload.reason ?? "Archived by owner"), correlationId); return Response.json({ material: safeMaterial(next), correlationId }); }
    return error("Unsupported Launch Studio action.", 400, correlationId);
  } catch { return error("The Launch Studio action could not be completed. No approval or publication action was performed.", 503, correlationId); }
}
