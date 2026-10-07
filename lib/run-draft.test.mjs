import test from "node:test";
import assert from "node:assert/strict";
import { inspectRunDraft, recoverInterruptedRun, RUN_DRAFT_VERSION } from "./run-draft.mjs";

const draft = {
  schema_version: RUN_DRAFT_VERSION, saved_at: "2026-09-26T12:00:10.000Z", run_id: "RUN-HUMAN-01", run_sequence: 2,
  run_state: "running", mode: "Human", automation_manifest_id: "AUT-1", benchmark_id: "BENCH-1",
  task_id: "TASK-1", task_version: "v1", input_ref: "benchmark://BENCH-1/TASK-1",
  active_seconds: 10, human_active: true, human_started_at: "2026-09-26T12:00:00.000Z", events: [], review_output_ref: "",
};

test("valid run draft can be inspected", () => {
  assert.equal(inspectRunDraft(draft).errors.length, 0);
});

test("recovery counts only until the last saved heartbeat and pauses the timer", () => {
  const recovered = recoverInterruptedRun(draft);
  assert.equal(recovered.human_active, false);
  assert.equal(recovered.human_started_at, null);
  assert.equal(recovered.events.length, 1);
  assert.equal(recovered.events[0].duration_ms, 10_000);
  assert.equal(recovered.events[0].ended_at, draft.saved_at);
});

test("paused drafts do not invent a human segment", () => {
  const recovered = recoverInterruptedRun({ ...draft, human_active: false, human_started_at: null });
  assert.equal(recovered.events.length, 0);
});

test("invalid event binding and negative time are rejected", () => {
  assert.ok(inspectRunDraft({ ...draft, active_seconds: -1, events: [{ event_id: "EV-001", run_id: "other" }] }).errors.length >= 2);
});

test("post-submit work recovers only to heartbeat as a human review segment", () => {
  const original = [{ event_id: "E1", run_id: draft.run_id, actor: "human", metadata: {} }];
  const form = { criteria_ref: "test-only://v1", final_output_ref: "test-only://corrected", reviewer_ref: "TEST", decision_note: "", decision: "", confirmed: false, timing_complete: false };
  const submitted = { ...draft, run_state: "submitted", review_output_ref: "test-only://original", events: original, completion_form: form };
  assert.equal(inspectRunDraft(submitted).errors.length, 0);
  const recovered = recoverInterruptedRun(submitted);
  assert.equal(recovered.events.at(-1).event_type, "human_review");
  assert.equal(recovered.active_seconds, 10);
  assert.deepEqual(recovered.events[0], original[0]);
  assert.deepEqual(recovered.completion_form, form);
  assert.equal(recovered.review_output_ref, "test-only://original");
});

test("malformed completion form cannot silently restore as a signed decision", () => {
  assert.ok(inspectRunDraft({ ...draft, completion_form: { confirmed: true } }).errors.length);
});
