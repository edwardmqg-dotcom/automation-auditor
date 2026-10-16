import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildConnectionManifest, inspectToolSetupDraft, inspectConnectionDraft, bindToolSetupToTask, inspectStoredToolSetup, toolSetupSignature } from './automation-connection.ts';
import { buildWorkspaceSnapshot, inspectWorkspaceSnapshot } from './workspace-snapshot.mjs';

const draft = {
  name: 'Test automation', taskKind: 'test_task', purpose: 'Connection regression fixture',
  versionA: 'fixture-a', versionB: '', adapter: 'guided', targetUrl: 'https://example.org/',
  inputTransport: 'manual_files', outputTransport: 'manual_import', eventSource: 'run_console',
};

test('new connections declare the current recorder schema without claiming connectivity', () => {
  const manifest = buildConnectionManifest(draft, new Date('2026-10-01T00:00:00Z'));
  assert.equal(manifest.contracts.events.schema_ref, 'event-schema.v0.4.json');
  assert.equal(manifest.validation.contract_status, 'valid');
  assert.equal(manifest.validation.connectivity_status, 'manual_confirmation_required');
  assert.equal(manifest.adapter.credential_ref, null);
});

test('legacy connections remain recoverable without rewriting their event contract', () => {
  const manifest = buildConnectionManifest(draft, new Date('2026-10-01T00:00:00Z'));
  manifest.contracts.events.schema_ref = 'event-schema.v0.3.json';
  const snapshot = buildWorkspaceSnapshot({ manifest }, [], false, new Date('2026-10-01T00:00:00Z'));
  const before = structuredClone(snapshot);
  const inspected = inspectWorkspaceSnapshot(snapshot);
  assert.deepEqual(inspected.errors, []);
  assert.deepEqual(snapshot, before);
  assert.equal(inspected.snapshot.automation.manifest.contracts.events.schema_ref, 'event-schema.v0.3.json');
});

test('a prepared setup needs no guessed task ID but is not a valid manifest yet', () => {
  const prepared = { ...draft, taskKind: '' };
  assert.ok(inspectToolSetupDraft(prepared).every(x => x.passed));
  assert.ok(inspectConnectionDraft(prepared).some(x => !x.passed));
  assert.equal(buildConnectionManifest(prepared).validation.contract_status, 'invalid');
  assert.deepEqual(inspectStoredToolSetup(prepared), prepared);
});

test('verified task binding is explicit and leaves the original draft untouched', () => {
  const prepared = { ...draft, taskKind: '' };
  const bound = bindToolSetupToTask(prepared, 'another_task');
  assert.equal(prepared.taskKind, '');
  assert.equal(bound.taskKind, 'another_task');
  assert.equal(buildConnectionManifest(bound).validation.contract_status, 'valid');
  assert.throws(() => bindToolSetupToTask(prepared, 'My category'), /valid task/);
  assert.throws(() => bindToolSetupToTask({ ...prepared, name: '' }, 'another_task'), /Complete/);
});

test('stored drafts reject unsupported transports, missing settings and secret fields', () => {
  assert.throws(() => inspectStoredToolSetup({ ...draft, api_key: 'TEST-ONLY-NOT-A-KEY' }), /unsupported fields/);
  for (const key of ['adapter', 'inputTransport', 'outputTransport', 'eventSource']) assert.throws(() => inspectStoredToolSetup({ ...draft, [key]: 'unknown' }), /unsupported integration/);
  assert.throws(() => inspectStoredToolSetup({ ...draft, targetUrl: 'file:///tmp/test' }), /checks/);
});

test('reading the package ID does not dirty setup; changes to actual settings do', () => {
  assert.equal(toolSetupSignature(draft), toolSetupSignature({ ...draft, taskKind: 'other_task' }));
  assert.notEqual(toolSetupSignature(draft), toolSetupSignature({ ...draft, targetUrl: 'https://other.example/' }));
});

test('setup validation and both restore paths use the same task-independent signature', () => {
  const page = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /const currentDraftSignature = toolSetupSignature\(connectionDraft\);/);
  assert.match(page, /setValidatedDraftSignature\(toolSetupSignature\(draft\)\);/);
  assert.match(page, /setValidatedDraftSignature\(toolSetupSignature\(restoredDraft\)\);/);
  assert.doesNotMatch(page, /setValidatedDraftSignature\(JSON\.stringify/);
});
