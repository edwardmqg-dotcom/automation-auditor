export type RunMetrics = {
  run_id: string;
  mode: "human_baseline" | "automation_version_a" | "automation_version_b";
  task_id: string;
  task_version: string;
  human_active_time_measured: boolean;
  human_active_ms: number;
  intervention_count: number;
  rework_count: number;
  passed: boolean;
  first_pass: boolean;
  conclusion_count: number | null;
  evidence_standard: "human_accountability" | "automation_traceability" | "user_completion";
  metric_schema_version?: "time-metrics-v0.1";
  completion_criteria_ref?: string;
  timing_complete?: boolean;
  traceable_conclusion_count: number | null;
  traceability_rate: number | null;
};

export type ModeMetrics = {
  mode: RunMetrics["mode"];
  task_count: number;
  human_active_time_measured: boolean;
  human_active_ms: number;
  intervention_count: number;
  rework_count: number;
  passed_task_count: number;
  pass_rate: number;
  first_passed_task_count: number;
  first_pass_rate: number;
  evidence_standard: RunMetrics["evidence_standard"];
  traceable_conclusion_count: number | null;
  conclusion_count: number;
  traceability_rate: number | null;
};

export type ComparisonMetrics = {
  metric_schema_version: "metrics-v0.2";
  task_version: string;
  runs: RunMetrics[];
  by_mode: Record<RunMetrics["mode"], ModeMetrics>;
  comparisons: Record<"automation_version_a" | "automation_version_b", {
    baseline_mode: "human_baseline";
    human_active_delta_ms: number;
    relative_improvement_pct: number | null;
    quality_constraint_satisfied: boolean;
    net_improvement_qualified: boolean;
  }>;
};

export function calculateRunMetrics(events: unknown[]): RunMetrics;
export function calculateMetrics(events: unknown[]): ComparisonMetrics;
