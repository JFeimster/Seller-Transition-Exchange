import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { financingAuditEvents, financingReadinessReviews, financingRequests, capitalStructureScenarios, fundingPartners, sellers, businesses, buyers } from "../../../db/schema";
import { buildCapitalDeskPackage, buildCapitalScenarios, calculateEquityAnalysis, calculateSellerNoteIllustration, calculateSourcesUses, classifyReadiness, evaluatePartnerRouting } from "../../lib/financing";

const adminEmail = () => (process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com").toLowerCase();
const errorResponse = (message: string, status: number, correlationId: string) => Response.json({ error: message, correlationId }, { status });
const safeJson = (value: unknown, fallback: unknown = {}) => { if (typeof value === "object" && value !== null) return value; if (typeof value !== "string") return fallback; try { return JSON.parse(value); } catch { return fallback; } };
const ownerOf = (value: string | null) => { const parsed = safeJson(value, {}) as { ownerUserId?: string }; return parsed.ownerUserId ?? ""; };

async function audit(db: Awaited<ReturnType<typeof getDb>>, user: string, role: string, eventType: string, entityId: string | number, requestId: number | null, before?: string, after?: string, reason?: string, correlationId?: string) {
  await db.insert(financingAuditEvents).values({ financingRequestId: requestId, actorUserId: user, actorRole: role, eventType, entityType: "FinancingRequest", entityId: String(entityId), statusBefore: before ?? null, statusAfter: after ?? null, reason: reason ?? null, correlationId: correlationId ?? crypto.randomUUID() });
}

function publicRequest(row: typeof financingRequests.$inferSelect) {
  return { id: row.id, sellerId: row.sellerId, businessId: row.businessId, listingId: row.listingId, mandateId: row.mandateId, buyerId: row.buyerId, inquiryId: row.inquiryId, transactionPath: row.transactionPath, purchasePrice: row.purchasePrice, buyerEquity: row.buyerEquity, sellerNote: row.sellerNote, workingCapital: row.workingCapital, equipmentAmount: row.equipmentAmount, buyerExperience: row.buyerExperience, desiredClosingDate: row.desiredClosingDate, status: row.status, evidenceClassification: row.evidenceClassification, consentStatus: row.consentStatus, documentationStatus: row.documentationStatus, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("Sign in is required.", 401, correlationId);
    const url = new URL(request.url); const view = url.searchParams.get("view") ?? "seller"; const requestId = Number(url.searchParams.get("requestId") ?? 0); const db = await getDb();
    const isAdmin = user.email.toLowerCase() === adminEmail();
    let requests = isAdmin && view === "admin" ? await db.select().from(financingRequests).orderBy(desc(financingRequests.updatedAt)).limit(100) : [] as (typeof financingRequests.$inferSelect)[];
    if (!(isAdmin && view === "admin")) {
      const owned = await db.select().from(financingRequests).orderBy(desc(financingRequests.updatedAt)).limit(100);
      requests = owned.filter((item) => ownerOf(item.rawPayload) === user.email).slice(0, 50);
    }
    if (requestId) requests = requests.filter((row) => row.id === requestId);
    const ids = requests.map((row) => row.id);
    const reviews = ids.length ? await db.select().from(financingReadinessReviews).where(eq(financingReadinessReviews.financingRequestId, ids[0])) : [];
    const scenarios = ids.length ? await db.select().from(capitalStructureScenarios).where(eq(capitalStructureScenarios.financingRequestId, ids[0])) : [];
    return Response.json({ requests: requests.map(publicRequest), reviews, scenarios, correlationId });
  } catch {
    return errorResponse("Financing workspace is temporarily unavailable. No financing decision was made.", 503, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) return errorResponse("JSON content type is required.", 415, correlationId);
    if (Number(request.headers.get("content-length") ?? 0) > 64_000) return errorResponse("Financing requests are limited to 64 KB.", 413, correlationId);
    const user = await getChatGPTUser(); if (!user) return errorResponse("Sign in is required.", 401, correlationId);
    const body = await request.json() as { action?: string; requestId?: number; payload?: Record<string, unknown> }; const action = body.action ?? ""; const payload = body.payload ?? {}; const db = await getDb(); const isAdmin = user.email.toLowerCase() === adminEmail();
    if (action === "create_request") {
      const ownerPayload = JSON.stringify({ ownerUserId: user.email, original: payload });
      const [canonicalSeller] = await db.select().from(sellers).where(eq(sellers.userId, user.email)).orderBy(desc(sellers.updatedAt)).limit(1);
      const [canonicalBusiness] = canonicalSeller ? await db.select().from(businesses).where(eq(businesses.sellerId, canonicalSeller.id)).orderBy(desc(businesses.updatedAt)).limit(1) : [];
      const [canonicalBuyer] = await db.select().from(buyers).where(eq(buyers.userId, user.email)).orderBy(desc(buyers.updatedAt)).limit(1);
      if (!canonicalSeller && !canonicalBuyer) return errorResponse("Save the canonical seller or buyer profile before creating a financing request.", 409, correlationId);
      const [row] = await db.insert(financingRequests).values({ sellerId: canonicalSeller?.id ?? null, businessId: canonicalBusiness?.id ?? null, buyerId: canonicalBuyer?.id ?? null, listingId: typeof payload.listingId === "number" ? payload.listingId : null, mandateId: typeof payload.mandateId === "number" ? payload.mandateId : null, inquiryId: typeof payload.inquiryId === "number" ? payload.inquiryId : null, transitionPlanId: typeof payload.transitionPlanId === "number" ? payload.transitionPlanId : null, transactionPath: String(payload.transactionPath ?? "External sale"), purchasePrice: String(payload.purchasePrice ?? ""), buyerEquity: String(payload.buyerEquity ?? ""), sellerNote: String(payload.sellerNote ?? ""), workingCapital: String(payload.workingCapital ?? ""), equipmentAmount: String(payload.equipment ?? ""), buyerExperience: String(payload.buyerExperience ?? ""), desiredClosingDate: String(payload.desiredClosingDate ?? ""), evidenceClassification: String(payload.evidenceClassification ?? "Buyer Provided"), consentStatus: "Not Started", documentationStatus: "Missing", rawPayload: ownerPayload }).returning();
      await audit(db, user.email, "Seller or Buyer", "financing_request.created", row.id, row.id, undefined, row.status, "Canonical financing request created", correlationId);
      return Response.json({ request: publicRequest(row), correlationId }, { status: 201 });
    }
    const id = Number(body.requestId ?? 0); if (!id) return errorResponse("A financing request is required.", 400, correlationId);
    const [row] = await db.select().from(financingRequests).where(eq(financingRequests.id, id)).limit(1); if (!row) return errorResponse("Financing request not found.", 404, correlationId);
    if (!isAdmin && ownerOf(row.rawPayload) !== user.email) return errorResponse("This financing request is not available to the current account.", 403, correlationId);
    if (action === "save_intake") {
      const next = await db.update(financingRequests).set({ transactionPath: String(payload.transactionPath ?? row.transactionPath ?? ""), purchasePrice: String(payload.purchasePrice ?? row.purchasePrice ?? ""), buyerEquity: String(payload.buyerEquity ?? row.buyerEquity ?? ""), sellerNote: String(payload.sellerNote ?? row.sellerNote ?? ""), workingCapital: String(payload.workingCapital ?? row.workingCapital ?? ""), equipmentAmount: String(payload.equipment ?? row.equipmentAmount ?? ""), buyerExperience: String(payload.buyerExperience ?? row.buyerExperience ?? ""), desiredClosingDate: String(payload.desiredClosingDate ?? row.desiredClosingDate ?? ""), capitalNeeds: JSON.stringify(payload.capitalNeeds ?? safeJson(row.capitalNeeds)), evidenceClassification: String(payload.evidenceClassification ?? row.evidenceClassification), consentStatus: String(payload.consentStatus ?? row.consentStatus), documentationStatus: String(payload.documentationStatus ?? row.documentationStatus), status: "In Progress", updatedAt: new Date().toISOString() }).where(eq(financingRequests.id, id)).returning();
      await audit(db, user.email, isAdmin ? "Admin" : "Owner", "financing_request.updated", id, id, row.status, "In Progress", "Financing intake saved", correlationId); return Response.json({ request: publicRequest(next[0]), correlationId });
    }
    const input = { ...payload, purchasePrice: payload.purchasePrice ?? row.purchasePrice, buyerEquity: payload.buyerEquity ?? row.buyerEquity, sellerNote: payload.sellerNote ?? row.sellerNote, workingCapital: payload.workingCapital ?? row.workingCapital, equipment: payload.equipment ?? row.equipmentAmount, transactionPath: payload.transactionPath ?? row.transactionPath };
    if (action === "generate_review") {
      const review = classifyReadiness(input); await db.insert(financingReadinessReviews).values({ financingRequestId: id, totalScore: review.totalScore, classification: review.classification, componentScores: JSON.stringify({ score: review.totalScore }), evidenceClassification: review.evidenceClassification, methodology: JSON.stringify(review.methodology), missingComponents: JSON.stringify(review.missingComponents), conflicts: JSON.stringify(review.hardBlockers), applicationState: "Preliminary" }).returning();
      await db.update(financingRequests).set({ status: review.classification, updatedAt: new Date().toISOString() }).where(eq(financingRequests.id, id)); await audit(db, user.email, isAdmin ? "Admin" : "Owner", "financing_review.generated", id, id, row.status, review.classification, "Educational readiness review generated", correlationId); return Response.json({ review, correlationId });
    }
    if (action === "save_scenarios") {
      const scenarios = buildCapitalScenarios(input); for (const scenario of scenarios) await db.insert(capitalStructureScenarios).values({ financingRequestId: id, scenarioType: scenario.name, sourcesUses: JSON.stringify(scenario.sourcesUses), assumptions: JSON.stringify(scenario.assumptions), risks: JSON.stringify(scenario.risks), status: scenario.status, evidenceClassification: "Buyer Provided", nextAction: scenario.nextAction });
      return Response.json({ scenarios, correlationId });
    }
    if (action === "save_seller_note") return Response.json({ illustration: calculateSellerNoteIllustration(input), correlationId });
    if (action === "equity_analysis") return Response.json({ analysis: calculateEquityAnalysis(input), sourcesUses: calculateSourcesUses(input), correlationId });
    if (action === "generate_package") return Response.json({ package: buildCapitalDeskPackage({ requestId: id, sourcesUses: calculateSourcesUses(input), readiness: classifyReadiness(input), scenarios: buildCapitalScenarios(input), documents: ["Historical financial statements", "Debt and lien schedule", "Purchase agreement or LOI", "Buyer experience summary", "Working-capital plan", "Transition-plan milestones"] }), correlationId });
    if (action === "route_evaluate") {
      if (!isAdmin) return errorResponse("Admin review is required before partner routing.", 403, correlationId);
      const partners = await db.select().from(fundingPartners).where(eq(fundingPartners.verificationStatus, "Verified")); const result = evaluatePartnerRouting({ partners: partners.map((partner) => ({ name: partner.name, status: partner.verificationStatus, criteria: safeJson(partner.criteria, []) as string[] })), request: input, consent: payload.consent === true });
      await audit(db, user.email, "Admin", "routing.evaluated", id, id, row.status, result.status, result.message, correlationId); return Response.json({ result, correlationId });
    }
    if (action === "admin_decision") {
      if (!isAdmin) return errorResponse("Admin authorization required.", 403, correlationId); const status = String(payload.status ?? "Needs Review"); await db.update(financingRequests).set({ status, updatedAt: new Date().toISOString() }).where(eq(financingRequests.id, id)); await audit(db, user.email, "Admin", "financing_request.admin_decision", id, id, row.status, status, String(payload.reason ?? "Admin capital desk review"), correlationId); return Response.json({ status, correlationId });
    }
    return errorResponse("Unsupported financing action.", 400, correlationId);
  } catch {
    return errorResponse("The financing request could not be saved. No approval or routing action was completed.", 503, correlationId);
  }
}
