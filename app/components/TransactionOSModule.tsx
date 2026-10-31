"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { actionStatuses, transactionStages } from "../lib/transaction-os";

type Go = (path: string) => void;
type ActionItem = { id: number; stage: string; title: string; module: string; route: string; priority: number; status: string; evidenceStatus: string; requiredInput?: string | null };
type Evidence = { id: number; fieldPath: string; entityType: string; evidenceStatus: string; reviewStatus: string; reviewerNotes?: string | null; sourceLineage?: Record<string, unknown> };
type Activity = { id: number; createdAt: string; actorRole: string; summary: string; statusAfter?: string | null; eventType: string };
type State = { seller: { verificationStatus?: string; transitionGoal?: string; confidentialityPreference?: string } | null; business: { industry?: string; anonymousName?: string; verificationStatus?: string } | null; checkpoints: Array<{ stage: string; status: string; nextMilestone?: string | null }>; actions: ActionItem[]; evidence: Evidence[]; activity: Activity[]; nextAction: ActionItem | null; error?: string };

const empty: State = { seller: null, business: null, checkpoints: [], actions: [], evidence: [], activity: [], nextAction: null };

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "The workspace is temporarily unavailable.");
  return result;
}

function Status({ value }: { value: string }) {
  const tone = ["Ready", "Completed", "Verified", "Approved"].includes(value) ? "lime" : ["Missing", "Needs Review", "Needs Information", "In Progress", "Conflicting", "Stale"].includes(value) ? "amber" : "";
  return <span className={`status ${tone}`}>{value}</span>;
}

export function TransactionOSModule({ path, go }: { path: string; go: Go }) {
  const [state, setState] = useState<State>(empty);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const admin = path.startsWith("/admin/");
  const view = path.endsWith("/tasks") ? "tasks" : path.endsWith("/activity") ? "activity" : path.endsWith("/evidence") ? "evidence" : path.endsWith("/reviews") ? "reviews" : path.endsWith("/access") ? "access" : "overview";
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      if (!admin) await api("/api/transaction-os", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ensure_workspace" }) });
      const data = await api(`/api/transaction-os${admin ? "?view=admin" : ""}`);
      setState({ ...empty, ...data });
    } catch (error) { setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Workspace unavailable" })); }
    finally { setLoading(false); }
  }, [admin]);
  useEffect(() => { void load(); }, [load]);

  const byStage = useMemo(() => transactionStages.map((stage) => ({ stage, checkpoint: state.checkpoints.find((item) => item.stage === stage), actions: state.actions.filter((item) => item.stage === stage) })), [state]);
  async function updateAction(item: ActionItem, status: string) {
    try { await api("/api/transaction-os", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update_action", actionId: item.id, payload: { status } }) }); setMessage(`Updated: ${item.title}`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Update unavailable."); }
  }
  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const fieldPath = String(form.get("fieldPath") ?? "").trim(); if (!fieldPath) return;
    try { await api("/api/transaction-os", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_evidence", payload: { fieldPath, sourceType: String(form.get("sourceType") ?? "Seller Provided"), sourceReference: String(form.get("sourceReference") ?? "") } }) }); event.currentTarget.reset(); setMessage("Evidence review added for admin review."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Evidence review unavailable."); }
  }
  async function reviewEvidence(item: Evidence, evidenceStatus: string) {
    try { await api("/api/transaction-os", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "review_evidence", evidenceId: item.id, payload: { evidenceStatus, reviewStatus: "Reviewed" } }) }); setMessage(`Review recorded for ${item.fieldPath}.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Review unavailable."); }
  }

  const title = admin ? "Transaction operations" : view === "tasks" ? "My transition tasks" : view === "activity" ? "Transition activity" : view === "evidence" ? "Evidence control" : "My transition";
  const intro = admin ? "Review work that is incomplete, conflicting, expired, or waiting on an authorized decision. Records remain separate from approval, disclosure, and professional review." : "One seller, one business, one operating sequence. Complete the next requirement before the market discovers it for you.";
  if (loading) return <main className="shell os-page"><p className="eyebrow">TRANSITION OPERATING SYSTEM</p><section className="panel"><h1>Loading your transition workspace…</h1><p>Preparing canonical records, existing modules, and current controls.</p></section></main>;
  if (state.error) return <main className="shell os-page"><p className="eyebrow">TRANSITION OPERATING SYSTEM</p><section className="empty-filter"><span>WORKSPACE NOT READY</span><h1>Open the seller record first.</h1><p>{state.error}</p><button className="primary" onClick={() => go("/sell")}>Create or continue seller profile</button></section></main>;

  return <main className="shell os-page">
    <section className="page-heading"><p className="eyebrow">{admin ? "ADMIN · OPERATIONS CONTROL" : "PRIVATE SELLER WORKSPACE · CANONICAL RECORD"}</p><h1>{title}</h1><p>{intro}</p></section>
    {message && <div className="demo-notice"><strong>Workspace update</strong><span>{message}</span></div>}
    {!admin && <nav className="os-subnav" aria-label="Transition workspace"><button className={view === "overview" ? "active" : ""} onClick={() => go("/seller/transition")}>Overview</button><button className={view === "tasks" ? "active" : ""} onClick={() => go("/seller/tasks")}>Tasks</button><button className={view === "evidence" ? "active" : ""} onClick={() => go("/seller/evidence")}>Evidence</button><button className={view === "activity" ? "active" : ""} onClick={() => go("/seller/activity")}>Activity</button></nav>}
    {admin && <nav className="os-subnav" aria-label="Operations control"><button className={view === "overview" ? "active" : ""} onClick={() => go("/admin/operations")}>Operations</button><button className={view === "reviews" ? "active" : ""} onClick={() => go("/admin/reviews")}>Reviews</button><button className={view === "evidence" ? "active" : ""} onClick={() => go("/admin/evidence")}>Evidence</button><button className={view === "access" ? "active" : ""} onClick={() => go("/admin/access")}>Access</button></nav>}

    {!admin && view === "overview" && <>
      <section className="os-next panel"><div><span>ONE PRIMARY NEXT ACTION</span><h2>{state.nextAction?.title ?? "Create the seller profile"}</h2><p>{state.nextAction ? `${state.nextAction.module} · ${state.nextAction.evidenceStatus} evidence` : "Your seller profile creates the canonical record every other module uses."}</p></div><button className="primary" onClick={() => go(state.nextAction?.route ?? "/sell")}>{state.nextAction ? "Open next action" : "Start profile"}</button></section>
      <section className="os-stage-grid">{byStage.map(({ stage, checkpoint, actions }, index) => <article className="os-stage" key={stage}><div><span>0{index + 1} · {stage.toUpperCase()}</span><Status value={checkpoint?.status ?? "Not Started"} /></div><h2>{stage}</h2><p>{checkpoint?.nextMilestone ?? "Awaiting the prior-stage evidence."}</p><small>{actions.filter((item) => item.status === "Completed").length} of {actions.length} recorded actions complete</small><button className="text-button" onClick={() => go("/seller/tasks")}>Review actions →</button></article>)}</section>
      <section className="os-summary-grid"><article className="panel"><span>CANONICAL PROFILE</span><h2>{state.business?.anonymousName || "Business profile"}</h2><p>{state.business?.industry || "Industry pending"} · Seller verification: {state.seller?.verificationStatus ?? "Missing"}</p><button className="secondary" onClick={() => go("/sell")}>Edit profile</button></article><article className="panel"><span>CONFIDENTIALITY</span><h2>{state.seller?.confidentialityPreference || "Not selected"}</h2><p>Seller approval, buyer verification, and administrator review remain independent gates.</p><button className="secondary" onClick={() => go("/seller/quiet-exit")}>Open Quiet Exit</button></article><article className="panel"><span>NETWORK & CAPITAL</span><h2>Match only when ready</h2><p>Buyer, advisor, and financing routes remain scoped, evidence-aware, and separately approved.</p><div className="actions"><button className="secondary" onClick={() => go("/buyers")}>Buyer network</button><button className="secondary" onClick={() => go("/financing-readiness")}>Financing</button></div></article></section>
    </>}

    {!admin && view === "tasks" && <section className="os-list panel"><div className="panel-head"><div><span>ACTION QUEUE</span><h2>Move the transition one valid checkpoint at a time.</h2></div><Status value={`${state.actions.filter((item) => item.status === "Completed").length} complete`} /></div>{state.actions.map((item) => <article key={item.id}><div><span>{item.stage} · {item.module}</span><h3>{item.title}</h3><p>Evidence: {item.evidenceStatus}{item.requiredInput ? ` · Required input: ${item.requiredInput}` : ""}</p></div><div className="os-row-actions"><Status value={item.status} /><button className="secondary" onClick={() => go(item.route)}>Open</button><select aria-label={`Status for ${item.title}`} value={item.status} onChange={(event) => void updateAction(item, event.target.value)}>{actionStatuses.map((status) => <option key={status}>{status}</option>)}</select></div></article>)}</section>}

    {!admin && view === "evidence" && <section className="os-evidence"><form className="panel evidence-form" onSubmit={addEvidence}><span>ADD EVIDENCE REVIEW</span><h2>Record what exists before calling it verified.</h2><label><span>Field or claim</span><input name="fieldPath" placeholder="e.g., financials.TTM_P&L" required /></label><label><span>Source classification</span><select name="sourceType"><option>Seller Provided</option><option>Buyer Provided</option><option>Advisor Submitted</option><option>Inferred</option></select></label><label><span>Source reference</span><input name="sourceReference" placeholder="Reference only — do not paste sensitive content" /></label><button className="primary">Add for review</button></form><EvidenceList items={state.evidence} /></section>}
    {!admin && view === "activity" && <ActivityList items={state.activity} />}

    {admin && <AdminPanels view={view} state={state} go={go} reviewEvidence={reviewEvidence} />}
  </main>;
}

function EvidenceList({ items }: { items: Evidence[] }) { return <section className="os-list panel"><div className="panel-head"><div><span>EVIDENCE REVIEW</span><h2>Current field-level record</h2></div><Status value={`${items.length} records`} /></div>{items.length ? items.map((item) => <article key={item.id}><div><span>{item.entityType} · {item.fieldPath}</span><h3>{item.evidenceStatus}</h3><p>{item.reviewStatus}{item.reviewerNotes ? ` · ${item.reviewerNotes}` : ""}</p></div><Status value={item.evidenceStatus} /></article>) : <p className="empty-copy">No evidence records yet. Add the first field that needs review.</p>}</section>; }
function ActivityList({ items }: { items: Activity[] }) { return <section className="os-list panel"><div className="panel-head"><div><span>ACTIVITY TIMELINE</span><h2>Actions and decisions—not fictional updates.</h2></div></div>{items.length ? items.map((item) => <article key={item.id}><div><span>{new Date(item.createdAt).toLocaleString()} · {item.actorRole}</span><h3>{item.summary}</h3><p>{item.eventType}</p></div>{item.statusAfter && <Status value={item.statusAfter} />}</article>) : <p className="empty-copy">Your activity timeline will begin when a canonical workspace record is created.</p>}</section>; }
function AdminPanels({ view, state, go, reviewEvidence }: { view: string; state: State; go: Go; reviewEvidence: (item: Evidence, status: string) => Promise<void> }) { const actionRows = view === "reviews" ? state.actions.filter((item) => ["Needs Review", "Needs Information"].includes(item.status)) : state.actions; const evidenceRows = view === "evidence" || view === "reviews" ? state.evidence : []; return <><section className="os-admin-kpis"><article><span>PENDING ACTIONS</span><strong>{state.actions.filter((item) => !["Completed", "Archived"].includes(item.status)).length}</strong></article><article><span>NEEDS REVIEW</span><strong>{state.evidence.filter((item) => item.reviewStatus !== "Reviewed").length}</strong></article><article><span>CONFLICTS / STALE</span><strong>{state.evidence.filter((item) => ["Conflicting", "Stale"].includes(item.evidenceStatus)).length}</strong></article><article><span>ACCESS CONTROL</span><strong>Scoped</strong></article></section>{(view === "overview" || view === "reviews") && <section className="os-list panel"><div className="panel-head"><div><span>REVIEW QUEUE</span><h2>Operational work awaiting an authorized decision.</h2></div><button className="secondary" onClick={() => go("/admin/evidence")}>Open evidence</button></div>{actionRows.length ? actionRows.map((item) => <article key={item.id}><div><span>{item.stage} · {item.module}</span><h3>{item.title}</h3><p>Owner input: {item.requiredInput || "Not stated"}</p></div><Status value={item.status} /></article>) : <p className="empty-copy">No transition actions currently require review.</p>}</section>}{(view === "evidence" || view === "reviews") && <section className="os-list panel"><div className="panel-head"><div><span>EVIDENCE CONTROL</span><h2>Review source classification before elevating a claim.</h2></div></div>{evidenceRows.length ? evidenceRows.map((item) => <article key={item.id}><div><span>{item.entityType} · {item.fieldPath}</span><h3>{item.evidenceStatus}</h3><p>{item.reviewStatus}</p></div><div className="os-row-actions"><Status value={item.reviewStatus} /><button className="secondary" onClick={() => void reviewEvidence(item, "Verified")}>Mark verified</button><button className="secondary" onClick={() => void reviewEvidence(item, "Needs Information")}>Request info</button></div></article>) : <p className="empty-copy">No seller evidence has entered the review queue.</p>}</section>}{view === "access" && <section className="panel"><span>ACCESS CONTROL</span><h2>Disclosure and document access remain separately governed.</h2><p>Quiet Exit requires seller approval, buyer verification, and scoped disclosure. Deal Room access uses item-level, time-bound grants that can be revoked. Secure file delivery remains disabled until authenticated storage and scanning are configured.</p><div className="actions"><button className="primary" onClick={() => go("/admin/quiet-exit")}>Review disclosures</button><button className="secondary" onClick={() => go("/admin/deal-rooms")}>Review Deal Rooms</button></div></section>}</>; }
