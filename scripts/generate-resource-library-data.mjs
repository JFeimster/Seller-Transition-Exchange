import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content", "resources");
const dataDir = path.join(root, "data");

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[")) return JSON.parse(trimmed);
  return trimmed.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) throw new Error("Missing frontmatter");
  return Object.fromEntries(match[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf(":");
    return [line.slice(0, separator).trim(), parseValue(line.slice(separator + 1))];
  }));
}

const files = (await readdir(contentDir)).filter((file) => file.endsWith(".mdx"));
const guides = (await Promise.all(files.map(async (file) => {
  const meta = parseFrontmatter(await readFile(path.join(contentDir, file), "utf8"));
  return {
    id: `resource-${String(meta.display_order).padStart(2, "0")}`,
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    seller_stage: meta.seller_stage,
    audience: meta.audience,
    transition_paths: meta.transition_paths,
    estimated_read_time: meta.estimated_read_time,
    display_order: meta.display_order,
    featured: meta.featured,
    evidence_status: meta.evidence_status,
    last_reviewed: meta.last_reviewed,
    related_modules: meta.related_modules,
    related_guides: meta.related_guides,
    primary_cta: meta.primary_cta,
    primary_cta_href: meta.primary_cta_href,
    file_path: `content/resources/${file}`,
  };
}))).sort((a, b) => a.display_order - b.display_order);

const categoryInfo = {
  "Sale Preparation": ["Define the outcome, readiness baseline, buyer profile, and controlled process.", "compass", "Prepare"],
  "Valuation and Value Building": ["Understand value drivers and improve durable transferability.", "trend-up", "Prepare"],
  "Financial Readiness": ["Organize consistent financial evidence for authorized review.", "ledger", "Package"],
  Financing: ["Understand educational acquisition and seller-financing structures.", "capital", "Match"],
  "Ownership Transition": ["Plan management, family, and partner ownership changes.", "handoff", "Transition"],
  Confidentiality: ["Control identity, qualification, disclosure, and deal-room access.", "shield", "Match"],
  Advisors: ["Select qualified professional scopes around actual transaction risks.", "network", "Prepare"],
  "Transition Execution": ["Sequence communication, closing, continuity, and post-close work.", "sequence", "Transition"],
};
const categories = Object.entries(categoryInfo).map(([name, [description, icon_identifier, related_seller_stage]], index) => ({
  name,
  description,
  display_order: index + 1,
  icon_identifier,
  related_seller_stage,
  guide_slugs: guides.filter((guide) => guide.category === name).map((guide) => guide.slug),
}));

const moduleRoutes = {
  "Exit Readiness": "/exit-readiness",
  "Value Builder": "/value-builder",
  "Seller Launch Studio": "/seller-launch-studio",
  "Quiet Exit Network": "/quiet-exit",
  "Financing Readiness": "/financing-readiness",
  "Capital Desk": "/acquisition-financing",
  "Buyer Matching": "/buyer-matching",
  "Legacy Matching": "/legacy-matching",
  "Change-of-Ownership Planning Center": "/change-of-ownership",
  "Advisor Network": "/advisors",
  "Deal Room": "/deal-room",
  "Digital Business Marketplace": "/digital-businesses/marketplace",
  "Transition Command Center": "/transition",
};
const linkMap = guides.map((guide) => ({
  guide_slug: guide.slug,
  outbound_internal_links: guide.related_guides.map((slug) => `/resources/${slug}`),
  inbound_internal_links: guides.filter((other) => other.related_guides.includes(guide.slug)).map((other) => `/resources/${other.slug}`),
  platform_route_links: [...new Set(guide.related_modules.map((module) => moduleRoutes[module]).filter(Boolean))],
  cta_links: [guide.primary_cta_href],
}));

const localSources = {
  "Sale Preparation": ["seller-transition-exchange/SKILL.md", "exit-readiness-and-value-builder/references/value-builder-playbook.md"],
  "Valuation and Value Building": ["exit-readiness-and-value-builder/SKILL.md", "exit-readiness-and-value-builder/references/value-builder-playbook.md"],
  "Financial Readiness": ["exit-readiness-and-value-builder/SKILL.md", "seller-transition-exchange/references/evidence-and-transaction-guardrails.md"],
  Financing: ["buyer-matching-and-financing/SKILL.md", "buyer-matching-and-financing/references/financing-boundaries.md"],
  "Ownership Transition": ["succession-and-legacy-transition/SKILL.md", "succession-and-legacy-transition/references/transition-paths.md"],
  Confidentiality: ["seller-listing-and-confidentiality/SKILL.md", "seller-listing-and-confidentiality/references/confidentiality-and-disclosure.md"],
  Advisors: ["seller-transition-exchange/references/evidence-and-transaction-guardrails.md", "seller-launch-studio/references/claims-and-review-policy.md"],
  "Transition Execution": ["succession-and-legacy-transition/SKILL.md", "seller-transition-exchange/references/output-contracts.md"],
};
const sourceManifest = guides.map((guide) => ({
  guide_slug: guide.slug,
  source_status: "editorial-review-required",
  local_references_used: localSources[guide.category],
  external_authoritative_sources_used: guide.slug === "sba-acquisition-financing" ? [
    {
      organization: "U.S. Small Business Administration",
      title: "7(a) loans",
      url: "https://www.sba.gov/funding-programs/loans/7a-loans",
      reviewed_on: "2026-07-31",
    },
    {
      organization: "U.S. Small Business Administration",
      title: "SOP 50 10 - Lender and Development Company Loan Programs",
      url: "https://www.sba.gov/document/sop-50-10-lender-development-company-loan-programs",
      reviewed_on: "2026-07-31",
    },
  ] : [],
  claims_requiring_professional_review: [
    "Transaction-specific legal, tax, accounting, valuation, brokerage, investment, employment, or financing conclusions.",
  ],
  current_law_or_program_claims: guide.slug === "sba-acquisition-financing"
    ? ["Current SBA program eligibility, lender requirements, loan terms, equity treatment, and closing conditions."]
    : [],
  last_source_review: "2026-07-31",
  reviewer: null,
  publication_approval: false,
}));

await mkdir(dataDir, { recursive: true });
for (const [name, value] of [
  ["resource-guides.json", guides],
  ["resource-categories.json", categories],
  ["resource-link-map.json", linkMap],
  ["resource-source-manifest.json", sourceManifest],
]) {
  await writeFile(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
console.log(`Generated resource data for ${guides.length} guides.`);
