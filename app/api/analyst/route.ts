import { env } from "cloudflare:workers";
import { analystUnavailableReason } from "@/lib/analyst-access.mjs";
import { ANALYST_PROMPT_VERSION, buildAnalystMessages, normalizeAnalystInput, parseAnalystResponse } from "@/lib/ai-analyst.mjs";
import { buildCompletionRequest, completionMetadata, completionText, GENERATION_VERSION, providerErrorCategory } from "@/lib/nebius-completion.mjs";

const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const PROMPT_VERSION = ANALYST_PROMPT_VERSION;
const MAX_REQUEST_BYTES = 300_000;

type RuntimeConfig = {
  NEBIUS_ANALYST_ENABLED?: string;
  NEBIUS_API_KEY?: string;
  NEBIUS_BASE_URL?: string;
  NEBIUS_MODEL?: string;
};

function getRuntimeConfig(): RuntimeConfig {
  const cloudflareEnv = env as unknown as RuntimeConfig;
  const nodeEnv: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env;
  return {
    NEBIUS_ANALYST_ENABLED: cloudflareEnv.NEBIUS_ANALYST_ENABLED ?? nodeEnv.NEBIUS_ANALYST_ENABLED,
    NEBIUS_API_KEY: cloudflareEnv.NEBIUS_API_KEY ?? nodeEnv.NEBIUS_API_KEY,
    NEBIUS_BASE_URL: cloudflareEnv.NEBIUS_BASE_URL ?? nodeEnv.NEBIUS_BASE_URL,
    NEBIUS_MODEL: cloudflareEnv.NEBIUS_MODEL ?? nodeEnv.NEBIUS_MODEL,
  };
}

function safeBaseUrl(value: string) {
  const parsed = new URL(value);
  const validHost = parsed.hostname === "api.tokenfactory.nebius.com" || /^api\.tokenfactory\.[a-z0-9-]+\.nebius\.com$/.test(parsed.hostname);
  if (parsed.protocol !== "https:" || !validHost) throw new Error("NEBIUS_BASE_URL must be an HTTPS Nebius Token Factory endpoint.");
  return parsed.toString().replace(/\/$/, "");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unavailable(reason: string, model: string) {
  return Response.json({
    status: "unavailable",
    error: reason,
    call_evidence: {
      provider: "Nebius Token Factory",
      model,
      prompt_version: PROMPT_VERSION,
      model_call_made: false,
    },
  }, { status: 503 });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_REQUEST_BYTES) return Response.json({ status: "rejected", error: "Evidence request is too large." }, { status: 413 });

  let normalized: ReturnType<typeof normalizeAnalystInput>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return Response.json({ status: "rejected", error: "Evidence request is too large." }, { status: 413 });
    normalized = normalizeAnalystInput(JSON.parse(raw));
  } catch (error) {
    return Response.json({ status: "rejected", error: error instanceof Error ? error.message : "Invalid evidence request." }, { status: 400 });
  }

  const config = getRuntimeConfig();
  const model = config.NEBIUS_MODEL?.trim() || DEFAULT_MODEL;
  const unavailableReason = analystUnavailableReason(config);
  if (unavailableReason) return unavailable(unavailableReason, model);
  const apiKey = config.NEBIUS_API_KEY!.trim();

  let baseUrl;
  try {
    baseUrl = safeBaseUrl(config.NEBIUS_BASE_URL?.trim() || DEFAULT_BASE_URL);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "The Token Factory endpoint is invalid.", model);
  }

  const messages = buildAnalystMessages(normalized.evidence, normalized.observationCatalog);
  const inputJson = JSON.stringify(normalized.evidence);
  const completionRequest = buildCompletionRequest(model, messages);
  const requestJson = JSON.stringify(completionRequest);
  const startedAt = new Date();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let upstreamStatus: number | null = null;
  let requestId = "not-returned";
  let metadata = completionMetadata(null);
  let rawOutputSha256: string | null = null;
  let failureStage = "provider_request";
  const callEvidence = async () => {
    const completedAt = new Date();
    return {
      provider: "Nebius Token Factory",
      model,
      endpoint_origin: new URL(baseUrl).origin,
      prompt_version: PROMPT_VERSION,
      generation_version: GENERATION_VERSION,
      generation_parameters: {
        temperature: completionRequest.temperature,
        max_tokens: completionRequest.max_tokens,
        response_format: completionRequest.response_format,
      },
      model_call_made: true,
      http_status: upstreamStatus,
      request_id: requestId,
      ...metadata,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      latency_ms: completedAt.getTime() - startedAt.getTime(),
      input_sha256: await sha256(inputJson),
      request_sha256: await sha256(requestJson),
      raw_output_sha256: rawOutputSha256,
      input_run_ids: normalized.evidence.runs.map((run: { run_id: string }) => run.run_id),
    };
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestJson,
      redirect: "manual",
      signal: controller.signal,
    });
    upstreamStatus = response.status;
    requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? "not-returned";

    if (!response.ok) {
      const errorCategory = providerErrorCategory(await response.json().catch(() => null));
      return Response.json({
        status: "failed",
        error: `Token Factory returned HTTP ${response.status}.`,
        call_evidence: { ...await callEvidence(), failure_stage: "provider_http", provider_error_category: errorCategory },
      }, { status: 502 });
    }

    failureStage = "provider_response";
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    metadata = completionMetadata(payload);
    if (typeof payload?.choices?.[0]?.message?.content === "string") {
      rawOutputSha256 = await sha256(payload.choices[0].message.content);
    }
    const content = completionText(payload);
    failureStage = "analysis_validation";
    const analysis = parseAnalystResponse(content, normalized.observationCatalog, normalized.deterministicAnalysis);
    const outputJson = JSON.stringify(analysis);

    return Response.json({
      status: "succeeded",
      analysis,
      call_evidence: {
        ...await callEvidence(),
        output_sha256: await sha256(outputJson),
      },
    });
  } catch (error) {
    const safeError = controller.signal.aborted
      ? "Token Factory request timed out after 45 seconds."
      : failureStage === "analysis_validation" && error instanceof Error
        ? error.message
        : failureStage === "provider_response" && metadata.finish_reason === "length"
          ? `Token Factory reached the ${completionRequest.max_tokens.toLocaleString("en-US")}-token output limit. No truncated analysis was accepted.`
          : "Token Factory did not return a complete, valid response. See call evidence for the failure stage and finish reason.";
    return Response.json({
      status: "failed",
      error: safeError,
      call_evidence: {
        ...await callEvidence(),
        failure_stage: controller.signal.aborted ? "timeout" : failureStage,
      },
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
