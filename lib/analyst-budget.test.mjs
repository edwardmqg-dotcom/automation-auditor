import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BUDGET_CAP_NANOS, BUDGET_MODEL, createBudgetLedger, digest, PRICING_VERSION, RESERVATION_NANOS, validatePricing, verifyReviewer } from "./analyst-budget.mjs";
import { handleAnalystRequest } from "./analyst-handler.mjs";

const migration = readFileSync(new URL("../migrations/0001-analyst-budget.sql", import.meta.url), "utf8");
const capMigration = readFileSync(new URL("../migrations/0002-reviewer-budget-25usd.sql", import.meta.url), "utf8");
const fixedNow = Date.parse("2026-10-07T10:00:00Z");
const testToken = "OFFLINE_ONLY_NOT_A_REAL_REVIEWER_CREDENTIAL_123456";
const credentialHash = await digest(testToken);
const fixture = JSON.parse(readFileSync(new URL("./fixtures/product-request.prepared.json", import.meta.url), "utf8"));

// Real SQLite engine; this adapter mirrors the D1 prepare/batch methods used by
// the application. It is not a live Cloudflare/D1 or provider invocation.
function sqlite(file = ":memory:") {
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  // Like the D1 migration runner, do not replay a superseded initialization.
  if (!raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='analyst_budget'").get()) raw.exec(migration);
  if (raw.prepare("SELECT cap_nanos FROM analyst_budget").get().cap_nanos !== BUDGET_CAP_NANOS) {
    raw.exec("BEGIN IMMEDIATE");
    try { raw.exec(capMigration); raw.exec("COMMIT"); }
    catch (error) { raw.exec("ROLLBACK"); throw error; }
  }
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => raw.prepare(sql).get(...args) ?? null,
    run: async () => {
      if (/RETURNING/.test(sql)) return { results: raw.prepare(sql).all(...args), meta: { changes: Number(raw.prepare("SELECT changes() AS n").get().n) } };
      return { results: [], meta: { changes: Number(raw.prepare(sql).run(...args).changes) } };
    },
  });
  const db = { prepare: sql => wrap(sql), batch: async statements => {
    raw.exec("BEGIN IMMEDIATE");
    try { const result = []; for (const statement of statements) result.push(await statement.run()); raw.exec("COMMIT"); return result; }
    catch (error) { raw.exec("ROLLBACK"); throw error; }
  } };
  return { raw, db, close: () => raw.close(), ledger: createBudgetLedger(db), budget: () => raw.prepare("SELECT * FROM analyst_budget").get() };
}
const metadata = (overrides = {}) => ({ returned_model: BUDGET_MODEL, usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300, reasoning_tokens: 150 }, ...overrides });
const config = db => ({ NEBIUS_ANALYST_ENABLED: "true", NEBIUS_API_KEY: "OFFLINE_ONLY_NOT_A_REAL_NEBIUS_KEY", ANALYST_REVIEWER_TOKEN_SHA256: credentialHash, ANALYST_PRICING_VERSION: PRICING_VERSION, ANALYST_PRICING_VERIFIED_AT: "2026-10-07T09:00:00Z", ANALYST_PRICING_VALID_UNTIL: "2026-10-08T09:00:00Z", ANALYST_BUDGET_DB: db });
const request = (headers = {}, body = JSON.stringify(fixture)) => new Request("https://offline.test/api/analyst", { method: "POST", headers: { Authorization: `Bearer ${testToken}`, "Idempotency-Key": randomUUID(), "Content-Type": "application/json", ...headers }, body });
const deps = fetcher => ({ now: () => fixedNow, fetch: fetcher });

test("reviewer access validates a digest without echoing any credential", async () => {
  assert.equal(await verifyReviewer(request(), config()), credentialHash);
  for (const token of ["", "wrong", "X".repeat(40)]) {
    await assert.rejects(verifyReviewer(request({ Authorization: `Bearer ${token}` }), config()), error => error.code === "reviewer_access_required" && !error.message.includes(testToken));
  }
});
test("missing, expired, future, overlong or different-model pricing fails closed", () => {
  validatePricing(config(), BUDGET_MODEL, fixedNow);
  for (const changes of [{ ANALYST_PRICING_VERSION: "" }, { ANALYST_PRICING_VALID_UNTIL: "2026-10-06" }, { ANALYST_PRICING_VERIFIED_AT: "2026-10-08" }, { ANALYST_PRICING_VALID_UNTIL: "2026-12-15" }]) assert.throws(() => validatePricing({ ...config(), ...changes }, BUDGET_MODEL, fixedNow), /pricing/);
  assert.throws(() => validatePricing(config(), "other-model", fixedNow), /model/);
});
test("reservation charges atomically; replay cannot charge or dispatch twice", async t => {
  const s = sqlite(); t.after(s.close);
  const id = randomUUID();
  await s.ledger.reserve(id, "input", credentialHash, fixedNow);
  assert.equal(s.budget().charged_nanos, RESERVATION_NANOS);
  await assert.rejects(s.ledger.reserve(id, "changed-input", credentialHash, fixedNow), error => error.code === "request_already_recorded");
  await s.ledger.dispatched(id);
  await assert.rejects(s.ledger.dispatched(id));
  assert.equal(s.budget().charged_nanos, RESERVATION_NANOS);
});
test("last budget slot has one winner across independently opened connections", async t => {
  const dir = mkdtempSync(join(tmpdir(), "auditor-budget-"));
  const a = sqlite(join(dir, "budget.sqlite")), b = sqlite(join(dir, "budget.sqlite"));
  t.after(() => { a.close(); b.close(); rmSync(dir, { recursive: true }); });
  a.raw.prepare("UPDATE analyst_budget SET charged_nanos=?").run(BUDGET_CAP_NANOS - RESERVATION_NANOS);
  const outcomes = await Promise.allSettled([a.ledger.reserve(randomUUID(), "a", credentialHash, fixedNow), b.ledger.reserve(randomUUID(), "b", credentialHash, fixedNow)]);
  assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 1);
  assert.equal(a.budget().charged_nanos, BUDGET_CAP_NANOS);
  assert.equal(a.raw.prepare("SELECT COUNT(*) AS n FROM analyst_requests").get().n, 1);
});
test("successful settlement uses integer buffered charges and never adds reasoning twice", async t => {
  const s = sqlite(); t.after(s.close); const id = randomUUID();
  await s.ledger.reserve(id, "input", credentialHash, fixedNow); await s.ledger.dispatched(id);
  const result = await s.ledger.settle(id, metadata(), "succeeded");
  assert.equal(result.charged_nanos, (100 * 300 + 200 * 900) * 2);
  assert.equal(s.budget().charged_nanos, result.charged_nanos);
  await assert.rejects(s.ledger.settle(id, metadata(), "succeeded"));
  assert.equal(s.budget().charged_nanos, result.charged_nanos);
});
test("unknown and inconsistent usage remain fully charged, never zero or refunded", async t => {
  const s = sqlite(); t.after(s.close);
  for (const usage of [null, { prompt_tokens: 100, completion_tokens: 200, total_tokens: 999, reasoning_tokens: null }]) {
    const id = randomUUID(); await s.ledger.reserve(id, "i", credentialHash, fixedNow); await s.ledger.dispatched(id);
    const result = await s.ledger.settle(id, metadata({ usage }), "failed");
    assert.equal(result.status, "held"); assert.equal(result.charged_nanos, RESERVATION_NANOS);
  }
  assert.equal(s.budget().charged_nanos, RESERVATION_NANOS * 2);
});
test("wrong returned model halts subsequent reservations", async t => {
  const s = sqlite(); t.after(s.close); const id = randomUUID();
  await s.ledger.reserve(id, "i", credentialHash, fixedNow); await s.ledger.dispatched(id);
  assert.equal((await s.ledger.settle(id, metadata({ returned_model: "other" }), "failed")).status, "halted");
  await assert.rejects(s.ledger.reserve(randomUUID(), "i", credentialHash, fixedNow), error => error.code === "budget_unavailable");
});
test("rate limit is shared, survives settled requests and counts failed attempts", async t => {
  const s = sqlite(); t.after(s.close);
  for (let i = 0; i < 10; i++) { const id = randomUUID(); await s.ledger.reserve(id, "i", credentialHash, fixedNow); await s.ledger.dispatched(id); await s.ledger.settle(id, metadata({ usage: null }), "failed"); }
  await assert.rejects(s.ledger.reserve(randomUUID(), "i", credentialHash, fixedNow), error => error.code === "rate_limited");
  await s.ledger.reserve(randomUUID(), "i", credentialHash, fixedNow + 60_001);
});
test("restart and migration reapplication do not reset budget or uncertain in-flight work", async t => {
  const dir = mkdtempSync(join(tmpdir(), "auditor-restart-")); const file = join(dir, "budget.sqlite");
  let s = sqlite(file); await s.ledger.reserve(randomUUID(), "i", credentialHash, fixedNow); s.close(); s = sqlite(file);
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); });
  assert.equal(s.budget().charged_nanos, RESERVATION_NANOS);
  await assert.rejects(s.ledger.reserve(randomUUID(), "i", credentialHash, fixedNow), error => error.code === "request_in_progress");
});
test("closed/default, missing access, stale pricing and unavailable DB make zero provider calls", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0;
  const fake = deps(async () => { calls++; throw new Error("Not allowed"); });
  for (const [cfg, req, expected] of [
    [{ ...config(s.db), NEBIUS_ANALYST_ENABLED: "false" }, request(), 503],
    [config(s.db), request({ Authorization: "" }), 401],
    [{ ...config(s.db), ANALYST_PRICING_VERSION: "" }, request(), 503],
    [config(), request(), 503],
    [{ ...config(s.db), NEBIUS_BASE_URL: "https://elsewhere.invalid" }, request(), 503],
    [config(s.db), request({ "Idempotency-Key": "invalid" }), 400],
  ]) { const response = await handleAnalystRequest(req, cfg, fake); assert.equal(response.status, expected); assert.equal((await response.json()).call_evidence.model_call_made, false); }
  assert.equal(calls, 0); assert.equal(s.budget().charged_nanos, 0);
});
test("invalid and oversized streaming inputs are rejected before any provider call", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0;
  for (const [body, expected] of [["{", 400], ["x".repeat(300001), 413]]) {
    const response = await handleAnalystRequest(request({}, body), config(s.db), deps(async () => { calls++; }));
    assert.equal(response.status, expected); assert.equal((await response.json()).call_evidence.model_call_made, false);
  }
  assert.equal(calls, 0);
});
test("provider errors retain reservation; a replay is rejected without a second mock request", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0; const id = randomUUID();
  const fake = deps(async () => { calls++; return Response.json({ error: { message: "PRIVATE_PROVIDER_ERROR" } }, { status: 500 }); });
  const response = await handleAnalystRequest(request({ "Idempotency-Key": id }), config(s.db), fake);
  const result = await response.json(); assert.equal(response.status, 502); assert.equal(result.call_evidence.model_call_made, true); assert.equal(result.call_evidence.budget.status, "held");
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PROVIDER_ERROR|OFFLINE_ONLY_NOT_A_REAL/);
  assert.equal((await handleAnalystRequest(request({ "Idempotency-Key": id }), config(s.db), fake)).status, 409);
  assert.equal(calls, 1); assert.equal(s.budget().charged_nanos, RESERVATION_NANOS);
});
test("timeout keeps unknown charge and records a mock attempted call, without retry", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0;
  const response = await handleAnalystRequest(request(), config(s.db), { ...deps(async (_url, options) => { calls++; return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true })); }), timeoutMs: 5 });
  const result = await response.json(); assert.equal(response.status, 502); assert.equal(result.call_evidence.failure_stage, "timeout"); assert.equal(result.call_evidence.model_call_made, true); assert.equal(calls, 1); assert.equal(s.budget().charged_nanos, RESERVATION_NANOS);
});
test("truncated output is rejected but known billed usage is accounted", async t => {
  const s = sqlite(); t.after(s.close);
  const response = await handleAnalystRequest(request(), config(s.db), deps(async () => Response.json({ model: BUDGET_MODEL, usage: { prompt_tokens: 100, completion_tokens: 4096, total_tokens: 4196 }, choices: [{ finish_reason: "length", message: { content: "{}" } }] })));
  assert.equal(response.status, 502); const result = await response.json(); assert.match(result.error, /output limit/); assert.equal(result.call_evidence.budget.status, "settled"); assert.equal(result.analysis, undefined);
});
test("ledger failure prevents dispatch, and failed settlement retains the full charge", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0;
  const broken = { prepare: () => { throw new Error("PRIVATE_DB_MESSAGE"); } };
  const first = await handleAnalystRequest(request(), config(broken), deps(async () => { calls++; }));
  assert.equal(first.status, 503); assert.equal(calls, 0); assert.doesNotMatch(await first.text(), /PRIVATE_DB_MESSAGE/);
  const failSettlement = { ...s.db, batch: async () => { throw new Error("PRIVATE_DB_MESSAGE"); } };
  const second = await handleAnalystRequest(request(), config(failSettlement), deps(async () => { calls++; return Response.json({}, { status: 500 }); }));
  const payload = await second.json(); assert.equal(second.status, 503); assert.equal(payload.call_evidence.budget.status, "unreconciled"); assert.equal(calls, 1); assert.equal(s.budget().charged_nanos, RESERVATION_NANOS);
});

test("offline complete response preserves measured times, prompt and call provenance", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0;
  const selection = { findings: [{ observation_id: "RUN-A-SUPPLIER-014-01#human-time", possible_explanations: [], evidence_needed: ["A separately timed manual baseline."] }], residual_human_work: [], recommended_next_experiment: "Collect a separate completely timed manual baseline under the same completion conditions." };
  const before = JSON.stringify(fixture);
  const response = await handleAnalystRequest(request(), config(s.db), deps(async (_url, options) => {
    calls++;
    const sent = JSON.parse(options.body);
    assert.equal(sent.model, BUDGET_MODEL); assert.equal(sent.max_tokens, 4096); assert.equal(options.redirect, "manual");
    return Response.json({ id: "offline-test-response", model: BUDGET_MODEL, usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300, completion_tokens_details: { reasoning_tokens: 150 } }, choices: [{ finish_reason: "stop", message: { content: JSON.stringify(selection) } }] }, { headers: { "x-request-id": "offline-test-request" } });
  }));
  const result = await response.json(); assert.equal(response.status, 200); assert.equal(result.status, "succeeded"); assert.equal(calls, 1);
  assert.match(result.analysis.executive_summary, /1448838 milliseconds/); assert.equal(result.call_evidence.prompt_version, "evidence-analyst-v0.8");
  assert.equal(result.call_evidence.request_id, "offline-test-request"); assert.equal(result.call_evidence.usage.reasoning_tokens, 150);
  assert.equal(result.call_evidence.budget.charged_nanos, 420000); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(JSON.stringify(fixture), before);
});
test("full budget rejects an otherwise valid endpoint request before provider dispatch", async t => {
  const s = sqlite(); t.after(s.close); s.raw.prepare("UPDATE analyst_budget SET charged_nanos=?").run(BUDGET_CAP_NANOS); let calls = 0;
  const response = await handleAnalystRequest(request(), config(s.db), deps(async () => { calls++; }));
  const payload = await response.json(); assert.equal(response.status, 429); assert.equal(payload.call_evidence.model_call_made, false); assert.equal(payload.call_evidence.failure_stage, "budget_exhausted"); assert.equal(calls, 0);
});
test("concurrent requests allow only one mock provider dispatch", async t => {
  const s = sqlite(); t.after(s.close); let calls = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const dependencies = deps(async () => { calls++; await barrier; return Response.json({}, { status: 500 }); });
  const first = handleAnalystRequest(request(), config(s.db), dependencies);
  while (calls === 0) await new Promise(resolve => setImmediate(resolve));
  const second = await handleAnalystRequest(request(), config(s.db), dependencies);
  assert.equal(second.status, 429); assert.equal((await second.json()).call_evidence.model_call_made, false);
  release(); await first; assert.equal(calls, 1);
});
test("SQL budget cap is exactly the approved twenty-five dollars", t => {
  const s = sqlite(); t.after(s.close);
  assert.throws(() => s.raw.prepare("UPDATE analyst_budget SET cap_nanos=?").run(BUDGET_CAP_NANOS + 1), /CHECK constraint/);
  assert.equal(s.budget().cap_nanos, BUDGET_CAP_NANOS);
  assert.equal(BUDGET_CAP_NANOS, 25_000_000_000);
});

test("cap migration preserves original request rows, consumption, identity and halt flag", () => {
  const raw = new DatabaseSync(":memory:");
  try {
    raw.exec("PRAGMA foreign_keys=ON;"); raw.exec(migration);
    raw.prepare("INSERT INTO analyst_requests (request_key,input_sha256,credential_sha256,pricing_version,created_ms,reserved_nanos,charged_nanos,state) VALUES (?,?,?,?,?,?,?,?)")
      .run("offline-existing", "input", "credential", PRICING_VERSION, fixedNow, RESERVATION_NANOS, RESERVATION_NANOS, "held");
    raw.exec("UPDATE analyst_budget SET halted=1");
    const before = raw.prepare("SELECT * FROM analyst_requests").all();
    raw.exec("BEGIN IMMEDIATE"); raw.exec(capMigration); raw.exec("COMMIT");
    assert.deepEqual(raw.prepare("SELECT * FROM analyst_requests").all(), before);
    const budget = raw.prepare("SELECT * FROM analyst_budget").get();
    assert.equal(budget.id, "reviewer-10usd-v1"); assert.equal(budget.cap_nanos, BUDGET_CAP_NANOS);
    assert.equal(budget.charged_nanos, RESERVATION_NANOS); assert.equal(budget.halted, 1);
    assert.deepEqual(raw.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name LIKE 'analyst_%'").get().n, 3);
    raw.exec("UPDATE analyst_budget SET halted=0");
    raw.prepare("UPDATE analyst_requests SET charged_nanos=123 WHERE request_key='offline-existing'").run();
    assert.equal(raw.prepare("SELECT charged_nanos FROM analyst_budget").get().charged_nanos, 123);
  } finally { raw.close(); }
});
