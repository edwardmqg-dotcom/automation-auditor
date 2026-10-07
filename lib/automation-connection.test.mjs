import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectionManifest } from './automation-connection.ts';
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
