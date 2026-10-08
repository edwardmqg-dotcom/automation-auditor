export const BUDGET_POLICY_ID = "reviewer-10usd-v1";
// Keep the original ledger identity so changing the cap never resets spending.
// Its legacy name is not the current limit; migration 0002 sets the cap to $25.
export const BUDGET_CAP_NANOS = 25_000_000_000;
export const BUDGET_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const PRICING_VERSION = "nemotron-super-2026-10-07-buffer2-v1";
// Integer nano-USD at the official $0.30/$0.90 per million input/output tariff.
// Reserve the entire published context, NOT an input estimate based on bytes.
export const MAX_CONTEXT_TOKENS = 262_144;
export const MAX_OUTPUT_TOKENS = 4096;
const INPUT_NANOS_PER_TOKEN = 300;
const OUTPUT_NANOS_PER_TOKEN = 900;
const SAFETY_MULTIPLIER = 2;
export const RESERVATION_NANOS = (MAX_CONTEXT_TOKENS * INPUT_NANOS_PER_TOKEN + MAX_OUTPUT_TOKENS * OUTPUT_NANOS_PER_TOKEN) * SAFETY_MULTIPLIER;
export const PRICING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export class BudgetError extends Error {
  constructor(code, message, httpStatus = 503) { super(message); this.code = code; this.httpStatus = httpStatus; }
}
export async function digest(value) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function verifyReviewer(request, config) {
  if (!/^[a-f0-9]{64}$/.test(config.ANALYST_REVIEWER_TOKEN_SHA256 ?? "")) throw new BudgetError("access_not_configured", "Reviewer access is not configured on the server.");
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length < 32 || token.length > 256 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new BudgetError("reviewer_access_required", "Enter a valid Reviewer access code. No model request was sent.", 401);
  const actual = await digest(token);
  let different = 0;
  for (let i = 0; i < 64; i++) different |= actual.charCodeAt(i) ^ config.ANALYST_REVIEWER_TOKEN_SHA256.charCodeAt(i);
  if (different) throw new BudgetError("reviewer_access_required", "Enter a valid Reviewer access code. No model request was sent.", 401);
  return actual;
}
export function validatePricing(config, model, now = Date.now()) {
  if (model !== BUDGET_MODEL) throw new BudgetError("unapproved_model", "This model has no approved reviewer pricing policy.");
  const verified = Date.parse(config.ANALYST_PRICING_VERIFIED_AT ?? "");
  const until = Date.parse(config.ANALYST_PRICING_VALID_UNTIL ?? "");
  if (config.ANALYST_PRICING_VERSION !== PRICING_VERSION || !Number.isFinite(verified) || !Number.isFinite(until) || verified > now || until <= now || until <= verified || until - verified > PRICING_MAX_AGE_MS || now - verified > PRICING_MAX_AGE_MS) throw new BudgetError("pricing_not_verified", "Reviewer inference is unavailable until current pricing is verified on the server.");
}
function ledgerError(error) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("ANALYST_BUDGET_EXHAUSTED")) return new BudgetError("budget_exhausted", "The shared reviewer budget cannot reserve another request.", 429);
  if (message.includes("ANALYST_BUSY")) return new BudgetError("request_in_progress", "Another reviewer analysis is in progress or awaits reconciliation.", 429);
  if (message.includes("ANALYST_RATE_LIMIT")) return new BudgetError("rate_limited", "Reviewer analysis requests are arriving too quickly.", 429);
  return new BudgetError("budget_unavailable", "The shared reviewer budget could not be verified. No new model request is allowed.");
}
export function requestKey(request) {
  const key = request.headers.get("idempotency-key") ?? "";
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key)) throw new BudgetError("request_identity_required", "A valid analysis request identity is required.", 400);
  return key.toLowerCase();
}
export function createBudgetLedger(db) {
  if (!db?.prepare) throw new BudgetError("budget_unavailable", "The shared reviewer budget database is not configured.");
  return {
    async reserve(key, inputHash, credentialHash, now) {
      try {
        // Insertion and triggers are a single transaction; replays insert no row.
        const row = await db.prepare(`INSERT INTO analyst_requests
          (request_key, input_sha256, credential_sha256, pricing_version, created_ms, reserved_nanos, charged_nanos, state)
          SELECT ?, ?, ?, ?, ?, ?, ?, 'reserved'
          WHERE NOT EXISTS (SELECT 1 FROM analyst_requests WHERE request_key = ?)
          RETURNING request_key`).bind(key, inputHash, credentialHash, PRICING_VERSION, now, RESERVATION_NANOS, RESERVATION_NANOS, key).first();
        if (!row) throw new BudgetError("request_already_recorded", "This request was already recorded. Inspect its existing call evidence; it will not be retried automatically.", 409);
      } catch (error) { if (error instanceof BudgetError) throw error; throw ledgerError(error); }
    },
    async dispatched(key) {
      try {
        const row = await db.prepare("UPDATE analyst_requests SET state='dispatched' WHERE request_key=? AND state='reserved' RETURNING request_key").bind(key).first();
        if (row?.request_key !== key) throw new Error("Invalid dispatch state");
      } catch { throw new BudgetError("budget_unavailable", "The request reservation could not be confirmed. No model request was sent."); }
    },
    async settle(key, metadata, outcome) {
      const usage = metadata.usage;
      const integer = n => Number.isSafeInteger(n) && n >= 0;
      const consistent = integer(usage?.prompt_tokens) && integer(usage?.completion_tokens) && integer(usage?.total_tokens)
        && usage.prompt_tokens + usage.completion_tokens === usage.total_tokens
        && (usage.reasoning_tokens === null || (integer(usage.reasoning_tokens) && usage.reasoning_tokens <= usage.completion_tokens));
      const known = consistent && metadata.returned_model === BUDGET_MODEL;
      const breach = (metadata.returned_model !== null && metadata.returned_model !== BUDGET_MODEL)
        || (integer(usage?.prompt_tokens) && usage.prompt_tokens > MAX_CONTEXT_TOKENS)
        || (integer(usage?.completion_tokens) && usage.completion_tokens > MAX_OUTPUT_TOKENS);
      const charge = known && !breach ? (usage.prompt_tokens * INPUT_NANOS_PER_TOKEN + usage.completion_tokens * OUTPUT_NANOS_PER_TOKEN) * SAFETY_MULTIPLIER : RESERVATION_NANOS;
      try {
        const statements = [db.prepare(`UPDATE analyst_requests SET state=?, charged_nanos=?, outcome=? WHERE request_key=? AND state='dispatched' RETURNING request_key`).bind(known && !breach ? "settled" : "held", charge, outcome, key)];
        if (breach) statements.push(db.prepare("UPDATE analyst_budget SET halted=1 WHERE id=?").bind(BUDGET_POLICY_ID));
        const results = await db.batch(statements);
        // D1 meta.changes includes trigger writes. Verify the returned identity,
        // not an assumed one-row change count.
        if (results[0].results?.[0]?.request_key !== key) throw new Error("Invalid settlement state");
      } catch { throw new BudgetError("settlement_unavailable", "The model attempt remains conservatively reserved because budget settlement could not be verified."); }
      return { policy_id: BUDGET_POLICY_ID, pricing_version: PRICING_VERSION, reservation_nanos: RESERVATION_NANOS, charged_nanos: charge, status: breach ? "halted" : known ? "settled" : "held", accounting: "conservative_application_budget_not_provider_invoice" };
    },
  };
}
