import test from "node:test";
import assert from "node:assert/strict";
import { composeTaskInstructions } from "./task-instructions.mjs";
import { createLocalTaskPackage, benchmarkCompletionCriteriaRef, validateBenchmarkFiles } from "./benchmark-import.ts";

const answers = { work: " Read the selected files. ", deliverable: " A saved summary. ", completion: " I have checked and saved the result. " };

test("all three answers are required, without a word-count or business-score rule", () => {
  for (const field of ["work", "deliverable", "completion"]) {
    for (const empty of ["", " \n\t", null, undefined]) assert.equal(composeTaskInstructions({ ...answers, [field]: empty }), null);
  }
  assert.notEqual(composeTaskInstructions({ work: "a", deliverable: "b", completion: "c" }), null);
});

test("three answers become ordered, labelled instructions without invented requirements", () => {
  assert.equal(composeTaskInstructions(answers), "What should be done?\nRead the selected files.\n\nWhat should be delivered?\nA saved summary.\n\nWhen is the task complete?\nI have checked and saved the result.");
  const multiline = { work: "检查材料\n按用户清单", deliverable: "保存报告", completion: "略；由我确认" };
  const before = structuredClone(multiline);
  assert.ok(composeTaskInstructions(multiline).includes(multiline.work));
  assert.ok(composeTaskInstructions(multiline).endsWith(multiline.completion));
  assert.deepEqual(multiline, before);
});

test("generated TXT contains the answers and roundtrips without changing the task", async () => {
  const file = new File(["TEST ONLY input"], "test-input.txt"), date = new Date("2026-10-11T01:00:00Z");
  const instructions = composeTaskInstructions(answers);
  const result = await createLocalTaskPackage([file], { name: "TEST ONLY three-question task", instructions }, date);
  assert.equal(result.status, "ready");
  const txt = result.selected_files.find(f => f.name === result.manifest.completion_criteria.instructions_file);
  assert.equal(await txt.text(), instructions + "\n");
  const restored = await validateBenchmarkFiles(result.selected_files);
  assert.equal(restored.status, "ready");
  assert.deepEqual(restored.manifest, result.manifest);
  assert.equal(benchmarkCompletionCriteriaRef(restored.manifest), benchmarkCompletionCriteriaRef(result.manifest));
});

test("changing any answer creates different task and criteria references, without rewriting the prior package", async () => {
  const file = new File(["TEST ONLY"], "input.txt"), date = new Date("2026-10-11T01:00:00Z");
  const prepare = fields => createLocalTaskPackage([file], { name: "TEST ONLY", instructions: composeTaskInstructions(fields) }, date);
  const original = await prepare(answers), before = JSON.stringify(original.manifest);
  for (const field of ["work", "deliverable", "completion"]) {
    const changed = await prepare({ ...answers, [field]: "Changed user requirement." });
    assert.notEqual(changed.manifest.task_id, original.manifest.task_id);
    assert.notEqual(benchmarkCompletionCriteriaRef(changed.manifest), benchmarkCompletionCriteriaRef(original.manifest));
  }
  assert.equal(JSON.stringify(original.manifest), before);
  assert.equal((await validateBenchmarkFiles(original.selected_files)).status, "ready");
});
