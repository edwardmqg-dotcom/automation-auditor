import { analystUnavailableReason } from "./analyst-access.mjs";
import { ANALYST_PROMPT_VERSION, buildAnalystMessages, normalizeAnalystInput, parseAnalystResponse } from "./ai-analyst.mjs";
import { buildCompletionRequest, completionMetadata, completionText, GENERATION_VERSION, providerErrorCategory } from "./nebius-completion.mjs";
import { BUDGET_MODEL, BudgetError, createBudgetLedger, digest, requestKey, validatePricing, verifyReviewer } from "./analyst-budget.mjs";
const BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const MAX_REQUEST_BYTES = 300_000;
const MAX_PROVIDER_BYTES = 500_000;
async function boundedText(stream, maximum) {
  if (!stream) return "";
  const reader = stream.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new BudgetError("request_too_large", "Evidence or provider response is too large.", 413); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
const json = (payload, status = 200) => Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
const preflightFailure = (error, model) => json({ status: "unavailable", error: error.message, call_evidence: { provider: "Nebius Token Factory", model, prompt_version: ANALYST_PROMPT_VERSION, model_call_made: false, failure_stage: error.code } }, error.httpStatus);

// Tests inject a mock fetch. The product route always supplies real bindings.
export async function handleAnalystRequest(request, config, dependencies = {}) {
  const model = config.NEBIUS_MODEL?.trim() || BUDGET_MODEL;
  let normalized;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) throw new BudgetError("request_too_large", "Evidence request is too large.", 413);
    normalized = normalizeAnalystInput(JSON.parse(await boundedText(request.body, MAX_REQUEST_BYTES)));
  } catch (error) { return json({ status: "rejected", error: error instanceof BudgetError ? error.message : "Invalid evidence request.", call_evidence: { model_call_made: false } }, error instanceof BudgetError ? error.httpStatus : 400); }
  const unavailable = analystUnavailableReason(config);
  if (unavailable) return preflightFailure(new BudgetError("analyst_disabled_or_unconfigured", unavailable), model);
  const now = dependencies.now ?? Date.now;
  let ledger, key, completionRequest, requestJson, inputJson;
  try {
    const credentialHash = await verifyReviewer(request, config);
    validatePricing(config, model, now());
    if ((config.NEBIUS_BASE_URL?.trim() || BASE_URL).replace(/\/$/, "") !== BASE_URL) throw new BudgetError("unapproved_endpoint", "This endpoint has no approved reviewer pricing policy.");
    key = requestKey(request);
    inputJson = JSON.stringify(normalized.evidence);
    completionRequest = buildCompletionRequest(model, buildAnalystMessages(normalized.evidence, normalized.observationCatalog));
    requestJson = JSON.stringify(completionRequest);
    ledger = createBudgetLedger(config.ANALYST_BUDGET_DB);
    await ledger.reserve(key, await digest(requestJson), credentialHash, now());
    await ledger.dispatched(key);
  } catch (error) { return preflightFailure(error instanceof BudgetError ? error : new BudgetError("guard_unavailable", "Reviewer request protection could not be verified."), model); }

  const fetcher = dependencies.fetch ?? fetch;
  const startedAt = now(), controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 45_000);
  let upstreamStatus = null, requestId = "not-returned", rawOutputSha256 = null;
  let metadata = completionMetadata(null);
  let outcome = "provider_request", status = 502, payload;
  try {
    const response = await fetcher(`${BASE_URL}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${config.NEBIUS_API_KEY.trim()}`, "Content-Type": "application/json" }, body: requestJson, redirect: "manual", signal: controller.signal });
    upstreamStatus = response.status;
    requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? "not-returned";
    const upstream = JSON.parse(await boundedText(response.body, MAX_PROVIDER_BYTES));
    if (!response.ok) { outcome = "provider_http"; payload = { status: "failed", error: `Token Factory returned HTTP ${response.status}.`, provider_error_category: providerErrorCategory(upstream) }; }
    else {
      outcome = "provider_response";
      metadata = completionMetadata(upstream);
      if (typeof upstream?.choices?.[0]?.message?.content === "string") rawOutputSha256 = await digest(upstream.choices[0].message.content);
      const content = completionText(upstream);
      outcome = "analysis_validation";
      const analysis = parseAnalystResponse(content, normalized.observationCatalog, normalized.deterministicAnalysis);
      payload = { status: "succeeded", analysis }; status = 200; outcome = "succeeded";
    }
  } catch {
    outcome = controller.signal.aborted ? "timeout" : outcome;
    payload = { status: "failed", error: controller.signal.aborted ? "Token Factory request timed out. No automatic retry was made." : metadata.finish_reason === "length" ? "Token Factory reached the 4,096-token output limit. No truncated analysis was accepted." : "Token Factory did not return a complete, valid response. See call evidence for the failure stage and finish reason." };
  } finally { clearTimeout(timeout); }
  let budget;
  try {
    budget = await ledger.settle(key, metadata, outcome);
    if (budget.status === "halted") { payload = { status: "failed", error: "The returned model or usage exceeded the approved pricing assumptions. Reviewer inference is halted." }; status = 502; outcome = "pricing_assumption_breach"; }
  } catch { budget = { status: "unreconciled", accounting: "reservation_retained_no_automatic_retry" }; payload = { status: "failed", error: "The model attempt was recorded, but its budget settlement is unverified. The reservation is retained." }; status = 503; outcome = "budget_settlement"; }
  const completedAt = now();
  const evidence = {
    provider: "Nebius Token Factory", model, endpoint_origin: new URL(BASE_URL).origin,
    prompt_version: ANALYST_PROMPT_VERSION, generation_version: GENERATION_VERSION,
    generation_parameters: { temperature: completionRequest.temperature, max_tokens: completionRequest.max_tokens, response_format: completionRequest.response_format },
    model_call_made: true, http_status: upstreamStatus, request_id: requestId, analysis_request_id: key, ...metadata, budget,
    started_at: new Date(startedAt).toISOString(), completed_at: new Date(completedAt).toISOString(), latency_ms: completedAt - startedAt,
    input_sha256: await digest(inputJson), request_sha256: await digest(requestJson), raw_output_sha256: rawOutputSha256,
    input_run_ids: normalized.evidence.runs.map(run => run.run_id),
    ...(payload.status === "succeeded" ? { output_sha256: await digest(JSON.stringify(payload.analysis)) } : { failure_stage: outcome }),
  };
  return json({ ...payload, call_evidence: evidence }, status);
}
