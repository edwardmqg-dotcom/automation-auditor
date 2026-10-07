import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalystMessages, normalizeAnalystInput, parseAnalystResponse } from "./ai-analyst.mjs";

const reviewedRun = {
  manifest: {
    run_id: "RUN-A-001",
    mode: "automation_version_a",
    automation_version_id: "v1.0.0",
    benchmark_id: "benchmark-001",
    task_id: "TASK-001",
    task_version: "gold-v0.1",
    review_as_of: "2026-09-13",
  },
  metrics: {
    human_active_ms: 12000,
    intervention_count: 1,
    rework_count: 0,
    passed: true,
    first_pass: true,
    traceability_rate: 1,
  },
  events: [
    {
      event_id: "EV-001",
      event_type: "run_started",
      actor: "system",
      duration_ms: 0,
      status: "started",
      reason_code: "none",
      input_ref: "benchmark://benchmark-001/TASK-001",
      output_ref: "",
      metadata: { label: "Run started", detail: "Controlled run" },
    },
    {
      event_id: "EV-002",
      event_type: "human_action",
      actor: "human",
      duration_ms: 12000,
      status: "completed",
      reason_code: "evidence_check",
      input_ref: "benchmark://benchmark-001/TASK-001",
      output_ref: "review://001",
      metadata: { label: "Evidence check", detail: "Human verified one source reference", billable_human_active: true },
    },
  ],
};

function normalized() {
  return normalizeAnalystInput({ runs: [reviewedRun] });
}

test("confirmed non-task timing is not offered as residual business work", () => {
  const run = structuredClone(reviewedRun);
  run.events[1].started_at = "2026-10-01T10:00:00.000Z";
  run.events[1].ended_at = "2026-10-01T10:00:12.000Z";
  run.events.push({ ...run.events[1], event_id: "EV-003", event_type: "timing_excluded", duration_ms: 0, started_at: "2026-10-01T11:00:00.000Z", ended_at: "2026-10-01T11:00:00.000Z", metadata: { target_event_id: "EV-002", exclusion_reason: "Test-only troubleshooting", reviewer_ref: "TEST-OPERATOR", confirmation_ref: "test-only://confirmation" } });
  run.metrics.human_active_ms = 0;
  const result = normalizeAnalystInput({ runs: [run] });
  assert.equal(result.evidence.runs[0].human_active_time_measured, false);
  assert.equal(result.observationCatalog.some((item) => item.category === "human_event"), false);
  run.metrics.human_active_ms = 12000;
  assert.throws(() => normalizeAnalystInput({ runs: [run] }), /do not match/);
});

function validModelOutput(overrides = {}) {
  return {
    findings: [{
      observation_id: "RUN-A-001#decision",
      possible_explanations: [
        "Hypothesis: The recorded outcome reflects the submitted task result.",
        "Hypothesis: The recorded outcome reflects the acceptance rubric decision.",
      ],
      evidence_needed: ["A repeated reviewed run under the same rubric."],
    }],
    residual_human_work: [{
      observation_id: "RUN-A-001/EV-002#human-event",
      cause_not_established: true,
      evidence_needed: ["The recorded trigger for the human action."],
    }],
    recommended_next_experiment: "Repeat the run and record the trigger for each human action.",
    ...overrides,
  };
}

test("normalizes reviewed evidence and builds deterministic observations", () => {
  const result = normalized();
  assert.deepEqual(result.allowedEvidenceRefs, ["RUN-A-001", "RUN-A-001/EV-001", "RUN-A-001/EV-002"]);
  assert.equal(result.evidence.runs[0].human_active_time_measured, true);
  assert.equal(result.observationCatalog.length, 4);
  assert.equal(result.observationCatalog[0].observation_id, "RUN-A-001#decision");
  assert.equal(result.observationCatalog[3].category, "human_event");
  assert.match(result.deterministicAnalysis.executive_summary, /RUN-A-001: Pass; automation traceability 100%; human-active time 12000 milliseconds/);
  assert.deepEqual(result.deterministicAnalysis.limitations, [
    "The analysis is limited to 1 reviewed run: RUN-A-001.",
    "No reviewed Human baseline was supplied.",
  ]);
});

test("human baseline does not create a fictitious zero-traceability finding", () => {
  const humanRun = structuredClone(reviewedRun);
  humanRun.manifest.run_id = "RUN-HUMAN-001";
  humanRun.manifest.mode = "human_baseline";
  humanRun.metrics.traceability_rate = null;
  const result = normalizeAnalystInput({ runs: [humanRun] });
  assert.equal(result.evidence.runs[0].traceability_rate, null);
  assert.equal(result.observationCatalog.some((item) => item.category === "traceability"), false);
  assert.match(result.deterministicAnalysis.executive_summary, /machine-style traceability not applicable to the human baseline/);
});

test("marks functional evidence as not measured instead of zero time", () => {
  const functionalRun = structuredClone(reviewedRun);
  functionalRun.metrics.human_active_ms = 0;
  functionalRun.events = functionalRun.events.filter((event) => event.event_type !== "human_action");
  const result = normalizeAnalystInput({ runs: [functionalRun] });
  assert.equal(result.evidence.runs[0].human_active_time_measured, false);
  assert.equal(result.observationCatalog.find((item) => item.category === "human_time").observation, "RUN-A-001: human-active time was not measured.");
  assert.match(result.deterministicAnalysis.limitations.join(" "), /Human-active time was not measured/);
});

test("rejects a request without reviewed evidence", () => {
  assert.throws(() => normalizeAnalystInput({ runs: [] }), /At least one reviewed evidence bundle/);
});

test("prompt gives the model a catalog, not raw event detail or factual writing authority", () => {
  const result = normalized();
  const messages = buildAnalystMessages(result.evidence, result.observationCatalog);
  assert.match(messages[0].content, /Deterministic code, not you, owns timing/);
  assert.match(messages[0].content, /Select observation_id values only/);
  assert.match(messages[0].content, /complete JSON response under 600 words/);
  assert.match(messages[0].content, /residual_human_work observation_id must have category human_event/);
  assert.match(messages[1].content, /RUN-A-001\/EV-002#human-event/);
  assert.doesNotMatch(messages[1].content, /Human verified one source reference/);
});

test("resolves model selections to deterministic facts and references", () => {
  const result = normalized();
  const output = parseAnalystResponse(JSON.stringify(validModelOutput({
    executive_summary: "The automation is better because it can verify evidence.",
    limitations: [],
  })), result.observationCatalog, result.deterministicAnalysis);
  assert.equal(output.executive_summary, result.deterministicAnalysis.executive_summary);
  assert.equal(output.findings[0].observation, "RUN-A-001: Pass was recorded.");
  assert.deepEqual(output.findings[0].evidence_refs, ["RUN-A-001"]);
  assert.equal(output.residual_human_work[0].observed_context, "RUN-A-001/EV-002: a reviewed human-authored event was recorded.");
  assert.deepEqual(output.limitations, result.deterministicAnalysis.limitations);
  assert.doesNotMatch(JSON.stringify(output), /better because|verify evidence/);
});

test("rejects an unknown observation selection", () => {
  const result = normalized();
  const modelOutput = validModelOutput();
  modelOutput.findings[0].observation_id = "RUN-A-001#invented";
  assert.throws(() => parseAnalystResponse(JSON.stringify(modelOutput), result.observationCatalog, result.deterministicAnalysis), /unknown observation_id/);
});

test("residual human work can select only a human-event observation", () => {
  const result = normalized();
  const modelOutput = validModelOutput();
  modelOutput.residual_human_work[0].observation_id = "RUN-A-001#traceability";
  assert.throws(() => parseAnalystResponse(JSON.stringify(modelOutput), result.observationCatalog, result.deterministicAnalysis), /category human_event/);
});

test("rejects duplicate observation selections", () => {
  const result = normalized();
  const modelOutput = validModelOutput({ residual_human_work: [] });
  modelOutput.findings.push(structuredClone(modelOutput.findings[0]));
  assert.throws(() => parseAnalystResponse(JSON.stringify(modelOutput), result.observationCatalog, result.deterministicAnalysis), /selected more than once/);
});

test("rejects collections that exceed the concise response contract", () => {
  const result = normalized();
  const finding = validModelOutput().findings[0];
  const modelOutput = validModelOutput({ findings: [finding, finding, finding, finding], residual_human_work: [] });
  assert.throws(() => parseAnalystResponse(JSON.stringify(modelOutput), result.observationCatalog, result.deterministicAnalysis), /findings must contain no more than 3 items/);
});

test("rejects a single causal story", () => {
  const result = normalized();
  const modelOutput = validModelOutput();
  modelOutput.findings[0].possible_explanations = ["Hypothesis: The automation was uncertain."];
  assert.throws(() => parseAnalystResponse(JSON.stringify(modelOutput), result.observationCatalog, result.deterministicAnalysis), /at least two alternatives/);
});
