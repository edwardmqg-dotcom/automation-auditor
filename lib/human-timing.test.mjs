import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { humanElapsedMs, includedHumanEvents } from "./human-timing.mjs";
import { hasMeasuredHumanTime } from "./timing-evidence.mjs";
import { recoverInterruptedRun } from "./run-draft.mjs";
import { calculateRunMetrics } from "./metric-calculator.mjs";

const segment = { event_id: "EV-1", run_id: "TEST", mode: "human_baseline", task_id: "T", task_version: "v1", actor: "human", event_type: "human_action", started_at: "2026-10-01T10:00:00.000Z", ended_at: "2026-10-01T10:00:45.935Z", duration_ms: 45935, metadata: { billable_human_active: true } };
const correction = { ...segment, event_id: "EV-2", actor: "human", event_type: "timing_excluded", started_at: "2026-10-01T11:00:00.000Z", ended_at: "2026-10-01T11:00:00.000Z", duration_ms: 0, status: "completed", metadata: { target_event_id: "EV-1", exclusion_reason: "Timer troubleshooting", reviewer_ref: "TEST-OPERATOR", confirmation_ref: "test-only://confirmation" } };

test("a delayed single repaint reflects all elapsed time, not one callback second", () => {
  assert.equal(humanElapsedMs([], "2026-10-01T10:00:00.000Z", Date.parse("2026-10-01T10:27:39.667Z")), 1659667);
});
test("resume adds exact completed milliseconds without counting paused gaps", () => {
  assert.equal(humanElapsedMs([segment], "2026-10-01T12:00:00.000Z", Date.parse("2026-10-01T12:00:01.125Z")), 47060);
  assert.equal(humanElapsedMs([segment]), 45935);
});
test("confirmed exclusion preserves every original event and removes only its target", () => {
  const ledger = [segment, correction];
  const original = JSON.stringify(ledger);
  assert.equal(humanElapsedMs(ledger), 0);
  assert.equal(includedHumanEvents(ledger).length, 0);
  assert.equal(hasMeasuredHumanTime(ledger), false);
  assert.equal(JSON.stringify(ledger), original);
});
test("exclusions reject missing targets, future targets, cross-run targets and duplicates", () => {
  assert.throws(() => humanElapsedMs([correction]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([correction, segment]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([segment, { ...correction, run_id: "OTHER" }]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([segment, correction, { ...correction, event_id: "EV-3" }]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([segment, { ...segment }, correction]), /EXCLUSION_INVALID/);
});
test("exclusions reject absent confirmation, model-authored correction and nonzero duration", () => {
  assert.throws(() => humanElapsedMs([segment, { ...correction, metadata: { ...correction.metadata, confirmation_ref: "" } }]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([segment, { ...correction, actor: "model" }]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([segment, { ...correction, duration_ms: 1 }]), /EXCLUSION_INVALID/);
  assert.throws(() => humanElapsedMs([{ ...segment, actor: "system" }, correction]), /EXCLUSION_INVALID/);
});
test("clock reversal and invalid live starts fail rather than invent time", () => {
  assert.throws(() => humanElapsedMs([], "bad"), /Invalid live/);
  assert.throws(() => humanElapsedMs([], segment.started_at, Date.parse(segment.started_at) - 1), /Invalid live/);
});
test("paused recovery ignores a stale callback-count display and retains corrections", () => {
  const recovered = recoverInterruptedRun({ human_active: false, active_seconds: 1, events: [segment] });
  assert.equal(recovered.active_seconds, 45);
  assert.equal(recoverInterruptedRun({ human_active: false, active_seconds: 1, events: [segment, correction] }).active_seconds, 0);
});
test("shared official calculator includes corrections and legacy fixture outputs stay unchanged", () => {
  const original = JSON.parse(fs.readFileSync(new URL("./fixtures/smoke-runs.json", import.meta.url), "utf8")).filter((event) => event.mode === "human_baseline").map((event, index) => ({ ...event, event_id: `TEST-${index}` }));
  const target = original.find((event) => event.metadata.billable_human_active);
  const excluded = { ...original.at(-1), event_id: "TEST-EXCLUSION", event_type: "timing_excluded", actor: "human", duration_ms: 0, metadata: { ...correction.metadata, target_event_id: target.event_id } };
  excluded.started_at = excluded.ended_at;
  assert.equal(calculateRunMetrics(original).human_active_ms, 120000);
  assert.equal(calculateRunMetrics([...original, excluded]).human_active_ms, 0);
  assert.equal(calculateRunMetrics([...original, excluded]).human_active_time_measured, false);
});
