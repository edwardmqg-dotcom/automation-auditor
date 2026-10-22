import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectTaskInputDraft, emptyTaskInputDraft } from './task-input-draft.ts';
import { prepareBenchmarkFiles, createLocalTaskPackage, taskImportFailure, canPrepareLocalTask } from './benchmark-import.ts';

test('local preparation shares a state gate between button and handler',async()=>{
  const base={manifest:null,status:'idle'};
  for(const status of ['idle','validating','ready','invalid'])assert.equal(canPrepareLocalTask({...base,status}),false,status);
  assert.equal(canPrepareLocalTask({...base,status:'needs_setup'}),true);
  for(const stage of ['reading','fingerprint','preparation']){
    const failure={stage,file_name:'input.txt',exception_name:'TestOnlyError'};
    assert.equal(canPrepareLocalTask({...base,status:'invalid',failure}),true,stage);
    assert.equal(canPrepareLocalTask({...base,status:'validating',failure}),false);
  }
  const ready=await createLocalTaskPackage([new File(['x'],'input.txt')],{name:'test',instructions:'Read input.'});
  assert.equal(canPrepareLocalTask(ready),false);assert.equal(canPrepareLocalTask({...ready,status:'needs_setup'}),false);
  const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert(page.includes('if (!canPrepareLocalTask(imported)) return;'));
  assert.match(page,/disabled=\{busy \|\| !draftReady \|\| !canPrepareLocalTask\(imported\)/);
});

test('duplicate filenames block preparation until a valid selection is provided',async()=>{
  const first=new File(['first'],'input.txt'),second=new File(['second'],'input.txt');
  const duplicate=await prepareBenchmarkFiles([first,second]);
  assert.equal(duplicate.status,'invalid');assert.match(duplicate.errors.join(' '),/Duplicate selected filename/);
  assert.equal(canPrepareLocalTask(duplicate),false);
  const corrected=await prepareBenchmarkFiles([first]);
  assert.equal(corrected.status,'needs_setup');assert.equal(canPrepareLocalTask(corrected),true);
});

test('task draft preserves exact text without files, changes, criteria generation or run identity',()=>{
  const draft={name:'  My task  ',work:'中文\nread input',deliverable:'saved file',completion:'I decide'};
  assert.deepEqual(inspectTaskInputDraft(draft),draft);
  assert.notEqual(inspectTaskInputDraft(draft),draft);
  assert.deepEqual(inspectTaskInputDraft(emptyTaskInputDraft()),emptyTaskInputDraft());
  for(const bad of [null,[],{}, {...draft,work:12},{...draft,api_key:'TEST ONLY'},{...draft,run_id:'not allowed'}]) assert.throws(()=>inspectTaskInputDraft(bad));
});
test('plain TXT uses normal import and preparation; retries retain original files',async()=>{
  const file=new File(['Diagnostic input'],'input.txt',{type:'text/plain'}),files=[file];
  assert.equal((await prepareBenchmarkFiles(files)).status,'needs_setup');
  const result=await createLocalTaskPackage(files,{name:'test',instructions:'Read input and save output.'});
  assert.equal(result.status,'ready');assert.equal(await file.text(),'Diagnostic input');assert.equal(files.length,1);
});
test('unreadable TXT is identified at actual byte-read phase, without leaking original error text',async()=>{
  class Broken extends File {async arrayBuffer(){throw new DOMException('private diagnostic detail','NotReadableError');}}
  const f=new Broken(['x'],'broken.txt');assert.equal((await prepareBenchmarkFiles([f])).status,'needs_setup');
  try {await createLocalTaskPackage([f],{name:'t',instructions:'read'});assert.fail('expected read failure');}
  catch(reason){const error=taskImportFailure(reason);assert.equal(error.failure.stage,'reading');assert.equal(error.failure.file_name,'broken.txt');assert.equal(error.failure.exception_name,'NotReadableError');assert.match(error.errors[0],/kept/);assert(!JSON.stringify(error).includes('private diagnostic detail'));}
});
test('unreadable package JSON has filename and reading phase, not a misleading parse or hash error',async()=>{
  class Broken extends File {async text(){throw new DOMException('not accessible','NotReadableError');}}
  try {await prepareBenchmarkFiles([new Broken(['{}'],'package.json')]);assert.fail('expected read failure');}
  catch(reason){assert.deepEqual(taskImportFailure(reason).failure,{stage:'reading',file_name:'package.json',exception_name:'NotReadableError'});}
});
test('fingerprint failures are distinct from reads and unexpected failures do not masquerade as unreadable files',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:async()=>{throw new DOMException('test','OperationError');}}}});
  try{await createLocalTaskPackage([new File(['x'],'input.txt')],{name:'t',instructions:'read'});assert.fail('expected hash failure');}
  catch(reason){const result=taskImportFailure(reason);assert.equal(result.failure.stage,'fingerprint');assert.equal(result.failure.file_name,'input.txt');assert.equal(result.failure.exception_name,'OperationError');}
  finally{Object.defineProperty(globalThis,'crypto',descriptor);}
  assert.equal(taskImportFailure(new Error('secret detail')).failure.stage,'preparation');
  assert(!JSON.stringify(taskImportFailure(new Error('secret detail'))).includes('secret detail'));
});
test('draft storage keeps database v2 and existing snapshots/records; ordered saves and explicit warnings are wired',()=>{
  const store=fs.readFileSync(new URL('./workspace-store.ts',import.meta.url),'utf8');
  const hook=fs.readFileSync(new URL('../hooks/use-task-input-draft.ts',import.meta.url),'utf8');
  assert.match(store,/indexedDB.open\(DATABASE_NAME, 2\)/);assert.match(store,/put\(checked, "task-input-v1"\)/);
  assert.match(store,/get\("task-input-v1"\)/);assert(!store.includes('delete("task-input-v1")'));
  assert.match(hook,/queue.current = queue.current.then/);assert.match(hook,/Copy it before reloading/);assert(!hook.includes('clearLocal'));
});
test('read-only example is isolated from persistence, timers, new signatures and paid analysis',()=>{
  const ui=fs.readFileSync(new URL('../components/readonly-example.tsx',import.meta.url),'utf8');
  for(const text of ['saved observations','not your results','0.349 seconds','View recorded certificate'])assert(ui.includes(text),text);
  for(const name of ['saveLocalWorkspace','saveEvidenceBundle','startRun','toggleHumanWork','createBenchmarkCertificate','fetch('])assert(!ui.includes(name),name);
  const certificate=JSON.parse(fs.readFileSync(new URL('./examples/summary-certificate.json',import.meta.url)));
  assert.equal(certificate.comparison.baseline_human_active_ms,256463);assert.equal(certificate.comparison.automation_human_active_ms,256114);
  assert.equal(certificate.certificate_id,'AA-579AE407D3C6CD84');assert.equal(certificate.automation_reviewer,'EddieM');
});
test('global pending setup name and status agree without claiming a connection',()=>{
  const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert(page.includes('preparedSetup?.name ?? automation?.name'));
  assert(page.includes('Tool setup saved — awaiting task connection'));
  assert(!page.includes('No automation selected'));
});
