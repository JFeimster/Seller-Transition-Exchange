export const TRANSITION_PATHS = [
  "External Third-Party Sale", "Strategic Buyer", "Competitor Buyer", "Self-Funded Acquisition Entrepreneur",
  "Management Buyout", "Partner Buyout", "Family Succession", "Employee Ownership", "Partial Sale",
  "Seller-Financed Gradual Transition", "Rollover Equity", "Recapitalization", "Identified Buyer Transaction", "Hybrid Transition",
] as const;

export type TransitionPath = typeof TRANSITION_PATHS[number];
export type PathClassification = "Strong Preliminary Alignment" | "Possible Alignment" | "Needs More Information" | "Material Tradeoffs" | "Weak Alignment" | "Blocked by Hard Conflict";
export type MatchClassification = "Strong Preliminary Compatibility" | "Potential Compatibility" | "Needs More Information" | "Material Legacy Tradeoffs" | "Weak Compatibility" | "Blocked by Hard Conflict";

export const PATH_GUIDANCE: Record<TransitionPath, { prerequisite: string; review: string[]; workspace: string; resources: string[] }> = {
  "External Third-Party Sale": { prerequisite: "Seller objectives, a prepared business record, and buyer qualification", review: ["Transaction attorney", "CPA", "Valuation professional", "Transaction advisor"], workspace: "External Sale", resources: ["preparing-to-sell-your-business", "confidential-business-sales", "choosing-transaction-advisors"] },
  "Strategic Buyer": { prerequisite: "Strategic fit with seller-controlled confidentiality and concentration review", review: ["Transaction attorney", "CPA", "Transaction advisor"], workspace: "External Sale", resources: ["confidential-business-sales", "preparing-employees-and-customers"] },
  "Competitor Buyer": { prerequisite: "A controlled disclosure perimeter and explicit seller exclusions", review: ["Transaction attorney", "Transaction advisor", "CPA"], workspace: "External Sale", resources: ["confidential-business-sales", "choosing-transaction-advisors"] },
  "Self-Funded Acquisition Entrepreneur": { prerequisite: "Qualified operating profile, declared capital position, and controlled disclosure", review: ["Transaction attorney", "CPA", "Financing advisor"], workspace: "External Sale", resources: ["sba-acquisition-financing", "organizing-financial-records"] },
  "Management Buyout": { prerequisite: "Capable management team, defined ownership, and explicit equity analysis", review: ["Transaction attorney", "CPA", "Financing advisor", "Governance advisor"], workspace: "Management Buyout", resources: ["management-buyouts", "seller-financing"] },
  "Partner Buyout": { prerequisite: "An operating agreement review, ownership framework, and capital plan", review: ["Transaction attorney", "CPA", "Valuation professional"], workspace: "Partner Buyout", resources: ["partner-buyouts", "seller-financing"] },
  "Family Succession": { prerequisite: "Interested successor, governance preparation, seller income planning, and professional review", review: ["Estate-planning attorney", "Tax advisor", "CPA", "Governance advisor"], workspace: "Family Succession", resources: ["family-succession", "preparing-employees-and-customers"] },
  "Employee Ownership": { prerequisite: "Employee-group readiness, governance work, and specialist review", review: ["Employee-ownership specialist", "Transaction attorney", "CPA"], workspace: "Employee Ownership", resources: ["management-buyouts", "preparing-employees-and-customers"] },
  "Partial Sale": { prerequisite: "Divisible control, retained-rights design, and future-liquidity review", review: ["Transaction attorney", "Tax advisor", "Valuation professional"], workspace: "Partial Sale and Rollover", resources: ["understanding-business-valuation", "choosing-transaction-advisors"] },
  "Seller-Financed Gradual Transition": { prerequisite: "Seller risk tolerance, buyer qualification, proposed payment security, and capital review", review: ["Transaction attorney", "Tax advisor", "Financing advisor"], workspace: "Seller-Financed Transition", resources: ["seller-financing", "sba-acquisition-financing"] },
  "Rollover Equity": { prerequisite: "Compatible control rights, rollover terms, and future-liquidity review", review: ["Transaction attorney", "Tax advisor", "Valuation professional"], workspace: "Partial Sale and Rollover", resources: ["understanding-business-valuation", "choosing-transaction-advisors"] },
  "Recapitalization": { prerequisite: "Clear objective, supportable cash-flow evidence, and control design", review: ["Transaction attorney", "CPA", "Financing advisor"], workspace: "Partial Sale and Rollover", resources: ["organizing-financial-records", "understanding-business-valuation"] },
  "Identified Buyer Transaction": { prerequisite: "Documented buyer profile, defined disclosure scope, and transaction structure", review: ["Transaction attorney", "CPA", "Financing advisor"], workspace: "External Sale", resources: ["confidential-business-sales", "seller-financing"] },
  "Hybrid Transition": { prerequisite: "Explicit combination of ownership, control, financing, and continuity decisions", review: ["Transaction attorney", "CPA", "Governance advisor", "Financing advisor"], workspace: "Hybrid Planning", resources: ["preparing-to-sell-your-business", "choosing-transaction-advisors"] },
};

export const advisorCategories = ["Transaction attorney", "CPA", "Tax advisor", "Valuation professional", "Business broker", "M&A advisor", "SBA lender", "Commercial lender", "Estate-planning attorney", "Wealth advisor", "Insurance professional", "Employee-ownership specialist", "Governance advisor", "HR advisor", "Industry advisor"];

type RecordInput = Record<string, unknown>;
const has = (input: RecordInput, key: string) => String(input[key] ?? "").trim().length > 0;
const bool = (input: RecordInput, key: string) => input[key] === true || String(input[key] ?? "").toLowerCase() === "yes";
const includes = (value: unknown, phrase: string) => String(value ?? "").toLowerCase().includes(phrase.toLowerCase());

export function compareTransitionPaths(input: RecordInput, selected: TransitionPath, alternatives: TransitionPath[]) {
  const all = [selected, ...alternatives.filter((path) => path !== selected)];
  const hardBlockers: string[] = [];
  const missing = [
    !has(input, "desiredTimeline") && "Desired transition timeline",
    !has(input, "postCloseRole") && "Desired post-close role",
    !has(input, "riskTolerance") && "Seller risk tolerance",
    !has(input, "confidentialityLevel") && "Confidentiality level",
  ].filter(Boolean) as string[];
  if (bool(input, "confidentialityFailure")) hardBlockers.push("Current confidentiality requirement is not satisfied.");
  if (bool(input, "restrictedBuyer")) hardBlockers.push("Buyer or successor status is restricted.");
  if (bool(input, "prohibitedGeography")) hardBlockers.push("The proposed geography conflicts with a seller constraint.");
  const results = all.map((path) => {
    const tradeoffs: string[] = [];
    const localMissing = [...missing];
    const guidance = PATH_GUIDANCE[path];
    if (["Management Buyout", "Partner Buyout", "Family Succession", "Employee Ownership"].includes(path) && !has(input, "successorInterest")) localMissing.push("Successor or participant interest");
    if (["Management Buyout", "Partner Buyout", "Family Succession", "Employee Ownership", "Seller-Financed Gradual Transition"].includes(path) && !has(input, "buyerEquity")) tradeoffs.push("Buyer or successor equity remains unprovided or incomplete.");
    if (["Partial Sale", "Rollover Equity", "Recapitalization"].includes(path) && !has(input, "governancePreference")) tradeoffs.push("Governance and retained-rights preferences need definition.");
    if (path === "Family Succession" && !has(input, "familyGovernance")) localMissing.push("Family governance, seller income needs, and professional review");
    if (path === "Employee Ownership") tradeoffs.push("Employee ownership requires structure-specific professional review.");
    if (path === "Competitor Buyer" || path === "Strategic Buyer") tradeoffs.push("Confidentiality and concentration review may be material.");
    const blockers = [...hardBlockers];
    if (path === "Management Buyout" && bool(input, "managementEquityGap")) blockers.push("Management equity gap requires financing review; seller financing is distinct from buyer equity.");
    if (path === "Family Succession" && bool(input, "familyHardConflict")) blockers.push("A documented family or governance conflict requires professional review before advancement.");
    const classification: PathClassification = blockers.length ? "Blocked by Hard Conflict" : localMissing.length >= 3 ? "Needs More Information" : tradeoffs.length >= 2 ? "Material Tradeoffs" : localMissing.length ? "Possible Alignment" : "Strong Preliminary Alignment";
    return { path, classification, prerequisite: guidance.prerequisite, professionalReview: guidance.review, tradeoffs, missingInformation: localMissing, hardBlockers: blockers, financingConsiderations: ["Buyer equity, seller financing, working capital, and debt remain separate inputs.", "Capital Desk review is educational and does not issue approval."], confidentialityConsiderations: ["Seller-approved disclosure scope remains controlling.", "A path comparison never expands Quiet Exit access."], verticalConsiderations: ["Apply the selected industry Skill overlay as Inferred guidance until company evidence is reviewed."] };
  });
  return { methodology: { classification: "educational_path_comparison", version: "0.1.0", generatedAt: new Date().toISOString() }, selectedPath: selected, results, missingInformation: missing, hardBlockers };
}

export function evaluateLegacyMatch(input: { legacy: RecordInput; successor: RecordInput; plan: RecordInput; financing?: RecordInput; vertical?: RecordInput }) {
  const compatible: string[] = [];
  const tradeoffs: string[] = [];
  const missing: string[] = [];
  const softConflicts: string[] = [];
  const hardBlockers: string[] = [];
  const financeBlockers: string[] = [];
  const confidentialityBlockers: string[] = [];
  const legacy = input.legacy;
  const successor = input.successor;
  const plan = input.plan;
  const financing = input.financing ?? {};
  const dimensions: Record<string, string> = {};
  const evidenceFields = ["successorType", "operatingExperience", "industryExperience", "geography", "financingStatus", "confidentialityAcknowledged"];
  const answered = evidenceFields.filter((field) => has(successor, field)).length;
  const classify = (name: string, condition: boolean, absent: string) => { if (!has(successor, absent)) { dimensions[name] = "Needs More Information"; missing.push(`${name} evidence`); } else if (condition) { dimensions[name] = "Preliminary alignment"; compatible.push(name); } else { dimensions[name] = "Material tradeoff"; tradeoffs.push(name); } };
  classify("Operational capability", has(successor, "operatingExperience") || has(successor, "managementExperience"), "operatingExperience");
  classify("Industry alignment", !has(plan, "industry") || includes(successor.industryExperience, String(plan.industry)), "industryExperience");
  classify("Geographic alignment", !has(legacy, "geographicCommitment") || includes(successor.geography, String(legacy.geographicCommitment)), "geography");
  classify("Seller involvement", !has(legacy, "sellerInvolvementPreference") || includes(successor.sellerTransitionExpectations, String(legacy.sellerInvolvementPreference)), "sellerTransitionExpectations");
  classify("Employee continuity", !bool(legacy, "employeeRetentionPriority") || bool(successor, "employeeCommitment"), "employeeCommitment");
  classify("Brand continuity", !bool(legacy, "brandContinuityPriority") || bool(successor, "brandCommitment"), "brandCommitment");
  classify("Community alignment", !bool(legacy, "communityCommitment") || bool(successor, "communityCommitment"), "communityCommitment");
  classify("Ownership horizon", !has(legacy, "ownershipHorizonPreference") || includes(successor.ownershipHorizon, String(legacy.ownershipHorizonPreference)), "ownershipHorizon");
  classify("Governance alignment", !has(legacy, "governancePreference") || includes(successor.governancePreference, String(legacy.governancePreference)), "governancePreference");
  dimensions["Confidentiality alignment"] = bool(successor, "confidentialityAcknowledged") ? "Acknowledged" : "Blocked";
  if (!bool(successor, "confidentialityAcknowledged")) confidentialityBlockers.push("Buyer or successor confidentiality acknowledgment is incomplete.");
  const excludedOrganizations = String(legacy.excludedOrganizations ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (excludedOrganizations.some((organization) => organization.toLowerCase() === String(successor.organization ?? "").trim().toLowerCase())) hardBlockers.push("A private seller exclusion is triggered.");
  if (has(legacy, "excludedBuyerCharacteristics") && has(successor, "successorType") && includes(legacy.excludedBuyerCharacteristics, String(successor.successorType))) hardBlockers.push("A private seller buyer-characteristic exclusion is triggered.");
  if (has(plan, "selectedPath") && has(successor, "desiredTransactionPath") && !includes(successor.desiredTransactionPath, String(plan.selectedPath))) softConflicts.push("Desired transaction path differs from the current seller plan.");
  if (!has(successor, "capitalReadiness") || includes(successor.capitalReadiness, "not provided") || includes(successor.financingStatus, "unsupported")) financeBlockers.push("Capital readiness or financing status is incomplete or unsupported.");
  if (bool(financing, "equityGap")) financeBlockers.push("Buyer equity gap remains explicit; a seller note is not buyer equity.");
  if (bool(input.vertical ?? {}, "licensingDependency") && !bool(successor, "licenseCapability")) hardBlockers.push("Industry overlay identifies a licensing or capability question requiring current jurisdiction review.");
  const allBlockers = [...hardBlockers, ...financeBlockers, ...confidentialityBlockers];
  const classification: MatchClassification = allBlockers.length ? "Blocked by Hard Conflict" : missing.length >= 4 ? "Needs More Information" : tradeoffs.length >= 3 || softConflicts.length ? "Material Legacy Tradeoffs" : compatible.length >= 5 ? "Strong Preliminary Compatibility" : compatible.length ? "Potential Compatibility" : "Weak Compatibility";
  return { methodology: { classification: "educational_legacy_matching", version: "0.1.0", generatedAt: new Date().toISOString() }, classification, dimensions, evidenceCoverage: `${answered}/${evidenceFields.length} transition-profile fields`, compatiblePriorities: compatible, tradeoffs, missingInformation: [...new Set(missing)], softConflicts, hardBlockers, financingBlockers: financeBlockers, confidentialityBlockers, disclosureRecommendation: allBlockers.length ? "Do not advance disclosure automatically. Seller review and applicable admin or policy approval remain required." : "Seller review required before any disclosure decision. This match is not buyer approval or closing ability." };
}

export const transitionDisclaimer = "Transition-path and legacy-match outputs are preliminary educational planning aids. They are not legal, tax, estate-planning, valuation, financing, fiduciary, employment, governance, or transaction advice, and they do not approve a buyer, successor, disclosure, or closing.";
