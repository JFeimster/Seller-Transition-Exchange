"use client";

import { useEffect, useRef, useState } from "react";
import {
  evaluateBuyerMatch,
  quietExitLevels,
  reviewAnonymousTeaser,
  type BuyerMatchInput,
  type BuyerRequirements,
  type QuietExitIdentifiers,
  type QuietExitLevel,
  type QuietExitProfile,
  type SellerExclusions,
  type TeaserReview,
} from "../lib/quiet-exit";

type Go = (path: string) => void;
type ApiState = "idle" | "loading" | "ready" | "device" | "error";
type Mandate = {
  id: number;
  objective: string;
  confidentialityLevel: QuietExitLevel;
  status: string;
  teaserStatus: string;
  identificationRisk: string;
  publicSafeProfile: QuietExitProfile;
  buyerRequirements: BuyerRequirements;
  sellerExclusions: SellerExclusions;
  sellerApprovedAt?: string | null;
  adminReviewStatus: string;
  adminApprovedAt?: string | null;
  nextAction: string;
  evidenceClassification: string;
};

const levelDetails: Array<{
  level: QuietExitLevel;
  public: string;
  registered: string;
  verified: string;
  seller: string;
  admin: string;
  private: string;
  search: string;
  inquiries: string;
}> = [
  { level: "Anonymous Teaser", public: "General industry, broad region, approved ranges, strengths, and transition preference.", registered: "The same redacted teaser.", verified: "The same teaser until a separate disclosure decision.", seller: "Every additional disclosure tier.", admin: "Redaction and publication review.", private: "Identity, exact location, people, customers, identifiers, and documents.", search: "Yes—only after seller and admin approval.", inquiries: "Yes." },
  { level: "Verified-Buyer Only", public: "A restricted, non-identifying teaser.", registered: "Restricted teaser and qualification requirements.", verified: "Approved information only; verification alone grants nothing.", seller: "Buyer-specific disclosure scope.", admin: "Identity, qualification, and policy review where required.", private: "All unapproved identity and evidence.", search: "Restricted teaser may appear after approval.", inquiries: "Verified profiles may request access." },
  { level: "Private Mandate", public: "Nothing. The mandate is excluded from public search and indexing.", registered: "Nothing unless specifically approved.", verified: "Nothing unless specifically approved.", seller: "Every buyer and every disclosure tier.", admin: "Mandate controls and access review.", private: "The entire opportunity unless access is granted.", search: "No.", inquiries: "Approved buyers only." },
  { level: "Invite-Only Opportunity", public: "Nothing; no public teaser is required.", registered: "Nothing without an invitation.", verified: "Nothing without an invitation and approval.", seller: "Invitation list and disclosure scope.", admin: "Invitation and access controls where required.", private: "Everything outside the approved invitation scope.", search: "No.", inquiries: "Invited buyers only." },
  { level: "Coming to Market", public: "Approved industry, broad region, timing, readiness stage, and selected goals.", registered: "The same preparation signal.", verified: "No sale materials unless separately approved.", seller: "Whether and when to convert to an active opportunity.", admin: "Public-safe preparation signal.", private: "Identity, sale terms, documents, and active-sale claims.", search: "Optional after approval.", inquiries: "Interest may be captured, but it is not an active listing." },
];

const sellerWorkflow = [
  "Confirm seller identity", "Select or create native business record", "Select Quiet Exit objective", "Choose confidentiality level",
  "Complete confidential business profile", "Define public-safe information", "Generate anonymous teaser", "Review redaction and identification risks",
  "Define buyer qualification requirements", "Define seller exclusions", "Submit for admin review", "Approve teaser or mandate activation",
  "Receive buyer interest", "Review qualified buyer summaries", "Approve, decline, or condition disclosure", "Track access and activity", "Prepare meeting or deal-room next step",
];

const publicPages: Record<string, { eyebrow: string; title: string; intro: string }> = {
  "/quiet-exit": { eyebrow: "QUIET EXIT NETWORK · SELLER CONTROLLED", title: "SELL QUIETLY. DISCLOSE DELIBERATELY. KEEP CONTROL.", intro: "Explore a confidential transition without publishing identifying business details before the right buyer has been reviewed." },
  "/quiet-exit/how-it-works": { eyebrow: "CONTROLLED PROCESS · FIVE GATES", title: "Confidentiality is a workflow—not a checkbox.", intro: "The system separates preparation, qualification, approval, access, and revocation so a seller can make deliberate decisions at each gate." },
  "/quiet-exit/confidentiality": { eyebrow: "DISCLOSURE PERIMETER", title: "Choose who sees what—and when.", intro: "Five confidentiality levels define search visibility, buyer eligibility, approval rights, and the information that must remain private." },
  "/quiet-exit/buyer-qualification": { eyebrow: "QUALIFICATION BEFORE DISCLOSURE", title: "Buyer interest is useful. Qualified buyer interest is better.", intro: "Identity, experience, capital, financing preparation, conflicts, intent, and continuity fit are reviewed before disclosure." },
  "/quiet-exit/resources": { eyebrow: "QUIET EXIT FIELD MANUAL", title: "Prepare the process before the market sees the opportunity.", intro: "Use the Seller Resource Library to understand confidentiality, financial preparation, buyer diligence, advisors, financing, and post-close execution." },
};

function navigate(go: Go, path: string) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); go(path); };
}

function QuietHero({ page, go }: { page: { eyebrow: string; title: string; intro: string }; go: Go }) {
  return <section className="quiet-hero">
    <div><p className="eyebrow"><span>{page.eyebrow}</span></p><h1>{page.title}</h1><p>{page.intro}</p>
      <div className="actions"><button className="primary" onClick={() => go("/seller/quiet-exit")}>Start a Quiet Exit ↗</button><button className="secondary" onClick={() => go("/quiet-exit/how-it-works")}>See how confidential sales work</button></div>
    </div>
    <aside className="quiet-control-card" aria-label="Quiet Exit operating controls"><div><span>DISCLOSURE</span><strong>Seller controlled</strong></div><div><span>BUYER ACCESS</span><strong>Qualified first</strong></div><div><span>PUBLICATION</span><strong>Admin approved</strong></div><div><span>REVOCATION</span><strong>Event logged</strong></div><p>Verification never creates automatic access.</p></aside>
  </section>;
}

function LevelCards({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "quiet-levels compact" : "quiet-levels"}>{levelDetails.map((item, index) => <article key={item.level}>
    <span className="quiet-number">0{index + 1}</span><div><p className="kicker">{item.search === "No." ? "NOT PUBLICLY DISCOVERABLE" : "CONTROLLED DISCOVERABILITY"}</p><h3>{item.level}</h3><p>{item.public}</p></div>
    {!compact && <dl><div><dt>Verified buyer</dt><dd>{item.verified}</dd></div><div><dt>Seller decision</dt><dd>{item.seller}</dd></div><div><dt>Admin review</dt><dd>{item.admin}</dd></div><div><dt>Remains private</dt><dd>{item.private}</dd></div><div><dt>Public search</dt><dd>{item.search}</dd></div><div><dt>Inquiries</dt><dd>{item.inquiries}</dd></div></dl>}
  </article>)}</div>;
}

function QuietExitHome({ go }: { go: Go }) {
  return <><QuietHero page={publicPages["/quiet-exit"]} go={go} />
    <section className="quiet-signal-rail"><span>IDENTITY PROTECTED</span><span>CLAIMS REVIEWED</span><span>BUYERS QUALIFIED</span><span>ACCESS REVOCABLE</span></section>
    <section className="section"><div className="section-head"><div><p className="kicker">WHO IT SERVES</p><h2>For owners who need optionality before exposure.</h2></div><p>Use Quiet Exit for verified native business records, anonymous teasers, restricted opportunities, private mandates, invite-only outreach, and preparation-stage signals.</p></div><div className="quiet-audience-grid">{["Owners exploring a sale discreetly", "Owners protecting employees and customers", "Businesses with high identification risk", "Native digital-business sellers", "Management, family, or partner transitions", "Owners preparing before an active process"].map((item, i) => <article key={item}><span>0{i + 1}</span><h3>{item}</h3></article>)}</div></section>
    <section className="section quiet-paper"><div className="section-head"><div><p className="kicker">FIVE CONFIDENTIALITY LEVELS</p><h2>Not every opportunity belongs in public search.</h2></div><button className="secondary light-border" onClick={() => go("/quiet-exit/confidentiality")}>Compare disclosure rights</button></div><LevelCards compact /></section>
    <section className="section"><div className="section-head"><div><p className="kicker">SELLER-CONTROLLED DISCLOSURE</p><h2>Interest does not equal access.</h2></div><p>A buyer completes a profile, supplies qualification information, acknowledges confidentiality, clears hard conflicts, and requests a defined tier. The seller still decides.</p></div><div className="quiet-gate-flow">{["Profile", "Verification", "Qualification", "Seller decision", "Controlled access"].map((item, index) => <article key={item}><span>GATE {index + 1}</span><strong>{item}</strong><small>{index === 4 ? "Time-bound · revocable · logged" : "Required before the next gate"}</small></article>)}</div></section>
    <section className="section quiet-studio-preview"><div><p className="kicker">ANONYMOUS TEASER STUDIO</p><h2>Remove the clues before a buyer connects the dots.</h2><p>Review names, domains, addresses, people, customers, license numbers, awards, slogans, exact territories, and embedded identifiers before publication.</p><button className="primary" onClick={() => go("/seller/quiet-exit/new/teaser")}>Open teaser studio</button></div><aside><span>IDENTIFICATION RISK</span><strong>BLOCK HIGH-RISK COPY</strong><ul><li>Direct identifier detection</li><li>Known-identifier matching</li><li>Public-safe draft separation</li><li>Redaction log</li><li>Independent admin review</li></ul></aside></section>
    <section className="section"><div className="quiet-three"><article><span>PRIVATE MANDATE</span><h3>Excluded from public search.</h3><p>Visible only to the seller, assigned administrators, approved advisors, and specifically approved buyers.</p></article><article><span>COMING TO MARKET</span><h3>Preparation is not an active listing.</h3><p>Signal approved timing and readiness without claiming the business is currently for sale.</p></article><article><span>DEAL-ROOM PREPARATION</span><h3>Structure now. Upload later.</h3><p>Build the index, access policy, and missing-document list. Secure uploads remain disabled until authenticated storage is configured.</p></article></div></section>
    <QuietResourceShelf go={go} />
    <section className="quiet-final"><p className="kicker">A STRONG EXIT STARTS BEFORE THE LISTING GOES LIVE.</p><h2>Protect the business while you prepare the decision.</h2><button className="primary" onClick={() => go("/seller/quiet-exit")}>Start a Quiet Exit</button></section>
  </>;
}

function QuietHow({ go }: { go: Go }) {
  return <><QuietHero page={publicPages["/quiet-exit/how-it-works"]} go={go} /><section className="section"><div className="quiet-workflow-list">{sellerWorkflow.map((step, index) => <article key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{index < 4 ? "Explore" : index < 10 ? "Package" : index < 15 ? "Match" : "Transition"}</small></article>)}</div></section><section className="section quiet-boundary"><h2>One canonical record. Separate approval rights.</h2><p>Quiet Exit uses the existing Seller, Business, Listing, Buyer, Inquiry, assessment, plan, generated-material, admin-review, and audit records. It does not clone the business for a confidential workflow. Seller approval and admin approval remain independent.</p></section></>;
}

function QuietConfidentiality({ go }: { go: Go }) {
  return <><QuietHero page={publicPages["/quiet-exit/confidentiality"]} go={go} /><section className="section"><LevelCards /></section><section className="section quiet-boundary"><h2>Never public by default.</h2><p>Legal and trade names, seller identity, exact address, direct contact information, domains, licenses, customers, employees, identifying imagery, documents, and unapproved evidence stay private. Private mandates and invite-only opportunities are excluded from metadata, sitemap entries, and public search.</p></section></>;
}

function QuietBuyerQualification({ go }: { go: Go }) {
  const buyer: BuyerMatchInput = { confidentialityAcknowledged: false };
  const review = evaluateBuyerMatch(buyer, { minimumEquity: 250000, financingRequired: true }, {});
  return <><QuietHero page={publicPages["/quiet-exit/buyer-qualification"]} go={go} /><section className="section"><div className="quiet-qualification-grid">{["Buyer identity", "Acquisition criteria", "Operating experience", "Declared equity", "Financing preparation", "Confidentiality acknowledgment", "Seller exclusions", "Continuity approach"].map((item, index) => <article key={item}><span>CHECK {String(index + 1).padStart(2, "0")}</span><h3>{item}</h3><p>{index < 2 ? "Required profile evidence." : "Buyer-provided information remains unverified until reviewed."}</p></article>)}</div><div className="quiet-hard-stop"><span>HARD-CONSTRAINT PREVIEW</span><h2>{review.classification}</h2><p>A strong industry fit cannot override insufficient declared equity, an excluded organization, prohibited geography, missing required financing preparation, or a missing confidentiality acknowledgment.</p></div></section><section className="section"><div className="actions"><button className="primary" onClick={() => go("/buyer/profile")}>Build buyer profile</button><button className="secondary" onClick={() => go("/buyer/verification")}>Review verification steps</button></div></section></>;
}

function QuietResourceShelf({ go }: { go: Go }) {
  const guides = [
    ["Confidential Business Sales", "/resources/confidential-business-sales", "Primary Quiet Exit guide"],
    ["Preparing to Sell Your Business", "/resources/preparing-to-sell-your-business", "Prepare"],
    ["Organizing Financial Records", "/resources/organizing-financial-records", "Package"],
    ["Choosing Transaction Advisors", "/resources/choosing-transaction-advisors", "Transition"],
  ];
  return <section className="section quiet-resources"><div className="section-head"><div><p className="kicker">SELLER RESOURCE LIBRARY</p><h2>Use the field manual before granting access.</h2></div><button className="secondary" onClick={() => go("/resources")}>Open all fourteen guides</button></div><div>{guides.map(([title, path, label]) => <a href={path} onClick={navigate(go, path)} key={path}><span>{label}</span><strong>{title}</strong><small>Educational draft · editorial review required</small></a>)}</div></section>;
}

function QuietResources({ go }: { go: Go }) {
  return <><QuietHero page={publicPages["/quiet-exit/resources"]} go={go} /><QuietResourceShelf go={go} /><section className="section quiet-boundary"><h2>Educational boundaries remain in force.</h2><p>These resources support planning. They are not legal, tax, valuation, brokerage, lending, or transaction advice, and their editorial-review classifications remain unchanged.</p></section></>;
}

async function quietApi(method: "GET" | "POST", path: string, body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.error ?? "The request could not be completed."));
  return data;
}

function Field({ label, value, onChange, multiline = false, type = "text", hint }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; type?: string; hint?: string }) {
  return <label className="quiet-field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />}{hint && <small>{hint}</small>}</label>;
}

function SellerQuietExit({ path, go, onStatus }: { path: string; go: Go; onStatus?: (status: string) => void }) {
  const parts = path.split("/").filter(Boolean);
  const requestedId = Number(parts[2] ?? 0);
  const requestedTab = parts[3] ?? "overview";
  const [state, setState] = useState<ApiState>("loading");
  const [message, setMessage] = useState("");
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [bundle, setBundle] = useState<Record<string, unknown>>({});
  const [objective, setObjective] = useState("Explore a confidential transition");
  const [level, setLevel] = useState<QuietExitLevel>("Anonymous Teaser");
  const [profile, setProfile] = useState<QuietExitProfile>({});
  const [identifiers, setIdentifiers] = useState<QuietExitIdentifiers>({});
  const [review, setReview] = useState<TeaserReview | null>(null);
  const [requirements, setRequirements] = useState<BuyerRequirements>({});
  const [exclusions, setExclusions] = useState<SellerExclusions>({});
  const [invitationEmail, setInvitationEmail] = useState("");
  const [drawer, setDrawer] = useState<Record<string, unknown> | null>(null);

  const active = mandates.find((item) => item.id === requestedId) ?? mandates[0];
  const activeId = active?.id;
  useEffect(() => {
    let live = true;
    quietApi("GET", `/api/quiet-exit?view=seller${requestedId ? `&mandateId=${requestedId}` : ""}`).then((data) => {
      if (!live) return;
      const loaded = (data.mandates ?? []) as Mandate[];
      setMandates(loaded); setBundle(data); setState("ready");
      const selected = loaded.find((item) => item.id === requestedId) ?? loaded[0];
      if (selected) { setProfile(selected.publicSafeProfile ?? {}); setRequirements(selected.buyerRequirements ?? {}); setExclusions(selected.sellerExclusions ?? {}); onStatus?.(selected.status === "Active" ? "Active" : "In Progress"); }
    }).catch((error: Error) => { if (live) { setMessage(error.message); setState(error.message.includes("Sign in") ? "error" : "device"); } });
    return () => { live = false; };
  }, [requestedId, onStatus]);

  async function mutate(action: string, payload: Record<string, unknown> = {}) {
    setMessage("");
    try {
      const data = await quietApi("POST", "/api/quiet-exit", { action, mandateId: activeId, payload });
      setMessage(action === "create_mandate" ? "Native Quiet Exit mandate created from the existing seller and business records." : "Saved to the protected Quiet Exit record.");
      if (action === "create_mandate") { const mandate = data.mandate as Mandate; setMandates([mandate]); go(`/seller/quiet-exit/${mandate.id}`); }
      else { const refreshed = await quietApi("GET", `/api/quiet-exit?view=seller&mandateId=${activeId}`); setMandates((refreshed.mandates ?? []) as Mandate[]); setBundle(refreshed); }
      onStatus?.("In Progress");
      return data;
    } catch (error) { setMessage(error instanceof Error ? error.message : "The request could not be completed."); return null; }
  }

  function previewTeaser() { const result = reviewAnonymousTeaser(profile, identifiers); setReview(result); onStatus?.("In Progress"); }
  const tabs = [["overview", "Control"], ["teaser", "Teaser"], ["buyers", "Buyers"], ["disclosures", "Disclosures"], ["activity", "Activity"]];

  if (state === "loading") return <QuietWorkspaceShell title="Loading the protected Quiet Exit workspace…"><div className="quiet-loading" aria-live="polite"><span /></div></QuietWorkspaceShell>;
  if (!active) return <QuietWorkspaceShell title="Start with the existing seller and business records.">
    <div className="quiet-empty"><span>NO NATIVE MANDATE</span><h2>Confidentiality starts with record ownership.</h2><p>Quiet Exit can only attach to a signed-in seller’s native Seller Transition Exchange business record. Syndicated external opportunities and demonstration records are not eligible.</p>
      <div className="quiet-setup-grid"><label><span>Quiet Exit objective</span><select value={objective} onChange={(event) => setObjective(event.target.value)}><option>Explore a confidential transition</option><option>Run a confidential buyer search</option><option>Prepare a private mandate</option><option>Prepare an invite-only process</option><option>Signal coming to market</option></select></label><label><span>Confidentiality level</span><select value={level} onChange={(event) => setLevel(event.target.value as QuietExitLevel)}>{quietExitLevels.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="actions"><button className="primary" onClick={() => mutate("create_mandate", { objective, confidentialityLevel: level })}>Use my canonical business record</button><button className="secondary" onClick={() => go("/sell")}>Create seller and business record</button></div>{message && <p className="quiet-message" role="status">{message}</p>}<small>{state === "device" ? "The durable data service is unavailable. No mandate was simulated or created on this device." : "One seller record. One business record. No duplicate module profile."}</small>
    </div></QuietWorkspaceShell>;

  return <QuietWorkspaceShell title="Confidentiality is operated here—not implied.">
    <div className="quiet-workspace-head"><div><span className="badge">NATIVE QUIET EXIT MANDATE · #{active.id}</span><h2>{active.objective}</h2><p>{active.confidentialityLevel} · {active.evidenceClassification}</p></div><div><span className={`status ${active.status === "Active" ? "lime" : "amber"}`}>{active.status}</span><strong>{active.nextAction}</strong></div></div>
    <nav className="quiet-tabs" aria-label="Quiet Exit mandate sections">{tabs.map(([key, label]) => <button className={requestedTab === key || (requestedTab === "overview" && key === "overview") ? "active" : ""} key={key} onClick={() => go(`/seller/quiet-exit/${active.id}${key === "overview" ? "" : `/${key}`}`)}>{label}</button>)}</nav>
    {requestedTab === "teaser" && <TeaserStudio profile={profile} setProfile={setProfile} identifiers={identifiers} setIdentifiers={setIdentifiers} review={review} preview={previewTeaser} save={async () => { const data = await mutate("save_teaser", { profile, identifiers }); if (data?.review) setReview(data.review as TeaserReview); }} message={message} />}
    {requestedTab === "buyers" && <BuyerQueue reviews={(bundle.reviews ?? []) as Array<Record<string, unknown>>} onOpen={(reviewRecord) => { const disclosure = ((bundle.disclosures ?? []) as Array<Record<string, unknown>>).find((item) => item.inquiryId === reviewRecord.inquiryId); setDrawer(disclosure ?? null); if (!disclosure) setMessage("The buyer review has no disclosure request to decide."); }} />}
    {requestedTab === "disclosures" && <DisclosureQueue disclosures={(bundle.disclosures ?? []) as Array<Record<string, unknown>>} onOpen={setDrawer} />}
    {requestedTab === "activity" && <ActivityLog events={(bundle.events ?? []) as Array<Record<string, unknown>>} />}
    {requestedTab === "overview" && <MandateControl active={active} requirements={requirements} setRequirements={setRequirements} exclusions={exclusions} setExclusions={setExclusions} invitationEmail={invitationEmail} setInvitationEmail={setInvitationEmail} saveControls={() => mutate("save_controls", { buyerRequirements: requirements, sellerExclusions: exclusions })} submit={() => mutate("seller_submit")} activate={() => mutate("activate")} invite={() => mutate("prepare_invitation", { email: invitationEmail })} go={go} message={message} />}
    {drawer && <ReviewDrawer record={drawer} close={() => setDrawer(null)} decide={(decision, reason) => mutate("disclosure_decision", { disclosureId: drawer.id, decision, reason })} />}
  </QuietWorkspaceShell>;
}

function QuietWorkspaceShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <><section className="quiet-dashboard-hero"><p className="eyebrow"><span>AUTHENTICATED · SELLER WORKSPACE</span></p><h1>QUIET EXIT CONTROL</h1><p>{title}</p></section><section className="page-content quiet-workspace">{children}</section></>;
}

function TeaserStudio({ profile, setProfile, identifiers, setIdentifiers, review, preview, save, message }: { profile: QuietExitProfile; setProfile: (value: QuietExitProfile) => void; identifiers: QuietExitIdentifiers; setIdentifiers: (value: QuietExitIdentifiers) => void; review: TeaserReview | null; preview: () => void; save: () => void; message: string }) {
  const profileFields: Array<[keyof QuietExitProfile, string, boolean]> = [["generalIndustry", "General industry", false], ["broadRegion", "Broad region", false], ["revenueRange", "Revenue range", false], ["earningsRange", "Earnings range", false], ["employeeRange", "Employee range", false], ["revenueModel", "Revenue model", false], ["strengths", "Selected strengths", true], ["growthOpportunities", "Selected growth opportunities", true], ["transitionPreference", "General transition preference", true], ["narrative", "Anonymous overview", true]];
  const identifierFields: Array<[keyof QuietExitIdentifiers, string]> = [["legalBusinessName", "Legal business name"], ["tradeName", "Trade name"], ["sellerName", "Seller name"], ["exactAddress", "Exact address"], ["phone", "Phone"], ["email", "Email"], ["website", "Website / domain"], ["licenseNumbers", "License numbers"], ["namedCustomers", "Named customers"], ["namedEmployees", "Named employees"], ["searchableAwards", "Searchable awards"], ["uniquePhrases", "Unique phrases or slogans"], ["exactServiceTerritory", "Exact service territory"]];
  return <div className="teaser-studio"><section><div className="quiet-panel-head"><span>PUBLIC-SAFE DRAFT</span><h2>Write for anonymity, not intrigue alone.</h2></div><div className="quiet-form-grid">{profileFields.map(([key, label, multiline]) => <Field key={key} label={label} multiline={multiline} value={String(profile[key] ?? "")} onChange={(value) => setProfile({ ...profile, [key]: value })} />)}</div></section>
    <section><div className="quiet-panel-head"><span>PRIVATE IDENTIFIER DICTIONARY</span><h2>Tell the review what must never leak.</h2><p>Stored only in the protected mandate when durable save succeeds. Never returned in public content.</p></div><div className="quiet-form-grid">{identifierFields.map(([key, label]) => <Field key={key} label={label} value={String(identifiers[key] ?? "")} onChange={(value) => setIdentifiers({ ...identifiers, [key]: value })} />)}</div></section>
    <aside className="teaser-review"><div><span>IDENTIFICATION RISK</span><strong className={review?.publicationBlocked ? "risk-block" : "risk-clear"}>{review?.riskLevel ?? "NOT REVIEWED"}</strong></div>{review ? <><p>{review.publicationBlocked ? "Publication is blocked until high-risk copy is revised and independently reviewed." : "No high-risk identifier was detected by the current rules. Human review is still required."}</p><div className="redaction-list">{review.findings.length ? review.findings.map((finding, index) => <article key={`${finding.field}-${index}`}><span>{finding.severity} · {finding.category}</span><p>{finding.message}</p></article>) : <article><span>NO AUTOMATED FINDINGS</span><p>Automated review cannot prove anonymity.</p></article>}</div><pre>{JSON.stringify(review.publicDraft, null, 2)}</pre></> : <div className="quiet-empty compact"><p>Run the review to generate a separate public-safe draft and redaction log.</p></div>}<div className="actions"><button className="secondary" onClick={preview}>Review on this device</button><button className="primary" onClick={save}>Save protected review</button></div>{message && <p className="quiet-message" role="status">{message}</p>}<small>DRAFT · seller and professional review required. The server reruns redaction before durable storage.</small></aside>
  </div>;
}

function MandateControl({ active, requirements, setRequirements, exclusions, setExclusions, invitationEmail, setInvitationEmail, saveControls, submit, activate, invite, go, message }: { active: Mandate; requirements: BuyerRequirements; setRequirements: (value: BuyerRequirements) => void; exclusions: SellerExclusions; setExclusions: (value: SellerExclusions) => void; invitationEmail: string; setInvitationEmail: (value: string) => void; saveControls: () => void; submit: () => void; activate: () => void; invite: () => void; go: Go; message: string }) {
  return <><div className="quiet-control-grid"><section><span>MANDATE STATUS</span><div className="quiet-meters"><div><small>Teaser</small><strong>{active.teaserStatus}</strong></div><div><small>Identification risk</small><strong>{active.identificationRisk}</strong></div><div><small>Seller approval</small><strong>{active.sellerApprovedAt ? "Recorded" : "Not recorded"}</strong></div><div><small>Admin review</small><strong>{active.adminReviewStatus}</strong></div></div><button className="secondary" onClick={() => go(`/seller/quiet-exit/${active.id}/teaser`)}>Open anonymous teaser studio</button></section>
    <section><span>BUYER QUALIFICATION REQUIREMENTS</span><div className="quiet-form-grid"><Field label="Preferred industries" value={requirements.preferredIndustries ?? ""} onChange={(value) => setRequirements({ ...requirements, preferredIndustries: value })} /><Field label="Preferred geography" value={requirements.preferredGeography ?? ""} onChange={(value) => setRequirements({ ...requirements, preferredGeography: value })} /><Field label="Minimum declared equity" type="number" value={String(requirements.minimumEquity ?? "")} onChange={(value) => setRequirements({ ...requirements, minimumEquity: Number(value || 0) })} /><Field label="Required buyer types" value={requirements.requiredBuyerTypes ?? ""} onChange={(value) => setRequirements({ ...requirements, requiredBuyerTypes: value })} /><label className="quiet-check"><input type="checkbox" checked={Boolean(requirements.financingRequired)} onChange={(event) => setRequirements({ ...requirements, financingRequired: event.target.checked })} /><span>Documented financing preparation required</span></label></div></section>
    <section><span>SELLER EXCLUSIONS</span><div className="quiet-form-grid"><Field label="Excluded buyer types" value={exclusions.excludedBuyerTypes ?? ""} onChange={(value) => setExclusions({ ...exclusions, excludedBuyerTypes: value })} /><Field label="Excluded organizations" value={exclusions.excludedOrganizations ?? ""} onChange={(value) => setExclusions({ ...exclusions, excludedOrganizations: value })} /><Field label="Prohibited geographies" value={exclusions.prohibitedGeographies ?? ""} onChange={(value) => setExclusions({ ...exclusions, prohibitedGeographies: value })} /></div><button className="secondary" onClick={saveControls}>Save qualification controls</button></section>
    <section><span>PUBLICATION CONTROL</span><p>Seller submission does not publish. Admin approval does not replace seller activation. High identification risk blocks activation.</p><div className="actions"><button className="secondary" onClick={submit}>Submit for admin review</button><button className="primary" onClick={activate}>Activate approved mandate</button></div></section></div>
    {active.confidentialityLevel === "Invite-Only Opportunity" && <section className="quiet-invite"><div><span>INVITE-ONLY PREPARATION</span><h2>Prepare one buyer invitation at a time.</h2><p>Delivery is not simulated. The record remains marked pending integration until a secure notification service is configured.</p></div><div><Field label="Invited buyer email" type="email" value={invitationEmail} onChange={setInvitationEmail} /><button className="primary" onClick={invite}>Prepare invitation record</button></div></section>}
    <section className="quiet-dealroom"><div><span>PRIVATE DEAL ROOM PREPARATION</span><h2>Build the access perimeter before files arrive.</h2></div><div>{["Financial package index", "Tax-document checklist", "Customer concentration schedule", "Contract transfer review", "Employee privacy review", "Access policy", "Revocation plan", "Watermarking requirement"].map((item) => <label key={item}><input type="checkbox" /> {item}</label>)}</div><p>Secure uploads are disabled because authenticated confidential object storage is not configured. No file is accepted or simulated.</p><button className="secondary" onClick={() => go("/deal-room")}>Open deal-room preparation</button></section>{message && <p className="quiet-message" role="status">{message}</p>}
  </>;
}

function BuyerQueue({ reviews, onOpen }: { reviews: Array<Record<string, unknown>>; onOpen: (record: Record<string, unknown>) => void }) {
  if (!reviews.length) return <div className="quiet-empty"><span>0 BUYER REVIEWS</span><h2>No qualified buyer summary exists yet.</h2><p>Interest will appear only after an authenticated buyer completes the profile, confidentiality, and access-request workflow. No buyer is fabricated for this empty state.</p></div>;
  return <div className="quiet-table-wrap"><table><thead><tr><th>Request</th><th>Match</th><th>Hard conflicts</th><th>Missing</th><th>Review</th></tr></thead><tbody>{reviews.map((row) => <tr key={String(row.id)}><td>#{String(row.inquiryId)}</td><td>{String(row.matchClassification)}</td><td>{JSON.parse(String(row.hardConflicts ?? "[]")).length}</td><td>{JSON.parse(String(row.missingInformation ?? "[]")).length}</td><td><button className="secondary" onClick={() => onOpen(row)}>Review</button></td></tr>)}</tbody></table></div>;
}

function DisclosureQueue({ disclosures, onOpen }: { disclosures: Array<Record<string, unknown>>; onOpen: (record: Record<string, unknown>) => void }) {
  if (!disclosures.length) return <div className="quiet-empty"><span>0 DISCLOSURE REQUESTS</span><h2>Nothing has been granted.</h2><p>Access requires a buyer request, qualification review, seller decision, and any required admin approval.</p></div>;
  return <div className="quiet-table-wrap"><table><thead><tr><th>Request</th><th>Requested tier</th><th>Decision</th><th>Expiration</th><th>Action</th></tr></thead><tbody>{disclosures.map((row) => <tr key={String(row.id)}><td>#{String(row.id)}</td><td>{String(row.requestedTier)}</td><td>{String(row.decisionStatus)}</td><td>{String(row.expiresAt ?? "Not set")}</td><td><button className="secondary" onClick={() => onOpen(row)}>Decide</button></td></tr>)}</tbody></table></div>;
}

function ActivityLog({ events }: { events: Array<Record<string, unknown>> }) {
  if (!events.length) return <div className="quiet-empty"><span>0 ACCESS EVENTS</span><h2>The audit trail begins with a real action.</h2><p>Mandate creation, review decisions, access requests, disclosures, revocations, and invitation preparation are recorded with actor, state, timestamp, and correlation ID.</p></div>;
  return <div className="quiet-activity">{events.map((event) => <article key={String(event.id)}><span>{String(event.eventType)}</span><strong>{String(event.statusBefore ?? "—")} → {String(event.statusAfter ?? "—")}</strong><small>{String(event.createdAt)} · {String(event.actorRole)}</small></article>)}</div>;
}

function ReviewDrawer({ record, close, decide }: { record: Record<string, unknown>; close: () => void; decide: (decision: string, reason: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const node = ref.current; const previous = document.activeElement as HTMLElement | null; node?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && node) { const focusable = [...node.querySelectorAll<HTMLElement>("button,input,textarea")]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    };
    document.addEventListener("keydown", onKey); return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [close]);
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div className="quiet-review-drawer" ref={ref} role="dialog" aria-modal="true" aria-labelledby="quiet-review-title" tabIndex={-1}><button className="drawer-close" onClick={close}>Close</button><span>SELLER DISCLOSURE DECISION</span><h2 id="quiet-review-title">Approve a tier—not the whole record.</h2><dl>{Object.entries(record).filter(([key]) => !["rawPayload", "buyerEmail"].includes(key)).slice(0, 10).map(([key, value]) => <div key={key}><dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt><dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>)}</dl><Field label="Decision reason or conditions" multiline value={reason} onChange={setReason} /><div className="actions"><button className="secondary" onClick={() => decide("Declined", reason)}>Decline</button><button className="secondary" onClick={() => decide("Conditioned", reason)}>Condition</button><button className="primary" onClick={() => decide("Approved for Disclosure", reason)}>Approve requested tier</button></div><button className="text-button risk-link" onClick={() => decide("Revoked", reason)}>Revoke existing access</button><small>Approval is scoped, logged, and may require independent admin approval. Buyer verification does not guarantee closing capacity.</small></div></div>;
}

function BuyerQuietExit({ path, go }: { path: string; go: Go }) {
  const [state, setState] = useState<ApiState>("loading");
  const [profile, setProfile] = useState<Record<string, string | boolean>>({});
  const [bundle, setBundle] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [mandateId, setMandateId] = useState("");
  useEffect(() => { quietApi("GET", "/api/quiet-exit?view=buyer").then((data) => { setBundle(data); if (data.profile) setProfile(data.profile as Record<string, string | boolean>); setState("ready"); }).catch((error: Error) => { setMessage(error.message); setState("error"); }); }, []);
  async function save() { try { const data = await quietApi("POST", "/api/quiet-exit", { action: "save_buyer_profile", payload: profile }); setBundle({ ...bundle, profile: data.profile }); setMessage("Buyer-provided profile saved. Verification remains Submitted until reviewed."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save."); } }
  async function requestAccess() { try { await quietApi("POST", "/api/quiet-exit", { action: "request_access", mandateId: Number(mandateId), payload: { requestedTier: "Restricted Teaser", reasonForInterest: profile.reasonForInterest ?? "" } }); setMessage("Access request recorded for qualification and seller review."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to request access."); } }
  const fields = [["buyerName", "Buyer name"], ["organization", "Organization"], ["buyerType", "Buyer type"], ["industries", "Preferred industries"], ["geography", "Preferred geography"], ["operatingExperience", "Operating experience"], ["acquisitionExperience", "Acquisition experience"], ["availableEquity", "Available equity declaration"], ["financingStatus", "Financing preparation"], ["transitionApproach", "Transition and continuity approach"]];
  const isProfile = path === "/buyer/profile";
  const disclosures = (bundle.disclosures ?? []) as Array<Record<string, unknown>>;
  const opportunities = (bundle.opportunities ?? []) as Array<Record<string, unknown>>;
  return <><section className="quiet-dashboard-hero"><p className="eyebrow"><span>AUTHENTICATED · BUYER WORKSPACE</span></p><h1>CONFIDENTIAL BUYER ACCESS</h1><p>Build one buyer record, document capacity and experience, acknowledge confidentiality, and request a defined disclosure tier.</p></section><section className="page-content quiet-workspace"><nav className="quiet-tabs" aria-label="Buyer sections">{[["/buyer/profile", "Profile"], ["/buyer/verification", "Verification"], ["/buyer/confidential-opportunities", "Opportunities"], ["/buyer/access-requests", "Access requests"]].map(([href, label]) => <button key={href} className={path === href ? "active" : ""} onClick={() => go(href)}>{label}</button>)}</nav>
    {state === "loading" && <div className="quiet-loading"><span /></div>}
    {isProfile && <div className="quiet-control-grid"><section><span>BUYER PROFILE · BUYER PROVIDED</span><div className="quiet-form-grid">{fields.map(([key, label]) => <Field key={key} label={label} value={String(profile[key] ?? "")} onChange={(value) => setProfile({ ...profile, [key]: value })} />)}<label className="quiet-check"><input type="checkbox" checked={Boolean(profile.confidentialityAcknowledged)} onChange={(event) => setProfile({ ...profile, confidentialityAcknowledged: event.target.checked })} /><span>I acknowledge the confidentiality requirements and understand that verification does not grant automatic access.</span></label></div><button className="primary" onClick={save}>Save buyer profile</button></section><aside><span>VERIFICATION STATUS</span><h2>{String((bundle.profile as Record<string, unknown> | undefined)?.verificationStatus ?? "Not Started")}</h2><p>Identity, capacity, experience, and financing statements remain buyer-provided until independently reviewed.</p></aside></div>}
    {path === "/buyer/verification" && <div className="quiet-qualification-grid">{["Profile complete", "Identity submitted", "Confidentiality acknowledged", "Capacity declared", "Criteria supplied", "Admin review"].map((item, index) => <article key={item}><span>STEP 0{index + 1}</span><h3>{item}</h3><p>{index === 0 && bundle.profile ? "Submitted" : "Needs review"}</p></article>)}</div>}
    {path === "/buyer/confidential-opportunities" && <>{opportunities.length ? <div className="quiet-opportunity-grid">{opportunities.map((opportunity) => { const safe = (opportunity.publicSafeProfile ?? {}) as QuietExitProfile; return <article key={String(opportunity.mandateReference)}><div><span className="badge">{String(opportunity.confidentialityLevel)}</span><span className="status amber">{String(opportunity.accessStatus)}</span></div><h2>{safe.generalIndustry || "Confidential native business"}</h2><p>{safe.broadRegion || "Broad geography withheld"}</p><dl><div><dt>Revenue</dt><dd>{safe.revenueRange || "Not provided"}</dd></div><div><dt>Earnings</dt><dd>{safe.earningsRange || "Not provided"}</dd></div><div><dt>Evidence</dt><dd>{String(opportunity.evidenceClassification)}</dd></div><div><dt>Status</dt><dd>{String(opportunity.status)}</dd></div></dl><button className="secondary" onClick={() => setMandateId(String(opportunity.mandateReference))}>Select for access request</button></article>; })}</div> : <div className="quiet-empty"><span>0 ELIGIBLE OPPORTUNITIES</span><h2>No confidential opportunity is displayed without eligibility.</h2><p>Private mandates and invite-only opportunities never appear here automatically. No opportunity has been fabricated for this empty state.</p></div>}<section className="quiet-request-box"><span>REQUEST A DEFINED TIER</span><p>Use a visible or seller-approved mandate reference. A request does not grant access.</p><Field label="Mandate reference" type="number" value={mandateId} onChange={setMandateId} /><Field label="Reason for interest" multiline value={String(profile.reasonForInterest ?? "")} onChange={(value) => setProfile({ ...profile, reasonForInterest: value })} /><button className="primary" onClick={requestAccess}>Request restricted teaser access</button></section></>}
    {path === "/buyer/access-requests" && (disclosures.length ? <DisclosureQueue disclosures={disclosures} onOpen={() => undefined} /> : <div className="quiet-empty"><span>0 ACCESS REQUESTS</span><h2>No seller has granted access.</h2><p>Request states, conditions, expiration, and revocation events will appear here when real requests exist.</p></div>)}
    {message && <p className="quiet-message" role="status">{message}</p>}</section></>;
}

function AdminQuietExit({ path, go }: { path: string; go: Go }) {
  const [state, setState] = useState<ApiState>("loading"); const [message, setMessage] = useState(""); const [mandates, setMandates] = useState<Mandate[]>([]); const [bundle, setBundle] = useState<Record<string, unknown>>({}); const [disclosureDrawer, setDisclosureDrawer] = useState<Record<string, unknown> | null>(null);
  const parts = path.split("/").filter(Boolean); const id = Number(parts[2] ?? 0); const active = mandates.find((item) => item.id === id);
  useEffect(() => { quietApi("GET", `/api/quiet-exit?view=admin${id ? `&mandateId=${id}` : ""}`).then((data) => { setMandates((data.mandates ?? []) as Mandate[]); setBundle(data); setState("ready"); }).catch((error: Error) => { setMessage(error.message); setState("error"); }); }, [id]);
  async function decide(decision: string) { if (!active) return; try { await quietApi("POST", "/api/quiet-exit", { action: "admin_decision", mandateId: active.id, payload: { decision, reason: "Admin Quiet Exit desk decision" } }); setMessage(`Admin review recorded: ${decision}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record review."); } }
  async function verifyBuyer(profileId: number, decision: string) { try { await quietApi("POST", "/api/quiet-exit", { action: "buyer_verification_decision", payload: { profileId, decision, reason: "Admin identity and profile review" } }); setMessage(`Buyer verification recorded: ${decision}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record verification."); } }
  async function verifySeller() { if (!active) return; try { await quietApi("POST", "/api/quiet-exit", { action: "seller_verification_decision", mandateId: active.id, payload: { decision: "verified", reason: "Admin native seller record review" } }); setMessage("Native seller verification recorded. This does not approve publication or disclosure."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record verification."); } }
  async function decideDisclosure(decision: string, reason: string) { if (!disclosureDrawer) return; try { await quietApi("POST", "/api/quiet-exit", { action: "disclosure_decision", mandateId: Number(disclosureDrawer.mandateId), payload: { disclosureId: Number(disclosureDrawer.id), decision, reason } }); setMessage(`Disclosure review recorded: ${decision}.`); setDisclosureDrawer(null); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record disclosure review."); } }
  const buyerProfiles = (bundle.buyerProfiles ?? []) as Array<Record<string, unknown>>;
  const disclosures = (bundle.disclosures ?? []) as Array<Record<string, unknown>>;
  return <><section className="quiet-dashboard-hero admin"><p className="eyebrow"><span>ADMIN · LEAST PRIVILEGE REVIEW</span></p><h1>QUIET EXIT DESK</h1><p>Review redaction, evidence, buyer qualification, disclosure scope, and access events. Admin approval does not replace seller approval.</p></section><section className="page-content quiet-workspace"><nav className="quiet-tabs">{[["/admin/quiet-exit", "Mandates"], ["/admin/buyer-verification", "Buyer verification"], ["/admin/disclosure-review", "Disclosure review"]].map(([href, label]) => <button key={href} className={path === href ? "active" : ""} onClick={() => go(href)}>{label}</button>)}</nav>
    {state === "loading" && <div className="quiet-loading"><span /></div>}{path === "/admin/quiet-exit" && !mandates.length && state !== "loading" && <div className="quiet-empty"><span>0 QUIET EXIT MANDATES</span><h2>The review queue is honestly empty.</h2><p>No seller, buyer, approval, or opportunity was generated to populate this screen.</p></div>}
    {path === "/admin/quiet-exit" && mandates.length > 0 && <div className="quiet-table-wrap"><table><thead><tr><th>Mandate</th><th>Level</th><th>Risk</th><th>Seller</th><th>Admin</th><th>Open</th></tr></thead><tbody>{mandates.map((item) => <tr key={item.id}><td>#{item.id}</td><td>{item.confidentialityLevel}</td><td>{item.identificationRisk}</td><td>{item.sellerApprovedAt ? "Approved" : "Not approved"}</td><td>{item.adminReviewStatus}</td><td><button className="secondary" onClick={() => go(`/admin/quiet-exit/${item.id}`)}>Review</button></td></tr>)}</tbody></table></div>}
    {active && <div className="quiet-control-grid"><section><span>MANDATE #{active.id}</span><h2>{active.objective}</h2><dl><div><dt>Confidentiality</dt><dd>{active.confidentialityLevel}</dd></div><div><dt>Identification risk</dt><dd>{active.identificationRisk}</dd></div><div><dt>Evidence</dt><dd>{active.evidenceClassification}</dd></div><div><dt>Seller approval</dt><dd>{active.sellerApprovedAt ? "Recorded" : "Missing"}</dd></div></dl><div className="actions"><button className="secondary" onClick={verifySeller}>Verify native seller record</button><button className="secondary" onClick={() => decide("Revision Requested")}>Request revision</button><button className="secondary" onClick={() => decide("Paused")}>Pause</button><button className="primary" onClick={() => decide("Approved")}>Approve controlled activation</button></div></section><aside><span>PUBLIC-SAFE CONTENT</span><pre>{JSON.stringify(active.publicSafeProfile, null, 2)}</pre><p>Known identifiers and private source values are deliberately omitted from this client response.</p></aside></div>}
    {path === "/admin/buyer-verification" && (buyerProfiles.length ? <div className="quiet-table-wrap"><table><thead><tr><th>Profile</th><th>Buyer type</th><th>Identity</th><th>Confidentiality</th><th>Decision</th></tr></thead><tbody>{buyerProfiles.map((profile) => <tr key={String(profile.id)}><td>#{String(profile.id)}</td><td>{String(profile.buyerType ?? "Not provided")}</td><td>{String(profile.verificationStatus)}</td><td>{profile.confidentialityAcknowledged ? "Acknowledged" : "Missing"}</td><td><div className="actions"><button className="secondary" onClick={() => verifyBuyer(Number(profile.id), "Revision Requested")}>Request revision</button><button className="primary" onClick={() => verifyBuyer(Number(profile.id), "Verified")}>Verify</button></div></td></tr>)}</tbody></table></div> : <div className="quiet-empty"><span>VERIFICATION QUEUE</span><h2>No buyer verification decision is fabricated.</h2><p>Submitted buyer profiles will require identity and capacity review. The interface does not claim a third-party verification service is connected.</p></div>)}
    {path === "/admin/disclosure-review" && (disclosures.length ? <DisclosureQueue disclosures={disclosures} onOpen={setDisclosureDrawer} /> : <div className="quiet-empty"><span>DISCLOSURE REVIEW</span><h2>No disclosure request is pending in this view.</h2><p>Seller-scoped decisions and required admin policy review remain separate, logged events.</p></div>)}{message && <p className="quiet-message" role="status">{message}</p>}{disclosureDrawer && <ReviewDrawer record={disclosureDrawer} close={() => setDisclosureDrawer(null)} decide={decideDisclosure} />}</section></>;
}

export function QuietExitModule({ path, go, onStatus }: { path: string; go: Go; onStatus?: (status: string) => void }) {
  const publicPage = publicPages[path];
  if (path === "/quiet-exit") return <QuietExitHome go={go} />;
  if (path === "/quiet-exit/how-it-works") return <QuietHow go={go} />;
  if (path === "/quiet-exit/confidentiality") return <QuietConfidentiality go={go} />;
  if (path === "/quiet-exit/buyer-qualification") return <QuietBuyerQualification go={go} />;
  if (path === "/quiet-exit/resources") return <QuietResources go={go} />;
  if (path === "/seller/quiet-exit" || path.startsWith("/seller/quiet-exit/")) return <SellerQuietExit path={path} go={go} onStatus={onStatus} />;
  if (["/buyer/profile", "/buyer/verification", "/buyer/confidential-opportunities", "/buyer/access-requests"].includes(path)) return <BuyerQuietExit path={path} go={go} />;
  if (path === "/admin/quiet-exit" || path.startsWith("/admin/quiet-exit/") || path === "/admin/buyer-verification" || path === "/admin/disclosure-review") return <AdminQuietExit path={path} go={go} />;
  if (publicPage) return <QuietHero page={publicPage} go={go} />;
  return null;
}
