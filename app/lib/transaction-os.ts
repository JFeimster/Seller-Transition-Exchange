export const transactionStages = ["Explore", "Prepare", "Package", "Match", "Transition"] as const;
export type TransactionStage = (typeof transactionStages)[number];

export const actionStatuses = ["Not Started", "In Progress", "Needs Information", "Needs Review", "Ready", "Completed", "Archived"] as const;
export type ActionStatus = (typeof actionStatuses)[number];

export const evidenceStatuses = ["Verified", "Seller Provided", "Buyer Provided", "Advisor Submitted", "Inferred", "Stale", "Conflicting", "Missing", "Demo"] as const;

export const defaultTransitionActions = [
  { stage: "Explore", title: "Confirm the transition objective", module: "Seller profile", route: "/sell", evidence: "Seller Provided" },
  { stage: "Prepare", title: "Complete Exit Readiness", module: "Exit Readiness", route: "/exit-readiness", evidence: "Missing" },
  { stage: "Prepare", title: "Organize the evidence baseline", module: "Evidence Control", route: "/seller/evidence", evidence: "Missing" },
  { stage: "Package", title: "Prepare the controlled materials", module: "Seller Launch Studio", route: "/seller/launch-studio", evidence: "Seller Provided" },
  { stage: "Match", title: "Set the disclosure perimeter", module: "Quiet Exit Network", route: "/seller/quiet-exit", evidence: "Missing" },
  { stage: "Transition", title: "Compare the transition paths", module: "Change-of-Ownership Planning", route: "/change-of-ownership", evidence: "Seller Provided" },
] as const;

export function nextStageAction(actions: Array<{ status: string; stage: string; title: string; route: string }>) {
  return actions.find((item) => !["Completed", "Archived"].includes(item.status)) ?? null;
}

export function stageIndex(stage: string) {
  const index = transactionStages.indexOf(stage as TransactionStage);
  return index < 0 ? 0 : index;
}
