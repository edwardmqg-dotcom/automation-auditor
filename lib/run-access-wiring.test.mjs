import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Source wiring guards only; actual browser checks are recorded separately.
const page = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function body(name) { let text = ''; function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) text = node.getText(ast); ts.forEachChild(node, visit); } visit(ast); assert(text); return text; }

test('Run Console reuses existing access handlers with no page-navigation dependency', () => {
  const console = body('RunConsole');
  assert.match(page, /onBeginConnectivityDryRun=\{beginConnectivityDryRun\}/);
  assert.match(page, /onResolveGuidedConnectivity=\{resolveGuidedConnectivity\}/);
  assert.match(console, /onClick=\{onBeginConnectivityDryRun\}/);
  for (const value of ['true', 'false']) assert(console.includes(`onClick={() => onResolveGuidedConnectivity(${value})}`));
  assert.doesNotMatch(console, /Connectivity verification required|Verify the automation connection in Automations/);
  assert.match(console, /runAccessPrompt\(mode, runState, automation.adapter/);
  assert.match(console, /mode !== "Human" && connectivityEvidence\?\.outcome !== "verified"/);
  assert.match(console, /runIdStored \|\| automationRunBlocked \|\| runPersistenceStatus !== "ready"/);
  assert.match(console, /Could not open tool/);
  assert.match(console, /Checking tool access…/);
});

test('open and confirmation handlers do not prepare, time, navigate or sign a run', () => {
  const open = body('beginConnectivityDryRun'), confirm = body('resolveGuidedConnectivity');
  assert.match(open, /window.open\(automation.manifest.adapter.target_url, "_blank", "noopener,noreferrer"\)/);
  assert.match(open, /outcome: "pending_manual_confirmation"/);
  assert.match(confirm, /if \(!connectivityEvidence \|\| connectivityEvidence.outcome !== "pending_manual_confirmation"\) return/);
  assert.match(confirm, /verified \? "verified" : "failed"/);
  for (const handler of [open, confirm]) for (const forbidden of ['startRun(', 'toggleHumanWork(', 'recordAcceptance(', 'setActiveNav(', 'resetConsole(', 'appendEvent(']) assert(!handler.includes(forbidden), forbidden);
  assert.match(body('startRun'), /mode !== "Human" && connectivityEvidence\?\.outcome !== "verified"/);
});

test('Automations owns setup only; access actions exist only in Run Console', () => {
  const setup = body('Automations');
  assert.doesNotMatch(setup, /connectivityEvidence|onBeginConnectivityDryRun|onResolveGuidedConnectivity|connectivity-panel/);
  assert.doesNotMatch(setup, />Open tool[^<]*<|>Confirm tool opened<|>Record failure<|>Run unauthenticated HEAD check</);
  for (const label of ['Launch URL', 'Automation name', 'Current version A', 'Check setup', 'Save and continue to Benchmarks', 'Export tool setup']) assert(setup.includes(label), label);
  assert.match(setup, /Open and confirm the tool in Run Console/);
  const accessProps = [...page.matchAll(/onBeginConnectivityDryRun=\{beginConnectivityDryRun\}/g)];
  assert.equal(accessProps.length, 1);
  assert.equal([...page.matchAll(/onResolveGuidedConnectivity=\{resolveGuidedConnectivity\}/g)].length, 1);
  assert.match(body('RunConsole'), />Confirm tool opened</);
});
