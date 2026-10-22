import type { AdapterType } from "./automation-connection";

export type ConsoleRunState = "ready" | "running" | "submitted" | "reviewed";

type AccessOutcome = "pending_manual_confirmation" | "verified" | "failed" | null | undefined;

// Session access guidance only. The existing handlers still own verification;
// these prompts never create a run, confirm completion, or start a timer.
export function runAccessPrompt(mode: "Human" | "Version A" | "Version B", state: ConsoleRunState, adapter: AdapterType, outcome: AccessOutcome, toolName: string) {
  if (mode === "Human" || state !== "ready") return null;
  if (outcome === "verified") return { tone: "neutral", text: "Tool access confirmed. Click Prepare run to prepare the run. This does not start timing." };
  if (adapter !== "guided") return outcome === "pending_manual_confirmation"
    ? { tone: "neutral", text: "Checking tool access. Wait for the result before preparing the run. Timing stays off." }
    : { tone: outcome === "failed" ? "warning" : "neutral", text: `Check access to ${toolName} before preparing the run. This only checks the endpoint response, not whether the tool can complete the task. Timing stays off.` };
  if (outcome === "pending_manual_confirmation") return { tone: "neutral", text: `Return here and click Confirm tool opened only if ${toolName} opened successfully. If it did not, choose Could not open tool. Timing stays off.` };
  return outcome === "failed"
    ? { tone: "warning", text: `Access to ${toolName} was not confirmed. Click Open tool to try again. Timing stays off.` }
    : { tone: "neutral", text: `Before preparing this run, check tool access for this session. Open ${toolName}, then return here to confirm that it opens. Timing stays off.` };
}

export function nextAvailableRunSequence(prefix: string, sequence: number, storedIds: string[]) {
  const ids = new Set(storedIds);
  while (ids.has(`${prefix}${String(sequence).padStart(2, "0")}`)) sequence++;
  return sequence;
}

export function runWorkInstructions(mode: "Human" | "Version A" | "Version B", toolName: string) {
  return mode === "Human"
    ? "Complete the task manually and save your result. Use this page to time your active work."
    : `Complete the task in ${toolName}, then check and save its result. Time all your active work here, including necessary corrections.`;
}

// Presentation only: never starts work, creates events, or changes timing.
export function runConsolePrompt(state: ConsoleRunState, humanActive: boolean, hasWorked: boolean, measurementComplete = true) {
  if (state === "ready") return { tone: "neutral", text: "Click Prepare run to prepare the run. This does not start timing." };
  if (state === "reviewed") return measurementComplete
    ? { tone: "neutral", text: "Completion record saved. You can export the run records or continue to Compare." }
    : { tone: "warning", text: "Measurement incomplete. This record cannot be used for a time comparison. Repeat the full task with timing; the previous record stays saved." };
  if (humanActive) return { tone: "neutral", text: "Timing is running. Click Pause human work for breaks or machine-only waiting, or before submitting your saved result." };
  if (state === "submitted") return { tone: "neutral", text: "Result reference recorded. Click Start checking / correction if more work is needed, or save your completion decision below." };
  return hasWorked
    ? { tone: "warning", text: "Timing is paused. Click Start human work before continuing the task; check that COUNTING appears and the timer advances." }
    : { tone: "neutral", text: "Ready to start timing. Click Start human work when you begin; check that COUNTING appears and the timer advances." };
}

export function measurementReady(metrics: { passed?: boolean; timing_complete?: boolean; human_active_time_measured?: boolean; evidence_standard?: string }) {
  return metrics.evidence_standard === "user_completion" && metrics.passed === true && metrics.timing_complete === true && metrics.human_active_time_measured === true;
}

export function canSaveCompleteMeasurement(humanActive: boolean, sealing: boolean, timingComplete: boolean, decision: string, responsible: boolean, reviewer: string, result: string, hasMeasuredWork: boolean) {
  return !humanActive && !sealing && timingComplete && decision === "pass" && responsible && Boolean(reviewer.trim()) && Boolean(result.trim()) && hasMeasuredWork;
}

export function canSubmitTaskResult(state: ConsoleRunState, humanActive: boolean, resultRef: string, checkpointReady: boolean) {
  return state === "running" && !humanActive && checkpointReady && Boolean(resultRef.trim());
}
