import assert from "node:assert/strict";
import test from "node:test";
import { buildCompletionRequest, completionMetadata, completionText } from "./nebius-completion.mjs";

test("requests bounded JSON output without unsupported storage parameters", () => {
  const messages = [{ role: "user", content: "Synthetic evidence" }];
  const request = buildCompletionRequest("nvidia/test-model", messages);
  assert.equal(request.model, "nvidia/test-model");
  assert.deepEqual(request.messages, messages);
  assert.deepEqual(request.response_format, { type: "json_object" });
  assert.equal(request.max_tokens, 4096);
  assert.equal("store" in request, false);
});

test("preserves allowlisted provider provenance without raw reasoning", () => {
  const metadata = completionMetadata({
    id: "completion-test", model: "nvidia/test-model",
    choices: [{ finish_reason: "length", message: { reasoning_content: "PRIVATE TRACE" } }],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300, completion_tokens_details: { reasoning_tokens: 190 } },
    arbitrary_field: "NOT FOR EXPORT",
  });
  assert.equal(metadata.response_id, "completion-test");
  assert.equal(metadata.finish_reason, "length");
  assert.equal(metadata.usage.reasoning_tokens, 190);
  assert.doesNotMatch(JSON.stringify(metadata), /PRIVATE TRACE|NOT FOR EXPORT/);
});

test("missing or malformed usage stays unknown, not zero", () => {
  assert.equal(completionMetadata({}).usage.total_tokens, null);
  assert.equal(completionMetadata({ usage: { total_tokens: -1 } }).usage.total_tokens, null);
  assert.equal(completionMetadata({ usage: { total_tokens: "100" } }).usage.total_tokens, null);
});

test("accepts only a completed final answer", () => {
  assert.equal(completionText({ choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] }), '{"ok":true}');
});

test("rejects truncated output even when it contains a valid JSON object", () => {
  assert.throws(() => completionText({ choices: [{ finish_reason: "length", message: { content: '{"ok":true}' } }] }), /token limit/);
});

test("does not substitute reasoning for missing final content", () => {
  assert.throws(() => completionText({ choices: [{ finish_reason: "stop", message: { content: null, reasoning_content: '{"ok":true}' } }] }), /final text/);
});

test("rejects refusals and unknown termination", () => {
  assert.throws(() => completionText({ choices: [{ finish_reason: "stop", message: { refusal: "Refused", content: '{}' } }] }), /declined/);
  assert.throws(() => completionText({ choices: [{ finish_reason: "content_filter" }] }), /complete text/);
  assert.throws(() => completionText({}), /complete text/);
});
