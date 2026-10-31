export const FINANCING_STATUSES = [
  "Not Started", "In Progress", "Needs Information", "Needs Review", "Ready",
  "Approved", "Active", "Paused", "Completed", "Archived", "Blocked",
] as const;
export type FinancingStatus = (typeof FINANCING_STATUSES)[number];

export const TRANSACTION_PATHS = [
  "External sale", "Management buyout", "Partner buyout", "Family succession",
  "Employee ownership", "Partial sale", "Seller-financed transition", "Rollover equity",
] as const;
export type TransactionPath = (typeof TRANSACTION_PATHS)[number];

export const SCENARIO_TYPES = [
  "Buyer equity + acquisition debt", "Buyer equity + seller note",
  "Acquisition debt + working capital", "Senior debt + seller note + rollover",
  "Management buyout", "Partner buyout", "Family succession", "Employee ownership",
  "Partial sale + rollover", "Earnout-supported structure", "Seller-financed transition",
  "Digital business educational structure",
] as const;

export type FinancingEvidence = "Verified" | "Seller Provided" | "Buyer Provided" | "Advisor Submitted" | "Inferred" | "Stale" | "Conflicting" | "Missing" | "Demo";
export type FinancingInput = { key: string; label: string; value?: number | string | null; evidence?: FinancingEvidence; required?: boolean };

export const financingDisclaimer = "Preliminary educational financing analysis only. This is not a financing approval, commitment, rate quote, eligibility decision, valuation, legal advice, tax advice, or guarantee of closing.";

const numeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export function normalizeFinancingInputs(input: Record<string, unknown>) {
  const numericKeys = ["purchasePrice", "buyerEquity", "acquisitionDebt", "sellerNote", "rolloverEquity", "earnout", "workingCapital", "equipment", "realEstate", "closingCosts", "professionalFees", "transitionCosts", "technology", "deferredMaintenance", "contingency", "refinance", "annualCashFlow", "sellerNoteRate", "sellerNoteAmortization", "sellerNoteMaturity"];
  const normalized: Record<string, unknown> = { ...input };
  for (const key of numericKeys) normalized[key] = numeric(input[key]);
  return normalized;
}

export function calculateSourcesUses(input: Record<string, unknown>) {
  const v = normalizeFinancingInputs(input);
  const sources = {
    buyerEquity: Number(v.buyerEquity ?? 0), acquisitionDebt: Number(v.acquisitionDebt ?? 0), sellerNote: Number(v.sellerNote ?? 0),
    rolloverEquity: Number(v.rolloverEquity ?? 0), earnout: Number(v.earnout ?? 0),
  };
  const uses = {
    purchasePrice: Number(v.purchasePrice ?? 0), workingCapital: Number(v.workingCapital ?? 0), equipment: Number(v.equipment ?? 0),
    realEstate: Number(v.realEstate ?? 0), closingCosts: Number(v.closingCosts ?? 0), professionalFees: Number(v.professionalFees ?? 0),
    transitionCosts: Number(v.transitionCosts ?? 0), technology: Number(v.technology ?? 0), deferredMaintenance: Number(v.deferredMaintenance ?? 0),
    contingency: Number(v.contingency ?? 0), refinance: Number(v.refinance ?? 0),
  };
  const sourceTotal = Object.values(sources).reduce((a, b) => a + b, 0);
  const useTotal = Object.values(uses).reduce((a, b) => a + b, 0);
  const gap = sourceTotal - useTotal;
  const missingInputs = ["purchasePrice", "buyerEquity"].filter((key) => v[key] === null);
  return { sources, uses, sourceTotal, useTotal, gap, balanced: Math.abs(gap) < 0.01, missingInputs, evidenceGaps: Object.entries(input).filter(([, value]) => value && typeof value === "object" && (value as { evidence?: string }).evidence === "Missing").map(([key]) => key) };
}

export function calculateEquityAnalysis(input: Record<string, unknown>) {
  const v = normalizeFinancingInputs(input);
  const totalUses = calculateSourcesUses(v).useTotal;
  const buyerEquity = Number(v.buyerEquity ?? 0);
  const gap = Math.max(0, totalUses - buyerEquity - Number(v.acquisitionDebt ?? 0) - Number(v.sellerNote ?? 0) - Number(v.rolloverEquity ?? 0) - Number(v.earnout ?? 0));
  return {
    totalUses, buyerEquity, buyerEquityPercent: totalUses ? Math.round((buyerEquity / totalUses) * 1000) / 10 : null,
    sellerNoteDistinct: Number(v.sellerNote ?? 0), remainingCapitalNeed: gap, buyerEquityGap: gap > 0,
    workingCapitalGap: v.workingCapital === null, equipmentGap: v.equipment === null, contingencyGap: v.contingency === null,
    note: "Buyer equity is analyzed separately from seller financing; neither is treated as a lender requirement.",
  };
}

export function classifyReadiness(input: Record<string, unknown>) {
  const required = ["purchasePrice", "buyerEquity", "annualCashFlow", "workingCapital"];
  const present = required.filter((key) => numeric(input[key]) !== null);
  const missingComponents = required.filter((key) => numeric(input[key]) === null);
  const conflicts = Array.isArray(input.conflicts) ? input.conflicts.map(String) : [];
  const evidenceCoverage = Math.round((present.length / required.length) * 100);
  const gap = calculateSourcesUses(input).gap;
  const hardBlockers = [...(gap < 0 ? ["Sources do not cover stated uses"] : []), ...conflicts];
  let classification: string = "Early Preparation";
  if (!present.length) classification = "Incomplete";
  else if (missingComponents.length) classification = "Needs More Information";
  else if (hardBlockers.length) classification = "Structure Requires Revision";
  else if (calculateEquityAnalysis(input).buyerEquityGap) classification = "Buyer Equity Gap";
  else if (evidenceCoverage >= 100) classification = "Preliminary Review Possible";
  const score = Math.min(100, Math.round((present.length / required.length) * 70 + (hardBlockers.length ? 0 : 30)));
  return {
    totalScore: score, classification, hardBlockers, missingComponents, evidenceCoverage,
    evidenceClassification: conflicts.length ? "Conflicting" : present.length === required.length ? "Seller Provided" : "Missing",
    methodology: { scoring_method: "financing-readiness-evidence-coverage", scoring_version: "0.1.0", approved_for: "educational-financing-readiness", approved_by: null, last_methodology_review: null, evidence_coverage: evidenceCoverage, missing_components: missingComponents, manual_overrides: [], application_state: "Preliminary", generated_at: new Date().toISOString() },
    disclaimer: financingDisclaimer,
    decision: "No lender decision is produced.",
  };
}

export function calculateSellerNoteIllustration(input: Record<string, unknown>) {
  const principal = numeric(input.sellerNote); const rate = numeric(input.sellerNoteRate); const months = numeric(input.sellerNoteAmortization);
  if (principal === null || rate === null || months === null || principal <= 0 || months <= 0) return { modeled: false, label: "Not modeled", reason: "Enter a proposed principal, interest rate, and amortization term to illustrate payments. No terms were inferred." };
  const monthlyRate = rate / 100 / 12; const payment = monthlyRate ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)) : principal / months;
  return { modeled: true, principal, annualRate: rate, amortizationMonths: months, estimatedMonthlyPayment: Math.round(payment * 100) / 100, label: "Proposed educational illustration", disclaimer: "Seller-note terms require seller, buyer, legal, tax, and professional review." };
}

export function buildCapitalScenarios(input: Record<string, unknown>) {
  const names = [...SCENARIO_TYPES];
  return names.map((name, index) => ({ id: `scenario-${index + 1}`, name, status: "Preliminary", sourcesUses: calculateSourcesUses(input), assumptions: ["Uses reflect only supplied inputs", "No lender terms or eligibility inferred"], risks: ["Evidence and recipient criteria require review"], nextAction: index === 0 ? "Complete the financing intake" : "Compare this structure with a qualified professional", disclaimer: financingDisclaimer }));
}

export function evaluatePartnerRouting(input: { partners: Array<{ name?: string; status?: string; criteria?: string[] }>; request: Record<string, unknown>; consent?: boolean }) {
  const eligible = input.partners.filter((partner) => partner.status === "Verified" && Array.isArray(partner.criteria) && partner.criteria.length > 0);
  if (!input.consent) return { status: "Needs Review", message: "Requester consent and an approved data scope are required before routing.", partners: [] };
  if (!eligible.length) return { status: "No Supported Route", message: "No supported route identified from currently verified partner criteria.", partners: [] };
  return { status: "Preliminary Review Possible", message: "Potential routes require partner-side review; no approval or acceptance is implied.", partners: eligible.map((partner) => ({ name: partner.name ?? "Verified funding partner", criteria: partner.criteria })) };
}

export function quietExitFinancingScope(input: { isNative: boolean; sellerAuthorized: boolean; approvedDisclosure: boolean; buyerQualified: boolean; fields: Record<string, unknown> }) {
  const allowed = input.isNative && input.sellerAuthorized && input.approvedDisclosure && input.buyerQualified;
  const safeFields = allowed ? Object.fromEntries(Object.entries(input.fields).filter(([key]) => ["purchasePrice", "workingCapital", "equipment", "transactionPath", "buyerEquity", "sellerNote", "desiredClosingDate"].includes(key))) : {};
  return { allowed, fields: safeFields, message: allowed ? "Financing review uses the approved disclosure scope and does not expand it." : "Financing review is unavailable until the native seller, buyer qualification, and disclosure gates are complete." };
}

export function buildCapitalDeskPackage(input: { requestId: string | number; sourcesUses: unknown; readiness: unknown; scenarios: unknown; documents: string[] }) {
  return { version: 1, status: "Draft · Requires seller and professional review", requestId: String(input.requestId), sourceLineage: ["Canonical Seller", "Canonical Business", "Financing Request", "Financing Readiness Review"], contents: { sourcesUses: input.sourcesUses, readiness: input.readiness, scenarios: input.scenarios, documentChecklist: input.documents }, generatedAt: new Date().toISOString(), disclaimer: financingDisclaimer };
}
