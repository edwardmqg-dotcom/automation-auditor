import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceSnapshot, inspectWorkspaceSnapshot } from "./workspace-snapshot.mjs";

const automation = {
  name: "Synthetic auditor",
  versionA: "commit-a",
  versionB: "commit-b",
  adapter: "guided",
  manifest: {
    schema_version: "automation-connection-manifest-v0.1",
    adapter: { type: "guided", target_url: "http://127.0.0.1:5174/", credential_ref: null },
    validation: { contract_status: "valid" },
  },
};

const files = [{ name: "benchmark.json", size: 120, type: "application/json" }, { name: "input.pdf", size: 900, type: "application/pdf" }];

test("builds a versioned workspace without connectivity evidence", () => {
  const snapshot = buildWorkspaceSnapshot(automation, files, true, new Date("2026-09-21T00:00:00.000Z"));
  assert.equal(snapshot.schema_version, "local-workspace-snapshot-v0.1");
  assert.equal(snapshot.snapshot_id, "active");
  assert.equal(snapshot.benchmark.attached, true);
  assert.equal(snapshot.connectivity_evidence_persisted, false);
  assert.equal("connectivityEvidence" in snapshot, false);
  assert.deepEqual(inspectWorkspaceSnapshot(snapshot).errors, []);
});

test("refuses to persist a credential reference", () => {
  const unsafe = structuredClone(automation);
  unsafe.manifest.adapter.credential_ref = "secret://token";
  assert.throws(() => buildWorkspaceSnapshot(unsafe), /Credentials must not be stored/);
});

test("rejects corrupted or connectivity-bearing snapshots", () => {
  const snapshot = buildWorkspaceSnapshot(automation, files, false);
  snapshot.connectivity_evidence_persisted = true;
  assert.match(inspectWorkspaceSnapshot(snapshot).errors.join(" "), /must not be persisted/);
  snapshot.connectivity_evidence_persisted = false;
  snapshot.connectivity_evidence = { outcome: "verified" };
  assert.match(inspectWorkspaceSnapshot(snapshot).errors.join(" "), /forbidden/);
  delete snapshot.connectivity_evidence;
  snapshot.benchmark.files[0].size = -1;
  assert.match(inspectWorkspaceSnapshot(snapshot).errors.join(" "), /not a valid stored file/);
});
