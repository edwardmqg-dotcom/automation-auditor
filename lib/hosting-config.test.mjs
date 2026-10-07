import assert from "node:assert/strict";
import test from "node:test";
import { loadHostingBindings } from "../build/hosting-config.mjs";

// Minimal fake filesystem inputs are injected using Node's built-in mock API.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

function readConfig(t, text) {
  t.mock.method(fs, "readFileSync", () => text);
  syncBuiltinESMExports();
  try { return loadHostingBindings("test-only-hosting.json"); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
}

test("missing private hosting file uses empty local bindings", () => {
  assert.deepEqual(loadHostingBindings(new URL("./fixtures/absent-hosting-config.json", import.meta.url)), { d1: null, r2: null });
});
test("existing binding names retained and omitted fields use null", t => {
  assert.deepEqual(readConfig(t, '{"d1":"DB","r2":"BUCKET","private_field":"not-returned"}'), { d1: "DB", r2: "BUCKET" });
  assert.deepEqual(readConfig(t, '{}'), { d1: null, r2: null });
});
test("malformed JSON, non-objects and invalid names do not silently fall back", t => {
  for (const text of ["{", "null", "[]", "1", '{"d1":42}', '{"r2":"bad binding"}']) assert.throws(() => readConfig(t, text));
});
test("unreadable config errors propagate without local fallback", t => {
  t.mock.method(fs, "readFileSync", () => { throw Object.assign(new Error("test-only permission error"), { code: "EACCES" }); });
  syncBuiltinESMExports();
  try { assert.throws(() => loadHostingBindings("test-only-hosting.json"), /permission error/); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});
