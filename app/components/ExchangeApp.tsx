"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DigitalBridge, DigitalBusinessHome, DigitalBuy, DigitalMarketplace, DigitalOpportunity, DigitalResources, DigitalSell, DigitalValuationLab, type DigitalWorkspace } from "./DigitalBusinessModule";
import { QuietExitModule } from "./QuietExitModule";
import { CapitalDeskModule } from "./CapitalDeskModule";
import { VerticalIntelligenceModule } from "./VerticalIntelligenceModule";
import { ChangeOfOwnershipModule } from "./ChangeOfOwnershipModule";
import { LaunchStudioDealRoomModule } from "./LaunchStudioDealRoomModule";
import { NetworkModule } from "./NetworkModule";
import { TransactionOSModule } from "./TransactionOSModule";
import { resourceCategories, resourceGuides, resourceModuleLinks, resourcePaths, resourceStages, type ResourceGuide, type ResourceHeadingBlock } from "../lib/resource-library";
import { SITE_ORIGIN } from "../lib/site-origin";
import { demoListingFacets, skillForIndustry, verticalIndustryNames } from "../lib/vertical-intelligence";

type FormState = Record<string, string | boolean>;
type ReadinessScores = Record<string, number>;
export type Stage = "Explore" | "Prepare" | "Package" | "Match" | "Transition";
export type ModuleStatus = "Not Started" | "In Progress" | "Needs Information" | "Needs Review" | "Ready" | "Approved" | "Active" | "Paused" | "Completed" | "Archived";
export type V2Workspace = {
  currentStage: Stage;
  moduleStatus: Record<string, ModuleStatus>;
  financingAnswers: ReadinessScores;
  legacyPriorities: string[];
  transitionPath: string;
  quietExitChecks: string[];
  dealRoomChecks: string[];
  buyerCriteria: FormState;
  digital: DigitalWorkspace;
};
export type WorkspaceSetter = (next: V2Workspace | ((current: V2Workspace) => V2Workspace)) => void;

const stages: { name: Stage; route: string; promise: string }[] = [
  { name: "Explore", route: "/transition", promise: "Choose the path and establish the evidence baseline." },
  { name: "Prepare", route: "/financing-readiness", promise: "Reduce risk, organize records, and test readiness." },
  { name: "Package", route: "/seller/launch-studio", promise: "Build controlled, reviewable transition materials." },
  { name: "Match", route: "/quiet-exit", promise: "Qualify fit before granting access." },
  { name: "Transition", route: "/change-of-ownership", promise: "Sequence control, capital, continuity, and handoff." },
];

const platformModules = [
  { name: "Quiet Exit Network", route: "/quiet-exit", stage: "Match", serves: "Owners requiring a controlled off-market process", inputs: "Seller criteria · visibility · disclosure gates", output: "Private mandate preparation brief", action: "Define the disclosure perimeter" },
  { name: "Financing Readiness", route: "/financing-readiness", stage: "Prepare", serves: "Sellers, successors, and identified buyers", inputs: "Financial evidence · debt · capital requirements", output: "Educational readiness review", action: "Complete the five-factor review" },
  { name: "Vertical Intelligence", route: "/vertical-intelligence", stage: "Explore", serves: "Owners in operating-model-specific industries", inputs: "Industry · geography · business model", output: "Diligence and readiness question set", action: "Select the narrowest industry pack" },
  { name: "Legacy Matching", route: "/change-of-ownership/legacy", stage: "Match", serves: "Owners prioritizing continuity and stewardship", inputs: "Legacy priorities · transition path · buyer criteria", output: "Continuity alignment brief", action: "Rank the continuity priorities" },
  { name: "Change-of-Ownership Planning", route: "/change-of-ownership", stage: "Transition", serves: "External sales, succession, and internal buyouts", inputs: "Objectives · path · milestones · review gates", output: "Draft transition-plan framework", action: "Compare ownership paths" },
  { name: "Seller Launch Studio", route: "/seller/launch-studio", stage: "Package", serves: "Owners preparing controlled transaction materials", inputs: "Canonical records · source versions · audience · visibility", output: "Versioned, claim-traceable transaction drafts", action: "Generate the next material" },
  { name: "Buyer Matching", route: "/buyer-matching", stage: "Match", serves: "Sellers and qualified acquisition prospects", inputs: "Criteria · evidence · capacity · confidentiality", output: "Educational fit screen", action: "Define buyer qualification criteria" },
  { name: "Advisor Network", route: "/advisors", stage: "Transition", serves: "Owners requiring licensed or specialist review", inputs: "Need · geography · assignment scope", output: "Support-routing request", action: "Define the professional-review need" },
  { name: "Digital Businesses", route: "/digital-businesses", stage: "Explore", serves: "Owners and buyers of online operating businesses", inputs: "Business model · evidence · buyer or seller objective", output: "Marketplace, value, readiness, and transition workflow", action: "Select the digital business type" },
];

const emptyModuleStatus = Object.fromEntries(platformModules.map((module) => [module.name, "Not Started"])) as Record<string, ModuleStatus>;
const defaultWorkspace: V2Workspace = {
  currentStage: "Explore",
  moduleStatus: emptyModuleStatus,
  financingAnswers: {},
  legacyPriorities: [],
  transitionPath: "",
  quietExitChecks: [],
  dealRoomChecks: [],
  buyerCriteria: {},
  digital: { businessType: "", valuationComplete: false, sellerProfileComplete: false, marketplaceActive: false, buyerCriteriaComplete: false },
};

const nav = [
  ["Businesses", "/businesses-for-sale"],
  ["Confidential", "/confidential-opportunities"],
  ["Industries", "/industries"],
  ["Markets", "/markets"],
  ["Sell", "/sell"],
  ["Exit Readiness", "/exit-readiness"],
  ["Value Builder", "/value-builder"],
  ["Financing", "/acquisition-financing"],
  ["Resources", "/resources"],
  ["Advisors", "/advisors"],
];

const protectedClientPrefixes = ["/sell", "/seller", "/admin", "/buyer", "/seller-launch-studio", "/buyer-matching", "/acquisition-financing", "/transition", "/legacy-matching", "/transition-planning", "/deal-room"];

const pathways = [
  ["Sell now", "sell-now", "Build the listing, teaser, and controlled buyer process."],
  ["Sell in 12–24 months", "future-sale", "Create the timeline and readiness plan before market exposure."],
  ["Increase value first", "value-first", "Identify value suppressors and build the operating roadmap."],
  ["Run a confidential process", "confidential", "Control identity, disclosure, qualification, and access."],
  ["Sell to management or family", "succession", "Structure continuity around the people already inside the business."],
  ["Find a qualified buyer", "buyer-search", "Define the buyer profile and launch a focused sourcing mandate."],
  ["Finance an identified buyer", "buyer-financing", "Model equity, debt, seller note, and working capital."],
];

const listings = [
  {
    slug: "demo-mid-atlantic-field-services",
    title: "Established Mid-Atlantic Field Services Platform",
    industry: "Commercial Services",
    location: "Mid-Atlantic · Broad region",
    revenue: "$2M–$5M",
    earnings: "$500K–$1M EBITDA",
    price: "Available after qualification",
    visibility: "Anonymous teaser",
    status: "Coming to market",
    finance: "Financing review pending",
    sellerNote: "Seller financing considered",
    verification: "Demo · unverified",
  },
  {
    slug: "demo-home-services-operator",
    title: "Recurring-Revenue Home Services Operator",
    industry: "Home Services",
    location: "Northern Virginia · Broad region",
    revenue: "$1M–$2M",
    earnings: "$250K–$500K SDE",
    price: "$1.6M indicative",
    visibility: "Verified-buyer only",
    status: "Seller review",
    finance: "Documents in preparation",
    sellerNote: "Open to structured note",
    verification: "Demo · unverified",
  },
  {
    slug: "demo-digital-b2b-asset",
    title: "Niche B2B Digital Information Asset",
    industry: "Digital Assets",
    location: "U.S. · Remote",
    revenue: "$500K–$1M",
    earnings: "$250K–$500K EBITDA",
    price: "Not disclosed",
    visibility: "Private mandate",
    status: "Illustrative workflow",
    finance: "Structure analysis required",
    sellerNote: "Case-by-case",
    verification: "Demo · unverified",
  },
];

const industries = [
  "HVAC", "Plumbing", "Electrical", "Pest Control", "Commercial Cleaning", "Landscaping",
  "Roofing", "Restoration", "Laundromats", "Home Services", "Professional Services", "Digital Assets",
];
const markets = ["Washington, D.C.", "Northern Virginia", "Alexandria", "Arlington", "Fairfax", "Maryland", "Baltimore", "Richmond"];
const readinessItems = [
  "Financial record quality", "Revenue stability", "Margin quality", "Recurring revenue",
  "Customer concentration", "Owner dependence", "Management depth", "Employee retention",
  "Standard operating procedures", "Legal organization", "Tax-document readiness",
  "Contract transferability", "Lease transferability", "Vendor concentration",
  "Equipment condition", "Technology maturity", "Growth documentation",
  "Transition planning", "Financing readiness",
];

const sellerSteps = [
  { title: "Owner", fields: [["ownerName", "Owner name"], ["email", "Email"], ["phone", "Phone"], ["preferredContact", "Preferred communication"], ["ownerLocation", "Geographic location"], ["businessCount", "Businesses owned"], ["ownership", "Ownership percentage"], ["coOwners", "Co-owners"], ["advisors", "Advisor involvement"]] },
  { title: "Transition goal", fields: [["transitionGoal", "Transition goal"], ["timeline", "Target timeline"], ["goalNotes", "What would a successful transition protect?"]] },
  { title: "Business", fields: [["businessName", "Business name"], ["anonymousName", "Anonymous display name"], ["industry", "Industry"], ["subindustry", "Subindustry"], ["headquarters", "Headquarters"], ["serviceArea", "Service area"], ["founded", "Year founded"], ["entityType", "Entity type"], ["website", "Website"], ["employees", "Employees"], ["ownerRole", "Owner role"], ["licenses", "Licenses or certifications"]] },
  { title: "Financial snapshot", fields: [["revenue", "Annual revenue range"], ["sde", "SDE range"], ["ebitda", "EBITDA range"], ["askingPrice", "Asking price / range"], ["expectedValue", "Expected valuation range"], ["recurringRevenue", "Recurring revenue %"], ["customerConcentration", "Largest customer %"], ["grossMargin", "Gross margin range"], ["businessDebt", "Existing business debt"], ["workingCapital", "Working-capital requirement"], ["capex", "Capital expenditures"], ["revenueTrend", "Revenue trend"]] },
  { title: "Transaction preferences", fields: [["saleType", "Asset or equity preference"], ["saleScope", "Full or partial sale"], ["sellerFinancing", "Seller financing openness"], ["cashAtClose", "Desired cash at closing"], ["rollover", "Retained equity"], ["earnout", "Earnout openness"], ["transitionPeriod", "Desired transition period"], ["postCloseRole", "Post-close role"], ["buyerProfile", "Preferred buyer profile"], ["confidentiality", "Confidentiality requirements"]] },
  { title: "Support requested", fields: [["support", "Primary support requested"], ["supportDetails", "Specific help or context"], ["documentStatus", "Current document readiness"]] },
];

const selectOptions: Record<string, string[]> = {
  industry: verticalIndustryNames,
  preferredContact: ["Email", "Phone", "Text", "Advisor"],
  transitionGoal: ["Sell immediately", "Sell within 6 months", "Sell within 12 months", "Sell within 12–24 months", "Explore options", "Increase value before selling", "Family succession", "Management buyout", "Partner buyout", "Employee ownership", "Partial sale", "Recapitalization", "Already have a buyer", "Confidential buyer search"],
  timeline: ["Immediately", "0–6 months", "6–12 months", "12–24 months", "Undecided"],
  revenue: ["Under $500K", "$500K–$1M", "$1M–$2M", "$2M–$5M", "$5M–$10M", "$10M+"],
  sde: ["Not calculated", "Under $250K", "$250K–$500K", "$500K–$1M", "$1M+"],
  ebitda: ["Not calculated", "Under $250K", "$250K–$500K", "$500K–$1M", "$1M–$3M", "$3M+"],
  revenueTrend: ["Growing", "Stable", "Uneven", "Declining", "Turnaround"],
  saleType: ["Asset sale", "Equity sale", "Open to either", "Professional review needed"],
  saleScope: ["Full sale", "Majority sale", "Minority / partial sale", "Recapitalization", "Exploring"],
  sellerFinancing: ["Open", "Possibly", "Not currently", "Needs scenario review"],
  earnout: ["Open", "Possibly", "Not currently"],
  confidentiality: ["Public", "Anonymous teaser", "Verified-buyer only", "Private mandate", "Coming to market"],
  support: ["Exit Readiness assessment", "Value-improvement plan", "Listing preparation", "Anonymous teaser", "Buyer sourcing", "Buyer qualification", "Acquisition financing", "Seller financing structure", "Management-buyout planning", "Family-succession planning", "Partner-buyout planning", "Advisor introduction", "Document preparation", "Private deal room"],
};

const defaultSeller: FormState = {
  ownerName: "", email: "", phone: "", transitionGoal: "Explore options", timeline: "12–24 months",
  businessName: "", anonymousName: "", industry: "", confidentiality: "Anonymous teaser",
  support: "Exit Readiness assessment", verification: "Seller-provided · unverified",
};

function formatPath(path: string) {
  return path.replace(/^\//, "").split("/").filter(Boolean);
}

export default function ExchangeApp({ initialPath = "/" }: { initialPath?: string }) {
  const [path, setPath] = useState(initialPath);
  const [mobileNav, setMobileNav] = useState(false);
  const [seller, setSeller] = useState<FormState>(defaultSeller);
  const [sellerStep, setSellerStep] = useState(0);
  const [visibility, setVisibility] = useState("Anonymous teaser");
  const [saved, setSaved] = useState("");
  const [scores, setScores] = useState<ReadinessScores>({});
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [selectedListing, setSelectedListing] = useState(listings[0]);
  const [adminStatus, setAdminStatus] = useState("Admin Review");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [workspace, setWorkspace] = useState<V2Workspace>(defaultWorkspace);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    queueMicrotask(() => {
      const draft = window.localStorage.getItem("ste-seller-draft");
      if (draft) {
        const parsedSeller = JSON.parse(draft);
        setSeller({ ...defaultSeller, ...parsedSeller });
        if (parsedSeller.confidentiality) setVisibility(parsedSeller.confidentiality);
      }
      const v2 = window.localStorage.getItem("ste-v2-workspace");
      if (v2) {
        const parsedWorkspace = JSON.parse(v2);
        setWorkspace({ ...defaultWorkspace, ...parsedWorkspace, moduleStatus: { ...emptyModuleStatus, ...parsedWorkspace.moduleStatus } });
      }
      setWorkspaceReady(true);
    });
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (workspaceReady) window.localStorage.setItem("ste-v2-workspace", JSON.stringify(workspace));
  }, [workspace, workspaceReady]);

  function go(next: string) {
    if (protectedClientPrefixes.some((prefix) => next === prefix || next.startsWith(`${prefix}/`))) {
      window.location.assign(next);
      return;
    }
    window.history.pushState({}, "", next);
    setPath(next);
    setMobileNav(false);
    setPlatformOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const updateDigital = useCallback((patch: Partial<DigitalWorkspace>) => {
    setWorkspace((current) => ({ ...current, digital: { ...current.digital, ...patch }, moduleStatus: { ...current.moduleStatus, "Digital Businesses": "In Progress" } }));
  }, []);

  const updateQuietStatus = useCallback((status: string) => {
    const supported: ModuleStatus[] = ["Not Started", "In Progress", "Needs Information", "Needs Review", "Ready", "Approved", "Active", "Paused", "Completed", "Archived"];
    const next = supported.includes(status as ModuleStatus) ? status as ModuleStatus : "In Progress";
    setWorkspace((current) => ({ ...current, currentStage: "Match", moduleStatus: { ...current.moduleStatus, "Quiet Exit Network": next } }));
  }, []);

  async function persist(kind: string, payload: unknown) {
    try {
      const response = await fetch("/api/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, payload }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  function choosePathway(key: string) {
    const map: Record<string, Partial<FormState>> = {
      "sell-now": { transitionGoal: "Sell immediately", timeline: "Immediately", support: "Listing preparation" },
      "future-sale": { transitionGoal: "Sell within 12–24 months", timeline: "12–24 months", support: "Exit Readiness assessment" },
      "value-first": { transitionGoal: "Increase value before selling", timeline: "12–24 months", support: "Value-improvement plan" },
      confidential: { transitionGoal: "Confidential buyer search", confidentiality: "Private mandate", support: "Private deal room" },
      succession: { transitionGoal: "Family succession", support: "Family-succession planning" },
      "buyer-search": { transitionGoal: "Explore options", support: "Buyer sourcing" },
      "buyer-financing": { transitionGoal: "Already have a buyer", support: "Acquisition financing" },
    };
    const pathwayUpdate = map[key] ?? {};
    setSeller((current) => ({ ...current, ...pathwayUpdate } as FormState));
    if (key === "confidential") window.localStorage.setItem("ste-seller-draft", JSON.stringify({ ...seller, ...pathwayUpdate }));
    if (key === "value-first") go("/value-builder");
    else if (key === "buyer-financing") go("/acquisition-financing");
    else if (key === "confidential") go("/seller/quiet-exit");
    else go("/sell");
  }

  const assessment = useMemo(() => {
    const answered = readinessItems.filter((item) => scores[item] !== undefined);
    const total = answered.reduce((sum, item) => sum + (scores[item] ?? 0), 0);
    const percent = answered.length ? Math.round((total / (answered.length * 4)) * 100) : 0;
    const category = percent >= 80 ? "Market-ready foundation" : percent >= 60 ? "Build before launch" : percent >= 40 ? "Material preparation required" : "Early transition planning";
    const lows = readinessItems.filter((item) => (scores[item] ?? 0) <= 1).slice(0, 4);
    return { percent, category, lows };
  }, [scores]);

  const route = formatPath(path);
  const activeListing = listings.find((listing) => listing.slug === route[1]);
  const activeResource = route[0] === "resources" && route[1] ? resourceGuides.find((guide) => guide.slug === route[1]) : undefined;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <button className="brand" onClick={() => go("/")} aria-label="Seller Transition Exchange home">
          <span className="brand-mark">STX</span>
          <span><strong>SELLER TRANSITION</strong><small>EXCHANGE</small></span>
        </button>
        <nav className={mobileNav ? "main-nav open" : "main-nav"} aria-label="Primary">
          {nav.map(([label, href]) => <button key={href} className={path.startsWith(href) ? "active" : ""} onClick={() => go(href)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          <button className="ghost compact platform-trigger" onClick={() => setPlatformOpen(true)}>Platform</button>
          <button className="ghost compact" onClick={() => go("/seller/transition")}>My transition</button>
          <button className="nav-toggle" onClick={() => setMobileNav(!mobileNav)} aria-expanded={mobileNav}>Menu</button>
        </div>
      </header>

      <nav className="stage-rail" aria-label="Seller transition stages">
        {stages.map((stage, index) => <button key={stage.name} className={workspace.currentStage === stage.name ? "active" : ""} onClick={() => go(stage.route)}><span>0{index + 1}</span>{stage.name}</button>)}
      </nav>

      <nav className="module-subnav" aria-label="Business marketplace navigation"><span>BUSINESSES</span><button onClick={() => go("/businesses-for-sale")}>Native listings</button><button className={path.startsWith("/quiet-exit") || path.startsWith("/seller/quiet-exit") || (path.startsWith("/buyer/") && !path.startsWith("/buyer/financing") && !path.startsWith("/buyer/transition-")) ? "active" : ""} onClick={() => go("/quiet-exit")}>Quiet Exit</button><button className={path.startsWith("/digital-businesses") ? "active" : ""} onClick={() => go("/digital-businesses")}>Digital Businesses</button><button className={path.startsWith("/change-of-ownership") || path.startsWith("/seller/transition-plans") || path.startsWith("/buyer/transition-") ? "active" : ""} onClick={() => go("/change-of-ownership")}>Transition Planning</button><button className={path.startsWith("/financing-readiness") || path.startsWith("/capital-desk") || path.startsWith("/seller/financing") || path.startsWith("/buyer/financing") ? "active" : ""} onClick={() => go("/financing-readiness")}>Financing Readiness</button></nav>

      <main id="main-content" tabIndex={-1}>
        {path === "/" && <Home go={go} choosePathway={choosePathway} />}
        {path === "/businesses-for-sale" && <Marketplace title="Businesses for sale" subtitle="Structured opportunities with disclosure status, financing context, and seller-controlled access." go={go} />}
        {path === "/confidential-opportunities" && <Marketplace title="Confidential opportunities" subtitle="Identity stays protected while verified buyers demonstrate fit, capacity, and intent." go={go} confidential />}
        {activeListing && <ListingDetail listing={activeListing} onInquiry={() => { setSelectedListing(activeListing); setInquiryOpen(true); }} />}
        {path === "/industries" && <VerticalIntelligenceModule path={path} go={go} listings={listings} />}
        {path.startsWith("/markets") && <NetworkModule path={path} go={go} />}
        {(path.startsWith("/buyers") || path.startsWith("/buyer/") || path.startsWith("/advisors") || path.startsWith("/advisor/") || path.startsWith("/community") || path.startsWith("/seller/buyer") || path.startsWith("/seller/introduction") || path.startsWith("/seller/advisor") || path === "/seller/regional-support" || path.startsWith("/admin/network") || path === "/admin/buyers" || path === "/admin/advisors" || path === "/admin/advisor-verification" || path === "/admin/introduction-requests" || path === "/admin/regions" || path === "/admin/events" || path === "/admin/network-audit") && <NetworkModule path={path} go={go} />}
        {route[0] === "industries" && route[1] && <VerticalIntelligenceModule path={path} go={go} listings={listings} />}
        {path === "/sell" && <SellerIntake seller={seller} setSeller={setSeller} step={sellerStep} setStep={setSellerStep} visibility={visibility} setVisibility={setVisibility} saved={saved} onSave={async () => {
          window.localStorage.setItem("ste-seller-draft", JSON.stringify(seller));
          const ok = await persist("seller_bundle", { seller, visibility });
          setSaved(ok ? "Profile and business record saved for admin review." : "Draft saved on this device. Durable sync will activate with the production data service.");
        }} />}
        {path === "/exit-readiness" && <Readiness scores={scores} setScores={setScores} assessment={assessment} done={assessmentDone} setDone={setAssessmentDone} onSave={() => persist("readiness_assessment", { scores, assessment })} go={go} />}
        {path === "/value-builder" && <ValueBuilder go={go} />}
        {path === "/digital-businesses" && <DigitalBusinessHome go={go} digital={workspace.digital} updateDigital={updateDigital} />}
        {path === "/digital-businesses/marketplace" && <DigitalMarketplace go={go} updateDigital={updateDigital} />}
        {path === "/digital-businesses/valuation" && <DigitalValuationLab go={go} updateDigital={updateDigital} />}
        {path === "/digital-businesses/sell" && <DigitalSell go={go} digital={workspace.digital} updateDigital={updateDigital} />}
        {path === "/digital-businesses/buy" && <DigitalBuy go={go} digital={workspace.digital} updateDigital={updateDigital} />}
        {path === "/digital-businesses/resources" && <DigitalResources go={go} />}
        {route[0] === "digital-businesses" && route[1] === "opportunities" && route[2] && <DigitalOpportunity listingId={route[2]} go={go} />}
        {path === "/platform" && <PlatformDirectory go={go} workspace={workspace} />}
        {path === "/transition" && <TransitionCommandCenter go={go} seller={seller} visibility={visibility} assessment={assessment} assessmentDone={assessmentDone} adminStatus={adminStatus} workspace={workspace} setWorkspace={setWorkspace} />}
        {["/seller/transition", "/seller/tasks", "/seller/activity", "/seller/evidence", "/admin/operations", "/admin/reviews", "/admin/evidence", "/admin/access"].includes(path) && <TransactionOSModule path={path} go={go} />}
        {(path.startsWith("/change-of-ownership") || path.startsWith("/seller/transition-plans") || path.startsWith("/buyer/transition-") || path === "/buyer/legacy-profile" || path.startsWith("/admin/transition") || path === "/admin/legacy-matches" || path === "/admin/successor-review" || path === "/legacy-matching" || path === "/transition-planning") && <ChangeOfOwnershipModule path={path} go={go} workspace={workspace} setWorkspace={setWorkspace} />}
        {(path === "/quiet-exit" || path.startsWith("/quiet-exit/") || path === "/seller/quiet-exit" || path.startsWith("/seller/quiet-exit/") || path === "/buyer/confidential-opportunities" || path === "/buyer/access-requests" || path === "/admin/quiet-exit" || path.startsWith("/admin/quiet-exit/") || path === "/admin/buyer-verification" || path === "/admin/disclosure-review") && <QuietExitModule path={path} go={go} onStatus={updateQuietStatus} />}
        {(path === "/financing-readiness" || path === "/financing-readiness/how-it-works" || path === "/financing-readiness/requirements" || path === "/capital-desk" || path === "/capital-desk/resources" || path.startsWith("/seller/financing") || path.startsWith("/buyer/financing") || path === "/admin/capital-desk" || path.startsWith("/admin/capital-desk/") || path === "/admin/funding-partners" || path === "/admin/financing-review") && <CapitalDeskModule path={path} go={go} workspace={workspace} setWorkspace={setWorkspace} />}
        {path === "/vertical-intelligence" && <VerticalIntelligence />}
        {(path === "/deal-room" || path === "/seller-launch-studio" || path.startsWith("/seller/launch-studio") || path.startsWith("/seller/deal-room") || path.startsWith("/buyer/deal-room") || path === "/admin/launch-studio" || path.startsWith("/admin/generated-materials") || path === "/admin/deal-rooms" || path.startsWith("/admin/deal-rooms/")) && <LaunchStudioDealRoomModule path={path === "/deal-room" ? "/seller/deal-room" : path === "/seller-launch-studio" ? "/seller/launch-studio" : path} go={go} />}
        {path === "/buyer-matching" && <BuyerMatching workspace={workspace} setWorkspace={setWorkspace} go={go} />}
        {path === "/acquisition-financing" && <Financing onSave={(payload) => persist("financing_request", payload)} go={go} />}
        {path === "/financing" && <Financing onSave={(payload) => persist("financing_request", payload)} go={go} />}
        {path === "/resources" && <Resources go={go} />}
        {activeResource && <ResourceGuidePage guide={activeResource} go={go} />}
        {path.startsWith("/seller/") && !["/seller/transition", "/seller/tasks", "/seller/activity", "/seller/evidence"].includes(path) && !path.startsWith("/seller/quiet-exit") && !path.startsWith("/seller/financing") && !path.startsWith("/seller/launch-studio") && !path.startsWith("/seller/deal-room") && !path.startsWith("/seller/buyer") && !path.startsWith("/seller/introduction") && !path.startsWith("/seller/advisor") && path !== "/seller/regional-support" && <SellerDashboard current={path} go={go} seller={seller} assessment={assessment} saved={saved} workspace={workspace} />}
        {path === "/admin/review" && <AdminReview status={adminStatus} setStatus={setAdminStatus} />}
        {route.length === 0 ? null : !knownRoute(path, activeListing, activeResource) && <NotFound go={go} />}
      </main>

      <footer>
        <div><span className="brand-mark">STX</span><p>Prepare better. Find the right buyer. Finance the transition.</p></div>
        <div className="footer-links"><button onClick={() => go("/sell")}>Start seller path</button><button onClick={() => go("/exit-readiness")}>Assess readiness</button><button onClick={() => go("/admin/review")}>Admin review</button></div>
        <p className="boundary">Readiness, valuation, and financing outputs are educational and preliminary. Seller-provided information remains unverified until reviewed. Legal, tax, brokerage, lending, and transaction services require the appropriate professionals, disclosures, agreements, and licensing frameworks.</p>
      </footer>

      {inquiryOpen && <InquiryDrawer listing={selectedListing} close={() => setInquiryOpen(false)} status={inquiryStatus} submit={async (payload) => {
        const ok = await persist("buyer_inquiry", { listing: selectedListing.slug, ...payload });
        setInquiryStatus(ok ? "Interest submitted as New · Needs Qualification." : "Draft captured. Durable submission activates with the production data service.");
      }} />}
      {platformOpen && <PlatformDrawer current={path} go={go} close={() => setPlatformOpen(false)} workspace={workspace} />}
    </div>
  );
}

function knownRoute(path: string, activeListing: typeof listings[number] | undefined, activeResource: ResourceGuide | undefined) {
  return path === "/" || !!activeListing || !!activeResource || ["/businesses-for-sale", "/confidential-opportunities", "/industries", "/markets", "/sell", "/exit-readiness", "/value-builder", "/platform", "/transition", "/quiet-exit", "/quiet-exit/how-it-works", "/quiet-exit/confidentiality", "/quiet-exit/buyer-qualification", "/quiet-exit/resources", "/financing-readiness", "/financing-readiness/how-it-works", "/financing-readiness/requirements", "/capital-desk", "/capital-desk/resources", "/vertical-intelligence", "/legacy-matching", "/transition-planning", "/change-of-ownership", "/deal-room", "/buyer-matching", "/acquisition-financing", "/financing", "/resources", "/advisors", "/seller-launch-studio", "/admin/review", "/admin/operations", "/admin/reviews", "/admin/evidence", "/admin/access", "/admin/launch-studio", "/admin/deal-rooms", "/admin/quiet-exit", "/admin/buyer-verification", "/admin/disclosure-review", "/admin/capital-desk", "/admin/funding-partners", "/admin/financing-review", "/buyer/profile", "/buyer/verification", "/buyer/legacy-profile", "/buyer/confidential-opportunities", "/buyer/access-requests", "/buyer/deal-room", "/digital-businesses", "/digital-businesses/marketplace", "/digital-businesses/valuation", "/digital-businesses/sell", "/digital-businesses/buy", "/digital-businesses/resources", "/buyers", "/buyers/how-it-works", "/buyers/types", "/buyers/resources", "/advisors/categories", "/advisors/how-it-works", "/advisors/resources", "/community", "/community/events", "/community/roundtables", "/community/workshops", "/community/newsletter", "/admin/network", "/admin/buyers", "/admin/advisors", "/admin/advisor-verification", "/admin/introduction-requests", "/admin/regions", "/admin/events", "/admin/network-audit"].includes(path) || path.startsWith("/change-of-ownership/") || path.startsWith("/digital-businesses/opportunities/") || path.startsWith("/seller/") || path.startsWith("/buyer/") || path.startsWith("/buyers/") || path.startsWith("/advisor/") || path.startsWith("/advisors/") || path.startsWith("/community/") || path.startsWith("/admin/transition") || path.startsWith("/admin/generated-materials/") || path.startsWith("/admin/deal-rooms/") || path.startsWith("/admin/capital-desk/") || path.startsWith("/admin/quiet-exit/") || path.startsWith("/admin/network/") || path.startsWith("/industries/") || path.startsWith("/markets/");
}

function Home({ go, choosePathway }: { go: (path: string) => void; choosePathway: (key: string) => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>PRIVATE-MARKET INFRASTRUCTURE</span> · SELLER FIRST</p>
          <h1>Your business deserves a better exit than <em>“list it and hope.”</em></h1>
          <p>Prepare the business. Protect confidentiality. Find qualified buyers. Structure a transition that works for the owner, employees, customers, and capital stack.</p>
          <div className="actions"><button className="primary" onClick={() => choosePathway("sell-now")}>Start my seller path <span>↗</span></button><button className="secondary" onClick={() => go("/exit-readiness")}>Assess exit readiness</button></div>
          <div className="micro-actions"><button onClick={() => go("/businesses-for-sale")}>Explore businesses</button><button onClick={() => choosePathway("confidential")}>Submit confidential opportunity</button></div>
        </div>
        <div className="deal-console">
          <div className="console-head"><span>TRANSITION CONTROL</span><span className="live-dot">OPERATING</span></div>
          <div className="console-score"><span>READINESS</span><strong>—</strong><small>Complete assessment</small></div>
          <div className="console-grid">
            <div><span>Disclosure</span><strong>Seller-controlled</strong></div>
            <div><span>Publication</span><strong>Admin approval</strong></div>
            <div><span>Buyer access</span><strong>Qualified first</strong></div>
            <div><span>Capital desk</span><strong>Structure-led</strong></div>
          </div>
          <blockquote>“Confidentiality is a workflow—not a checkbox.”</blockquote>
        </div>
      </section>

      <div className="operator-rail" aria-label="Platform operating sequence">
        <span><b>01</b> Prepare evidence</span>
        <span><b>02</b> Control disclosure</span>
        <span><b>03</b> Qualify interest</span>
        <span><b>04</b> Structure transition</span>
      </div>

      <section className="pathways section">
        <div className="section-head"><div><p className="kicker">CHOOSE YOUR TRANSITION PATH</p><h2>Seven owner realities. Seven distinct workflows.</h2></div><p>The platform begins where you actually are—not where a generic intake form wishes you were.</p></div>
        <div className="path-grid">
          {pathways.map(([title, key, copy], index) => <button key={key} className="path-card" onClick={() => choosePathway(key)}>
            <span className="path-index">0{index + 1}</span><h3>{title}</h3><p>{copy}</p><span className="path-arrow">Launch workflow ↗</span>
          </button>)}
        </div>
      </section>

      <section className="process section">
        <div className="section-head"><div><p className="kicker">THE OPERATING SEQUENCE</p><h2>Prepare before the market prices the problems for you.</h2></div></div>
        <div className="process-grid">{[
          ["01", "Diagnose", "Score readiness, marketability, documentation, and buyer risk."],
          ["02", "Prepare", "Build the profile, teaser, evidence package, and continuity plan."],
          ["03", "Control", "Choose visibility, qualify interest, and govern disclosure."],
          ["04", "Structure", "Align price, equity, debt, seller note, working capital, and transition."],
        ].map(([n, title, copy]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="split-feature section">
        <div className="score-preview">
          <p className="kicker">EXIT READINESS</p><h2>Know what buyers will notice before buyers notice it.</h2>
          <p>Assess 19 operating factors, surface value suppressors, and leave with one executable first action.</p>
          <div className="metric-row"><div><strong>19</strong><span>risk factors</span></div><div><strong>90</strong><span>day priorities</span></div><div><strong>12</strong><span>month roadmap</span></div></div>
          <button className="primary" onClick={() => go("/exit-readiness")}>Run the assessment</button>
        </div>
        <div className="visibility-preview">
          <p className="kicker">DISCLOSURE ARCHITECTURE</p><h3>Public when useful. Private where essential.</h3>
          {["Public listing", "Anonymous teaser", "Verified-buyer only", "Private mandate", "Coming to market"].map((item, index) => <div className="visibility-line" key={item}><span>0{index + 1}</span><strong>{item}</strong><small>{index === 0 ? "Market-facing" : index === 4 ? "Future pipeline" : "Controlled access"}</small></div>)}
        </div>
      </section>

      <section className="studio-strip section">
        <div><p className="kicker">SELLER LAUNCH STUDIO</p><h2>Turn owner knowledge into transaction-ready drafts.</h2><p>Generate an editable listing, anonymous teaser, transition narrative, buyer FAQ, document checklist, and financing summary—each clearly marked for seller and professional review.</p></div>
        <button className="primary light" onClick={() => go("/seller-launch-studio")}>Open launch studio</button>
      </section>

      <section className="catalog-section section">
        <div className="section-head"><div><p className="kicker">MARKET INTELLIGENCE</p><h2>Built for the businesses people actually operate.</h2></div><button className="text-button" onClick={() => go("/industries")}>View every industry →</button></div>
        <div className="tag-cloud">{industries.map((industry) => <button key={industry} onClick={() => go(`/industries/${industry.toLowerCase().replaceAll(" ", "-")}`)}>{industry}<span>↗</span></button>)}</div>
      </section>

      <section className="capital-band section">
        <div><p className="kicker">CHANGE-OF-OWNERSHIP CAPITAL DESK</p><h2>The deal has to work after the headline price.</h2></div>
        <p>Model buyer equity, acquisition debt, seller notes, earnouts, working capital, equipment needs, and rollover equity—without turning an educational scenario into a fictional approval.</p>
        <button className="primary" onClick={() => go("/acquisition-financing")}>Structure the transition</button>
      </section>

      <section className="market-section section"><div className="section-head"><div><p className="kicker">DMV-FIRST REGIONAL LAYER</p><h2>Local continuity deserves local context.</h2></div></div><div className="market-grid">{markets.map((market) => <button key={market} onClick={() => go(`/markets/${market.toLowerCase().replaceAll(/[,.]/g, "").replaceAll(" ", "-")}`)}><span>{market}</span><small>Listings · advisors · buyers · events</small></button>)}</div></section>

      <section className="final-cta section"><p className="kicker">THE NEXT MOVE</p><h2>A strong exit starts before the listing goes live.</h2><div className="actions"><button className="primary light" onClick={() => choosePathway("future-sale")}>Build my transition plan</button><button className="secondary light-border" onClick={() => go("/resources")}>Explore seller resources</button></div></section>
    </>
  );
}

function Marketplace({ title, subtitle, go, confidential = false }: { title: string; subtitle: string; go: (path: string) => void; confidential?: boolean }) {
  const [industry, setIndustry] = useState("All industries");
  const [subindustry, setSubindustry] = useState("All subindustries");
  const [region, setRegion] = useState("All regions");
  const [access, setAccess] = useState("All access levels");
  const [recurringProfile, setRecurringProfile] = useState("All recurring profiles");
  const [transactionPath, setTransactionPath] = useState("All transaction paths");
  const [financingReview, setFinancingReview] = useState("All financing review states");
  const industryOptions = Array.from(new Set([...industries, ...listings.map((listing) => listing.industry)]));
  const subindustryOptions = ["All subindustries", "Field Services", "Recurring Home Services", "Digital Information Asset", "Not provided"];
  const recurringOptions = ["All recurring profiles", "Recurring revenue indicated", "Not provided"];
  const transactionOptions = ["All transaction paths", "External sale", "Seller-financed transition", "Private mandate", "Not provided"];
  const financingOptions = ["All financing review states", "Financing review pending", "Documents in preparation", "Structure analysis required", "Not provided"];
  const base = confidential ? listings.filter((listing) => listing.visibility !== "Public listing") : listings;
  const visible = base.filter((listing) =>
    (industry === "All industries" || listing.industry === industry) &&
    (subindustry === "All subindustries" || (demoListingFacets[listing.slug]?.subindustry ?? "Not provided") === subindustry) &&
    (region === "All regions" || listing.location.includes(region)) &&
    (access === "All access levels" || listing.visibility === access) &&
    (recurringProfile === "All recurring profiles" || (demoListingFacets[listing.slug]?.recurringProfile ?? "Not provided") === recurringProfile) &&
    (transactionPath === "All transaction paths" || (demoListingFacets[listing.slug]?.transactionPath ?? "Not provided") === transactionPath) &&
    (financingReview === "All financing review states" || (demoListingFacets[listing.slug]?.financingReview ?? "Not provided") === financingReview)
  );
  return <PageFrame eyebrow="CONTROLLED MARKETPLACE" title={title} intro={subtitle}>
    <DigitalBridge go={go} context="marketplace" />
    <div className="filter-bar marketplace-filter-bar"><label>Industry<select aria-label="Broad industry" value={industry} onChange={(event) => setIndustry(event.target.value)}><option>All industries</option>{industryOptions.map((x) => <option key={x}>{x}</option>)}</select></label><label>Subindustry<select aria-label="Subindustry" value={subindustry} onChange={(event) => setSubindustry(event.target.value)}>{subindustryOptions.map((x) => <option key={x}>{x}</option>)}</select></label><label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option>All regions</option>{markets.map((x) => <option key={x}>{x}</option>)}</select></label><label>Recurring revenue<select aria-label="Recurring revenue profile" value={recurringProfile} onChange={(event) => setRecurringProfile(event.target.value)}>{recurringOptions.map((x) => <option key={x}>{x}</option>)}</select></label><label>Transaction path<select aria-label="Transaction path" value={transactionPath} onChange={(event) => setTransactionPath(event.target.value)}>{transactionOptions.map((x) => <option key={x}>{x}</option>)}</select></label><label>Financing review<select aria-label="Financing review status" value={financingReview} onChange={(event) => setFinancingReview(event.target.value)}>{financingOptions.map((x) => <option key={x}>{x}</option>)}</select></label><label>Visibility<select aria-label="Confidentiality level" value={access} onChange={(event) => setAccess(event.target.value)}><option>All access levels</option><option>Anonymous teaser</option><option>Verified-buyer only</option><option>Private mandate</option></select></label><span>{visible.length} demo {visible.length === 1 ? "opportunity" : "opportunities"}</span><button className="text-button" onClick={() => { setIndustry("All industries"); setSubindustry("All subindustries"); setRegion("All regions"); setAccess("All access levels"); setRecurringProfile("All recurring profiles"); setTransactionPath("All transaction paths"); setFinancingReview("All financing review states"); }}>Reset all filters</button></div>
    <div className="demo-notice"><strong>Demonstration records</strong><span>These listings illustrate data structure and disclosure behavior. They are not active acquisition opportunities.</span></div>
    {visible.length === 0 ? <div className="empty-filter"><span>ZERO MATCHES</span><h2>The market answered honestly.</h2><p>Widen the criteria or reset the filters. Controlled marketplaces build trust by showing zero when zero is the answer.</p><button className="primary" onClick={() => { setIndustry("All industries"); setSubindustry("All subindustries"); setRegion("All regions"); setAccess("All access levels"); setRecurringProfile("All recurring profiles"); setTransactionPath("All transaction paths"); setFinancingReview("All financing review states"); }}>Reset filters</button></div> : <div className="listing-grid">{visible.map((listing, index) => <article className="listing-card" key={listing.slug}>
      <span className="listing-index">{String(index + 1).padStart(3, "0")}</span>
      <div className="listing-meta"><span className="badge demo">{listing.verification}</span><span className="badge">{listing.visibility}</span></div>
      <h3>{listing.title}</h3><p>{listing.industry} · {listing.location}</p>
      <div className="listing-numbers"><div><span>Revenue</span><strong>{listing.revenue}</strong></div><div><span>Earnings</span><strong>{listing.earnings}</strong></div><div><span>Price</span><strong>{listing.price}</strong></div></div>
      <div className="listing-flags"><span>{listing.sellerNote}</span><span>{listing.finance}</span></div>
      <button className="secondary" onClick={() => go(`/businesses-for-sale/${listing.slug}`)}>Review structured teaser</button>
    </article>)}</div>}
  </PageFrame>;
}

function ListingDetail({ listing, onInquiry }: { listing: typeof listings[number]; onInquiry: () => void }) {
  return <PageFrame eyebrow={`${listing.visibility.toUpperCase()} · DEMO RECORD`} title={listing.title} intro={`${listing.industry} · ${listing.location}`}>
    <div className="detail-layout">
      <div className="detail-main">
        <div className="demo-notice"><strong>Demo · seller-provided · unverified</strong><span>This page demonstrates disclosure controls. No real company, owner, financial result, or transaction is represented.</span></div>
        {[
          ["Overview", "Illustrative established operator serving a defensible regional customer base through repeat service relationships."],
          ["Business highlights", "Long operating history, documented service process, recognizable local market position, and multiple growth levers."],
          ["Revenue model", "Mix of recurring service agreements and project revenue. Exact composition requires verified financial review."],
          ["Customers", "Concentration, tenure, contracts, and transferability remain gated pending qualification and disclosure approval."],
          ["Operations & employees", "Field operations, scheduling, management depth, retention, licensing, and owner dependence require diligence."],
          ["Assets, equipment & real estate", "Equipment and facility status will be disclosed through the controlled document workflow."],
          ["Growth opportunities", "Sales process, pricing discipline, route density, recurring agreements, and adjacent-market expansion."],
          ["Reason for transition", "Seller transition narrative is withheld from the public teaser."],
          ["Desired buyer", "Qualified operator or buyer group with relevant experience, adequate liquidity, and a continuity-minded transition plan."],
          ["Financing considerations", "Buyer equity, debt capacity, seller note, working capital, and equipment needs require a full underwriting package."],
        ].map(([heading, copy]) => <section className="detail-section" key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}
      </div>
      <aside className="deal-aside">
        <div><span>Revenue</span><strong>{listing.revenue}</strong></div><div><span>Earnings</span><strong>{listing.earnings}</strong></div><div><span>Asking price</span><strong>{listing.price}</strong></div><div><span>Status</span><strong>{listing.status}</strong></div><div><span>Financing</span><strong>{listing.finance}</strong></div>
        <button className="primary" onClick={onInquiry}>Request information</button><small>Seller contact information is never exposed directly.</small>
      </aside>
    </div>
  </PageFrame>;
}

function SellerIntake({ seller, setSeller, step, setStep, visibility, setVisibility, saved, onSave }: { seller: FormState; setSeller: (next: FormState | ((current: FormState) => FormState)) => void; step: number; setStep: (n: number) => void; visibility: string; setVisibility: (v: string) => void; saved: string; onSave: () => void }) {
  const current = sellerSteps[step];
  const verticalSkill = skillForIndustry(String(seller.industry || ""));
  const overlayFields = verticalSkill?.assessmentQuestions.slice(0, 3) ?? [];
  return <PageFrame eyebrow="SELLER INTAKE" title="Build the transition record once." intro="Create the owner profile, business record, transaction preferences, and controlled disclosure plan.">
    <div className="workflow-layout">
      <aside className="step-rail">{sellerSteps.map((item, index) => <button key={item.title} className={step === index ? "current" : index < step ? "done" : ""} onClick={() => setStep(index)}><span>{index < step ? "✓" : `0${index + 1}`}</span><strong>{item.title}</strong></button>)}</aside>
      <section className="form-panel">
        <div className="form-heading"><span>STEP {step + 1} OF {sellerSteps.length}</span><h2>{current.title}</h2><p>Information is seller-provided and unverified until evidence review is completed.</p></div>
        <div className="form-grid">{current.fields.map(([key, label]) => <Field key={key} name={key} label={label} value={String(seller[key] ?? "")} onChange={(value) => setSeller((prev) => ({ ...prev, [key]: value }))} />)}</div>
        {step === 2 && verticalSkill && <section className="seller-vertical-overlay" aria-labelledby="seller-vertical-overlay-title"><div className="panel-head"><div><span className="kicker">VERTICAL SELLER INTELLIGENCE</span><h3 id="seller-vertical-overlay-title">{verticalSkill.skillName}</h3></div><span className="badge">{verticalSkill.sourceClassification} · no duplicate record</span></div><p>{verticalSkill.overview} This overlay writes into the existing seller and business draft; it does not create a second business or assessment.</p><div className="overlay-evidence"><span>Required evidence to organize</span><strong>{verticalSkill.requiredEvidence.slice(0, 3).join(" · ")}</strong></div><div className="form-grid">{overlayFields.map((question, index) => { const key = `verticalQuestion${index + 1}`; return <Field key={key} name={key} label={question} value={String(seller[key] ?? "")} onChange={(value) => setSeller((prev) => ({ ...prev, [key]: value }))} />; })}</div><small>Seller-provided and unverified until evidence review. Use the selected industry pack to inform readiness, listing fields, buyer diligence, and Value Builder recommendations.</small></section>}
        {step === 4 && <div className="priority-row"><label><input type="checkbox" /> Employee retention is a priority</label><label><input type="checkbox" /> Brand continuity is a priority</label><label><input type="checkbox" /> Real estate may be included</label></div>}
        {step === 5 && <VisibilityPicker value={visibility} onChange={(next) => { setVisibility(next); setSeller((prev) => ({ ...prev, confidentiality: next })); }} />}
        <div className="form-actions"><button className="secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</button>{step < sellerSteps.length - 1 ? <button className="primary" onClick={() => setStep(step + 1)}>Continue</button> : <button className="primary" onClick={onSave}>Save and submit for review</button>}</div>
        {saved && <p className="success-message">{saved}</p>}
      </section>
    </div>
  </PageFrame>;
}

function Field({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  const options = selectOptions[name];
  return <label className={name.includes("Notes") || name.includes("Details") ? "wide" : ""}><span>{label}</span>{options ? <select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} />}</label>;
}

function VisibilityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const levels = [
    ["Public listing", "Business name and approved financial summary may appear publicly."],
    ["Anonymous teaser", "Generalized industry, region, ranges, and highlights. Identity stays hidden."],
    ["Verified-buyer only", "Limited teaser until buyer profile, capacity, criteria, and confidentiality steps are complete."],
    ["Private mandate", "Visible only to approved buyers and internal administrators."],
    ["Coming to market", "Signals preparation stage and timing without presenting an active listing."],
  ];
  return <div className="visibility-picker"><h3>Choose listing visibility</h3>{levels.map(([title, copy]) => <button key={title} className={value === title ? "selected" : ""} onClick={() => onChange(title)}><span className="radio">{value === title ? "●" : "○"}</span><div><strong>{title}</strong><p>{copy}</p></div></button>)}</div>;
}

function ResourceShelf({ title, intro, slugs, go }: { title: string; intro: string; slugs: string[]; go: (path: string) => void }) {
  const guides = [...new Set(slugs)].map((slug) => resourceGuides.find((guide) => guide.slug === slug)).filter(Boolean) as ResourceGuide[];
  return <section className="module-resource-shelf" aria-labelledby={`resource-shelf-${slugs[0]}`}>
    <div><p className="kicker">SELLER RESOURCE LIBRARY</p><h2 id={`resource-shelf-${slugs[0]}`}>{title}</h2><p>{intro}</p></div>
    <div>{guides.map((guide) => <a key={guide.slug} href={`/resources/${guide.slug}`} onClick={(event) => { event.preventDefault(); go(`/resources/${guide.slug}`); }}><span>GUIDE {String(guide.display_order).padStart(2, "0")} · {guide.seller_stage}</span><strong>{guide.title}</strong><small>{guide.estimated_read_time} · {guide.category}</small></a>)}</div>
  </section>;
}

function Readiness({ scores, setScores, assessment, done, setDone, onSave, go }: { scores: ReadinessScores; setScores: (s: ReadinessScores) => void; assessment: { percent: number; category: string; lows: string[] }; done: boolean; setDone: (v: boolean) => void; onSave: () => void; go: (p: string) => void }) {
  const findingGuides = [
    "improving-business-value-before-a-sale",
    ...(assessment.lows.includes("Financial record quality") ? ["organizing-financial-records"] : []),
    ...(assessment.lows.includes("Owner dependence") ? ["reducing-owner-dependence"] : []),
    ...(assessment.lows.includes("Transition planning") ? ["confidential-business-sales"] : []),
  ];
  if (done) return <PageFrame eyebrow="PRELIMINARY EDUCATIONAL ASSESSMENT" title={`${assessment.percent}/100 · ${assessment.category}`} intro="A planning baseline—not a valuation, appraisal, legal opinion, tax opinion, or financing decision.">
    <DigitalBridge go={go} context="readiness" />
    <ResourceShelf title="Guides for the findings on this device" intro="Recommendations are based only on the assessment answers currently stored in this browser. Missing seller context remains unassumed." slugs={[...new Set(findingGuides)]} go={go} />
    <div className="report-grid"><div className="report-score"><span>EXIT READINESS</span><strong>{assessment.percent}</strong><small>out of 100</small></div><div className="report-content"><h2>Major value suppressors</h2><ul>{(assessment.lows.length ? assessment.lows : ["No critical low-score items identified in the current responses"]).map((item) => <li key={item}>{item}</li>)}</ul><h2>Recommended sale timeline</h2><p>{assessment.percent >= 80 ? "Begin controlled market preparation after evidence review." : assessment.percent >= 60 ? "Use a focused 3–6 month preparation window before launch." : "Use a 6–12 month stabilization and value-building window before market exposure."}</p><h2>90-day stabilization priorities</h2><p>Improve the lowest-scoring operating factors, organize evidence, assign owners, and document the first repeatable operating cadence.</p><h2>12-month value-building priorities</h2><p>Strengthen revenue quality, reduce owner dependence, deepen management, improve transferability, and build financing-ready documentation.</p><h2>First executable action</h2><p>{assessment.lows[0] ? `Assign an owner to improve ${assessment.lows[0].toLowerCase()} and define the evidence that proves progress.` : "Open Value Builder and convert this score into an accountable operating plan."}</p><div className="actions"><button className="primary" onClick={() => go("/value-builder")}>Build improvement plan</button><button className="secondary" onClick={() => setDone(false)}>Revise answers</button></div></div></div>
  </PageFrame>;
  return <PageFrame eyebrow="EXIT READINESS" title="See the business through a buyer’s eyes." intro="Score each factor from 0 (unprepared) to 4 (strong and evidenced).">
    <DigitalBridge go={go} context="readiness" />
    <ResourceShelf title="Prepare before you score" intro="Use these field guides to understand the evidence behind financial readiness, value building, and owner independence." slugs={["preparing-to-sell-your-business", "organizing-financial-records", "reducing-owner-dependence"]} go={go} />
    <div className="assessment-list">{readinessItems.map((item, index) => <div className="assessment-row" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><div className="score-buttons">{[0, 1, 2, 3, 4].map((score) => <button key={score} className={scores[item] === score ? "selected" : ""} onClick={() => setScores({ ...scores, [item]: score })}>{score}</button>)}</div></div>)}</div>
    <div className="assessment-submit"><div><span>Current score</span><strong>{assessment.percent}/100</strong><small>{Object.keys(scores).length} of {readinessItems.length} factors answered</small></div><button className="primary" disabled={Object.keys(scores).length < readinessItems.length} onClick={() => { setDone(true); onSave(); }}>Generate scored report</button></div>
  </PageFrame>;
}

function ValueBuilder({ go }: { go: (p: string) => void }) {
  const categories = ["Financial cleanup", "Revenue quality", "Margin improvement", "Recurring revenue", "Customer diversification", "Owner independence", "Management development", "Employee retention", "Documentation", "Technology and systems", "Legal and contract cleanup", "Transition planning"];
  return <PageFrame eyebrow="VALUE BUILDER" title="Convert value suppressors into accountable work." intro="Every recommendation carries buyer logic, impact, difficulty, timing, ownership, evidence, and a first move.">
    <DigitalBridge go={go} context="value" />
    <ResourceShelf title="Read the operating playbook behind the plan" intro="Use the guides for context; keep accountable tasks, owners, timing, and evidence in Value Builder." slugs={["improving-business-value-before-a-sale", "reducing-owner-dependence", "organizing-financial-records"]} go={go} />
    <div className="digital-action-strip">{["Reduce platform concentration", "Improve recurring revenue", "Document traffic sources", "Normalize owner add-backs", "Improve analytics history", "Reduce founder dependence", "Document code and systems", "Transfer intellectual property", "Diversify suppliers", "Improve customer retention", "Build standard operating procedures", "Prepare migration documentation", "Define known identifiers", "Generalize exact geography", "Document buyer qualification gates", "Prepare a revocable disclosure policy", "Develop successor capability", "Document management responsibilities", "Prepare governance", "Clarify seller transition role", "Prepare employee communication", "Prepare customer communication", "Document brand and community priorities", "Define seller-financing parameters", "Define hard exclusions", "Prepare continuity documentation"].map((item) => <span key={item}>{item}</span>)}</div>
    <div className="builder-board">{categories.map((category, index) => <article key={category}><div className="builder-head"><span>{String(index + 1).padStart(2, "0")}</span><h3>{category}</h3><span className={`impact ${index < 4 ? "high" : "medium"}`}>{index < 4 ? "High impact" : "Medium impact"}</span></div><p><strong>Why buyers care:</strong> Stronger evidence reduces uncertainty, diligence friction, and perceived transition risk.</p><div className="builder-meta"><span>Difficulty · {index % 3 === 0 ? "High" : "Moderate"}</span><span>Horizon · {index < 4 ? "90 days" : "6–12 months"}</span><span>Owner · Assign</span></div><label><input type="checkbox" /> First action: document current state and name the accountable operator.</label></article>)}</div>
    <div className="sticky-action"><p><strong>Next:</strong> Turn intake data and this plan into seller-ready drafts.</p><div className="actions"><button className="secondary" onClick={() => go("/capital-desk")}>Open Capital Desk</button><button className="primary" onClick={() => go("/seller/launch-studio")}>Open Seller Launch Studio</button></div></div>
  </PageFrame>;
}

function Financing({ onSave, go }: { onSave: (payload: FormState) => Promise<boolean>; go: (p: string) => void }) {
  const [form, setForm] = useState<FormState>({});
  const [result, setResult] = useState("");
  const fields = [["purchasePrice", "Target purchase price"], ["buyerEquity", "Buyer equity"], ["sellerNote", "Seller note"], ["earnout", "Earnout"], ["existingDebt", "Existing business debt"], ["workingCapital", "Working capital"], ["equipment", "Equipment financing"], ["creditRange", "Buyer credit-profile range"], ["liquidity", "Buyer liquidity"], ["experience", "Buyer experience"], ["cashFlow", "Historical business cash flow"], ["closingDate", "Desired closing date"]];
  async function model() {
    await onSave(form);
    const equity = String(form.buyerEquity || "buyer equity");
    const note = String(form.sellerNote || "a possible seller note");
    const wc = String(form.workingCapital || "separately sized working capital");
    setResult(`Educational structure scenario: combine ${equity} with an acquisition loan sized to verified cash flow, evaluate ${note} for alignment or gap coverage, and preserve ${wc}. Equipment needs may be separated when useful. Final eligibility, terms, valuation, rates, and approval require lender underwriting and professional transaction review.`);
  }
  return <PageFrame eyebrow="CHANGE-OF-OWNERSHIP CAPITAL DESK" title="Finance the transition—not just the purchase price." intro="Build an educational structure scenario for an identified buyer, management team, family successor, partner buyout, or acquisition entrepreneur.">
    <DigitalBridge go={go} context="financing" />
    <ResourceShelf title="Financing field guides" intro="Organize the evidence, understand seller-financing risk, and prepare the questions that belong in lender underwriting." slugs={["seller-financing", "sba-acquisition-financing", "organizing-financial-records"]} go={go} />
    <div className="capital-layout"><section className="form-panel"><div className="form-grid">{fields.map(([key, label]) => <Field key={key} name={key} label={label} value={String(form[key] || "")} onChange={(value) => setForm({ ...form, [key]: value })} />)}</div><button className="primary" onClick={model}>Generate structure scenario</button></section><aside className="scenario-panel"><span>STRUCTURE OUTPUT</span>{result ? <><h2>Preliminary scenario</h2><p>{result}</p><ul><li>Buyer equity + acquisition loan</li><li>Seller note + working capital</li><li>Rollover equity or earnout support</li><li>Management, partner, or family buyout variants</li></ul></> : <div className="empty-state"><strong>Numbers first. Narrative second.</strong><p>Complete the intake to produce a scenario grounded in the structure you entered.</p></div>}<small>Educational only. No approval, rate, valuation, eligibility, or transaction completion is promised.</small></aside></div>
  </PageFrame>;
}

function PlatformDirectory({ go, workspace }: { go: (p: string) => void; workspace: V2Workspace }) {
  const entities = ["Seller", "Business", "Listing", "Buyer", "Inquiry", "Exit Readiness Assessment", "Value Builder Plan", "Financing Readiness Review", "Transition Plan", "Legacy Profile", "Buyer Match", "Generated Material", "Deal Room", "Advisor", "Admin Review", "Audit Event"];
  const moduleStatuses: ModuleStatus[] = ["Not Started", "In Progress", "Needs Information", "Needs Review", "Ready", "Approved", "Active", "Paused", "Completed", "Archived"];
  const evidenceStatuses = ["Verified", "Seller Provided", "Buyer Provided", "Advisor Submitted", "Inferred", "Stale", "Conflicting", "Missing", "Demo"];
  return <PageFrame eyebrow="VERSION 2.0 · PLATFORM DIRECTORY" title="One transition system. Nine controlled workstreams." intro="Every module reads from the same seller and business spine. Status is preparation state—not approval, verification, or a predicted transaction outcome.">
    <div className="shared-spine"><span>CANONICAL RECORD SPINE</span><strong>Seller → Business → Listing / Assessment / Plan / Materials / Inquiry</strong><p>Modules do not create duplicate businesses. Missing information stays missing, seller-provided claims stay labeled, and disclosure remains separately approved.</p></div>
    <div className="relationship-grid">{entities.map((entity) => <span key={entity}>{entity}</span>)}</div>
    <div className="module-directory">{platformModules.map((module, index) => <article className="module-card" key={module.name}>
      <div className="module-card-head"><span>0{index + 1} · {module.stage}</span><StatusBadge value={workspace.moduleStatus[module.name]} /></div>
      <h2>{module.name}</h2><p>{module.serves}</p>
      <dl><dt>Inputs required</dt><dd>{module.inputs}</dd><dt>Output produced</dt><dd>{module.output}</dd></dl>
      <button className="secondary" onClick={() => go(module.route)}>{module.action} ↗</button>
    </article>)}</div>
    <div className="module-card module-card-deal"><div><span>09 · PACKAGE</span><h2>Private Deal Room</h2><p>Build the canonical document index, review evidence status, and control item-level access. Secure binary storage stays pending until the authenticated storage layer is configured.</p></div><button className="primary" onClick={() => go("/seller/deal-room")}>Prepare the deal room</button></div>
    <div className="status-contract"><section><span>MODULE STATUS CONTRACT</span><div>{moduleStatuses.map((status) => <StatusBadge key={status} value={status} />)}</div></section><section><span>EVIDENCE STATUS CONTRACT</span><div>{evidenceStatuses.map((status) => <StatusBadge key={status} value={status} evidence />)}</div></section></div>
  </PageFrame>;
}

function TransitionCommandCenter({ go, seller, visibility, assessment, assessmentDone, adminStatus, workspace, setWorkspace }: { go: (p: string) => void; seller: FormState; visibility: string; assessment: { percent: number }; assessmentDone: boolean; adminStatus: string; workspace: V2Workspace; setWorkspace: WorkspaceSetter }) {
  const hasSeller = Boolean(seller.ownerName || seller.email);
  const hasBusiness = Boolean(seller.businessName || seller.anonymousName);
  const missing = [!hasSeller && "Seller profile", !hasBusiness && "Business record", !assessmentDone && "Exit Readiness assessment", workspace.moduleStatus["Financing Readiness"] !== "Ready" && "Financing readiness", !workspace.transitionPath && "Transition path", workspace.legacyPriorities.length === 0 && "Legacy priorities"].filter(Boolean) as string[];
  const next = !hasSeller ? ["Create the canonical seller record", "/sell"] : !hasBusiness ? ["Add the business to the existing seller record", "/sell"] : !assessmentDone ? ["Complete Exit Readiness", "/exit-readiness"] : !workspace.transitionPath ? ["Compare transition paths", "/seller/transition-plans"] : workspace.legacyPriorities.length === 0 ? ["Define private legacy priorities", "/seller/transition-plans"] : workspace.moduleStatus["Financing Readiness"] !== "Ready" ? ["Complete Financing Readiness", "/financing-readiness"] : ["Package the controlled seller materials", "/seller/launch-studio"];
  const stageCards = stages.map((stage) => {
    const stageModules = platformModules.filter((module) => module.stage === stage.name);
    const complete = stageModules.filter((module) => ["Ready", "Approved", "Active", "Completed"].includes(workspace.moduleStatus[module.name])).length;
    return { ...stage, complete, total: stageModules.length, missing: stageModules.filter((module) => workspace.moduleStatus[module.name] === "Not Started").length };
  });
  const pathwayGuideMap: Record<string, string> = {
    "Family succession": "family-succession",
    "Management buyout": "management-buyouts",
    "Partner buyout": "partner-buyouts",
    "Confidential buyer search": "confidential-business-sales",
    "Already have a buyer": "sba-acquisition-financing",
    "Increase value before selling": "improving-business-value-before-a-sale",
  };
  const stageGuideMap: Record<Stage, string> = { Explore: "preparing-to-sell-your-business", Prepare: "improving-business-value-before-a-sale", Package: "organizing-financial-records", Match: "confidential-business-sales", Transition: "preparing-employees-and-customers" };
  const recommendedGuide = resourceGuides.find((guide) => guide.slug === (pathwayGuideMap[String(seller.transitionGoal)] ?? stageGuideMap[workspace.currentStage])) ?? resourceGuides[0];
  const recommendationBasis = hasSeller || hasBusiness ? "Based on the seller pathway and stage saved on this device" : "Platform starting point · no seller profile assumed";
  return <PageFrame eyebrow="PRIVATE SELLER WORKSPACE · VERSION 2.5" title="Transition Command Center" intro="One decision surface for readiness, disclosure, capital, matching, legacy, package preparation, and the next executable action.">
    <div className="command-overview">
      <section className="command-primary"><div className="panel-head"><div><span className="kicker">CURRENT TRANSITION STAGE</span><h2>{workspace.currentStage}</h2></div><StatusBadge value={missing.length ? "Needs Information" : "Ready"} /></div><p>{stages.find((stage) => stage.name === workspace.currentStage)?.promise}</p><div className="command-next"><span>ONE PRIMARY NEXT ACTION</span><strong>{next[0]}</strong><button className="primary" onClick={() => go(next[1])}>Continue ↗</button></div></section>
      <section className="command-facts"><div><span>Seller pathway</span><strong>{String(seller.transitionGoal || "Not selected")}</strong></div><div><span>Exit Readiness</span><strong>{assessmentDone ? `${assessment.percent}/100 · Educational` : "Not completed"}</strong></div><div><span>Listing status</span><strong>{adminStatus}</strong></div><div><span>Confidentiality</span><strong>{visibility}</strong></div><div><span>Quiet Exit Network</span><strong>{workspace.moduleStatus["Quiet Exit Network"]}</strong></div><div><span>Quiet Exit next action</span><strong>{workspace.moduleStatus["Quiet Exit Network"] === "Not Started" ? "Define the disclosure perimeter" : "Continue protected mandate work"}</strong></div><div><span>Financing Readiness</span><strong>{workspace.moduleStatus["Financing Readiness"]}</strong></div><div><span>Seller Launch Studio</span><strong>{workspace.moduleStatus["Seller Launch Studio"]}</strong></div><div><span>Private Deal Room</span><strong>Prepare canonical index</strong></div><div><span>Transition Path</span><strong>{workspace.transitionPath || "Not selected"}</strong></div><div><span>Path Comparison</span><strong>{workspace.transitionPath ? "In Progress · educational" : "Not started"}</strong></div><div><span>Legacy Profile</span><strong>{workspace.legacyPriorities.length ? "In progress · private" : "Incomplete"}</strong></div><div><span>Match Review</span><strong>{workspace.moduleStatus["Legacy Matching"] === "Not Started" ? "Successor profile incomplete" : workspace.moduleStatus["Legacy Matching"]}</strong></div><div><span>Buyer interest</span><strong>0 live inquiries · demo excluded</strong></div><div><span>Legacy priorities</span><strong>{workspace.legacyPriorities.length ? workspace.legacyPriorities.join(" · ") : "Not documented"}</strong></div><div><span>Digital Business Type Selected</span><strong>{workspace.digital.businessType || "Not selected"}</strong></div><div><span>Digital Valuation</span><strong>{workspace.digital.valuationComplete ? "Complete · educational" : "Not Started"}</strong></div><div><span>Digital Marketplace</span><strong>{workspace.digital.marketplaceActive ? "Active" : "Not Started"}</strong></div><div><span>Buyer Criteria</span><strong>{workspace.digital.buyerCriteriaComplete ? "Complete" : "Incomplete"}</strong></div></section>
    </div>
    <section className="command-resource" aria-labelledby="command-resource-title"><div><span>RECOMMENDED FIELD GUIDE</span><small>{recommendationBasis}</small></div><div><span>{recommendedGuide.seller_stage} · {recommendedGuide.related_modules[0]}</span><h2 id="command-resource-title">{recommendedGuide.title}</h2><p>{recommendedGuide.description}</p></div><div><strong>{recommendedGuide.estimated_read_time}</strong><a href={`/resources/${recommendedGuide.slug}`} onClick={(event) => { event.preventDefault(); go(`/resources/${recommendedGuide.slug}`); }}>Read the guide →</a></div></section>
    <div className="transition-map">{stageCards.map((stage, index) => <button key={stage.name} className={workspace.currentStage === stage.name ? "active" : ""} onClick={() => { setWorkspace((current) => ({ ...current, currentStage: stage.name })); go(stage.route); }}><span>0{index + 1}</span><h3>{stage.name}</h3><strong>{stage.complete}/{stage.total} ready</strong><small>{stage.missing} not started · Next: {stage.promise}</small></button>)}</div>
    <div className="requirements-panel"><div><span>MISSING REQUIREMENTS</span><strong>{missing.length}</strong></div>{missing.length ? <ul>{missing.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Core preparation requirements are complete. Seller and professional review gates still apply.</p>}</div>
  </PageFrame>;
}

function VerticalIntelligence() {
  const [industry, setIndustry] = useState("HVAC");
  const packs: Record<string, string[]> = {
    HVAC: ["License ownership and transferability", "Technician credentials and retention", "Maintenance agreements and recurring revenue", "Dispatch performance, fleet, and seasonality", "Owner-held customer relationships"],
    Plumbing: ["License ownership and transferability", "Technician credentials and retention", "Service agreements and repeat revenue", "Dispatch performance, fleet, and permitting", "Owner-held customer relationships"],
    Electrical: ["License ownership and transferability", "Technician credentials and retention", "Service agreements and repeat revenue", "Permitting, fleet, and project mix", "Owner-held customer relationships"],
    "Pest Control": ["Applicator licensing and regulatory records", "Recurring route density and retention", "Chemical handling and environmental claims", "Technician credentials and fleet", "Route transferability"],
    "Commercial Cleaning": ["Contract assignment and termination rights", "Customer and site-level concentration", "Labor model, wage compliance, and supervision", "Quality controls and insurance", "Site-level profitability evidence"],
    Landscaping: ["Maintenance versus project revenue", "Route density and seasonality", "Crew leadership and retention", "Fleet, equipment, and credentials", "Backlog, contracts, and concentration"],
    Roofing: ["Licensing, insurance, and safety history", "Project backlog and job costing", "Claims and lead-source dependence", "Subcontractor controls and warranties", "Working capital and storm concentration"],
    Restoration: ["Licensing, insurance, and safety history", "Claims dependence and referral sources", "Project backlog and job costing", "Subcontractor controls and warranties", "Working capital and storm concentration"],
    Laundromats: ["Lease term, assignment, and landlord consent", "Utilities history and machine age", "Maintenance and capital expenditure needs", "Payment systems and ancillary revenue", "Competitive radius and environmental matters"],
    "Home Services": ["License and credential dependencies", "Recurring service agreements", "Technician and crew retention", "Fleet, equipment, and dispatch", "Owner-held customer relationships"],
    "Professional Services": ["Practitioner licenses and transferability", "Client concentration and recurring retainers", "Owner-originated revenue", "Utilization, work in progress, and realization", "Data security and restrictive covenants"],
    "Digital Assets": ["Domain, account, code, and content ownership", "Platform and traffic-source concentration", "Recurring revenue, churn, and payment dependence", "Privacy, security, and key-person access", "Transfer restrictions"],
  };
  const selected = packs[industry] || packs.HVAC;
  return <PageFrame eyebrow="EXPLORE · VERTICAL SELLER INTELLIGENCE" title="The operating model changes the diligence." intro="Industry packs overlay the shared business record. They do not create company facts, valuation multiples, or jurisdiction-specific legal conclusions.">
    <div className="vertical-layout"><aside className="vertical-selector"><label><span>Industry pack</span><select value={industry} onChange={(event) => setIndustry(event.target.value)}>{industries.map((item) => <option key={item}>{item}</option>)}</select></label><StatusBadge value="Inferred" evidence /><p>Unsourced operating heuristics are labeled Inferred. Licensing, labor, privacy, environmental, and transfer rules require current jurisdiction-specific verification.</p></aside><section className="vertical-pack"><div className="panel-head"><div><span className="kicker">{industry.toUpperCase()} · QUESTION SET</span><h2>Ask before applying.</h2></div><span className="badge">Overlay · no duplicate record</span></div><div className="diligence-grid">{selected.map((item, index) => <article key={item}><span>0{index + 1}</span><h3>{item}</h3><p>Request company-specific evidence and classify the response before using it in readiness, packaging, matching, or financing.</p></article>)}</div></section></div>
  </PageFrame>;
}

// Retained as a migration reference while Version 2.4 routes legacy work to ChangeOfOwnershipModule.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyMatching({ workspace, setWorkspace }: { workspace: V2Workspace; setWorkspace: WorkspaceSetter }) {
  const priorities = ["Employee continuity", "Customer continuity", "Community presence", "Brand stewardship", "Family objectives", "Seller role and timing"];
  const toggle = (priority: string) => setWorkspace((current) => ({ ...current, legacyPriorities: current.legacyPriorities.includes(priority) ? current.legacyPriorities.filter((item) => item !== priority) : [...current.legacyPriorities, priority], moduleStatus: { ...current.moduleStatus, "Legacy Matching": "In Progress" } }));
  return <PageFrame eyebrow="MATCH · LEGACY ALIGNMENT" title="The highest headline price is not always the best transition." intro="Document continuity priorities before comparing successor or buyer fit. No buyer or successor is created, ranked, or represented here.">
    <div className="module-workflow"><section className="form-panel"><div className="form-heading"><span>SELLER-PROVIDED PRIORITIES</span><h2>What must the transition protect?</h2></div><div className="priority-selector">{priorities.map((priority) => <button key={priority} className={workspace.legacyPriorities.includes(priority) ? "selected" : ""} onClick={() => toggle(priority)}><span>{workspace.legacyPriorities.includes(priority) ? "✓" : "+"}</span>{priority}</button>)}</div></section><aside className="module-output"><StatusBadge value={workspace.moduleStatus["Legacy Matching"]} /><h2>Continuity alignment brief</h2>{workspace.legacyPriorities.length ? <ol>{workspace.legacyPriorities.map((priority) => <li key={priority}>{priority}</li>)}</ol> : <div className="empty-state compact-empty"><strong>No priorities selected.</strong><p>Missing preferences remain missing—never inferred from owner age, family status, or buyer type.</p></div>}<div className="integration-note"><strong>Human judgment required</strong><span>Protected characteristics and unsupported personal judgments are excluded from matching.</span></div></aside></div>
  </PageFrame>;
}

// Retained as a migration reference while Version 2.4 routes planning work to ChangeOfOwnershipModule.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TransitionPlanning({ workspace, setWorkspace, go }: { workspace: V2Workspace; setWorkspace: WorkspaceSetter; go: (p: string) => void }) {
  const paths: Record<string, [string, string]> = {
    "External sale": ["Market-ready business and seller consent", "Valuation · brokerage · legal · tax"],
    "Management buyout": ["Capable management team and role transition", "Financing · valuation · legal · tax"],
    "Partner buyout": ["Enforceable ownership framework", "Legal · valuation · tax"],
    "Family succession": ["Willing and capable successor", "Estate · tax · legal"],
    "Employee ownership": ["Eligible structure and workforce fit", "ERISA · tax · valuation · legal"],
    "Partial sale": ["Divisible control and economics", "Legal · tax · valuation"],
    "Seller-financed transition": ["Seller risk tolerance and payment security", "Financing · legal · tax"],
    "Rollover equity": ["Compatible buyer structure and minority rights", "Legal · tax · valuation"],
  };
  const selected = paths[workspace.transitionPath];
  const pathGuideMap: Record<string, string> = { "Management buyout": "management-buyouts", "Partner buyout": "partner-buyouts", "Family succession": "family-succession", "Seller-financed transition": "seller-financing" };
  const selectedGuide = pathGuideMap[workspace.transitionPath] ?? "preparing-employees-and-customers";
  return <PageFrame eyebrow="TRANSITION · CHANGE-OF-OWNERSHIP PLANNING" title="Choose the path before designing the handoff." intro="Preferences and educational scenarios stay separate from agreed terms, executed documents, and professional conclusions.">
    <ResourceShelf title={workspace.transitionPath ? `Field guides for ${workspace.transitionPath.toLowerCase()}` : "Compare the ownership-transition field guides"} intro="Use the guides to frame the questions; keep transaction-specific legal, tax, valuation, employment, and financing conclusions with qualified professionals." slugs={[selectedGuide, "preparing-employees-and-customers", "what-happens-after-closing"]} go={go} />
    <div className="path-selector">{Object.keys(paths).map((path, index) => <button key={path} className={workspace.transitionPath === path ? "selected" : ""} onClick={() => setWorkspace((current) => ({ ...current, transitionPath: path, currentStage: "Transition", moduleStatus: { ...current.moduleStatus, "Change-of-Ownership Planning": "In Progress" } }))}><span>0{index + 1}</span><strong>{path}</strong></button>)}</div>
    {selected ? <div className="transition-plan-output"><section><span>CORE PREREQUISITE</span><h2>{selected[0]}</h2></section><section><span>PROFESSIONAL REVIEW GATES</span><h2>{selected[1]}</h2></section><section><span>DRAFT MILESTONES</span><ol><li>Confirm seller objectives and evidence</li><li>Assess successor or buyer readiness</li><li>Design capital and control sequence</li><li>Review legal, tax, valuation, and financing dependencies</li><li>Document contingencies and handoff</li></ol></section></div> : <div className="empty-filter compact-empty"><span>PATH NOT SELECTED</span><h2>Keep the decision open until the tradeoffs are visible.</h2><p>Select one path to expose its prerequisites and review gates.</p></div>}
  </PageFrame>;
}

function BuyerMatching({ workspace, setWorkspace, go }: { workspace: V2Workspace; setWorkspace: WorkspaceSetter; go: (p: string) => void }) {
  const fields = [["industries", "Preferred industries"], ["geography", "Preferred geography"], ["purchasePrice", "Purchase-price range"], ["equity", "Available equity range"], ["experience", "Operating / acquisition experience"], ["financing", "Financing status"]];
  const complete = fields.filter(([key]) => workspace.buyerCriteria[key]).length;
  return <PageFrame eyebrow="MATCH · BUYER QUALIFICATION" title="Buyer interest is useful. Qualified buyer interest is better." intro="Define fit across experience, capacity, geography, industry, transition philosophy, and continuity—not price alone.">
    <DigitalBridge go={go} context="buy" />
    <div className="matching-grid">{["Operating capability", "Financial capacity", "Acquisition criteria", "Continuity alignment", "Confidentiality completion", "Seller approval"].map((x, i) => <article key={x}><span>0{i + 1}</span><h3>{x}</h3><p>{["Relevant management and industry competence.", "Equity range, liquidity declaration, and financing status.", "Target size, geography, structure, and timing.", "Employees, customers, brand, community, and transition plan.", "Acknowledgment before controlled disclosure.", "Seller retains the final disclosure decision."][i]}</p></article>)}</div>
    <div className="module-workflow match-workflow"><section className="form-panel"><div className="form-heading"><span>BUYER CRITERIA · DEVICE-LOCAL DRAFT</span><h2>Define the qualification perimeter.</h2></div><div className="form-grid">{fields.map(([key, label]) => <Field key={key} name={key} label={label} value={String(workspace.buyerCriteria[key] || "")} onChange={(value) => setWorkspace((current) => ({ ...current, buyerCriteria: { ...current.buyerCriteria, [key]: value }, moduleStatus: { ...current.moduleStatus, "Buyer Matching": "In Progress" } }))} />)}</div></section><aside className="module-output"><span>LIVE MATCH RESULTS</span><strong className="readiness-number">0</strong><p>{complete} of {fields.length} criteria defined.</p><div className="integration-note"><strong>No fabricated buyers</strong><span>Matching requires verified buyer profiles, listing criteria, evidence coverage, hard-constraint review, and seller-approved disclosure scope.</span></div><small>Development method 0.1.0 · educational screening only.</small></aside></div>
    <div className="demo-notice"><strong>Operating boundary</strong><span>Qualification, verification, matching, disclosure approval, and financing approval remain separate decisions.</span></div>
  </PageFrame>;
}

function StatusBadge({ value, evidence = false }: { value: string; evidence?: boolean }) {
  const tone = ["Ready", "Approved", "Active", "Completed", "Verified"].includes(value) ? "lime" : ["Needs Information", "Needs Review", "In Progress", "Inferred"].includes(value) ? "amber" : "";
  return <span className={`status ${tone}`}>{evidence ? "Evidence · " : ""}{value}</span>;
}

function SellerDashboard({ current, go, seller, assessment, saved, workspace }: { current: string; go: (p: string) => void; seller: FormState; assessment: { percent: number }; saved: string; workspace: V2Workspace }) {
  const items = [["Overview", "/seller/dashboard"], ["My Transition", "/seller/transition"], ["Transition", "/transition"], ["Businesses", "/seller/businesses"], ["Listings", "/seller/listings"], ["Inquiries", "/seller/inquiries"], ["Documents", "/seller/documents"]];
  return <PageFrame eyebrow="PRIVATE SELLER WORKSPACE · DEMO SESSION" title={current === "/seller/dashboard" ? "Transition command center" : items.find((x) => x[1] === current)?.[0] || "Seller workspace"} intro="A focused view of the next required action, disclosure state, buyer activity, evidence, and review status.">
    <div className="dashboard-layout"><aside className="dashboard-nav">{items.map(([label, href]) => <button className={current === href ? "active" : ""} key={href} onClick={() => go(href)}>{label}</button>)}<button onClick={() => go("/seller/tasks")}>Action queue</button><button onClick={() => go("/seller/evidence")}>Evidence control</button><button onClick={() => go("/seller/activity")}>Activity</button><button onClick={() => go("/seller/launch-studio")}>Launch Studio</button><button onClick={() => go("/seller/deal-room")}>Deal Room</button><button onClick={() => go("/admin/operations")}>Operations</button></aside><section className="dashboard-main">
      <div className="kpi-grid">{[["Active businesses", seller.businessName ? "1" : "0"], ["Published listings", "0"], ["Confidential opportunities", seller.confidentiality ? "1" : "0"], ["Buyer inquiries", "2 Demo"], ["Qualified buyers", "1 Demo"], ["Documents missing", "8"], ["Readiness score", assessment.percent ? `${assessment.percent}` : "—"], ["Next milestone", "Admin review"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {current === "/seller/inquiries" ? <InquiryTable /> : current === "/seller/documents" ? <DocumentTable /> : current === "/seller/listings" ? <ListingWorkspace go={go} /> : current === "/seller/businesses" ? <BusinessWorkspace seller={seller} go={go} /> : <DashboardOverview seller={seller} saved={saved} go={go} workspace={workspace} />}
    </section></div>
  </PageFrame>;
}

function DashboardOverview({ seller, saved, go, workspace }: { seller: FormState; saved: string; go: (p: string) => void; workspace: V2Workspace }) {
  return <div className="dashboard-panels"><section><div className="panel-head"><h2>Required next action</h2><span className="status amber">INCOMPLETE</span></div><p>{saved || "Complete the seller and business record, then move through the shared transition command center."}</p><div className="actions"><button className="primary" onClick={() => go("/transition")}>Open command center</button><button className="secondary" onClick={() => go("/sell")}>Seller intake</button></div></section><section><div className="panel-head"><h2>Current business</h2><span className="status">{seller.verification || "Unverified"}</span></div><dl><dt>Public identity</dt><dd>{seller.businessName || "Not entered"}</dd><dt>Anonymous identity</dt><dd>{seller.anonymousName || "Not entered"}</dd><dt>Transition goal</dt><dd>{seller.transitionGoal || "Not entered"}</dd><dt>Visibility</dt><dd>{seller.confidentiality || "Not selected"}</dd></dl></section><section className="wide-panel"><div className="panel-head"><h2>Explore → Prepare → Package → Match → Transition</h2><StatusBadge value={workspace.currentStage} /></div><div className="timeline five-stage">{stages.map((stage, i) => <button key={stage.name} className={workspace.currentStage === stage.name ? "current" : ""} onClick={() => go(stage.route)}><span>0{i + 1}</span><strong>{stage.name}</strong></button>)}</div></section><section className="wide-panel"><div className="panel-head"><h2>Version 2.0 modules</h2><button className="text-button" onClick={() => go("/platform")}>Open directory →</button></div><div className="dashboard-module-grid">{platformModules.slice(0, 4).map((module) => <button key={module.name} onClick={() => go(module.route)}><StatusBadge value={workspace.moduleStatus[module.name]} /><strong>{module.name}</strong><span>{module.action} →</span></button>)}</div></section></div>;
}

function InquiryTable() {
  return <><div className="demo-notice"><strong>Demo inquiries</strong><span>Illustrative buyer records only. No actual buyer identity, financial capacity, or interest is represented.</span></div><div className="responsive-table"><table><thead><tr><th>Buyer</th><th>Type</th><th>Status</th><th>Equity range</th><th>Financing</th><th>Next action</th></tr></thead><tbody><tr><td>Demo Operator A</td><td>Self-funded searcher</td><td><span className="status amber">Needs Qualification</span></td><td>$250K–$500K</td><td>Exploring</td><td>Complete capacity declaration</td></tr><tr><td>Demo Buyer Group B</td><td>Strategic buyer</td><td><span className="status lime">Seller Review</span></td><td>Not disclosed</td><td>Internal capital</td><td>Seller disclosure decision</td></tr></tbody></table></div></>;
}

function DocumentTable() {
  return <><div className="upload-placeholder"><div><strong>Secure document storage requires authenticated R2 configuration.</strong><p>The interface preserves the intended permissions and metadata model without pretending sensitive files are protected before storage is configured.</p></div><button className="secondary" disabled>Secure upload pending</button></div><div className="checklist">{["Three years business tax returns", "Year-to-date P&L and balance sheet", "Debt schedule", "Customer concentration analysis", "Employee census—de-identified", "Key contracts and transferability", "Lease and equipment schedule", "Operating procedures index"].map((x, i) => <label key={x}><input type="checkbox" defaultChecked={i < 2} />{x}<span>{i < 2 ? "Added · verification pending" : "Missing"}</span></label>)}</div></>;
}

function ListingWorkspace({ go }: { go: (p: string) => void }) {
  return <div className="dashboard-panels"><section className="wide-panel"><div className="panel-head"><h2>Draft listing</h2><span className="status amber">ADMIN REVIEW REQUIRED</span></div><p>No listing publishes automatically. Complete the Launch Studio materials, choose visibility, then submit the draft for review.</p><div className="actions"><button className="primary" onClick={() => go("/seller/launch-studio")}>Prepare listing materials</button><button className="secondary" onClick={() => go("/admin/review")}>Open review queue</button></div></section></div>;
}

function BusinessWorkspace({ seller, go }: { seller: FormState; go: (p: string) => void }) {
  return <div className="dashboard-panels"><section className="wide-panel"><div className="panel-head"><h2>{seller.businessName || "No business record yet"}</h2><span className="status">{seller.verification || "Unverified"}</span></div><p>{seller.industry ? `${seller.industry} · ${seller.headquarters || "Location pending"}` : "Create the business profile to begin readiness, listing, and financing workflows."}</p><button className="primary" onClick={() => go("/sell")}>{seller.businessName ? "Edit business record" : "Create business record"}</button></section></div>;
}

function AdminReview({ status, setStatus }: { status: string; setStatus: (s: string) => void }) {
  return <PageFrame eyebrow="OWNER / ADMIN REVIEW" title="Evidence before exposure." intro="Review seller claims, business records, disclosure boundaries, buyer inquiries, and publication status.">
    <div className="admin-layout"><aside><span>REVIEW QUEUE</span>{["Seller profiles · 1", "Business records · 1", "Listing drafts · 1", "Buyer inquiries · 2", "Disclosure requests · 1"].map((x) => <button key={x}>{x}</button>)}</aside><section className="review-card"><div className="review-head"><div><span className="badge demo">Demo review record</span><h2>Established Mid-Atlantic Field Services Platform</h2><p>Anonymous teaser · seller-provided · evidence incomplete</p></div><span className="status amber">{status}</span></div><div className="claim-grid">{[["Revenue range", "$2M–$5M", "Evidence requested"], ["Earnings range", "$500K–$1M EBITDA", "Unsupported"], ["Recurring revenue", "Seller states material", "Quantification missing"], ["Seller financing", "Considered", "Structure review"], ["Customer concentration", "Not disclosed", "Required before approval"], ["Owner dependence", "Under assessment", "Readiness gap"]].map(([label, value, state]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{state}</small></div>)}</div><label className="admin-notes"><span>Internal notes</span><textarea defaultValue="Request supporting financial summary, concentration schedule, and transition narrative before any publication decision." /></label><div className="admin-actions"><button className="secondary" onClick={() => setStatus("Revision Requested")}>Request revisions</button><button className="secondary" onClick={() => setStatus("Paused")}>Pause</button><button className="primary" onClick={() => setStatus("Approved")}>Approve controlled publication</button></div></section></div>
  </PageFrame>;
}

function Resources({ go }: { go: (path: string) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [stage, setStage] = useState("All stages");
  const [transitionPath, setTransitionPath] = useState("All paths");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const normalized = search.trim().toLowerCase();
  const filtered = resourceGuides.filter((guide) =>
    (!normalized || [guide.title, guide.description, guide.category, ...guide.transition_paths].join(" ").toLowerCase().includes(normalized)) &&
    (category === "All categories" || guide.category === category) &&
    (stage === "All stages" || guide.seller_stage === stage) &&
    (transitionPath === "All paths" || guide.transition_paths.includes(transitionPath)),
  );
  const reset = () => {
    setSearch("");
    setCategory("All categories");
    setStage("All stages");
    setTransitionPath("All paths");
  };
  const filters = <div className="resource-filter-fields">
    <label><span>Search</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search decisions, risks, or paths" /></label>
    <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{resourceCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span>Seller stage</span><select value={stage} onChange={(event) => setStage(event.target.value)}><option>All stages</option>{resourceStages.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span>Transition path</span><select value={transitionPath} onChange={(event) => setTransitionPath(event.target.value)}><option>All paths</option>{resourcePaths.map((item) => <option key={item}>{item}</option>)}</select></label>
  </div>;

  return <PageFrame eyebrow="SELLER RESOURCE LIBRARY · 14 FIELD GUIDES" title="Useful before the first buyer call." intro="Direct, practical guidance for preparing the business, protecting the process, evaluating transition paths, and managing the handoff.">
    <section className="resource-featured" aria-labelledby="featured-guides"><div><p className="kicker">START HERE</p><h2 id="featured-guides">A strong exit begins before the listing goes live.</h2><p>Use the featured guides to establish the evidence baseline, improve transferability, and shorten expensive conversations.</p></div><div>{resourceGuides.filter((guide) => guide.featured).map((guide) => <a key={guide.slug} href={`/resources/${guide.slug}`} onClick={(event) => { event.preventDefault(); go(`/resources/${guide.slug}`); }}><span>{String(guide.display_order).padStart(2, "0")}</span><strong>{guide.title}</strong><small>{guide.estimated_read_time}</small></a>)}</div></section>
    <button className="secondary resource-mobile-filter" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>{filtersOpen ? "Hide filters" : "Filter guides"}</button>
    <section className={filtersOpen ? "resource-controls open" : "resource-controls"} aria-label="Resource library filters">{filters}<div className="resource-results-count"><strong>{filtered.length}</strong><span>{filtered.length === 1 ? "guide" : "guides"}</span><button className="text-button" onClick={reset}>Reset filters</button></div></section>
    {filtered.length ? <div className="resource-grid resource-library-grid">{filtered.map((guide) => <article key={guide.slug} className="resource-card"><div className="resource-card-top"><span>GUIDE {String(guide.display_order).padStart(2, "0")}</span><span>{guide.seller_stage}</span></div><h2>{guide.title}</h2><p>{guide.description}</p><div className="resource-card-meta"><span>{guide.estimated_read_time}</span><span>{guide.category}</span><span>{guide.related_modules[0]}</span></div><a className="text-button" href={`/resources/${guide.slug}`} onClick={(event) => { event.preventDefault(); go(`/resources/${guide.slug}`); }}>Open guide →</a></article>)}</div> :
      <section className="empty-filter resource-empty"><span>NO GUIDES MATCH</span><h2>The library is quiet at this intersection.</h2><p>Broaden the search or clear one of the filters. Every published guide remains available when filters reset.</p><button className="primary" onClick={reset}>Reset all filters</button></section>}
  </PageFrame>;
}

function InlineContent({ text, go }: { text: string; go: (path: string) => void }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return <>{parts.map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!link) return <span key={`${part}-${index}`}>{part}</span>;
    const [, label, href] = link;
    return href.startsWith("/") ? <a key={`${href}-${index}`} href={href} className="inline-link" onClick={(event) => { event.preventDefault(); go(href); }}>{label}</a> : <a key={`${href}-${index}`} href={href} target="_blank" rel="noreferrer">{label}</a>;
  })}</>;
}

function ResourceGuidePage({ guide, go }: { guide: ResourceGuide; go: (path: string) => void }) {
  const headings = guide.blocks.filter((block): block is ResourceHeadingBlock => block.type === "heading" && block.level === 2);
  const related = guide.related_guides.map((slug) => resourceGuides.find((item) => item.slug === slug)).filter(Boolean) as ResourceGuide[];
  const checklistAnchor = guide.blocks.findIndex((block) => block.type === "heading" && /(checklist|30-day|90-day|first 100 days)/i.test(block.text));
  const checklistBlock = guide.blocks.slice(checklistAnchor >= 0 ? checklistAnchor + 1 : 0).find((block) => block.type === "list") ?? guide.blocks.find((block) => block.type === "list");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.last_reviewed,
    mainEntityOfPage: `${SITE_ORIGIN}/resources/${guide.slug}`,
    publisher: { "@type": "Organization", name: "Seller Transition Exchange" },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
    <section className="resource-guide-hero">
      <div className="resource-breadcrumbs"><button onClick={() => go("/")}>Home</button><span>/</span><button onClick={() => go("/resources")}>Resources</button><span>/</span><span>{guide.category}</span></div>
      <div className="resource-guide-kicker"><span>{guide.category}</span><span>{guide.seller_stage}</span><span>{guide.estimated_read_time}</span></div>
      <h1>{guide.title}</h1><p>{guide.description}</p>
      <div className="resource-guide-status"><span>Last reviewed {guide.last_reviewed}</span><strong>{guide.evidence_status.replaceAll("-", " ")}</strong></div>
      <p className="resource-review-copy">This educational guide is available for planning purposes and remains subject to formal editorial and professional review where applicable.</p>
    </section>
    <section className="resource-guide-layout">
      <aside className="resource-toc"><span>IN THIS GUIDE</span><nav>{headings.map((heading) => <a key={heading.id} href={`#${heading.id}`}>{heading.text}</a>)}</nav><button className="primary" onClick={() => go(guide.primary_cta_href)}>{guide.primary_cta}</button></aside>
      <article className="resource-article">
        {guide.blocks.map((block, index) => {
          if (block.type === "heading") return block.level === 2 ? <h2 key={block.id} id={block.id}>{block.text}</h2> : <h3 key={`${block.id}-${index}`} id={block.id}>{block.text}</h3>;
          if (block.type === "paragraph") return <p key={index}><InlineContent text={block.text} go={go} /></p>;
          if (block.type === "quote") return <blockquote key={index}>{block.text}</blockquote>;
          const ListTag = block.ordered ? "ol" : "ul";
          return <ListTag key={index}>{block.items.map((item) => <li key={item}><InlineContent text={item} go={go} /></li>)}</ListTag>;
        })}
        {checklistBlock?.type === "list" && <section className="resource-practical-checklist" aria-labelledby="practical-checklist"><p className="kicker">PULLED FROM THIS FIELD GUIDE</p><h2 id="practical-checklist">Practical checklist</h2><ul>{checklistBlock.items.map((item) => <li key={item}><InlineContent text={item} go={go} /></li>)}</ul></section>}
        <section className="resource-tools"><p className="kicker">RELATED SELLER TRANSITION EXCHANGE MODULES</p><div>{guide.related_modules.map((module) => {
          const target = resourceModuleLinks[module];
          return target ? <a key={module} href={target.route} onClick={(event) => { event.preventDefault(); go(target.route); }}><strong>{module}</strong><small>{target.state}</small></a> : <span key={module}>{module}<small>Route pending</small></span>;
        })}</div></section>
        <section className="resource-guide-cta"><span>ONE PRIMARY NEXT ACTION</span><h2>{guide.primary_cta}</h2><p>Move from reading to a structured, reviewable next step inside Seller Transition Exchange.</p><button className="primary" onClick={() => go(guide.primary_cta_href)}>{guide.primary_cta} ↗</button><button className="secondary" onClick={() => go(guide.secondary_cta_href)}>{guide.secondary_cta}</button></section>
        <section className="resource-related"><p className="kicker">RELATED GUIDES</p><div>{related.map((item) => <a key={item.slug} href={`/resources/${item.slug}`} onClick={(event) => { event.preventDefault(); go(`/resources/${item.slug}`); }}><span>GUIDE {String(item.display_order).padStart(2, "0")}</span><strong>{item.title}</strong><small>{item.estimated_read_time}</small></a>)}</div></section>
      </article>
    </section>
  </>;
}

function PlatformDrawer({ current, go, close, workspace }: { current: string; go: (p: string) => void; close: () => void; workspace: V2Workspace }) {
  return <div className="drawer-backdrop platform-backdrop" onMouseDown={close}><aside className="platform-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={close}>Close ×</button><p className="kicker">VERSION 2.0 PLATFORM</p><h2>Move the transition forward.</h2><p>Explore → Prepare → Package → Match → Transition</p><button className="command-link" onClick={() => go("/transition")}><span>TRANSITION COMMAND CENTER</span><strong>One next action ↗</strong></button>{stages.map((stage) => <section key={stage.name}><span>{stage.name}</span>{platformModules.filter((module) => module.stage === stage.name).map((module) => <button key={module.name} className={current === module.route ? "active" : ""} onClick={() => go(module.route)}><span>{module.name}</span><StatusBadge value={workspace.moduleStatus[module.name]} /></button>)}{stage.name === "Package" && <button className={current === "/deal-room" ? "active" : ""} onClick={() => go("/deal-room")}><span>Private Deal Room</span><StatusBadge value={workspace.dealRoomChecks.length ? "In Progress" : "Not Started"} /></button>}</section>)}<button className="secondary full-width" onClick={() => go("/platform")}>Open full module directory</button></aside></div>;
}

function InquiryDrawer({ listing, close, status, submit }: { listing: typeof listings[number]; close: () => void; status: string; submit: (payload: FormState) => void }) {
  const [form, setForm] = useState<FormState>({ confidentiality: false, financingHelp: false });
  const fields = [["buyerName", "Buyer name"], ["email", "Email"], ["phone", "Phone"], ["buyerType", "Buyer type"], ["acquisitionExperience", "Acquisition experience"], ["operatingExperience", "Operating experience"], ["industries", "Preferred industries"], ["geography", "Preferred geography"], ["priceRange", "Target purchase-price range"], ["equityRange", "Available equity range"], ["financingStatus", "Financing status"], ["timeline", "Desired timeline"], ["reason", "Reason for interest"]];
  return <div className="drawer-backdrop" onMouseDown={close}><aside className="inquiry-drawer" onMouseDown={(e) => e.stopPropagation()}><button className="drawer-close" onClick={close}>Close ×</button><p className="kicker">EXPRESSION OF INTEREST</p><h2>{listing.title}</h2><p>Complete the buyer profile. Submission begins at <strong>New · Needs Qualification</strong>.</p><div className="drawer-form">{fields.map(([key, label]) => <Field key={key} name={key} label={label} value={String(form[key] || "")} onChange={(value) => setForm({ ...form, [key]: value })} />)}<label className="checkbox"><input type="checkbox" checked={Boolean(form.confidentiality)} onChange={(e) => setForm({ ...form, confidentiality: e.target.checked })} /> I acknowledge the confidentiality boundary.</label><label className="checkbox"><input type="checkbox" checked={Boolean(form.financingHelp)} onChange={(e) => setForm({ ...form, financingHelp: e.target.checked })} /> I want acquisition-financing assistance.</label><button className="primary" disabled={!form.confidentiality} onClick={() => submit(form)}>Submit interest</button>{status && <p className="success-message">{status}</p>}</div></aside></div>;
}

function PageFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <><section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></section><section className="page-content">{children}</section></>;
}

function NotFound({ go }: { go: (p: string) => void }) {
  return <PageFrame eyebrow="404 · ROUTE NOT FOUND" title="This transition room is not on the floor plan." intro="Return to the platform or start a seller workflow."><button className="primary" onClick={() => go("/")}>Return home</button></PageFrame>;
}
