import test from "node:test";
import assert from "node:assert/strict";

import { hasMeasuredHumanTime } from "./timing-evidence.mjs";

test("functional runs without billable human events are not treated as zero-time measurements", () => {
  assert.equal(hasMeasuredHumanTime([
    { actor: "system", metadata: {} },
    { actor: "human", metadata: { reviewer_ref: "XXX" } },
  ]), false);
});

test("an explicit billable human segment marks timing as measured even when its duration is zero", () => {
  assert.equal(hasMeasuredHumanTime([
    { actor: "human", duration_ms: 0, metadata: { billable_human_active: true } },
  ]), true);
});

test("non-human events cannot mark human-active time as measured", () => {
  assert.equal(hasMeasuredHumanTime([
    { actor: "system", metadata: { billable_human_active: true } },
  ]), false);
});
