import { humanElapsedMs } from "./human-timing.mjs";

export const RUN_DRAFT_KEY = "automation-auditor-active-run-v0.1";
export const RUN_DRAFT_VERSION = "active-run-v0.1";

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isTimestamp = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));

export function inspectRunDraft(value) {
  const errors = [];
  if (!isObject(value)) return { draft: null, errors: ["Run draft must be an object."] };
  if (value.schema_version !== RUN_DRAFT_VERSION) errors.push("Unsupported run draft version.");
  if (!["running", "submitted"].includes(value.run_state)) errors.push("Run draft must be running or submitted.");
  if (!["Human", "Version A", "Version B"].includes(value.mode)) errors.push("Invalid run mode.");
  for (const field of ["run_id", "automation_manifest_id", "benchmark_id", "task_id", "task_version", "input_ref"]) {
    if (typeof value[field] !== "string" || !value[field]) errors.push(`Missing ${field}.`);
  }
  if (!Number.isInteger(value.run_sequence) || value.run_sequence < 1) errors.push("Invalid run sequence.");
  if (!Number.isInteger(value.active_seconds) || value.active_seconds < 0) errors.push("Invalid active seconds.");
  if (typeof value.human_active !== "boolean") errors.push("Invalid human-active flag.");
  if (!isTimestamp(value.saved_at)) errors.push("Invalid save timestamp.");
  if (value.human_started_at !== null && !isTimestamp(value.human_started_at)) errors.push("Invalid segment start.");
  if (value.human_active && value.human_started_at === null) errors.push("Active segment has no start timestamp.");
  if (!Array.isArray(value.events) || value.events.some((event) => !isObject(event) || typeof event.event_id !== "string" || event.run_id !== value.run_id)) errors.push("Invalid event list.");
  if (typeof value.review_output_ref !== "string") errors.push("Invalid output reference.");
  if (value.completion_form !== undefined) {
    const form = value.completion_form;
    if (!isObject(form) || ["criteria_ref", "final_output_ref", "reviewer_ref", "decision_note"].some((key) => typeof form[key] !== "string")
      || !["", "pass", "fail"].includes(form.decision) || typeof form.confirmed !== "boolean" || typeof form.timing_complete !== "boolean") errors.push("Invalid completion form.");
  }
  return { draft: errors.length === 0 ? value : null, errors };
}

export function recoverInterruptedRun(draft) {
  if (!draft.human_active) return { ...draft, active_seconds: Math.floor(humanElapsedMs(draft.events) / 1000), human_started_at: null };
  const started = Date.parse(draft.human_started_at);
  const observedUntil = Date.parse(draft.saved_at);
  if (!Number.isFinite(started) || !Number.isFinite(observedUntil) || observedUntil < started) {
    throw new Error("The saved human-work interval is invalid; recovery requires manual review.");
  }
  const event = {
    event_id: `EV-${String(draft.events.length + 1).padStart(3, "0")}`,
    run_id: draft.run_id,
    mode: draft.mode === "Human" ? "human_baseline" : draft.mode === "Version A" ? "automation_version_a" : "automation_version_b",
    task_id: draft.task_id,
    task_version: draft.task_version,
    actor: "human",
    event_type: draft.run_state === "submitted" ? "human_review" : "human_action",
    started_at: draft.human_started_at,
    ended_at: draft.saved_at,
    duration_ms: observedUntil - started,
    input_ref: draft.input_ref,
    output_ref: "",
    status: "completed",
    reason_code: "none",
    metadata: {
      label: "Interrupted human work segment",
      detail: "Recovered only through the last locally saved heartbeat; time after that point was not counted.",
      billable_human_active: true,
    },
  };
  const events = [...draft.events, event];
  const activeSeconds = Math.floor(humanElapsedMs(events) / 1000);
  return { ...draft, active_seconds: activeSeconds, human_active: false, human_started_at: null, events };
}
