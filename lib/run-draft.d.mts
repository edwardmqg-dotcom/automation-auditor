export const RUN_DRAFT_KEY: string;
export const RUN_DRAFT_VERSION: string;
export type RunDraft = {
  schema_version: string;
  saved_at: string;
  run_id: string;
  run_sequence: number;
  run_state: "running" | "submitted";
  mode: "Human" | "Version A" | "Version B";
  automation_manifest_id: string;
  benchmark_id: string;
  task_id: string;
  task_version: string;
  input_ref: string;
  active_seconds: number;
  human_active: boolean;
  human_started_at: string | null;
  events: unknown[];
  review_output_ref: string;
  completion_form?: {
    criteria_ref: string; final_output_ref: string; reviewer_ref: string; decision_note: string;
    decision: "" | "pass" | "fail"; confirmed: boolean; timing_complete: boolean;
  };
};
export function inspectRunDraft(value: unknown): { draft: RunDraft | null; errors: string[] };
export function recoverInterruptedRun(draft: RunDraft): RunDraft;
