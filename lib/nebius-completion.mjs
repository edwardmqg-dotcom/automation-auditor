export const GENERATION_VERSION = "nebius-json-v0.3";

export function buildCompletionRequest(model, messages) {
  return {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };
}

const identifier = (value) => typeof value === "string" ? value.slice(0, 200) : null;
const tokenCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function providerErrorCategory(payload) {
  const message = typeof payload?.error?.message === "string" ? payload.error.message.toLowerCase() : "";
  if (/json|response_format|structured output/.test(message)) return "structured_output_rejected";
  if (/store/.test(message)) return "storage_parameter_rejected";
  if (/token/.test(message)) return "token_or_auth_parameter_rejected";
  if (/model/.test(message)) return "model_parameter_rejected";
  return "unclassified_provider_error";
}

// Allowlist provenance fields; never export raw reasoning or error bodies.
export function completionMetadata(payload) {
  return {
    response_id: identifier(payload?.id),
    returned_model: identifier(payload?.model),
    finish_reason: identifier(payload?.choices?.[0]?.finish_reason),
    usage: {
      prompt_tokens: tokenCount(payload?.usage?.prompt_tokens),
      completion_tokens: tokenCount(payload?.usage?.completion_tokens),
      total_tokens: tokenCount(payload?.usage?.total_tokens),
      reasoning_tokens: tokenCount(payload?.usage?.completion_tokens_details?.reasoning_tokens),
    },
  };
}

export function completionText(payload) {
  const choice = payload?.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("Token Factory output reached its token limit; no analysis was accepted.");
  if (choice?.finish_reason !== "stop") throw new Error("Token Factory did not finish with a complete text answer.");
  if (choice.message?.refusal) throw new Error("Token Factory declined the evidence analysis request.");
  const content = choice.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Token Factory response did not contain final text content.");
  return content;
}
