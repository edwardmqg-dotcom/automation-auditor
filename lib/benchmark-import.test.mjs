import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assertBenchmarkCompletionCriteria, benchmarkCompletionCriteriaRef, benchmarkRubricRef, inspectBenchmarkManifest, validateBenchmarkFiles, prepareBenchmarkFiles, createLocalTaskPackage } from "./benchmark-import.ts";
import { buildWorkspaceSnapshot } from "./workspace-snapshot.mjs";

const instructions = new File(["TEST ONLY: Use the same input and confirm the task is complete. No business answer key.\n"], "instructions.md", { type: "text/markdown" });
const jsonInput = new File(['{"test_only":true,"items":[1,2]}'], "input.json", { type: "application/json" });
const sha = async (file) => createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
const metadata = async (file) => ({ path: file.name, media_type: file.type, size_bytes: file.size, sha256: await sha(file) });
async function packet() {
  const manifest = { schema_version: "benchmark-package-manifest-v0.2", benchmark_id: "TEST-ONLY-v2", task_id: "TEST-ONLY", task_version: "TEST-v1", display_name: "TEST ONLY generic task", task_kind: "test_only", description: "Import regression, never real work", review_as_of: "2026-10-02", created_at: "2026-10-02T00:00:00Z", completion_criteria: { basis: "user_confirmation", instructions_file: instructions.name }, input_files: [await metadata(instructions), await metadata(jsonInput)] };
  return { manifest, files: [new File([JSON.stringify(manifest)], "manifest.json", { type: "application/json" }), instructions, jsonInput] };
}

test("v0.2 imports without answers, rubric or requirement counts; JSON and Markdown are valid inputs", async () => {
  const { manifest, files } = await packet();
  const result = await validateBenchmarkFiles(files);
  assert.equal(result.status, "ready"); assert.deepEqual(result.errors, []);
  assert.deepEqual(result.manifest, manifest);
  assert(result.file_checks.every((file) => file.status === "valid"));
  assert.equal(benchmarkCompletionCriteriaRef(result.manifest), `sha256:${await sha(instructions)}`);
  assert.equal(benchmarkRubricRef(result.manifest), benchmarkCompletionCriteriaRef(result.manifest));
  assert.doesNotThrow(() => assertBenchmarkCompletionCriteria(result.manifest, benchmarkCompletionCriteriaRef(result.manifest)));
  assert.throws(() => assertBenchmarkCompletionCriteria(result.manifest, "different"), /fingerprint/);
  assert.throws(() => assertBenchmarkCompletionCriteria(result.manifest, " "), /required/);
});

test("v0.2 requires listed, nonempty instructions and user-confirmation basis", async () => {
  for (const mutate of [m => { delete m.completion_criteria; }, m => { m.completion_criteria.instructions_file = "absent.txt"; }, m => { m.input_files[0].size_bytes = 0; }, m => { m.completion_criteria.basis = "model_scoring"; }, m => { m.completion_criteria.score = 100; }]) {
    const { manifest } = await packet(); mutate(manifest);
    assert.equal(inspectBenchmarkManifest(manifest).manifest, null);
  }
});

test("new package rejects quality and reference-answer fields rather than inventing sealed gold", async () => {
  for (const field of ["reference_answers", "rubric_ref", "acceptance", "unknown_field"]) {
    const { manifest } = await packet(); manifest[field] = {};
    assert.match(inspectBenchmarkManifest(manifest).errors.join(" "), /v0.2 does not accept/);
  }
});

test("safe relative paths, unique basenames, digest and date validation", async () => {
  for (const bad of ["../instructions.md", "/instructions.md", "C:\\instructions.md", "dir\\instructions.md", "a//instructions.md", "a/./instructions.md", "a/"]) {
    const { manifest } = await packet(); manifest.input_files[0].path = bad;
    assert.match(inspectBenchmarkManifest(manifest).errors.join(" "), /safe relative path/);
  }
  for (const mutate of [m => { m.input_files.push({ ...m.input_files[0], path: "other/instructions.md" }); }, m => { m.input_files[0].sha256 = "invalid"; }, m => { m.review_as_of = "2026-02-30"; }, m => { m.created_at = "not-a-time"; }]) {
    const { manifest } = await packet(); mutate(manifest);
    assert.equal(inspectBenchmarkManifest(manifest).manifest, null);
  }
});

test("published v0.2 schema path pattern accepts relative filenames and rejects unsafe segments", () => {
  const schema = JSON.parse(readFileSync(new URL("../schemas/benchmark-package-manifest.v0.2.json", import.meta.url), "utf8"));
  const pathPattern = new RegExp(schema.properties.input_files.items.properties.path.pattern);
  for (const path of ["instructions.txt", "folder/input.json", "a/.hidden", "a.b"]) assert(pathPattern.test(path), path);
  for (const path of ["../x", "folder/../x", "./x", "folder/./x", "/x", "C:/x", "a\\b", "a\0b", "a//b", "a/", ""]) assert(!pathPattern.test(path), path);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.completion_criteria.properties.basis.const, "user_confirmation");
  assert(!schema.properties.reference_answers);
});

test("missing, unlisted, duplicate, size-mismatched and hash-mismatched selections rejected", async () => {
  const { files } = await packet();
  for (const selection of [files.slice(0, 2), [...files, new File(["extra"], "unlisted.txt")], [...files, jsonInput], [files[0], new File(["short"], instructions.name), jsonInput], [files[0], new File(["X".repeat(instructions.size)], instructions.name), jsonInput]]) {
    assert.equal((await validateBenchmarkFiles(selection)).status, "invalid");
  }
});

test("zero or multiple manifest candidates cannot be mistaken for one JSON task input", async () => {
  const { files } = await packet();
  for (const selection of [[jsonInput], [new File(["{"], "broken.json")], [...files, new File([await files[0].text()], "second-manifest.json")]]) assert.equal((await validateBenchmarkFiles(selection)).status, "invalid");
});

test("workspace file roundtrip revalidates v0.2 and changed instructions get a different criteria fingerprint", async () => {
  const { files, manifest } = await packet();
  const snapshot = buildWorkspaceSnapshot({ manifest: { adapter: { credential_ref: null } } }, files, true);
  assert.equal((await validateBenchmarkFiles(snapshot.benchmark.files)).status, "ready");
  const tampered = new File(["Y".repeat(instructions.size)], instructions.name, { type: instructions.type });
  assert.equal((await validateBenchmarkFiles([files[0], tampered, jsonInput])).status, "invalid");
  const updated = structuredClone(manifest); updated.input_files[0].sha256 = await sha(tampered);
  assert.notEqual(benchmarkCompletionCriteriaRef(manifest), benchmarkCompletionCriteriaRef(updated));
});

test("existing v0.1 fixture remains byte-for-byte unchanged, with manual criteria behavior", () => {
  const file = new URL("./fixtures/test-only-benchmark.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(file, "utf8")); const before = JSON.stringify(manifest);
  assert.deepEqual(inspectBenchmarkManifest(manifest).errors, []);
  assert.equal(JSON.stringify(manifest), before);
  assert.equal(benchmarkCompletionCriteriaRef(manifest), null);
  assert.equal(benchmarkRubricRef(manifest), manifest.rubric_ref);
  assert.doesNotThrow(() => assertBenchmarkCompletionCriteria(manifest, "manually-declared-before-run"));
  delete manifest.reference_answers;
  assert.equal(inspectBenchmarkManifest(manifest).manifest, null);
});

test("raw materials need user instructions, not a user-supplied JSON", async () => {
  const materials = [new File(["TEST ONLY material"], "material.txt")];
  const prepared = await prepareBenchmarkFiles(materials);
  assert.equal(prepared.status, "needs_setup"); assert.deepEqual(prepared.errors, []); assert.equal(prepared.manifest, null);
  const result = await createLocalTaskPackage(materials, { name: "TEST ONLY task", instructions: "Read the material and save a summary." }, new Date("2026-10-11T01:00:00Z"));
  assert.equal(result.status, "ready"); assert.equal(result.selected_files.length, 3);
  assert.equal(result.manifest.display_name, "TEST ONLY task"); assert.equal(result.manifest.task_kind, "local_task");
  assert.deepEqual(inspectBenchmarkManifest(result.manifest).errors, []);
  assert.equal(benchmarkCompletionCriteriaRef(result.manifest), `sha256:${await sha(result.selected_files[1])}`);
  const snapshot = buildWorkspaceSnapshot({ manifest: { adapter: { credential_ref: null } } }, result.selected_files, true);
  const restored = await validateBenchmarkFiles(snapshot.benchmark.files);
  assert.equal(restored.status, "ready"); assert.deepEqual(restored.manifest, result.manifest);
  assert.equal(await materials[0].text(), "TEST ONLY material");
});

test("local task setup rejects empty fields, duplicate names, unsafe names and no files", async () => {
  const file = new File(["TEST ONLY"], "material.txt"), setup = { name: "TEST ONLY", instructions: "Save the result." };
  for (const [files, fields] of [[[], setup], [[file], { ...setup, name: " " }], [[file], { ...setup, instructions: " " }], [[file, file], setup], [[new File(["x"], "../bad")], setup], [[file], { ...setup, taskKind: "bad type" }]]) assert.equal((await createLocalTaskPackage(files, fields)).status, "invalid");
  assert.equal((await prepareBenchmarkFiles([])).status, "invalid");
  assert.equal((await prepareBenchmarkFiles([file, file])).status, "invalid");
});

test("plain JSON stays material, while malformed, multiple and unsupported declared task packages cannot fall back", async () => {
  assert.equal((await prepareBenchmarkFiles([jsonInput])).status, "needs_setup");
  assert.equal((await prepareBenchmarkFiles([new File(["{"], "raw.json")])).status, "needs_setup");
  const { files, manifest } = await packet();
  assert.equal((await prepareBenchmarkFiles(files)).status, "ready");
  assert.equal((await prepareBenchmarkFiles([...files, new File([await files[0].text()], "duplicate.json")])).status, "invalid");
  for (const mutate of [m => { m.schema_version = "benchmark-package-manifest-v99"; }, m => { delete m.completion_criteria; }]) {
    const broken = structuredClone(manifest); mutate(broken);
    const selected = [new File([JSON.stringify(broken)], "manifest.json"), instructions, jsonInput];
    assert.equal((await prepareBenchmarkFiles(selected)).status, "invalid");
    assert.equal((await createLocalTaskPackage(selected, { name: "TEST", instructions: "Do not override." })).status, "invalid");
  }
});

test("generated task identity is stable for reordered selection but changes with inputs or criteria", async () => {
  const first = new File(["A"], "a.txt"), second = new File(["B"], "b.txt"), date = new Date("2026-10-11T01:00:00Z"), setup = { name: "TEST task", instructions: "Save a summary.", taskKind: "test_only" };
  const a = await createLocalTaskPackage([first, second], setup, date), b = await createLocalTaskPackage([second, first], setup, date);
  assert.equal(a.manifest.task_id, b.manifest.task_id);
  for (const result of [await createLocalTaskPackage([new File(["C"], "a.txt"), second], setup, date), await createLocalTaskPackage([first, second], { ...setup, instructions: "Save a different result." }, date)]) assert.notEqual(a.manifest.task_id, result.manifest.task_id);
  const tampered = a.selected_files.map(f => f === first ? new File(["X"], "a.txt") : f);
  assert.equal((await validateBenchmarkFiles(tampered)).status, "invalid");
});

test("generated records avoid collisions with task material filenames and preserve user JSON as input", async () => {
  const files = [jsonInput, new File(["TEST ONLY"], "automation-auditor-task-instructions.txt"), new File(["TEST ONLY"], "automation-auditor-task-package.json")];
  const result = await createLocalTaskPackage(files, { name: "TEST", instructions: "Save the result." });
  assert.equal(result.status, "ready");
  assert.equal(result.manifest.completion_criteria.instructions_file, "automation-auditor-task-instructions-1.txt");
  assert.equal(new Set(result.selected_files.map(f => f.name)).size, 5);
  assert(result.manifest.input_files.some(f => f.path === jsonInput.name));
});
