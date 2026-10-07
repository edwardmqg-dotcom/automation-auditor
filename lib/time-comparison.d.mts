export type TimeComparison = {
  metric_schema_version: "time-comparison-v0.1";
  baseline_run_id: string; automation_run_id: string; task_id: string; task_version: string;
  completion_criteria_ref: string; baseline_human_active_ms: number; automation_human_active_ms: number;
  human_active_delta_ms: number; relative_improvement_pct: number | null; observed_time_reduction: boolean; limitation: string;
};
export function calculateTimeComparison(baseline: { manifest: unknown; events: unknown[] }, automation: { manifest: unknown; events: unknown[] }): TimeComparison;
