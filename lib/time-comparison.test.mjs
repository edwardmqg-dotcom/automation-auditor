import test from "node:test";
import assert from "node:assert/strict";
import { calculateRunMetrics, calculateMetrics } from "./metric-calculator.mjs";
import { calculateTimeComparison } from "./time-comparison.mjs";
import { normalizeAnalystInput } from "./ai-analyst.mjs";
import { inspectCompletionBundle } from "./completion-bundle-import.mjs";

// Synthetic regression fixture, never a user measurement or live model call.
function bundle(mode = "automation_version_a", timingComplete = true) {
  const runId = `TEST-ONLY-${mode}`;
  const criteria = "test-only://task-instructions-v1";
  const at = (seconds) => new Date(Date.UTC(2026, 0, 1) + seconds * 1000).toISOString();
  const base = { run_id: runId, mode, task_id: "TEST-TASK", task_version: "TEST-v1", input_ref: "benchmark://TEST-BENCH/TEST-TASK", actor: "human", output_ref: "test-only://original", status: "completed", reason_code: "none" };
  const event = (id, type, start, end, metadata = {}) => ({ ...base, event_id: id, event_type: type, started_at: at(start), ended_at: at(end), duration_ms: (end - start) * 1000, metadata });
  const events = [
    event("E1", "run_started", 0, 0), event("E2", "human_action", 0, 10, { billable_human_active: true }),
    event("E3", "run_completed", 10, 10), event("E4", "human_review", 20, 30, { billable_human_active: true }),
    event("E5", "human_correction", 40, 50, { billable_human_active: true }),
    event("E6", "review_submitted", 60, 60, { completion_basis: "user_confirmation", completion_criteria_ref: criteria, reviewer_ref: "TEST-USER", timing_complete: timingComplete }),
    event("E7", "acceptance_passed", 60, 60, { completion_basis: "user_confirmation", completion_criteria_ref: criteria, reviewer_ref: "TEST-USER" }),
  ];
  const manifest = { manifest_version: "run-manifest-v0.3", completion_basis: "user_confirmation", completion_criteria_ref: criteria, run_id: runId, mode, task_id: "TEST-TASK", task_version: "TEST-v1", automation_id: "TEST-AUT", automation_manifest_id: "TEST-AUT--CONNECTION-v1", automation_version_id: "TEST-code-v1", benchmark_id: "TEST-BENCH", input_refs: ["sha256:" + "a".repeat(64)], review_as_of: "2026-01-01" };
  return { manifest, events, metrics: calculateRunMetrics(events) };
}

test("operation, post-submit checking and correction all count without quality counts", () => {
  const run = bundle();
  assert.equal(run.metrics.human_active_ms, 30_000);
  assert.equal(run.metrics.evidence_standard, "user_completion");
  assert.equal(run.metrics.conclusion_count, null);
  assert.equal(run.metrics.traceability_rate, null);
});

test("two-mode time report is deterministic and accepts negative savings", () => {
  const result = calculateTimeComparison(bundle("human_baseline"), bundle());
  assert.equal(result.human_active_delta_ms, 0);
  assert.equal(result.observed_time_reduction, false);
  const current = bundle();
  current.events[4].ended_at = "2026-01-01T00:00:55.000Z";
  current.events[4].duration_ms = 15_000;
  current.metrics.human_active_ms = 1; // cached metrics must not drive claims
  assert.equal(calculateTimeComparison(bundle("human_baseline"), current).human_active_delta_ms, -5000);
});

test("unfinished task or incomplete timing blocks savings, but retains recorded time", () => {
  assert.throws(() => calculateTimeComparison(bundle("human_baseline"), bundle("automation_version_a", false)), /timing/);
  const unfinished = bundle();
  unfinished.events.at(-1).event_type = "acceptance_failed";
  unfinished.events.at(-1).metadata.decision_note = "TEST-ONLY: unfinished";
  assert.equal(calculateRunMetrics(unfinished.events).human_active_ms, 30_000);
  assert.throws(() => calculateTimeComparison(bundle("human_baseline"), unfinished), /not confirmed completed/);
});

test("different task, input, operator criteria or connection blocks comparison", () => {
  for (const key of ["task_id", "task_version", "automation_id", "benchmark_id", "review_as_of", "completion_criteria_ref", "input_refs"]) {
    const current = bundle(); current.manifest[key] = key === "input_refs" ? ["sha256:" + "b".repeat(64)] : "DIFFERENT";
    assert.throws(() => calculateTimeComparison(bundle("human_baseline"), current), /BLOCKED/);
  }
});

test("overlap, missing operator and late work cannot be sealed as complete timing", () => {
  const overlapping = bundle();
  overlapping.events[4].started_at = overlapping.events[3].started_at;
  overlapping.events[4].duration_ms = 30_000;
  assert.throws(() => calculateRunMetrics(overlapping.events), /overlap/);
  const unsigned = bundle(); delete unsigned.events[5].metadata.reviewer_ref;
  assert.throws(() => calculateRunMetrics(unsigned.events), /confirmation/);
  const late = bundle(); late.events[4].ended_at = "2026-01-01T00:01:05.000Z"; late.events[4].duration_ms = 25_000;
  assert.throws(() => calculateRunMetrics(late.events), /sealed/);
});

test("confirmed timing exclusion preserves original event and subtracts only that segment", () => {
  const run = bundle();
  const original = JSON.stringify(run.events[1]);
  const correction = { ...run.events[2], event_id: "EXCLUSION", event_type: "timing_excluded", metadata: { target_event_id: "E2", exclusion_reason: "TEST-ONLY troubleshooting", reviewer_ref: "TEST-USER", confirmation_ref: "test-only://confirmation" } };
  run.events.splice(3, 0, correction);
  assert.equal(calculateRunMetrics(run.events).human_active_ms, 20_000);
  assert.equal(JSON.stringify(run.events[1]), original);
});

test("legacy comparison cannot silently mix user completion with quality scoring", () => {
  assert.throws(() => calculateMetrics(bundle().events), /not interchangeable/);
});

test("analyst recomputes completion evidence and does not call it a quality score", () => {
  const run = bundle(); run.metrics.human_active_ms = 1;
  const normalized = normalizeAnalystInput({ runs: [run] });
  assert.equal(normalized.evidence.runs[0].human_active_ms, 30_000);
  assert.equal(normalized.evidence.runs[0].traceability_rate, null);
  assert.match(normalized.deterministicAnalysis.executive_summary, /no independent quality score/);
  assert.match(normalized.observationCatalog[0].observation, /user confirmed/);
});

const exportable = () => {
  const run = bundle();
  return { bundle_version: "evidence-bundle-v0.1", ...run, manifest: { ...run.manifest,
    rubric_ref: "test-only://original-rubric", original_output_ref: "test-only://original", operator_ref: "TEST-USER",
    auditor_build_id: "TEST-ONLY", connectivity_evidence_id: "TEST-ONLY", event_schema: "event-schema.v0.4.json",
    started_at: run.events[0].started_at, completed_at: run.events.at(-1).ended_at,
    completion_record_status: "local-record-not-release-approval",
    artifacts: { raw_event_log: "test-only-events.json", review_output: "test-only://original", manual_review: "TEST-USER", failure_record: "" },
  } };
};

test("local bundle import recomputes metrics without editing original events", () => {
  const run = exportable(); run.metrics.human_active_ms = 1;
  const original = JSON.stringify(run.events);
  assert.equal(inspectCompletionBundle(run).metrics.human_active_ms, 30_000);
  assert.equal(JSON.stringify(run.events), original);
});

test("bundle import rejects forged identity, output, operator and timestamp references", () => {
  for (const key of ["task_id", "operator_ref", "original_output_ref", "completed_at"]) {
    const run = exportable(); run.manifest[key] = "FORGED";
    assert.throws(() => inspectCompletionBundle(run), /REJECTED/);
  }
  const legacy = exportable(); legacy.manifest.manifest_version = "run-manifest-v0.2";
  assert.throws(() => inspectCompletionBundle(legacy), /legacy reviews/);
});

test("predeclared completion conditions cannot be replaced after seeing output", () => {
  const run = bundle(); run.events[0].metadata.completion_criteria_ref = "test-only://different";
  assert.throws(() => calculateRunMetrics(run.events), /cannot be changed/);
});

test("versioned connection revisions can differ for the same automation identity", () => {
  const current = bundle(); current.manifest.automation_manifest_id = "TEST-AUT--OTHER-CONNECTION";
  assert.equal(calculateTimeComparison(bundle("human_baseline"), current).human_active_delta_ms, 0);
});
