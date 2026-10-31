import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { businesses, buyers, financingRequests, legacyMatches, legacyProfiles, successorTransitionProfiles, transitionAuditEvents, transitionPathComparisons, transitionPlans, sellers } from "../../../db/schema";
import { compareTransitionPaths, evaluateLegacyMatch, TRANSITION_PATHS, type TransitionPath } from "../../lib/change-of-ownership";
import { skillForIndustry } from "../../lib/vertical-intelligence";

type Body = { action?: string; planId?: number; payload?: Record<string, unknown> };
const adminEmail = () => (process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com").toLowerCase();
const parse = <T>(value: unknown, fallback: T): T => { if (typeof value !== "string") return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } };
const object = (value: unknown) => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const error = (message: string, status: number, correlationId: string) => Response.json({ error: message, correlationId }, { status });

async function audit(db: Awaited<ReturnType<typeof getDb>>, input: { planId?: number; user: string; role: string; eventType: string; before?: string; after?: string; reason?: string; correlationId: string }) {
  await db.insert(transitionAuditEvents).values({ transitionPlanId: input.planId ?? null, actorUserId: input.user, actorRole: input.role, eventType: input.eventType, statusBefore: input.before ?? null, statusAfter: input.after ?? null, reason: input.reason ?? null, correlationId: input.correlationId });
}

function publicPlan(row: typeof transitionPlans.$inferSelect) {
  return { id: row.id, sellerId: row.sellerId, businessId: row.businessId, selectedPath: row.selectedPath, alternativePaths: parse<string[]>(row.alternativePaths, []), sellerObjectives: parse(row.sellerObjectives, {}), businessContext: parse(row.businessContext, {}), successorContext: parse(row.successorContext, {}), structuralPreferences: parse(row.structuralPreferences, {}), confidentialityLevel: row.confidentialityLevel, financingStatus: row.financingStatus, readinessStatus: row.readinessStatus, verticalSkillName: row.verticalSkillName, verticalSkillVersion: row.verticalSkillVersion, verticalSourceClassification: row.verticalSourceClassification, evidenceClassification: row.evidenceClassification, status: row.status, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function sellerLegacy(row: typeof legacyProfiles.$inferSelect) {
  return { id: row.id, transitionPlanId: row.transitionPlanId, priorities: parse(row.priorities, {}), preferredBuyerCharacteristics: row.preferredBuyerCharacteristics, excludedBuyerCharacteristics: row.excludedBuyerCharacteristics, excludedOrganizations: row.excludedOrganizations, excludedTransactionPaths: parse<string[]>(row.excludedTransactionPaths, []), sellerApproved: row.sellerApproved, evidenceClassification: row.evidenceClassification, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function successorSummary(row: typeof successorTransitionProfiles.$inferSelect) {
  return { id: row.id, buyerId: row.buyerId, transitionPlanId: row.transitionPlanId, successorType: row.successorType, experience: parse(row.experience, {}), operatingCapability: row.operatingCapability, industryCapability: row.industryCapability, geography: row.geography, capitalReadiness: row.capitalReadiness, financingStatus: row.financingStatus, transitionPreferences: parse(row.transitionPreferences, {}), continuityCommitments: parse(row.continuityCommitments, {}), governancePreferences: parse(row.governancePreferences, {}), confidentialityStatus: row.confidentialityStatus, evidenceClassification: row.evidenceClassification, verificationStatus: row.verificationStatus, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function matchSummary(row: typeof legacyMatches.$inferSelect, includePrivate = false) {
  return { id: row.id, transitionPlanId: row.transitionPlanId, successorProfileId: row.successorProfileId, financialAlignment: row.financialAlignment, operationalAlignment: row.operationalAlignment, legacyAlignment: row.legacyAlignment, transitionAlignment: row.transitionAlignment, industryAlignment: row.industryAlignment, geographicAlignment: row.geographicAlignment, evidenceCoverage: row.evidenceCoverage, compatiblePriorities: parse<string[]>(row.compatiblePriorities, []), tradeoffs: parse<string[]>(row.tradeoffs, []), missingInformation: parse<string[]>(row.missingInformation, []), softConflicts: parse<string[]>(row.softConflicts, []), hardBlockers: includePrivate ? parse<string[]>(row.hardBlockers, []) : [], financingBlockers: parse<string[]>(row.financingBlockers, []), confidentialityBlockers: parse<string[]>(row.confidentialityBlockers, []), disclosureRecommendation: row.disclosureRecommendation, methodology: parse(row.methodology, {}), status: row.status, generatedAt: row.generatedAt, reviewedAt: row.reviewedAt };
}

async function ownerPlan(db: Awaited<ReturnType<typeof getDb>>, planId: number, user: string) {
  const [plan] = await db.select().from(transitionPlans).where(eq(transitionPlans.id, planId)).limit(1);
  return plan && plan.ownerUserId === user ? plan : null;
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const user = await getChatGPTUser(); if (!user) return error("Sign in is required.", 401, correlationId);
    const url = new URL(request.url); const view = url.searchParams.get("view") ?? "seller"; const planId = Number(url.searchParams.get("planId") ?? 0); const db = await getDb();
    if (view === "admin") {
      if (user.email.toLowerCase() !== adminEmail()) return error("Admin authorization required.", 403, correlationId);
      const plans = await db.select().from(transitionPlans).orderBy(desc(transitionPlans.updatedAt)).limit(100);
      const matches = await db.select().from(legacyMatches).orderBy(desc(legacyMatches.generatedAt)).limit(100);
      return Response.json({ plans: plans.map(publicPlan), matches: matches.map((match) => matchSummary(match, true)), correlationId });
    }
    if (view === "buyer") {
      const profiles = await db.select().from(successorTransitionProfiles).where(eq(successorTransitionProfiles.ownerUserId, user.email)).orderBy(desc(successorTransitionProfiles.updatedAt));
      const profileIds = new Set(profiles.map((profile) => profile.id));
      const allMatches = await db.select().from(legacyMatches).orderBy(desc(legacyMatches.generatedAt)).limit(100);
      return Response.json({ profiles: profiles.map(successorSummary), matches: allMatches.filter((match) => profileIds.has(match.successorProfileId)).map((match) => matchSummary(match, false)), correlationId });
    }
    const allPlans = await db.select().from(transitionPlans).where(eq(transitionPlans.ownerUserId, user.email)).orderBy(desc(transitionPlans.updatedAt));
    const plans = planId ? allPlans.filter((plan) => plan.id === planId) : allPlans;
    if (planId && !plans.length) return error("Transition plan not found.", 404, correlationId);
    const planIds = new Set(plans.map((plan) => plan.id));
    const profiles = planIds.size ? await db.select().from(legacyProfiles).orderBy(desc(legacyProfiles.updatedAt)).limit(100) : [];
    const comparisons = planIds.size ? await db.select().from(transitionPathComparisons).orderBy(desc(transitionPathComparisons.generatedAt)).limit(100) : [];
    const matches = planIds.size ? await db.select().from(legacyMatches).orderBy(desc(legacyMatches.generatedAt)).limit(100) : [];
    const events = planIds.size ? await db.select().from(transitionAuditEvents).orderBy(desc(transitionAuditEvents.createdAt)).limit(100) : [];
    return Response.json({ plans: plans.map(publicPlan), legacyProfiles: profiles.filter((profile) => planIds.has(profile.transitionPlanId)).map(sellerLegacy), comparisons: comparisons.filter((comparison) => planIds.has(comparison.transitionPlanId)).map((comparison) => ({ ...comparison, paths: parse(comparison.paths, []), comparisonDimensions: parse(comparison.comparisonDimensions, {}), assumptions: parse(comparison.assumptions, []), evidenceGaps: parse(comparison.evidenceGaps, []), hardBlockers: parse(comparison.hardBlockers, []), professionalReviewFlags: parse(comparison.professionalReviewFlags, []) })), matches: matches.filter((match) => planIds.has(match.transitionPlanId)).map((match) => matchSummary(match, true)), events: events.filter((event) => planIds.has(event.transitionPlanId ?? 0)), correlationId });
  } catch { return error("Transition Planning storage is temporarily unavailable.", 503, correlationId); }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return error("JSON content type is required.", 415, correlationId);
    if (Number(request.headers.get("content-length") ?? 0) > 64_000) return error("Transition Planning requests are limited to 64 KB.", 413, correlationId);
    const user = await getChatGPTUser(); if (!user) return error("Sign in is required.", 401, correlationId);
    const body = await request.json() as Body; const action = body.action ?? ""; const payload = body.payload ?? {}; const planId = Number(body.planId ?? 0); const db = await getDb();
    if (action === "create_plan") {
      const [seller] = await db.select().from(sellers).where(eq(sellers.userId, user.email)).orderBy(desc(sellers.updatedAt)).limit(1);
      if (!seller) return error("Create the canonical seller record before starting a Transition Plan.", 409, correlationId);
      const [business] = await db.select().from(businesses).where(eq(businesses.sellerId, seller.id)).orderBy(desc(businesses.updatedAt)).limit(1);
      if (!business) return error("Add the canonical business record before starting a Transition Plan.", 409, correlationId);
      const existing = (await db.select().from(transitionPlans).where(eq(transitionPlans.ownerUserId, user.email)).orderBy(desc(transitionPlans.updatedAt))).find((plan) => plan.businessId === business.id && !["Completed", "Withdrawn", "Archived"].includes(plan.status));
      if (existing) return Response.json({ plan: publicPlan(existing), reusedCanonicalPlan: true, correlationId });
      const skill = skillForIndustry(business.industry ?? "");
      const [plan] = await db.insert(transitionPlans).values({ sellerId: seller.id, businessId: business.id, ownerUserId: user.email, selectedPath: String(payload.selectedPath ?? "") || null, alternativePaths: JSON.stringify(Array.isArray(payload.alternativePaths) ? payload.alternativePaths : []), sellerObjectives: JSON.stringify(object(payload.sellerObjectives)), sellerConstraints: JSON.stringify(object(payload.sellerConstraints)), businessContext: JSON.stringify({ industry: business.industry, subindustry: business.subindustry, geography: business.geography, revenueRange: business.revenueRange, sdeRange: business.sdeRange, ebitdaRange: business.ebitdaRange, employeeCount: business.employeeCount, recurringRevenue: business.recurringRevenuePercentage, customerConcentration: business.customerConcentration }), successorContext: JSON.stringify(object(payload.successorContext)), structuralPreferences: JSON.stringify(object(payload.structuralPreferences)), confidentialityLevel: String(payload.confidentialityLevel ?? seller.confidentialityPreference ?? ""), verticalSkillName: skill?.skillName ?? null, verticalSkillVersion: skill?.skillVersion ?? null, verticalSourceClassification: skill?.sourceClassification ?? "Missing", evidenceClassification: "Seller Provided", status: "Exploring Paths" }).returning();
      await audit(db, { planId: plan.id, user: user.email, role: "Seller", eventType: "transition_plan.created", after: plan.status, reason: "Canonical Transition Plan created", correlationId });
      return Response.json({ plan: publicPlan(plan), reusedCanonicalPlan: false, correlationId }, { status: 201 });
    }
    if (action === "save_successor_profile") {
      const [buyer] = await db.select().from(buyers).where(eq(buyers.userId, user.email)).orderBy(desc(buyers.updatedAt)).limit(1);
      const canonicalBuyer = buyer ?? (await db.insert(buyers).values({ userId: user.email, buyerType: String(payload.successorType ?? ""), operatingExperience: String(payload.operatingExperience ?? ""), acquisitionExperience: String(payload.ownershipExperience ?? ""), industries: String(payload.industryExperience ?? ""), geography: String(payload.geography ?? ""), availableEquityRange: String(payload.capitalReadiness ?? ""), financingStatus: String(payload.financingStatus ?? ""), rawPayload: JSON.stringify({ source: "Transition Profile", evidence: "Buyer Provided" }) }).returning())[0];
      const [current] = await db.select().from(successorTransitionProfiles).where(eq(successorTransitionProfiles.ownerUserId, user.email)).orderBy(desc(successorTransitionProfiles.updatedAt)).limit(1);
      const values = { buyerId: canonicalBuyer.id, transitionPlanId: typeof payload.transitionPlanId === "number" ? payload.transitionPlanId : null, successorType: String(payload.successorType ?? ""), experience: JSON.stringify({ operatingExperience: payload.operatingExperience ?? "", industryExperience: payload.industryExperience ?? "", managementExperience: payload.managementExperience ?? "", ownershipExperience: payload.ownershipExperience ?? "" }), operatingCapability: String(payload.operatingExperience ?? ""), industryCapability: String(payload.industryExperience ?? ""), geography: String(payload.geography ?? ""), capitalReadiness: String(payload.capitalReadiness ?? ""), financingStatus: String(payload.financingStatus ?? ""), transitionPreferences: JSON.stringify(object(payload.transitionPreferences)), continuityCommitments: JSON.stringify(object(payload.continuityCommitments)), governancePreferences: JSON.stringify(object(payload.governancePreferences)), confidentialityStatus: payload.confidentialityAcknowledged ? "Acknowledged" : "Not Started", evidenceClassification: "Buyer Provided", verificationStatus: "Submitted", updatedAt: new Date().toISOString() };
      const [profile] = current ? await db.update(successorTransitionProfiles).set(values).where(eq(successorTransitionProfiles.id, current.id)).returning() : await db.insert(successorTransitionProfiles).values({ ownerUserId: user.email, ...values }).returning();
      await audit(db, { planId: profile.transitionPlanId ?? undefined, user: user.email, role: "Buyer or Successor", eventType: "successor_profile.created", after: profile.verificationStatus, reason: "Successor transition profile saved", correlationId });
      return Response.json({ profile: successorSummary(profile), correlationId }, { status: current ? 200 : 201 });
    }
    if (!planId) return error("A Transition Plan is required.", 400, correlationId);
    const plan = await ownerPlan(db, planId, user.email); const isAdmin = user.email.toLowerCase() === adminEmail();
    if (!plan && !isAdmin) return error("This Transition Plan is not available to the current account.", 403, correlationId);
    const activePlan = plan ?? (await db.select().from(transitionPlans).where(eq(transitionPlans.id, planId)).limit(1))[0];
    if (!activePlan) return error("Transition Plan not found.", 404, correlationId);
    if (action === "save_plan") {
      const skill = skillForIndustry(String(payload.industry ?? parse<Record<string, unknown>>(activePlan.businessContext, {}).industry ?? ""));
      const [next] = await db.update(transitionPlans).set({ selectedPath: String(payload.selectedPath ?? activePlan.selectedPath ?? "") || null, alternativePaths: JSON.stringify(Array.isArray(payload.alternativePaths) ? payload.alternativePaths : parse(activePlan.alternativePaths, [])), sellerObjectives: JSON.stringify(object(payload.sellerObjectives)), sellerConstraints: JSON.stringify(object(payload.sellerConstraints)), successorContext: JSON.stringify(object(payload.successorContext)), structuralPreferences: JSON.stringify(object(payload.structuralPreferences)), confidentialityLevel: String(payload.confidentialityLevel ?? activePlan.confidentialityLevel ?? ""), verticalSkillName: skill?.skillName ?? activePlan.verticalSkillName, verticalSkillVersion: skill?.skillVersion ?? activePlan.verticalSkillVersion, verticalSourceClassification: skill?.sourceClassification ?? activePlan.verticalSourceClassification, status: "Seller Review", version: activePlan.version + 1, updatedAt: new Date().toISOString() }).where(eq(transitionPlans.id, activePlan.id)).returning();
      await audit(db, { planId: next.id, user: user.email, role: isAdmin ? "Admin" : "Seller", eventType: "seller_objectives.saved", before: activePlan.status, after: next.status, reason: "Transition Plan inputs saved", correlationId });
      return Response.json({ plan: publicPlan(next), correlationId });
    }
    if (action === "save_legacy_profile") {
      const [current] = await db.select().from(legacyProfiles).where(eq(legacyProfiles.transitionPlanId, activePlan.id)).limit(1);
      const values = { priorities: JSON.stringify(object(payload.priorities)), preferredBuyerCharacteristics: String(payload.preferredBuyerCharacteristics ?? ""), excludedBuyerCharacteristics: String(payload.excludedBuyerCharacteristics ?? ""), excludedOrganizations: String(payload.excludedOrganizations ?? ""), excludedTransactionPaths: JSON.stringify(Array.isArray(payload.excludedTransactionPaths) ? payload.excludedTransactionPaths : []), sellerApproved: payload.sellerApproved === true, evidenceClassification: "Seller Provided", status: payload.sellerApproved === true ? "Seller Approved" : "Draft", updatedAt: new Date().toISOString() };
      const [legacy] = current ? await db.update(legacyProfiles).set(values).where(eq(legacyProfiles.id, current.id)).returning() : await db.insert(legacyProfiles).values({ sellerId: activePlan.sellerId, businessId: activePlan.businessId, transitionPlanId: activePlan.id, ownerUserId: activePlan.ownerUserId, ...values }).returning();
      await audit(db, { planId: activePlan.id, user: user.email, role: "Seller", eventType: payload.sellerApproved === true ? "legacy_profile.approved" : "legacy_profile.created", after: legacy.status, reason: "Private Legacy Profile saved", correlationId });
      return Response.json({ legacyProfile: sellerLegacy(legacy), correlationId });
    }
    if (action === "generate_comparison") {
      const selectedPath = String(payload.selectedPath ?? activePlan.selectedPath ?? "") as TransitionPath;
      if (!TRANSITION_PATHS.includes(selectedPath)) return error("Select a supported transition path before generating a comparison.", 400, correlationId);
      const alternatives = Array.isArray(payload.alternativePaths) ? payload.alternativePaths.filter((value): value is TransitionPath => typeof value === "string") : parse<TransitionPath[]>(activePlan.alternativePaths, []);
      const comparison = compareTransitionPaths({ ...parse<Record<string, unknown>>(activePlan.sellerObjectives, {}), ...parse<Record<string, unknown>>(activePlan.sellerConstraints, {}), ...parse<Record<string, unknown>>(activePlan.successorContext, {}), ...parse<Record<string, unknown>>(activePlan.structuralPreferences, {}), selectedPath }, selectedPath, alternatives);
      const [row] = await db.insert(transitionPathComparisons).values({ transitionPlanId: activePlan.id, paths: JSON.stringify(comparison.results.map((result) => result.path)), comparisonDimensions: JSON.stringify(comparison.results), assumptions: JSON.stringify(["Seller-provided inputs", "Educational path-comparison method 0.1.0"]), evidenceGaps: JSON.stringify(comparison.missingInformation), hardBlockers: JSON.stringify(comparison.hardBlockers), professionalReviewFlags: JSON.stringify([...new Set(comparison.results.flatMap((result) => result.professionalReview))]) }).returning();
      await audit(db, { planId: activePlan.id, user: user.email, role: "Seller", eventType: "path_comparison.generated", after: activePlan.status, reason: "Educational path comparison generated", correlationId });
      return Response.json({ comparison: { ...row, paths: parse(row.paths, []), comparisonDimensions: parse(row.comparisonDimensions, {}), evidenceGaps: parse(row.evidenceGaps, []), hardBlockers: parse(row.hardBlockers, []) }, correlationId });
    }
    if (action === "generate_match") {
      const successorProfileId = Number(payload.successorProfileId ?? 0); const [legacy] = await db.select().from(legacyProfiles).where(eq(legacyProfiles.transitionPlanId, activePlan.id)).limit(1); const [successor] = await db.select().from(successorTransitionProfiles).where(eq(successorTransitionProfiles.id, successorProfileId)).limit(1);
      if (!legacy || !successor) return error("A Legacy Profile and successor profile are required before matching.", 409, correlationId);
      const [financing] = await db.select().from(financingRequests).where(eq(financingRequests.transitionPlanId, activePlan.id)).orderBy(desc(financingRequests.updatedAt)).limit(1);
      const business = (await db.select().from(businesses).where(eq(businesses.id, activePlan.businessId)).limit(1))[0]; const skill = skillForIndustry(business?.industry ?? "");
      const legacyInput = { ...parse<Record<string, unknown>>(legacy.priorities, {}), excludedBuyerCharacteristics: legacy.excludedBuyerCharacteristics, excludedOrganizations: legacy.excludedOrganizations };
      const successorInput = { successorType: successor.successorType, organization: "", operatingExperience: successor.operatingCapability, industryExperience: successor.industryCapability, managementExperience: parse<Record<string, unknown>>(successor.experience, {}).managementExperience, geography: successor.geography, capitalReadiness: successor.capitalReadiness, financingStatus: successor.financingStatus, ...parse<Record<string, unknown>>(successor.transitionPreferences, {}), ...parse<Record<string, unknown>>(successor.continuityCommitments, {}), ...parse<Record<string, unknown>>(successor.governancePreferences, {}), confidentialityAcknowledged: successor.confidentialityStatus === "Acknowledged" };
      const result = evaluateLegacyMatch({ legacy: legacyInput, successor: successorInput, plan: { selectedPath: activePlan.selectedPath, ...parse<Record<string, unknown>>(activePlan.businessContext, {}) }, financing: { equityGap: financing ? !String(financing.buyerEquity ?? "").trim() : true }, vertical: { licensingDependency: (skill?.riskFactors ?? []).some((risk) => /license|credential/i.test(risk)) } });
      const [match] = await db.insert(legacyMatches).values({ transitionPlanId: activePlan.id, legacyProfileId: legacy.id, successorProfileId: successor.id, buyerId: successor.buyerId, financialAlignment: result.financingBlockers.length ? "Blocked" : "Needs Review", operationalAlignment: result.dimensions["Operational capability"], legacyAlignment: result.classification, transitionAlignment: result.dimensions["Seller involvement"], industryAlignment: result.dimensions["Industry alignment"], geographicAlignment: result.dimensions["Geographic alignment"], evidenceCoverage: result.evidenceCoverage, compatiblePriorities: JSON.stringify(result.compatiblePriorities), tradeoffs: JSON.stringify(result.tradeoffs), missingInformation: JSON.stringify(result.missingInformation), softConflicts: JSON.stringify(result.softConflicts), hardBlockers: JSON.stringify(result.hardBlockers), sellerExclusionsTriggered: JSON.stringify(result.hardBlockers.filter((blocker) => blocker.includes("seller exclusion"))), financingBlockers: JSON.stringify(result.financingBlockers), confidentialityBlockers: JSON.stringify(result.confidentialityBlockers), disclosureRecommendation: result.disclosureRecommendation, methodology: JSON.stringify(result.methodology), methodologyVersion: "0.1.0", status: result.classification }).returning();
      await audit(db, { planId: activePlan.id, user: user.email, role: "Seller", eventType: result.hardBlockers.length ? "hard_blocker.detected" : "legacy_match.generated", after: result.classification, reason: "Educational Legacy Match generated; disclosure unchanged", correlationId });
      return Response.json({ match: matchSummary(match, true), correlationId });
    }
    if (action === "seller_match_action") {
      const matchId = Number(payload.matchId ?? 0); const [match] = await db.select().from(legacyMatches).where(eq(legacyMatches.id, matchId)).limit(1); if (!match || match.transitionPlanId !== activePlan.id) return error("Legacy Match not found.", 404, correlationId);
      const status = String(payload.status ?? "Seller Review Required"); const [next] = await db.update(legacyMatches).set({ status, reviewedAt: new Date().toISOString() }).where(eq(legacyMatches.id, match.id)).returning();
      await audit(db, { planId: activePlan.id, user: user.email, role: "Seller", eventType: "seller_match.reviewed", before: match.status, after: status, reason: "Match review recorded; no disclosure granted", correlationId });
      return Response.json({ match: matchSummary(next, true), correlationId });
    }
    return error("Unsupported Transition Planning action.", 400, correlationId);
  } catch { return error("The Transition Planning action could not be completed. No disclosure, approval, or transaction decision was made.", 503, correlationId); }
}
