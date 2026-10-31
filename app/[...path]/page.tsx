import ExchangeApp from "../components/ExchangeApp";
import { requireChatGPTUser } from "../chatgpt-auth";
import type { Metadata } from "next";
import resourceGuides from "../../data/resource-guides.json";
import { skillForIndustry } from "../lib/vertical-intelligence";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}): Promise<Metadata> {
  const resolved = await params;
  const pathname = `/${resolved.path.join("/")}`;
  if (["/sell", "/seller", "/buyer", "/advisor", "/admin"].includes(pathname) || pathname.startsWith("/seller/") || pathname.startsWith("/buyer/") || pathname.startsWith("/advisor/") || pathname.startsWith("/admin/") || ["/transition", "/seller-launch-studio", "/buyer-matching", "/acquisition-financing", "/legacy-matching", "/transition-planning", "/deal-room"].includes(pathname)) {
    return { robots: { index: false, follow: false }, referrer: "no-referrer" };
  }
  const quietMetadata: Record<string, { title: string; description: string }> = {
    "/quiet-exit": { title: "Quiet Exit Network | Seller Transition Exchange", description: "Prepare a confidential, seller-controlled business transition with anonymous teasers, buyer qualification, and deliberate disclosure." },
    "/quiet-exit/how-it-works": { title: "How Confidential Business Sales Work | Seller Transition Exchange", description: "Understand the Quiet Exit preparation, buyer qualification, seller approval, controlled access, and revocation workflow." },
    "/quiet-exit/confidentiality": { title: "Confidentiality Levels | Seller Transition Exchange", description: "Compare anonymous teaser, verified-buyer-only, private mandate, invite-only, and coming-to-market confidentiality controls." },
    "/quiet-exit/buyer-qualification": { title: "Confidential Buyer Qualification | Seller Transition Exchange", description: "Review the identity, experience, capacity, financing, conflict, and confidentiality gates used before seller disclosure." },
    "/quiet-exit/resources": { title: "Quiet Exit Resources | Seller Transition Exchange", description: "Use educational field guides for confidential sales, seller preparation, financial records, advisors, financing, and transition execution." },
  };
  const financingMetadata: Record<string, { title: string; description: string }> = {
    "/financing-readiness": { title: "Financing Readiness | Seller Transition Exchange", description: "Organize transaction evidence, surface financing gaps, and prepare an educational capital review." },
    "/financing-readiness/how-it-works": { title: "How Financing Readiness Works | Seller Transition Exchange", description: "Understand the evidence, structure, documentation, and consent gates before financing routing." },
    "/financing-readiness/requirements": { title: "Financing Requirements | Seller Transition Exchange", description: "Review the transaction, cash-flow, buyer, seller contribution, capital needs, and document inputs for a financing review." },
    "/capital-desk": { title: "Capital Desk | Seller Transition Exchange", description: "Compare educational sources-and-uses structures and prepare a reviewable financing request." },
    "/capital-desk/resources": { title: "Capital Desk Resources | Seller Transition Exchange", description: "Field guides for financial records, seller financing, acquisition financing, and ownership transition." },
  };
  const ownershipMetadata: Record<string, { title: string; description: string }> = {
    "/change-of-ownership": { title: "Change-of-Ownership Planning Center | Seller Transition Exchange", description: "Compare sale, succession, buyout, employee, retained-equity, and seller-financed transition paths before committing to a structure." },
    "/change-of-ownership/pathways": { title: "Business Transition Pathways | Seller Transition Exchange", description: "Explore ownership-transition pathways, prerequisites, tradeoffs, and professional-review gates." },
    "/change-of-ownership/how-it-works": { title: "How Transition Planning Works | Seller Transition Exchange", description: "Use one canonical Transition Plan to compare objectives, business context, successor availability, legacy priorities, structure, and review needs." },
    "/change-of-ownership/legacy": { title: "Legacy Matching | Seller Transition Exchange", description: "Understand the seller-controlled continuity priorities that inform educational transition matching." },
    "/change-of-ownership/resources": { title: "Change-of-Ownership Resources | Seller Transition Exchange", description: "Educational field guides for sale preparation, succession, financing, confidentiality, advisors, and post-close transition." },
  };
  const ownershipPaths: Record<string, string> = { "external-sale": "External Sale", "management-buyout": "Management Buyout", "partner-buyout": "Partner Buyout", "family-succession": "Family Succession", "employee-ownership": "Employee Ownership", "partial-sale": "Partial Sale", "seller-financed-transition": "Seller-Financed Transition", "rollover-equity": "Rollover Equity" };
  const networkMetadata: Record<string, { title: string; description: string }> = {
    "/buyers": { title: "Buyer Network | Seller Transition Exchange", description: "Explore controlled buyer and successor profiles, acquisition criteria, transition paths, and seller-approved opportunity access." },
    "/buyers/how-it-works": { title: "How Buyer Qualification Works | Seller Transition Exchange", description: "Understand buyer profile completion, verification, qualification, confidentiality, seller review, and access scope." },
    "/buyers/types": { title: "Buyer and Successor Types | Seller Transition Exchange", description: "Compare acquisition entrepreneurs, strategic buyers, management teams, family successors, partners, and employee ownership candidates." },
    "/buyers/resources": { title: "Buyer Network Resources | Seller Transition Exchange", description: "Educational resources for buyer readiness, acquisition financing, diligence, transition planning, and continuity." },
    "/advisors": { title: "Advisor Network | Seller Transition Exchange", description: "Find reviewed transaction, tax, legal, financing, valuation, HR, technology, and transition support records." },
    "/advisors/categories": { title: "Advisor Categories | Seller Transition Exchange", description: "Browse advisor categories with verification, sponsorship, source, and introduction status kept distinct." },
    "/advisors/how-it-works": { title: "How the Advisor Network Works | Seller Transition Exchange", description: "Review advisor submission, credential verification, sponsorship, matching, assignment, and introduction boundaries." },
    "/advisors/resources": { title: "Advisor Network Resources | Seller Transition Exchange", description: "Use educational resources to prepare for professional review during a business transition." },
    "/markets": { title: "Regional Markets | Seller Transition Exchange", description: "Explore regional transition hubs for local listings, buyers, advisors, events, and resources using reviewed records." },
    "/community": { title: "Transition Community | Seller Transition Exchange", description: "Find reviewed seller, buyer, advisor, and transition events without inferred attendance or fabricated outcomes." },
    "/community/events": { title: "Transition Events | Seller Transition Exchange", description: "Review public event records that have cleared the Seller Transition Exchange review workflow." },
    "/community/roundtables": { title: "Transition Roundtables | Seller Transition Exchange", description: "Explore reviewed roundtables for owners, buyers, advisors, and transition professionals." },
    "/community/workshops": { title: "Transition Workshops | Seller Transition Exchange", description: "Explore reviewed workshops for readiness, value building, financing, confidentiality, and continuity." },
    "/community/newsletter": { title: "Seller Transition Exchange Newsletter", description: "Join interest for educational transition updates. No subscription or delivery is inferred until an authenticated workflow is configured." },
  };
  if (networkMetadata[pathname]) return { ...networkMetadata[pathname], alternates: { canonical: pathname }, openGraph: { type: "website", ...networkMetadata[pathname], url: pathname } };
  if (resolved.path[0] === "markets" && resolved.path[1]) {
    const title = `${resolved.path[1].replaceAll("-", " ")} Regional Market | Seller Transition Exchange`;
    const description = "A regional transition hub for reviewed local listings, buyers, advisors, events, and resources.";
    return { title, description, alternates: { canonical: pathname }, openGraph: { type: "website", title, description, url: pathname } };
  }
  if (resolved.path[0] === "advisors" && resolved.path[1]) {
    const title = "Advisor Profile | Seller Transition Exchange";
    const description = "A public advisor profile is displayed only when its approved visibility and verification state permit discovery.";
    return { title, description, robots: { index: false, follow: false }, referrer: "no-referrer" };
  }
  if (resolved.path[0] === "buyers" && resolved.path[1]) {
    const title = "Buyer Profile | Seller Transition Exchange";
    const description = "A public buyer profile is displayed only when the buyer selects approved public visibility and completes documented review.";
    return { title, description, robots: { index: false, follow: false }, referrer: "no-referrer" };
  }
  if (ownershipMetadata[pathname]) return { ...ownershipMetadata[pathname], alternates: { canonical: pathname }, openGraph: { type: "website", ...ownershipMetadata[pathname], url: pathname } };
  if (resolved.path[0] === "change-of-ownership" && ownershipPaths[resolved.path[1] ?? ""]) {
    const label = ownershipPaths[resolved.path[1]];
    const title = `${label} Planning | Seller Transition Exchange`;
    const description = `Educational planning guidance for ${label.toLowerCase()}, including transition questions, review gates, continuity, and capital considerations.`;
    return { title, description, alternates: { canonical: pathname }, openGraph: { type: "website", title, description, url: pathname } };
  }
  if (financingMetadata[pathname]) return { ...financingMetadata[pathname], alternates: { canonical: pathname }, openGraph: { type: "website", ...financingMetadata[pathname], url: pathname } };
  if (quietMetadata[pathname]) return {
    ...quietMetadata[pathname],
    alternates: { canonical: pathname },
    openGraph: { type: "website", ...quietMetadata[pathname], url: pathname },
  };
  if (pathname === "/industries") return {
    title: "Vertical Seller Intelligence | Seller Transition Exchange",
    description: "Use reusable industry overlays to assess readiness, value drivers, diligence priorities, financing considerations, and sale preparation.",
    alternates: { canonical: pathname },
    openGraph: { type: "website", title: "Vertical Seller Intelligence | Seller Transition Exchange", description: "Industry-specific seller-transition operating centers for owners and buyers.", url: pathname },
  };
  if (resolved.path[0] === "industries" && resolved.path[1]) {
    const skill = skillForIndustry(resolved.path[1]);
    if (skill) {
      const title = `${skill.industry} Seller Transition Hub | Seller Transition Exchange`;
      const description = `${skill.industry} seller-transition guidance covering readiness questions, value drivers, buyer diligence, financing considerations, and preparation.`;
      const url = `/industries/${resolved.path[1]}`;
      return { title, description, alternates: { canonical: url }, openGraph: { type: "website", title, description, url } };
    }
  }
  if (resolved.path[0] !== "resources" || !resolved.path[1]) return {};
  const guide = resourceGuides.find((item) => item.slug === resolved.path[1]);
  if (!guide) return {};
  const url = `/resources/${guide.slug}`;
  return {
    title: `${guide.title} | Seller Transition Exchange`,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url,
    },
  };
}

const SIGN_IN_REQUIRED = [
  "/sell",
  "/seller",
  "/admin",
  "/seller-launch-studio",
  "/buyer-matching",
  "/acquisition-financing",
  "/transition",
  "/buyer",
  "/advisor",
  "/legacy-matching",
  "/transition-planning",
  "/deal-room",
  "/seller/financing",
  "/buyer/financing",
];

export default async function RoutedPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const resolved = await params;
  const pathname = `/${resolved.path.join("/")}`;

  if (SIGN_IN_REQUIRED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const user = await requireChatGPTUser(pathname);

    if (
      pathname.startsWith("/admin") &&
      user.email.toLowerCase() !==
        (process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com").toLowerCase()
    ) {
      return (
        <main className="shell" style={{ minHeight: "70vh", paddingTop: "8rem" }}>
          <section className="panel" style={{ maxWidth: "760px", margin: "0 auto" }}>
            <p className="eyebrow">Restricted workspace</p>
            <h1>Admin review is owner-controlled.</h1>
            <p>
              Your account is signed in, but it is not authorized to review seller claims,
              approve disclosure, or publish listings.
            </p>
          </section>
        </main>
      );
    }
  }

  return <ExchangeApp initialPath={pathname} />;
}
