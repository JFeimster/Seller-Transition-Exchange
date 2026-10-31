export const MATERIAL_TYPES = [
  "Public Listing", "Anonymous Teaser", "Business Overview", "Investment Highlights",
  "Seller Transition Narrative", "Buyer FAQ", "Desired Buyer Profile", "Confidentiality Plan",
  "Required Document Checklist", "Financing Summary", "Seller Note Scenario", "Deal Room Index",
  "Transition Options Report", "Path Comparison", "Legacy Profile Summary", "Buyer or Successor Profile",
  "Management Buyout Brief", "Partner Buyout Brief", "Family Succession Brief", "Employee Ownership Brief",
  "External Sale Brief", "Partial Sale Brief", "Rollover Equity Brief", "Seller-Financed Transition Brief",
  "Seller Continuity Statement", "Employee Continuity Plan", "Customer Transition Plan", "Advisor Brief", "Transition Timeline",
] as const;

export type MaterialType = typeof MATERIAL_TYPES[number];
type RecordInput = Record<string, unknown>;

const IDENTIFIER_FIELDS = ["legalName", "publicName", "website", "exactAddress", "ownerName", "email", "phone", "licenses", "customers", "employees"];
const UNSUPPORTED_PATTERNS = [
  /market leader/i, /guaranteed/i, /risk[- ]free/i, /turnkey/i, /pre[- ]approved/i,
  /best[- ]in[- ]class/i, /proven buyer demand/i, /certain to close/i,
];

const value = (record: RecordInput, field: string) => {
  const found = record[field];
  return typeof found === "string" && found.trim() ? found.trim() : null;
};

export function detectUnsupportedClaims(content: string) {
  return UNSUPPORTED_PATTERNS.filter((pattern) => pattern.test(content)).map((pattern) => `Unsupported phrase: ${pattern.source.replaceAll("\\", "")}`);
}

export function reviewMaterialConfidentiality(content: string, visibility: string, business: RecordInput) {
  const detected = IDENTIFIER_FIELDS.filter((field) => {
    const candidate = value(business, field);
    return Boolean(candidate && candidate.length > 2 && content.toLowerCase().includes(candidate.toLowerCase()));
  });
  const restricted = ["Anonymous Teaser", "Verified-Buyer Only", "Private Mandate", "Invite-Only Opportunity", "Coming to Market"].includes(visibility);
  return {
    classification: restricted && detected.length ? "Blocked" : detected.length ? "Needs Review" : "Ready for Review",
    detectedIdentifiers: detected,
    reviewRequired: true,
    boundary: "Visibility and disclosure approvals remain separate from material approval.",
  };
}

export function buildGeneratedMaterial(input: {
  materialType: MaterialType; seller: RecordInput; business: RecordInput; visibility: string;
  sourceEntityIds: RecordInput; sourceVersions: RecordInput; audience?: string;
}) {
  const anonymous = ["Anonymous Teaser", "Verified-Buyer Only", "Private Mandate", "Invite-Only Opportunity", "Coming to Market"].includes(input.visibility);
  const name = anonymous ? value(input.business, "anonymousName") : value(input.business, "publicName") ?? value(input.business, "legalName");
  const facts = [
    ["Industry", value(input.business, "industry")], ["Subindustry", value(input.business, "subindustry")],
    ["Broad geography", value(input.business, "geography")], ["Revenue range", value(input.business, "revenueRange")],
    ["SDE range", value(input.business, "sdeRange")], ["EBITDA range", value(input.business, "ebitdaRange")],
    ["Recurring revenue", value(input.business, "recurringRevenuePercentage")], ["Owner role", value(input.business, "ownerRole")],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const claimManifest = facts.map(([label, fact], index) => ({
    claimId: `claim-${index + 1}`, claim: `${label}: ${fact}`, sourceEntity: "Business",
    fieldPath: label.toLowerCase().replaceAll(" ", "_"), sourceVersion: input.sourceVersions.business ?? 1,
    verificationClass: "Seller Provided", asOfDate: new Date().toISOString(), transformationNote: "Rendered without changing the seller-provided value.",
  }));
  const sections = facts.length ? facts.map(([label, fact]) => `**${label}:** ${fact}`).join("  \n") : "No business facts are available for this section yet.";
  const title = name ?? (anonymous ? "Confidential business opportunity" : "Business transition material");
  const content = `# ${input.materialType}\n\n**DRAFT — SELLER AND ADMIN REVIEW REQUIRED**\n\n## ${title}\n\n${sections}\n\n## Transition context\n${value(input.seller, "transitionGoal") ?? "Transition objective remains to be supplied."}\n\n## Operating boundary\nThis draft uses canonical seller and business records. Missing facts remain missing. Disclosure, legal, tax, valuation, financing, and transaction conclusions require their own review.\n`;
  return {
    title: `${input.materialType} · ${title}`, content, claimManifest,
    unsupportedClaims: detectUnsupportedClaims(content),
    confidentialityReview: reviewMaterialConfidentiality(content, input.visibility, input.business),
    sourceEntityIds: input.sourceEntityIds, sourceVersions: input.sourceVersions,
    audience: input.audience ?? "Seller Only", visibilityLevel: input.visibility,
  };
}

export function materialGate(input: { unsupportedClaims: string[]; confidentialityReview: { classification: string }; sellerApproval: string; adminApproval: string }) {
  if (input.unsupportedClaims.length) return { ready: false, status: "Revision Requested", reason: "Unsupported claims require revision." };
  if (input.confidentialityReview.classification === "Blocked") return { ready: false, status: "Revision Requested", reason: "The material exceeds its confidentiality scope." };
  if (input.sellerApproval !== "Approved") return { ready: false, status: "Seller Review", reason: "Seller approval is required." };
  if (input.adminApproval !== "Approved") return { ready: false, status: "Admin Review", reason: "Admin approval is required." };
  return { ready: true, status: "Ready for Use", reason: "Seller and admin review gates are complete." };
}

export function sourceVersionsChanged(saved: RecordInput, current: RecordInput) {
  return Object.entries(saved).some(([key, version]) => current[key] !== version);
}

export const launchStudioBoundary = "Generated materials are editable drafts. Seller and admin approval are separate; neither replaces legal, tax, valuation, financing, licensing, brokerage, or transaction review.";
