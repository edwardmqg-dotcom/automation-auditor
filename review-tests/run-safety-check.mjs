import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getRunStartBlocker, isRunSetupLocked } from "../lib/run-safety.mjs";
import { resolveAuditorBuildId } from "../build/build-info.mjs";

const base = {
  runPersistenceStatus: "ready", automationConnected: true, benchmarkAttached: true,
  criteria: "same criteria", criteriaMatches: true, connectivityVerified: true,
  runState: "ready", runIdStored: false,
};
assert.equal(getRunStartBlocker(base), null);
assert.match(getRunStartBlocker({ ...base, runIdStored: true }), /already stored/);
assert.match(getRunStartBlocker({ ...base, runPersistenceStatus: "error" }), /checkpoint/);
assert.match(getRunStartBlocker({ ...base, automationConnected: false }), /Connect an automation/);
assert.match(getRunStartBlocker({ ...base, benchmarkAttached: false }), /validated benchmark/);
assert.match(getRunStartBlocker({ ...base, criteria: " " }), /completion criteria/);
assert.match(getRunStartBlocker({ ...base, criteriaMatches: false }), /do not match/);
assert.match(getRunStartBlocker({ ...base, connectivityVerified: false }), /connectivity/);
assert.match(getRunStartBlocker({ ...base, runState: "running" }), /not ready/);
assert.equal(isRunSetupLocked({ runState: "running", workspaceStoreStatus: "ready", evidenceStoreStatus: "ready" }), true);
assert.equal(isRunSetupLocked({ runState: "ready", workspaceStoreStatus: "saving", evidenceStoreStatus: "ready" }), true);
assert.equal(isRunSetupLocked({ runState: "ready", workspaceStoreStatus: "ready", evidenceStoreStatus: "saving" }), true);
assert.equal(isRunSetupLocked({ runState: "ready", workspaceStoreStatus: "ready", evidenceStoreStatus: "ready" }), false);
assert.equal(resolveAuditorBuildId({ gitRevision: "abc123", gitDirty: false }), "abc123");
assert.equal(resolveAuditorBuildId({ gitRevision: "abc123", gitDirty: true }), "local-development-uncommitted");
assert.equal(resolveAuditorBuildId({ configuredId: "release-42", gitDirty: true }), "release-42");
assert.equal(resolveAuditorBuildId({}), "local-development-uncommitted");
const uiSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const storeSource = await readFile(new URL("../lib/evidence-store.ts", import.meta.url), "utf8");
assert.match(uiSource, /const setupLocked = isRunSetupLocked\(/);
assert.ok((uiSource.match(/isRunSetupLocked\(/g) ?? []).length >= 2, "UI and WebMCP share the setup lock");
assert.ok((uiSource.match(/getRunStartBlocker\(/g) ?? []).length >= 2, "UI and WebMCP share the run-start guard");
assert.match(uiSource, /listEvidenceBundles<CompletedRun>\(\)/);
assert.match(storeSource, /objectStore\(STORE_NAME\)\.add\(record\)/);
assert.doesNotMatch(storeSource, /objectStore\(STORE_NAME\)\.put\(record\)/);
assert.doesNotMatch(storeSource, /preventOverwrite/);
console.log("PASS: run setup/start guards and build ID provenance");
