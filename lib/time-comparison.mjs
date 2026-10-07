import { calculateRunMetrics } from "./metric-calculator.mjs";

// Never trust cached metrics or a model when making a time-saving claim.
export function calculateTimeComparison(baseline, automation) {
  const human = calculateRunMetrics(baseline.events);
  const current = calculateRunMetrics(automation.events);
  const fail = (message) => { throw new Error(`TIME_COMPARISON_BLOCKED: ${message}`); };
  if (human.evidence_standard !== "user_completion" || current.evidence_standard !== "user_completion") fail("legacy quality reviews are not user completion confirmations");
  if (human.mode !== "human_baseline" || !["automation_version_a", "automation_version_b"].includes(current.mode)) fail("requires a Human baseline and an automation run");
  for (const [bundle, metrics] of [[baseline, human], [automation, current]]) {
    if (bundle.manifest.manifest_version !== "run-manifest-v0.3" || bundle.manifest.completion_basis !== "user_confirmation") fail("requires a versioned user-completion manifest");
    for (const key of ["run_id", "mode", "task_id", "task_version"]) if (bundle.manifest[key] !== metrics[key]) fail("manifest and events disagree");
    if (bundle.manifest.completion_criteria_ref !== metrics.completion_criteria_ref) fail("manifest and confirmation criteria disagree");
    if (!Array.isArray(bundle.manifest.input_refs) || !bundle.manifest.input_refs.length || bundle.manifest.input_refs.some((ref) => typeof ref !== "string" || !/^sha256:[a-f0-9]{64}$/.test(ref))) fail("input fingerprints missing or invalid");
    if (metrics.mode !== "human_baseline" && (!bundle.manifest.automation_version_id || bundle.manifest.automation_version_id === "version-not-registered")) fail("automation version missing");
    if (!metrics.passed) fail("task not confirmed completed; recorded time is not time-to-completion");
    if (!metrics.human_active_time_measured || !metrics.timing_complete) fail("complete human-active timing is not confirmed");
  }
  // Connection revisions may differ across lanes; the same automation identity must not.
  for (const key of ["automation_id", "benchmark_id", "task_id", "task_version", "review_as_of", "completion_criteria_ref"]) {
    if (!baseline.manifest[key] || baseline.manifest[key] !== automation.manifest[key]) fail(`different ${key}`);
  }
  if (JSON.stringify([...baseline.manifest.input_refs].sort()) !== JSON.stringify([...automation.manifest.input_refs].sort())) fail("different input fingerprints");
  const delta = human.human_active_ms - current.human_active_ms;
  return {
    metric_schema_version: "time-comparison-v0.1", baseline_run_id: human.run_id, automation_run_id: current.run_id,
    task_id: human.task_id, task_version: human.task_version, completion_criteria_ref: human.completion_criteria_ref,
    baseline_human_active_ms: human.human_active_ms, automation_human_active_ms: current.human_active_ms,
    human_active_delta_ms: delta, relative_improvement_pct: human.human_active_ms === 0 ? null : delta / human.human_active_ms * 100,
    observed_time_reduction: delta > 0,
    limitation: "Controlled task, based on user completion and timing confirmation. Not an independent output-quality assessment, production-safety judgment or enterprise ROI estimate.",
  };
}
