import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import {
  businesses,
  buyers,
  inquiries,
  quietExitAuditEvents,
  quietExitBuyerProfiles,
  quietExitDisclosures,
  quietExitInquiryReviews,
  quietExitInvitations,
  quietExitMandates,
  quietExitMaterials,
  quietExitRateLimits,
  sellers,
} from "../../../db/schema";
import {
  canTransitionDisclosure,
  evaluateBuyerMatch,
  reviewAnonymousTeaser,
  type BuyerMatchInput,
  type BuyerRequirements,
  type QuietExitIdentifiers,
  type QuietExitProfile,
  type SellerExclusions,
} from "../../lib/quiet-exit";

type QuietExitRequest = { action?: string; mandateId?: number; payload?: Record<string, unknown> };

const adminEmail = () => (process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com").toLowerCase();
const jsonObject = <T extends object>(value: unknown, fallback: T): T => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as T;
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};
const publicMandate = (row: typeof quietExitMandates.$inferSelect) => ({
  id: row.id,
  sellerId: row.sellerId,
  businessId: row.businessId,
  nativeListingId: row.nativeListingId,
  objective: row.objective,
  confidentialityLevel: row.confidentialityLevel,
  status: row.status,
  teaserStatus: row.teaserStatus,
  identificationRisk: row.identificationRisk,
  publicSafeProfile: jsonObject(row.publicSafeProfile, {}),
  buyerRequirements: jsonObject(row.buyerRequirements, {}),
  sellerExclusions: jsonObject(row.sellerExclusions, {}),
  sellerApprovedAt: row.sellerApprovedAt,
  adminReviewStatus: row.adminReviewStatus,
  adminApprovedAt: row.adminApprovedAt,
  nextAction: row.nextAction,
  evidenceClassification: row.evidenceClassification,
  version: row.version,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

async function audit(db: Awaited<ReturnType<typeof getDb>>, input: {
  mandateId?: number; actorUserId: string; actorRole: string; eventType: string; entityType: string;
  entityId: string | number; before?: string | null; after?: string | null; reason?: string;
  correlationId: string;
}) {
  await db.insert(quietExitAuditEvents).values({
    mandateId: input.mandateId ?? null,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: String(input.entityId),
    statusBefore: input.before ?? null,
    statusAfter: input.after ?? null,
    reason: input.reason ?? null,
    correlationId: input.correlationId,
  });
}

async function enforceRateLimit(db: Awaited<ReturnType<typeof getDb>>, principal: string) {
  const now = new Date();
  const minute = now.toISOString().slice(0, 16);
  const key = `${principal.toLowerCase()}:${minute}`;
  const [current] = await db.select().from(quietExitRateLimits).where(eq(quietExitRateLimits.id, key)).limit(1);
  if (current?.requestCount && current.requestCount >= 60) return false;
  if (current) await db.update(quietExitRateLimits).set({ requestCount: current.requestCount + 1, updatedAt: now.toISOString() }).where(eq(quietExitRateLimits.id, key));
  else await db.insert(quietExitRateLimits).values({ id: key, principal: principal.toLowerCase(), windowStartedAt: now.toISOString(), requestCount: 1 });
  return true;
}

function safeResponseError(message: string, status: number, correlationId: string) {
  return Response.json({ error: message, correlationId }, { status });
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const user = await getChatGPTUser();
    if (!user) return safeResponseError("Sign in is required.", 401, correlationId);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "seller";
    const mandateId = Number(url.searchParams.get("mandateId") ?? 0);
    const db = await getDb();

    if (view === "admin") {
      if (user.email.toLowerCase() !== adminEmail()) return safeResponseError("Admin authorization required.", 403, correlationId);
      const mandates = await db.select().from(quietExitMandates).orderBy(desc(quietExitMandates.updatedAt)).limit(50);
      const reviews = mandateId
        ? await db.select().from(quietExitInquiryReviews).where(eq(quietExitInquiryReviews.mandateId, mandateId)).orderBy(desc(quietExitInquiryReviews.createdAt))
        : [];
      const buyerProfiles = await db.select().from(quietExitBuyerProfiles).orderBy(desc(quietExitBuyerProfiles.updatedAt)).limit(50);
      const disclosures = await db.select().from(quietExitDisclosures).orderBy(desc(quietExitDisclosures.updatedAt)).limit(50);
      return Response.json({ mandates: mandates.map(publicMandate), reviews, buyerProfiles: buyerProfiles.map((profile) => ({ ...profile, rawPayload: undefined })), disclosures, correlationId });
    }

    if (view === "buyer") {
      const profiles = await db.select().from(quietExitBuyerProfiles).where(eq(quietExitBuyerProfiles.userId, user.email)).limit(1);
      const profile = profiles[0] ?? null;
      const disclosures = profile
        ? await db.select().from(quietExitDisclosures).where(eq(quietExitDisclosures.buyerProfileId, profile.id)).orderBy(desc(quietExitDisclosures.updatedAt))
        : [];
      const activeMandates = await db.select().from(quietExitMandates).where(eq(quietExitMandates.status, "Active")).orderBy(desc(quietExitMandates.updatedAt)).limit(100);
      const approvedMandateIds = new Set(disclosures.filter((item) => item.decisionStatus === "Approved for Disclosure" && !item.revokedAt && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now())).map((item) => item.mandateId));
      const opportunities = activeMandates.filter((item) => {
        if (item.identificationRisk === "High" || item.identificationRisk === "Blocked") return false;
        if (item.confidentialityLevel === "Anonymous Teaser" || item.confidentialityLevel === "Coming to Market") return true;
        if (item.confidentialityLevel === "Verified-Buyer Only") return profile?.verificationStatus === "Verified";
        return approvedMandateIds.has(item.id);
      }).map((item) => ({
        mandateReference: item.id,
        confidentialityLevel: item.confidentialityLevel,
        status: item.confidentialityLevel === "Coming to Market" ? "Coming to Market · not an active sale listing" : item.status,
        publicSafeProfile: jsonObject(item.publicSafeProfile, {}),
        evidenceClassification: item.evidenceClassification,
        accessStatus: approvedMandateIds.has(item.id) ? "Approved for Disclosure" : "Restricted Teaser",
      }));
      return Response.json({ profile: profile ? { ...profile, rawPayload: undefined } : null, disclosures, opportunities, correlationId });
    }

    const mandates = await db.select().from(quietExitMandates).where(eq(quietExitMandates.ownerUserId, user.email)).orderBy(desc(quietExitMandates.updatedAt));
    const allowed = mandateId ? mandates.filter((item) => item.id === mandateId) : mandates;
    if (mandateId && !allowed.length) return safeResponseError("Quiet Exit mandate not found.", 404, correlationId);
    const activeId = mandateId || allowed[0]?.id;
    const [materials, reviews, disclosures, events, invitations] = activeId ? await Promise.all([
      db.select().from(quietExitMaterials).where(eq(quietExitMaterials.mandateId, activeId)).orderBy(desc(quietExitMaterials.updatedAt)),
      db.select().from(quietExitInquiryReviews).where(eq(quietExitInquiryReviews.mandateId, activeId)).orderBy(desc(quietExitInquiryReviews.createdAt)),
      db.select().from(quietExitDisclosures).where(eq(quietExitDisclosures.mandateId, activeId)).orderBy(desc(quietExitDisclosures.updatedAt)),
      db.select().from(quietExitAuditEvents).where(eq(quietExitAuditEvents.mandateId, activeId)).orderBy(desc(quietExitAuditEvents.createdAt)).limit(100),
      db.select().from(quietExitInvitations).where(eq(quietExitInvitations.mandateId, activeId)).orderBy(desc(quietExitInvitations.createdAt)),
    ]) : [[], [], [], [], []];
    return Response.json({
      mandates: allowed.map(publicMandate),
      materials: materials.map((item) => ({ ...item, privateContent: undefined })),
      reviews,
      disclosures,
      events,
      invitations: invitations.map((item) => ({ ...item, invitedBuyerEmail: "Private invitation" })),
      correlationId,
    });
  } catch {
    return safeResponseError("Quiet Exit structured storage is temporarily unavailable.", 503, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return safeResponseError("JSON content type is required.", 415, correlationId);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 64_000) return safeResponseError("Quiet Exit requests are limited to 64 KB.", 413, correlationId);
    const user = await getChatGPTUser();
    if (!user) return safeResponseError("Sign in is required.", 401, correlationId);
    const body = (await request.json()) as QuietExitRequest;
    const payload = body.payload ?? {};
    const action = body.action ?? "";
    const mandateId = Number(body.mandateId ?? 0);
    const isAdmin = user.email.toLowerCase() === adminEmail();
    const db = await getDb();
    if (!(await enforceRateLimit(db, user.email))) return safeResponseError("Too many Quiet Exit requests. Try again after the current minute.", 429, correlationId);

    if (action === "create_mandate") {
      const [seller] = await db.select().from(sellers).where(eq(sellers.userId, user.email)).orderBy(desc(sellers.updatedAt)).limit(1);
      if (!seller) return safeResponseError("Create and save the canonical seller record before starting Quiet Exit.", 409, correlationId);
      const [business] = await db.select().from(businesses).where(eq(businesses.sellerId, seller.id)).orderBy(desc(businesses.updatedAt)).limit(1);
      if (!business) return safeResponseError("Add a native business record before starting Quiet Exit.", 409, correlationId);
      const [existing] = await db.select().from(quietExitMandates).where(and(eq(quietExitMandates.ownerUserId, user.email), eq(quietExitMandates.businessId, business.id))).limit(1);
      if (existing) return Response.json({ mandate: publicMandate(existing), correlationId });
      const level = String(payload.confidentialityLevel ?? "Anonymous Teaser");
      const [mandate] = await db.insert(quietExitMandates).values({
        sellerId: seller.id,
        businessId: business.id,
        ownerUserId: user.email,
        objective: String(payload.objective ?? "Explore a confidential transition"),
        confidentialityLevel: level,
        originalPayload: JSON.stringify({ sellerId: seller.id, businessId: business.id, objective: payload.objective, confidentialityLevel: level }),
        canonicalPayload: JSON.stringify({ sellerId: seller.id, businessId: business.id, objective: payload.objective, confidentialityLevel: level }),
      }).returning();
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: "Seller", eventType: "mandate.created", entityType: "QuietExitMandate", entityId: mandate.id, after: "Draft", correlationId });
      return Response.json({ mandate: publicMandate(mandate), correlationId }, { status: 201 });
    }

    if (action === "save_buyer_profile") {
      const [baseBuyer] = await db.select().from(buyers).where(eq(buyers.userId, user.email)).limit(1);
      const buyer = baseBuyer ?? (await db.insert(buyers).values({
        userId: user.email,
        buyerType: String(payload.buyerType ?? ""),
        operatingExperience: String(payload.operatingExperience ?? ""),
        acquisitionExperience: String(payload.acquisitionExperience ?? ""),
        industries: String(payload.industries ?? ""),
        geography: String(payload.geography ?? ""),
        availableEquityRange: String(payload.availableEquity ?? ""),
        financingStatus: String(payload.financingStatus ?? ""),
        rawPayload: JSON.stringify({ source: "Quiet Exit buyer profile", evidence: "Buyer Provided" }),
      }).returning())[0];
      const [current] = await db.select().from(quietExitBuyerProfiles).where(eq(quietExitBuyerProfiles.userId, user.email)).limit(1);
      const values = {
        buyerId: buyer.id, buyerName: String(payload.buyerName ?? ""), organization: String(payload.organization ?? ""), buyerType: String(payload.buyerType ?? ""),
        industries: String(payload.industries ?? ""), geography: String(payload.geography ?? ""), operatingExperience: String(payload.operatingExperience ?? ""),
        acquisitionExperience: String(payload.acquisitionExperience ?? ""), availableEquity: String(payload.availableEquity ?? ""), financingStatus: String(payload.financingStatus ?? ""),
        transitionApproach: String(payload.transitionApproach ?? ""), confidentialityAcknowledged: Boolean(payload.confidentialityAcknowledged),
        consentStatus: Boolean(payload.confidentialityAcknowledged) ? "Acknowledged" : "Not Started", rawPayload: JSON.stringify({ evidence: "Buyer Provided" }),
        updatedAt: new Date().toISOString(),
      };
      const [profile] = current
        ? await db.update(quietExitBuyerProfiles).set(values).where(eq(quietExitBuyerProfiles.id, current.id)).returning()
        : await db.insert(quietExitBuyerProfiles).values({ userId: user.email, ...values }).returning();
      await audit(db, { actorUserId: user.email, actorRole: "Buyer", eventType: "buyer_profile.saved", entityType: "BuyerProfile", entityId: profile.id, after: "Submitted", correlationId });
      return Response.json({ profile: { ...profile, rawPayload: undefined }, correlationId }, { status: current ? 200 : 201 });
    }

    if (action === "buyer_verification_decision") {
      if (!isAdmin) return safeResponseError("Admin authorization required.", 403, correlationId);
      const profileId = Number(payload.profileId ?? 0);
      const decision = String(payload.decision ?? "Revision Requested");
      if (!["Verified", "Revision Requested", "Declined"].includes(decision)) return safeResponseError("Unsupported buyer verification decision.", 400, correlationId);
      const [profile] = await db.select().from(quietExitBuyerProfiles).where(eq(quietExitBuyerProfiles.id, profileId)).limit(1);
      if (!profile) return safeResponseError("Buyer profile not found.", 404, correlationId);
      await db.update(quietExitBuyerProfiles).set({ verificationStatus: decision, identityStatus: decision, updatedAt: new Date().toISOString() }).where(eq(quietExitBuyerProfiles.id, profile.id));
      await db.update(buyers).set({ verificationStatus: decision.toLowerCase(), updatedAt: new Date().toISOString() }).where(eq(buyers.id, profile.buyerId ?? 0));
      await audit(db, { actorUserId: user.email, actorRole: "Admin", eventType: "buyer.verification_decision", entityType: "BuyerProfile", entityId: profile.id, before: profile.verificationStatus, after: decision, reason: String(payload.reason ?? ""), correlationId });
      return Response.json({ status: decision, correlationId });
    }

    const [mandate] = mandateId ? await db.select().from(quietExitMandates).where(eq(quietExitMandates.id, mandateId)).limit(1) : [];
    if (!mandate) return safeResponseError("Quiet Exit mandate not found.", 404, correlationId);
    const ownsMandate = mandate.ownerUserId.toLowerCase() === user.email.toLowerCase();

    if (action === "request_access") {
      const [profile] = await db.select().from(quietExitBuyerProfiles).where(eq(quietExitBuyerProfiles.userId, user.email)).limit(1);
      if (!profile) return safeResponseError("Complete the buyer profile before requesting access.", 409, correlationId);
      if (!profile.confidentialityAcknowledged) return safeResponseError("A confidentiality acknowledgment is required before access can be requested.", 409, correlationId);
      const buyerInput: BuyerMatchInput = {
        buyerType: profile.buyerType ?? "", organization: profile.organization ?? "", industries: profile.industries ?? "", geography: profile.geography ?? "",
        availableEquity: Number(profile.availableEquity || 0), financingStatus: profile.financingStatus ?? "", confidentialityAcknowledged: profile.confidentialityAcknowledged,
        operatingExperience: profile.operatingExperience ?? "", transitionApproach: profile.transitionApproach ?? "",
      };
      const match = evaluateBuyerMatch(buyerInput, jsonObject<BuyerRequirements>(mandate.buyerRequirements, {}), jsonObject<SellerExclusions>(mandate.sellerExclusions, {}));
      const [inquiry] = await db.insert(inquiries).values({
        listingSlug: `quiet-exit:${mandate.id}`, buyerId: profile.buyerId, sellerId: mandate.sellerId, buyerName: profile.buyerName ?? "Registered buyer",
        buyerEmail: user.email, buyerType: profile.buyerType, status: match.classification === "Hard Conflict" ? "Needs Qualification" : "New",
        reasonForInterest: String(payload.reasonForInterest ?? ""), financingHelpRequested: Boolean(payload.financingHelpRequested),
        rawPayload: JSON.stringify({ source: "Quiet Exit access request", requestedTier: payload.requestedTier ?? "Restricted Teaser" }),
      }).returning();
      const [review] = await db.insert(quietExitInquiryReviews).values({
        inquiryId: inquiry.id, mandateId: mandate.id, buyerProfileId: profile.id, matchClassification: match.classification, matchScore: match.score,
        hardConflicts: JSON.stringify(match.hardConflicts), alignment: JSON.stringify(match.alignment), missingInformation: JSON.stringify(match.missing),
      }).returning();
      const [disclosure] = await db.insert(quietExitDisclosures).values({
        mandateId: mandate.id, inquiryId: inquiry.id, buyerProfileId: profile.id, requestedTier: String(payload.requestedTier ?? "Restricted Teaser"), correlationId,
      }).returning();
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: "Buyer", eventType: "access.requested", entityType: "DisclosureRequest", entityId: disclosure.id, after: "Requested", correlationId });
      return Response.json({ inquiryId: inquiry.id, review, disclosure, correlationId }, { status: 201 });
    }

    if (!ownsMandate && !isAdmin) return safeResponseError("Seller or admin authorization required.", 403, correlationId);

    if (action === "save_teaser") {
      const profile = jsonObject<QuietExitProfile>(payload.profile, {});
      const identifiers = jsonObject<QuietExitIdentifiers>(payload.identifiers, {});
      const review = reviewAnonymousTeaser(profile, identifiers);
      const [material] = await db.insert(quietExitMaterials).values({
        mandateId: mandate.id,
        materialType: "Anonymous Teaser",
        sourceRecordIds: JSON.stringify([`seller:${mandate.sellerId}`, `business:${mandate.businessId}`, `mandate:${mandate.id}`]),
        sourceVersions: JSON.stringify({ mandate: mandate.version }),
        privateContent: JSON.stringify(profile),
        publicContent: JSON.stringify(review.publicDraft),
        redactionLog: JSON.stringify(review.redactionLog),
        riskReport: JSON.stringify({ riskLevel: review.riskLevel, findings: review.findings }),
        sellerReviewStatus: "Needs Review",
      }).returning();
      await db.update(quietExitMandates).set({
        publicSafeProfile: JSON.stringify(review.publicDraft),
        knownIdentifiersPrivate: JSON.stringify(identifiers),
        teaserStatus: review.publicationBlocked ? "Needs Revision" : "Needs Review",
        identificationRisk: review.riskLevel,
        nextAction: review.publicationBlocked ? "Resolve identification risks" : "Complete seller review",
        version: mandate.version + 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(quietExitMandates.id, mandate.id));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: isAdmin ? "Admin" : "Seller", eventType: "teaser.reviewed", entityType: "GeneratedMaterial", entityId: material.id, before: mandate.teaserStatus, after: review.publicationBlocked ? "Needs Revision" : "Needs Review", reason: review.riskLevel, correlationId });
      return Response.json({ material: { ...material, privateContent: undefined }, review, correlationId }, { status: 201 });
    }

    if (action === "save_controls") {
      await db.update(quietExitMandates).set({
        buyerRequirements: JSON.stringify(jsonObject(payload.buyerRequirements, {})),
        sellerExclusions: JSON.stringify(jsonObject(payload.sellerExclusions, {})),
        nextAction: "Submit the mandate for admin review",
        updatedAt: new Date().toISOString(),
      }).where(eq(quietExitMandates.id, mandate.id));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: isAdmin ? "Admin" : "Seller", eventType: "qualification_controls.saved", entityType: "QuietExitMandate", entityId: mandate.id, correlationId });
      return Response.json({ status: "Saved", correlationId });
    }

    if (action === "seller_submit") {
      await db.update(quietExitMandates).set({ status: "Admin Review", sellerApprovedAt: new Date().toISOString(), adminReviewStatus: "Needs Review", nextAction: "Await admin confidentiality review", updatedAt: new Date().toISOString() }).where(eq(quietExitMandates.id, mandate.id));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: "Seller", eventType: "mandate.submitted", entityType: "QuietExitMandate", entityId: mandate.id, before: mandate.status, after: "Admin Review", correlationId });
      return Response.json({ status: "Admin Review", correlationId });
    }

    if (action === "admin_decision") {
      if (!isAdmin) return safeResponseError("Admin authorization required.", 403, correlationId);
      const decision = String(payload.decision ?? "Revision Requested");
      const approved = decision === "Approved";
      await db.update(quietExitMandates).set({ adminReviewStatus: decision, adminApprovedAt: approved ? new Date().toISOString() : null, status: approved ? "Approved" : decision, nextAction: approved ? "Seller may activate the approved mandate" : "Resolve admin review findings", updatedAt: new Date().toISOString() }).where(eq(quietExitMandates.id, mandate.id));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: "Admin", eventType: "mandate.admin_decision", entityType: "QuietExitMandate", entityId: mandate.id, before: mandate.adminReviewStatus, after: decision, reason: String(payload.reason ?? ""), correlationId });
      return Response.json({ status: decision, correlationId });
    }

    if (action === "seller_verification_decision") {
      if (!isAdmin) return safeResponseError("Admin authorization required.", 403, correlationId);
      const decision = String(payload.decision ?? "verified").toLowerCase();
      if (!["verified", "unverified", "revision requested"].includes(decision)) return safeResponseError("Unsupported seller verification decision.", 400, correlationId);
      const [seller] = await db.select().from(sellers).where(eq(sellers.id, mandate.sellerId)).limit(1);
      if (!seller) return safeResponseError("Canonical seller record not found.", 404, correlationId);
      await db.update(sellers).set({ verificationStatus: decision, updatedAt: new Date().toISOString() }).where(eq(sellers.id, seller.id));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: "Admin", eventType: "seller.verification_decision", entityType: "Seller", entityId: seller.id, before: seller.verificationStatus, after: decision, reason: String(payload.reason ?? ""), correlationId });
      return Response.json({ status: decision, correlationId });
    }

    if (action === "activate") {
      if (!mandate.sellerApprovedAt || mandate.adminReviewStatus !== "Approved") return safeResponseError("Independent seller and admin approval are required before activation.", 409, correlationId);
      if (["High", "Blocked"].includes(mandate.identificationRisk)) return safeResponseError("High identification risk blocks activation until the teaser is revised and reviewed.", 409, correlationId);
      const [seller] = await db.select().from(sellers).where(eq(sellers.id, mandate.sellerId)).limit(1);
      if (!seller || seller.verificationStatus.toLowerCase() !== "verified") return safeResponseError("The native seller record must be verified before a Quiet Exit mandate can activate.", 409, correlationId);
      await db.update(quietExitMandates).set({ status: "Active", nextAction: "Review qualified buyer interest", updatedAt: new Date().toISOString() }).where(eq(quietExitMandates.id, mandate.id));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: isAdmin ? "Admin" : "Seller", eventType: "mandate.activated", entityType: "QuietExitMandate", entityId: mandate.id, before: mandate.status, after: "Active", correlationId });
      return Response.json({ status: "Active", correlationId });
    }

    if (action === "disclosure_decision") {
      const disclosureId = Number(payload.disclosureId ?? 0);
      const [disclosure] = await db.select().from(quietExitDisclosures).where(and(eq(quietExitDisclosures.id, disclosureId), eq(quietExitDisclosures.mandateId, mandate.id))).limit(1);
      if (!disclosure) return safeResponseError("Disclosure request not found.", 404, correlationId);
      const decision = String(payload.decision ?? "Declined");
      if (!canTransitionDisclosure(disclosure.decisionStatus, decision) && !(disclosure.decisionStatus === "Requested" && ["Approved for Disclosure", "Conditioned"].includes(decision))) {
        return safeResponseError("That disclosure state transition is not allowed.", 409, correlationId);
      }
      const requiresAdmin = decision === "Approved for Disclosure" && mandate.confidentialityLevel !== "Anonymous Teaser";
      if (decision === "Approved for Disclosure") {
        const [buyerProfile] = await db.select().from(quietExitBuyerProfiles).where(eq(quietExitBuyerProfiles.id, disclosure.buyerProfileId)).limit(1);
        const [review] = await db.select().from(quietExitInquiryReviews).where(eq(quietExitInquiryReviews.inquiryId, disclosure.inquiryId)).limit(1);
        if (!buyerProfile || buyerProfile.verificationStatus !== "Verified") return safeResponseError("Buyer verification is required before disclosure can be approved.", 409, correlationId);
        if (!buyerProfile.confidentialityAcknowledged) return safeResponseError("Buyer confidentiality acknowledgment is required before disclosure.", 409, correlationId);
        if (!review || review.matchClassification === "Hard Conflict" || JSON.parse(review.hardConflicts).length) return safeResponseError("A hard qualification conflict blocks disclosure approval.", 409, correlationId);
      }
      const storedDecision = requiresAdmin && !isAdmin ? "Conditioned" : decision;
      await db.update(quietExitDisclosures).set({
        approvedTier: decision === "Approved for Disclosure" ? String(payload.approvedTier ?? disclosure.requestedTier) : disclosure.approvedTier,
        decisionStatus: storedDecision,
        decisionReason: String(payload.reason ?? ""),
        conditions: String(payload.conditions ?? ""),
        expiresAt: payload.expiresAt ? String(payload.expiresAt) : null,
        sellerApprovedAt: !isAdmin && decision === "Approved for Disclosure" ? new Date().toISOString() : disclosure.sellerApprovedAt,
        adminApprovedAt: isAdmin && decision === "Approved for Disclosure" ? new Date().toISOString() : disclosure.adminApprovedAt,
        revokedAt: decision === "Revoked" ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      }).where(eq(quietExitDisclosures.id, disclosure.id));
      await db.update(inquiries).set({ status: storedDecision, disclosureApproved: storedDecision === "Approved for Disclosure", updatedAt: new Date().toISOString() }).where(eq(inquiries.id, disclosure.inquiryId));
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: isAdmin ? "Admin" : "Seller", eventType: decision === "Revoked" ? "disclosure.revoked" : "disclosure.decided", entityType: "DisclosureRequest", entityId: disclosure.id, before: disclosure.decisionStatus, after: storedDecision, reason: String(payload.reason ?? ""), correlationId });
      return Response.json({ status: storedDecision, correlationId });
    }

    if (action === "prepare_invitation") {
      if (mandate.confidentialityLevel !== "Invite-Only Opportunity") return safeResponseError("Invitations are available only for invite-only opportunities.", 409, correlationId);
      const email = String(payload.email ?? "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return safeResponseError("A valid buyer email is required.", 400, correlationId);
      const [invitation] = await db.insert(quietExitInvitations).values({ mandateId: mandate.id, invitedBuyerEmail: email, invitedByUserId: user.email, status: "Prepared · delivery pending integration", correlationId }).returning();
      await audit(db, { mandateId: mandate.id, actorUserId: user.email, actorRole: isAdmin ? "Admin" : "Seller", eventType: "invitation.prepared", entityType: "QuietExitInvitation", entityId: invitation.id, after: invitation.status, correlationId });
      return Response.json({ invitation: { ...invitation, invitedBuyerEmail: "Private invitation" }, correlationId }, { status: 201 });
    }

    return safeResponseError("Unsupported Quiet Exit action.", 400, correlationId);
  } catch {
    return safeResponseError("The Quiet Exit request could not be completed.", 503, correlationId);
  }
}
