export const quietExitLevels = [
  "Anonymous Teaser",
  "Verified-Buyer Only",
  "Private Mandate",
  "Invite-Only Opportunity",
  "Coming to Market",
] as const;

export type QuietExitLevel = (typeof quietExitLevels)[number];
export type RiskLevel = "Low" | "Moderate" | "High" | "Blocked";

export type QuietExitProfile = {
  generalIndustry?: string;
  broadRegion?: string;
  revenueRange?: string;
  earningsRange?: string;
  employeeRange?: string;
  revenueModel?: string;
  strengths?: string;
  growthOpportunities?: string;
  transitionPreference?: string;
  narrative?: string;
};

export type QuietExitIdentifiers = {
  legalBusinessName?: string;
  tradeName?: string;
  sellerName?: string;
  exactAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  licenseNumbers?: string;
  namedCustomers?: string;
  namedEmployees?: string;
  searchableAwards?: string;
  uniquePhrases?: string;
  exactServiceTerritory?: string;
};

export type RiskFinding = {
  field: keyof QuietExitProfile | "metadata";
  category: string;
  severity: RiskLevel;
  message: string;
};

export type TeaserReview = {
  publicDraft: QuietExitProfile;
  findings: RiskFinding[];
  redactionLog: Array<{ field: string; category: string; action: string }>;
  riskLevel: RiskLevel;
  publicationBlocked: boolean;
};

const profileKeys: Array<keyof QuietExitProfile> = [
  "generalIndustry", "broadRegion", "revenueRange", "earningsRange", "employeeRange",
  "revenueModel", "strengths", "growthOpportunities", "transitionPreference", "narrative",
];

function normalizedValues(identifiers: QuietExitIdentifiers) {
  return Object.entries(identifiers)
    .flatMap(([category, raw]) => String(raw ?? "").split(/[\n,;]+/).map((value) => ({ category, value: value.trim() })))
    .filter(({ value }) => value.length >= 3)
    .sort((a, b) => b.value.length - a.value.length);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function reviewAnonymousTeaser(profile: QuietExitProfile, identifiers: QuietExitIdentifiers): TeaserReview {
  const publicDraft: QuietExitProfile = {};
  const findings: RiskFinding[] = [];
  const redactionLog: TeaserReview["redactionLog"] = [];
  const known = normalizedValues(identifiers);

  for (const key of profileKeys) {
    let value = String(profile[key] ?? "").trim();
    if (!value) continue;

    for (const identifier of known) {
      const pattern = new RegExp(escapeRegExp(identifier.value), "gi");
      if (!pattern.test(value)) continue;
      value = value.replace(pattern, "[REDACTED]");
      findings.push({
        field: key,
        category: identifier.category,
        severity: "High",
        message: `A known ${humanize(identifier.category)} appeared in public-facing copy.`,
      });
      redactionLog.push({ field: key, category: identifier.category, action: "Removed known identifier" });
    }

    const directPatterns: Array<[RegExp, string, RiskLevel]> = [
      [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "email address", "Blocked"],
      [/(?:https?:\/\/|www\.)\S+/i, "website address", "Blocked"],
      [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/, "phone number", "Blocked"],
      [/\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/i, "exact street address", "Blocked"],
      [/\b(?:license|permit|registration)\s*(?:#|no\.?|number)?\s*[A-Z0-9-]{5,}\b/i, "license identifier", "Blocked"],
      [/[“”"]{1}[^“”"]{18,}[“”"]{1}/, "searchable quoted phrase", "High"],
      [/\b(?:winner|recipient|awarded)\b.{0,55}\b(?:award|prize|honor)\b/i, "searchable award", "High"],
    ];

    for (const [pattern, category, severity] of directPatterns) {
      if (!pattern.test(value)) continue;
      value = value.replace(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`), "[REDACTED]");
      findings.push({ field: key, category, severity, message: `Potential ${category} detected and removed.` });
      redactionLog.push({ field: key, category, action: "Pattern-redacted" });
    }

    publicDraft[key] = value;
  }

  const broadRegion = publicDraft.broadRegion ?? "";
  if (broadRegion && /\b(?:street|road|avenue|boulevard|drive|lane|court|suite|unit)\b/i.test(broadRegion)) {
    findings.push({ field: "broadRegion", category: "geographic precision", severity: "High", message: "Use a metro area, state, or multi-county region—not a street-level location." });
  }
  if ((publicDraft.narrative?.length ?? 0) > 900) {
    findings.push({ field: "narrative", category: "re-identification surface", severity: "Moderate", message: "Long narrative copy can combine clues that identify a business." });
  }
  if (publicDraft.employeeRange && /^\s*\d{1,5}\s*(?:employees?)?\s*$/i.test(publicDraft.employeeRange)) {
    findings.push({ field: "employeeRange", category: "exact employee count", severity: "High", message: "Use an employee range instead of an exact headcount." });
  }
  for (const key of ["revenueRange", "earningsRange"] as const) {
    const value = publicDraft[key] ?? "";
    if (/\$\s*[\d,.]+\s*(?:k|m|million|thousand)?\s*$/i.test(value) && !/[–—-]|\bto\b|\bunder\b|\bover\b|\bbetween\b/i.test(value)) {
      findings.push({ field: key, category: "exact financial figure", severity: "High", message: "Use a reviewed financial range instead of an exact figure." });
    }
  }
  if (publicDraft.narrative && /\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(?:19|20)\d{2}\b/i.test(publicDraft.narrative)) {
    findings.push({ field: "narrative", category: "exact date", severity: "Moderate", message: "Exact dates can combine with other clues to identify a business." });
  }

  const riskRank: Record<RiskLevel, number> = { Low: 0, Moderate: 1, High: 2, Blocked: 3 };
  const riskLevel = findings.reduce<RiskLevel>((highest, finding) => riskRank[finding.severity] > riskRank[highest] ? finding.severity : highest, findings.length ? "Moderate" : "Low");
  return {
    publicDraft,
    findings,
    redactionLog,
    riskLevel,
    publicationBlocked: riskLevel === "High" || riskLevel === "Blocked",
  };
}

export type BuyerMatchInput = {
  buyerType?: string;
  organization?: string;
  industries?: string;
  geography?: string;
  availableEquity?: number;
  financingStatus?: string;
  confidentialityAcknowledged?: boolean;
  operatingExperience?: string;
  transitionApproach?: string;
};

export type BuyerRequirements = {
  preferredIndustries?: string;
  preferredGeography?: string;
  minimumEquity?: number;
  financingRequired?: boolean;
  requiredBuyerTypes?: string;
};

export type SellerExclusions = {
  excludedBuyerTypes?: string;
  excludedOrganizations?: string;
  prohibitedGeographies?: string;
};

export type BuyerMatchReview = {
  classification: "Potential Fit" | "Needs Information" | "Hard Conflict";
  score: number | null;
  hardConflicts: string[];
  alignment: string[];
  missing: string[];
};

function includesTerm(haystack?: string, needle?: string) {
  if (!haystack || !needle) return false;
  const source = haystack.toLowerCase();
  return needle.toLowerCase().split(/[\n,;]+/).some((term) => term.trim().length > 1 && source.includes(term.trim()));
}

export function evaluateBuyerMatch(buyer: BuyerMatchInput, requirements: BuyerRequirements, exclusions: SellerExclusions): BuyerMatchReview {
  const hardConflicts: string[] = [];
  const alignment: string[] = [];
  const missing: string[] = [];

  if (includesTerm(exclusions.excludedBuyerTypes, buyer.buyerType)) hardConflicts.push("Buyer type is excluded by the seller.");
  if (includesTerm(exclusions.excludedOrganizations, buyer.organization)) hardConflicts.push("Buyer organization is on the seller exclusion list.");
  if (includesTerm(exclusions.prohibitedGeographies, buyer.geography)) hardConflicts.push("Buyer geography conflicts with seller restrictions.");
  if (requirements.minimumEquity && (!buyer.availableEquity || buyer.availableEquity < requirements.minimumEquity)) hardConflicts.push("Declared equity is below the seller requirement.");
  if (requirements.financingRequired && !/ready|approved|engaged|prequalified/i.test(buyer.financingStatus ?? "")) hardConflicts.push("Required financing preparation is not documented.");
  if (!buyer.confidentialityAcknowledged) hardConflicts.push("Confidentiality acknowledgment is required.");

  if (!buyer.buyerType) missing.push("Buyer type");
  if (!buyer.industries) missing.push("Industry criteria");
  if (!buyer.geography) missing.push("Geography");
  if (!buyer.operatingExperience) missing.push("Operating experience");
  if (buyer.availableEquity == null) missing.push("Available equity declaration");

  if (includesTerm(buyer.industries, requirements.preferredIndustries)) alignment.push("Industry alignment");
  if (includesTerm(buyer.geography, requirements.preferredGeography)) alignment.push("Geographic alignment");
  if (includesTerm(requirements.requiredBuyerTypes, buyer.buyerType)) alignment.push("Buyer-type alignment");
  if (buyer.operatingExperience) alignment.push("Operating experience supplied");
  if (buyer.transitionApproach) alignment.push("Transition approach supplied");

  if (hardConflicts.length) return { classification: "Hard Conflict", score: null, hardConflicts, alignment, missing };
  if (missing.length) return { classification: "Needs Information", score: null, hardConflicts, alignment, missing };
  return { classification: "Potential Fit", score: Math.min(100, 45 + alignment.length * 11), hardConflicts, alignment, missing };
}

export function isPubliclyDiscoverable(level: QuietExitLevel, status: string) {
  return level === "Anonymous Teaser" && status === "Active";
}

export function canTransitionDisclosure(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    Requested: ["Needs Qualification", "Declined", "Archived"],
    "Needs Qualification": ["Qualified", "Declined", "Archived"],
    Qualified: ["Seller Review", "Declined", "Archived"],
    "Seller Review": ["Approved for Disclosure", "Conditioned", "Declined"],
    Conditioned: ["Approved for Disclosure", "Declined", "Revoked"],
    "Approved for Disclosure": ["Meeting Requested", "Revoked", "Archived"],
    "Meeting Requested": ["Revoked", "Archived"],
    Revoked: ["Archived"],
    Declined: ["Archived"],
  };
  return (allowed[from] ?? []).includes(to);
}

export function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();
}
