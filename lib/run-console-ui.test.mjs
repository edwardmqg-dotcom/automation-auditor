import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runConsolePrompt, canSubmitTaskResult, runWorkInstructions, measurementReady, canSaveCompleteMeasurement, nextAvailableRunSequence } from './run-console-ui.ts';
import { readTaskInstructions } from './task-instructions-view.ts';
import { createLocalTaskPackage } from './benchmark-import.ts';

test('work instructions distinguish manual work from operating the connected tool', () => {
  const manual = runWorkInstructions('Human', 'TEST ONLY external tool');
  assert.match(manual, /Complete the task manually and save your result/);
  assert.ok(!manual.includes('TEST ONLY external tool') && !manual.includes('in the app'));
  for (const lane of ['Version A', 'Version B']) {
    const text = runWorkInstructions(lane, 'TEST ONLY external tool');
    assert.match(text, /Complete the task in TEST ONLY external tool, then check and save its result/);
    assert.match(text, /including necessary corrections/);
    assert.ok(!text.includes('Material Auditor'));
  }
});

test('preparation and subsequent prompts refer to the current action, in English', () => {
  const ready = runConsolePrompt('ready', false, false);
  assert.match(ready.text, /Click Prepare run/); assert.equal(ready.tone, 'neutral');
  const prepared = runConsolePrompt('running', false, false);
  assert.match(prepared.text, /Click Start human work/); assert.equal(prepared.tone, 'neutral');
  const paused = runConsolePrompt('running', false, true);
  assert.match(paused.text, /Timing is paused/); assert.equal(paused.tone, 'warning');
  assert.match(runConsolePrompt('running', true, true).text, /Click Pause human work/);
  assert.match(runConsolePrompt('submitted', false, true).text, /Start checking \/ correction/);
  assert.match(runConsolePrompt('submitted', true, true).text, /Pause human work/);
  assert.match(runConsolePrompt('reviewed', false, true).text, /Compare/);
  for (const state of ['ready', 'running', 'submitted', 'reviewed']) {
    for (const active of [true, false]) {
      assert.ok(!/[\u4e00-\u9fff]/.test(runConsolePrompt(state, active, true).text));
      if (state !== 'ready') assert.ok(!runConsolePrompt(state, active, true).text.includes('Click Prepare run'));
    }
  }
});

test('result submission requires a paused running lane, a saved result reference and a ready checkpoint', () => {
  assert.equal(canSubmitTaskResult('running', false, '/TEST-ONLY/result.md', true), true);
  for (const value of ['', ' \n\t']) assert.equal(canSubmitTaskResult('running', false, value, true), false);
  assert.equal(canSubmitTaskResult('running', true, 'https://example.test/result', true), false);
  assert.equal(canSubmitTaskResult('running', false, '/result', false), false);
  for (const state of ['ready', 'submitted', 'reviewed']) assert.equal(canSubmitTaskResult(state, false, '/result', true), false);
});

async function localTask() {
  return createLocalTaskPackage([new File(['TEST ONLY material'], 'input.txt')], {
    name: 'TEST ONLY instructions preview', instructions: 'What should be done?\nRead input.\n\nWhat should be delivered?\n保存摘要\n\nWhen is the task complete?\nI confirm completion. <script>not executed</script>'
  }, new Date('2026-10-11T01:00:00Z'));
}

test('incomplete measurement cannot follow the normal completion path', () => {
  const args = [false, false, true, 'pass', true, 'TEST-USER', 'test-only://result', true];
  assert.equal(canSaveCompleteMeasurement(...args), true);
  for (const [index, value] of [[0,true],[1,true],[2,false],[3,'fail'],[3,''],[4,false],[5,' '],[6,' '],[7,false]]) {
    const changed = [...args]; changed[index] = value;
    assert.equal(canSaveCompleteMeasurement(...changed), false);
  }
  const ready = { evidence_standard: 'user_completion', passed: true, timing_complete: true, human_active_time_measured: true };
  assert.equal(measurementReady(ready), true);
  for (const key of ['passed','timing_complete','human_active_time_measured']) assert.equal(measurementReady({...ready, [key]:false}),false);
  assert.equal(measurementReady({...ready,evidence_standard:'legacy_quality'}),false);
  const prompt = runConsolePrompt('reviewed',false,true,false);
  assert.equal(prompt.tone,'warning'); assert.match(prompt.text,/Repeat the full task with timing/);
  assert.doesNotMatch(prompt.text,/continue to Compare/);
});

test('retest numbering skips saved IDs without modifying records or starting timing', () => {
  const ids=['TEST-HUMAN-01','TEST-HUMAN-02','TEST-A-03'];
  const before=JSON.stringify(ids);
  assert.equal(nextAvailableRunSequence('TEST-HUMAN-',1,ids),3);
  assert.equal(nextAvailableRunSequence('TEST-HUMAN-',8,ids),8);
  assert.equal(nextAvailableRunSequence('TEST-B-',1,ids),1);
  assert.equal(JSON.stringify(ids),before);
});

test('reader returns the actual generated file and exact text without changing the task', async () => {
  const task = await localTask(), before = JSON.stringify(task.manifest);
  const result = await readTaskInstructions(task.manifest, task.selected_files);
  assert.equal(result.text, await result.file.text());
  assert.ok(result.text.includes('保存摘要')); assert.ok(result.text.includes('<script>not executed</script>'));
  assert.equal(JSON.stringify(task.manifest), before);
  assert.ok(task.selected_files.includes(result.file));
});

test('reader rechecks identity: missing, duplicate, changed size or changed bytes cannot be shown', async () => {
  const task = await localTask(), name = task.manifest.completion_criteria.instructions_file;
  const file = task.selected_files.find(item => item.name === name), other = task.selected_files.filter(item => item !== file);
  await assert.rejects(readTaskInstructions(task.manifest, other), /unavailable/);
  await assert.rejects(readTaskInstructions(task.manifest, [...task.selected_files, file]), /unavailable/);
  await assert.rejects(readTaskInstructions(task.manifest, [...other, new File(['x'], name)]), /size mismatch/);
  await assert.rejects(readTaskInstructions(task.manifest, [...other, new File([new Uint8Array(file.size)], name)]), /fingerprint mismatch/);
  const unlisted = structuredClone(task.manifest); unlisted.input_files = [];
  await assert.rejects(readTaskInstructions(unlisted, task.selected_files), /unavailable/);
});

test('binary, non-UTF8 and oversized instructions retain a verified downloadable file without garbled preview', async () => {
  const task = await localTask();
  for (const file of [new File(['%PDF TEST ONLY'], 'instructions.pdf', { type: 'application/pdf' }), new File([new Uint8Array([255, 254])], 'instructions.txt', { type: 'text/plain' }), new File([new Uint8Array([0])], 'instructions.txt', { type: 'text/plain' }), new File(['x'.repeat(1024 * 1024 + 1)], 'instructions.txt', { type: 'text/plain' })]) {
    const manifest = structuredClone(task.manifest);
    manifest.completion_criteria.instructions_file = 'nested/' + file.name;
    manifest.input_files = [{ path: 'nested/' + file.name, media_type: file.type, size_bytes: file.size, sha256: createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex') }];
    const result = await readTaskInstructions(manifest, [file]);
    assert.equal(result.text, null); assert.equal(result.file, file);
  }
});

test('older manually-referenced task is not converted to generated instructions', async () => {
  await assert.rejects(readTaskInstructions({ schema_version: 'benchmark-package-manifest-v0.1' }, []), /older task/);
});
