import assert from "node:assert/strict";
import test from "node:test";
import { analystUnavailableReason } from "./analyst-access.mjs";

test("paid analyst is disabled by default even with a configured key", () => {
  for (const config of [{}, { NEBIUS_API_KEY: "test-only-not-a-real-key" }]) assert.match(analystUnavailableReason(config), /disabled/);
});
test("only exact server opt-in true enables the analyst gate", () => {
  for (const value of [undefined, "", "false", "1", "TRUE", " true", "true ", "yes"]) {
    assert.match(analystUnavailableReason({ NEBIUS_ANALYST_ENABLED: value, NEBIUS_API_KEY: "test-only-not-a-real-key" }), /disabled/);
  }
});
test("opt-in without a usable key remains unavailable", () => {
  for (const key of [undefined, "", " \n "]) assert.match(analystUnavailableReason({ NEBIUS_ANALYST_ENABLED: "true", NEBIUS_API_KEY: key }), /not configured/);
});
test("explicit opt-in and nonempty test marker pass local readiness only", () => {
  const config = { NEBIUS_ANALYST_ENABLED: "true", NEBIUS_API_KEY: "test-only-not-a-real-key" };
  const before = JSON.stringify(config);
  assert.equal(analystUnavailableReason(config), null);
  assert.equal(JSON.stringify(config), before);
});
