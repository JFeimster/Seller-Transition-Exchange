import preparingToSell from "../../content/resources/preparing-to-sell-your-business.mdx?raw";
import understandingValuation from "../../content/resources/understanding-business-valuation.mdx?raw";
import improvingValue from "../../content/resources/improving-business-value-before-a-sale.mdx?raw";
import organizingFinancials from "../../content/resources/organizing-financial-records.mdx?raw";
import reducingOwnerDependence from "../../content/resources/reducing-owner-dependence.mdx?raw";
import sellerFinancing from "../../content/resources/seller-financing.mdx?raw";
import sbaFinancing from "../../content/resources/sba-acquisition-financing.mdx?raw";
import managementBuyouts from "../../content/resources/management-buyouts.mdx?raw";
import familySuccession from "../../content/resources/family-succession.mdx?raw";
import partnerBuyouts from "../../content/resources/partner-buyouts.mdx?raw";
import confidentialSales from "../../content/resources/confidential-business-sales.mdx?raw";
import choosingAdvisors from "../../content/resources/choosing-transaction-advisors.mdx?raw";
import preparingStakeholders from "../../content/resources/preparing-employees-and-customers.mdx?raw";
import afterClosing from "../../content/resources/what-happens-after-closing.mdx?raw";

export type ResourceHeadingBlock = { type: "heading"; level: 2 | 3; text: string; id: string };
export type ResourceBlock =
  | ResourceHeadingBlock
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

export type ResourceGuide = {
  title: string;
  slug: string;
  description: string;
  category: string;
  seller_stage: string;
  audience: string[];
  transition_paths: string[];
  estimated_read_time: string;
  display_order: number;
  featured: boolean;
  evidence_status: string;
  last_reviewed: string;
  related_modules: string[];
  related_guides: string[];
  primary_cta: string;
  primary_cta_href: string;
  secondary_cta: string;
  secondary_cta_href: string;
  blocks: ResourceBlock[];
};

export type ResourceModuleLink = {
  route: string;
  state: "Public module" | "Planning interface" | "Sign-in required" | "Version 2.1 preparation" | "Active · seller-controlled workflow";
};

export const resourceModuleLinks: Record<string, ResourceModuleLink> = {
  "Exit Readiness": { route: "/exit-readiness", state: "Public module" },
  "Value Builder": { route: "/value-builder", state: "Public module" },
  "Seller Launch Studio": { route: "/seller-launch-studio", state: "Sign-in required" },
  "Quiet Exit Network": { route: "/quiet-exit", state: "Active · seller-controlled workflow" },
  "Financing Readiness": { route: "/financing-readiness", state: "Public module" },
  "Capital Desk": { route: "/capital-desk", state: "Planning interface" },
  "Buyer Matching": { route: "/buyer-matching", state: "Sign-in required" },
  "Legacy Matching": { route: "/legacy-matching", state: "Sign-in required" },
  "Change-of-Ownership Planning Center": { route: "/change-of-ownership", state: "Planning interface" },
  "Advisor Network": { route: "/advisors", state: "Public module" },
  "Deal Room": { route: "/deal-room", state: "Sign-in required" },
  "Digital Business Marketplace": { route: "/digital-businesses/marketplace", state: "Public module" },
  "Transition Command Center": { route: "/transition", state: "Sign-in required" },
};

function parseValue(value: string): string | number | boolean | string[] {
  const trimmed = value.trim();
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[")) return JSON.parse(trimmed) as string[];
  return trimmed.replace(/^["']|["']$/g, "");
}

function headingId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseBody(body: string): ResourceBlock[] {
  const blocks: ResourceBlock[] = [];
  const lines = body.trim().split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", ordered, items: list });
      list = [];
    }
  };

  for (const line of lines) {
    const heading = /^(##|###)\s+(.+)$/.exec(line);
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    const quote = /^>\s+(.+)$/.exec(line);

    if (heading) {
      flushParagraph();
      flushList();
      const text = heading[2].trim();
      blocks.push({ type: "heading", level: heading[1] === "##" ? 2 : 3, text, id: headingId(text) });
    } else if (bullet || numbered) {
      flushParagraph();
      const nextOrdered = Boolean(numbered);
      if (list.length && ordered !== nextOrdered) flushList();
      ordered = nextOrdered;
      list.push((bullet ?? numbered)![1].trim());
    } else if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1].trim() });
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function parseGuide(raw: string): ResourceGuide {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error("Resource guide is missing valid frontmatter.");
  const meta = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        return [line.slice(0, separator).trim(), parseValue(line.slice(separator + 1))];
      }),
  );
  return { ...meta, blocks: parseBody(match[2]) } as ResourceGuide;
}

export const resourceGuides = [
  preparingToSell,
  understandingValuation,
  improvingValue,
  organizingFinancials,
  reducingOwnerDependence,
  sellerFinancing,
  sbaFinancing,
  managementBuyouts,
  familySuccession,
  partnerBuyouts,
  confidentialSales,
  choosingAdvisors,
  preparingStakeholders,
  afterClosing,
].map(parseGuide).sort((a, b) => a.display_order - b.display_order);

export const resourceCategories = [...new Set(resourceGuides.map((guide) => guide.category))];
export const resourceStages = [...new Set(resourceGuides.map((guide) => guide.seller_stage))];
export const resourcePaths = [...new Set(resourceGuides.flatMap((guide) => guide.transition_paths))];
