import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { ANALYST_PROMPT_VERSION, buildAnalystMessages, normalizeAnalystInput, parseAnalystResponse } from "./ai-analyst.mjs";

// Immutable real evidence, used only for local regressions. No network, secrets,
// UI, timer actions, or modifications to the sealed records.
const prepared = JSON.parse(fs.readFileSync(new URL("./fixtures/product-request.prepared.json", import.meta.url)));
const realResponse = JSON.parse(fs.readFileSync(new URL("./fixtures/v0.7-product-response.json", import.meta.url)));
const normalized = normalizeAnalystInput(prepared);
const modelFacts = evidence => JSON.parse(buildAnalystMessages(evidence, normalized.observationCatalog)[1].content.split("Reviewed run facts:\n")[1].split("\n\nDeclared study context:")[0]);
const parse = value => parseAnalystResponse(JSON.stringify(value), normalized.observationCatalog, normalized.deterministicAnalysis);
const validSelection = () => ({
  findings: [{ observation_id: "RUN-A-SUPPLIER-014-01#human-time", possible_explanations: [], evidence_needed: ["A separate, completely timed manual baseline under the shared completion conditions."] }],
  residual_human_work: [{ observation_id: "RUN-A-SUPPLIER-014-01/EV-007#human-event", cause_not_established: true, evidence_needed: ["User-described operation categories during checking and necessary correction."] }],
  recommended_next_experiment: "Use a separately identified task with complete human timing and the same user-confirmed completion conditions. Document prior exposure and order without changing the sealed records.",
});

test("v0.8 strips legacy quality and correction flags from completion model facts without mutating evidence", () => {
  assert.equal(ANALYST_PROMPT_VERSION, "evidence-analyst-v0.8");
  const before = JSON.stringify(normalized.evidence);
  const facts = modelFacts(normalized.evidence);
  for (const fact of facts) {
    assert.equal(fact.completion_basis, "user_confirmation");
    assert.equal(fact.completion_decision, "completed");
    for (const key of ["passed", "first_pass", "intervention_count", "rework_count", "traceability_rate", "events"]) assert.equal(key in fact, false, key);
  }
  assert.deepEqual(facts.map(fact => fact.human_active_ms), [1448838, 271016]);
  assert.equal(JSON.stringify(normalized.evidence), before);
});

test("not-completed model fact cannot turn into quality Fail or completed", () => {
  const evidence = structuredClone(normalized.evidence);
  evidence.runs[0].passed = false;
  assert.equal(modelFacts(evidence)[0].completion_decision, "not_completed");
});

test("legacy model facts remain compatible while completion facts are isolated in mixed inputs", () => {
  const evidence = structuredClone(normalized.evidence);
  delete evidence.runs[1].completion_basis;
  const facts = modelFacts(evidence);
  assert.equal("passed" in facts[0], false);
  assert.equal(facts[1].passed, true);
  assert.equal(facts[1].rework_count, 0);
  assert.equal("completion_decision" in facts[1], false);
});

test("prompt distinguishes user completion, unknown correction counts, and familiarity effects", () => {
  const prompt = buildAnalystMessages(normalized.evidence, normalized.observationCatalog)[0].content;
  assert.match(prompt, /There are no automated business pass\/fail criteria/);
  assert.match(prompt, /does not establish absence of checking/);
  assert.match(prompt, /Blinding version labels alone does not remove/);
});

test("actual v0.7 response is now rejected locally rather than silently rewritten", () => {
  const selections = {
    findings: realResponse.analysis.findings,
    residual_human_work: realResponse.analysis.residual_human_work,
    recommended_next_experiment: realResponse.analysis.recommended_next_experiment,
  };
  const before = JSON.stringify(realResponse);
  assert.throws(() => parse(selections), /introduces automated pass\/fail/);
  assert.equal(JSON.stringify(realResponse), before);
});

for (const wording of ["automated pass criteria", "automatic pass/fail criteria", "machine acceptance checks", "AI quality scoring", "automatically approved", "自动通过标准", "机器验收机制"]) {
  test(`rejects unsupported completion premise in recommendations: ${wording}`, () => {
    const selection = validSelection();
    selection.recommended_next_experiment = `Use ${wording} for the next run.`;
    assert.throws(() => parse(selection), /recommended_next_experiment introduces/);
  });
}

test("the same completion-basis guard checks hypotheses and both kinds of evidence requests", () => {
  for (const target of ["hypothesis", "finding_evidence", "residual_evidence"]) {
    const selection = validSelection();
    if (target === "hypothesis") selection.findings[0].possible_explanations = ["Hypothesis: Work remained despite automated pass criteria.", "Hypothesis: Repeated material changed checking behavior."];
    if (target === "finding_evidence") selection.findings[0].evidence_needed = ["The automated pass criteria used."];
    if (target === "residual_evidence") selection.residual_human_work[0].evidence_needed = ["The automatic acceptance checks used."];
    assert.throws(() => parse(selection), /introduces automated pass\/fail/, target);
  }
});

test("valid completion response preserves deterministic times and limitations without a quality score", () => {
  const output = parse(validSelection());
  assert.equal(output.executive_summary, normalized.deterministicAnalysis.executive_summary);
  assert.deepEqual(output.limitations, normalized.deterministicAnalysis.limitations);
  assert.match(output.executive_summary, /1448838 milliseconds/);
  assert.match(output.limitations.join(" "), /No reviewed Human baseline/);
});

test("uncertain quality and familiarity hypotheses are not turned into an automated business score", () => {
  const selection = validSelection();
  selection.findings[0].possible_explanations = ["Hypothesis: The user found the result usable without further correction.", "Hypothesis: Familiarity with repeated materials changed the user's checking effort."];
  assert.equal(parse(selection).findings[0].possible_explanations.length, 2);
});
