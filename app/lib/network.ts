export const NETWORK_BUYER_TYPES = ["Self-Funded Searcher", "Acquisition Entrepreneur", "Independent Sponsor", "Strategic Buyer", "Management Team", "Partner Successor", "Family Successor", "Employee Group", "Institutional Buyer"] as const;
export const ADVISOR_CATEGORIES = ["Transaction Attorney", "Business Attorney", "CPA", "Tax Advisor", "Business Broker", "M&A Advisor", "Investment Banker", "Valuation Professional", "Quality-of-Earnings Provider", "SBA Lender", "Commercial Lender", "Acquisition Financing Advisor", "Wealth Advisor", "Estate-Planning Attorney", "Insurance Professional", "Exit Planner", "Employee-Ownership Specialist", "Human Resources Advisor", "Governance Advisor", "Technology Advisor", "Digital-Business Advisor", "Industry Specialist", "Real Estate Advisor", "Environmental Advisor", "Licensing or Regulatory Advisor"] as const;
export const REGIONAL_MARKETS = [
  ["washington-dc", "Washington, D.C."], ["northern-virginia", "Northern Virginia"], ["alexandria", "Alexandria"], ["arlington", "Arlington"], ["fairfax", "Fairfax"], ["maryland", "Maryland"], ["baltimore", "Baltimore"], ["richmond", "Richmond"],
] as const;
export const EVENT_TYPES = ["Seller Education Session", "Buyer Briefing", "Advisor Roundtable", "Industry Transition Workshop", "Change-of-Ownership Clinic", "Financing Readiness Workshop", "Quiet Exit Briefing", "Family Succession Session", "Management Buyout Workshop", "Digital Business Transition Session", "Regional Networking Session", "Office Hours"] as const;

export type NetworkRecord = Record<string, unknown>;
export const parseJson = <T>(value: unknown, fallback: T): T => { if (typeof value === "object" && value !== null) return value as T; if (typeof value !== "string") return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } };

export function publicBuyer(row: NetworkRecord) {
  const raw = parseJson<NetworkRecord>(row.rawPayload, {}); const visibility = String(raw.publicVisibility ?? row.publicVisibility ?? ""); const status = String(row.verificationStatus ?? "Profile Incomplete");
  if (visibility !== "Public Buyer Profile" || status !== "Verified") return null;
  return { id: row.id, displayName: raw.publicDisplayName ?? "Approved buyer profile", buyerType: row.buyerType, geography: raw.geography ?? "Broad geography not provided", industries: raw.industries ?? [], transactionSizeRange: raw.transactionSizeRange ?? "Not provided", operatingExperience: raw.operatingExperience ?? "Not provided", acquisitionExperience: raw.acquisitionExperience ?? "Not provided", transitionPaths: raw.transitionPaths ?? [], legacyPriorities: raw.legacyPriorities ?? [], verificationStatus: status, lastReviewed: row.updatedAt, sourceClassification: status === "Verified" ? "Buyer Provided · Reviewed" : "Buyer Provided" };
}

export function publicAdvisor(row: NetworkRecord) {
  if (!row.publicVisibility || !["Verified", "Verified with Limitations"].includes(String(row.verificationStatus))) return null;
  return { id: row.id, displayName: row.publicDisplayName ?? "Advisor profile", firmName: row.firmName ?? "Not provided", category: row.primaryCategory ?? "Not provided", additionalCategories: parseJson(row.additionalCategories, []), publicBio: row.publicBio ?? "Public biography not provided.", geographies: parseJson(row.geographies, []), industries: parseJson(row.industries, []), transitionPaths: parseJson(row.transitionPaths, []), services: parseJson(row.services, []), verificationStatus: row.verificationStatus, sponsoredStatus: row.sponsoredStatus ?? "Not Sponsored", lastVerified: row.lastVerified ?? "Not documented", confidence: row.confidence ?? "Missing", introductionAvailability: row.introductionAvailability ?? "Request Review", source: row.source ?? "Advisor Submitted" };
}

export function matchAdvisor(criteria: NetworkRecord, advisor: NetworkRecord) {
  const reasons: string[] = []; const missing: string[] = []; const conflicts: string[] = []; const list = (v: unknown) => parseJson<string[]>(v, []).map((item) => item.toLowerCase());
  const category = String(criteria.category ?? "").toLowerCase(); const industry = String(criteria.industry ?? "").toLowerCase(); const geography = String(criteria.geography ?? "").toLowerCase();
  if (category && String(advisor.primaryCategory ?? "").toLowerCase() === category) reasons.push("Advisor category aligns"); else if (category) missing.push("Advisor category alignment");
  if (industry && list(advisor.industries).some((item) => item.includes(industry))) reasons.push("Industry overlay aligns"); else if (industry) missing.push("Industry evidence");
  if (geography && list(advisor.geographies).some((item) => item.includes(geography))) reasons.push("Broad geography aligns"); else if (geography) missing.push("Geographic coverage");
  if (String(advisor.sponsoredStatus) === "Sponsored") reasons.push("Sponsored placement · separate from verification");
  return { classification: conflicts.length ? "Blocked by Conflict" : reasons.length >= 2 ? "Preliminary Alignment" : "Needs More Information", reasons, missing, conflicts, evidenceCoverage: reasons.length ? "Documented profile fields" : "Missing", nextAction: "Seller or admin review required before introduction" };
}

export const networkBoundary = "Network profiles and match outputs are evidence-aware preparation records. Verification, sponsorship, introduction approval, financing routing, professional engagement, meeting delivery, and closing ability remain separate decisions.";
