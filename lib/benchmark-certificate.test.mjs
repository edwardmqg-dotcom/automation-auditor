import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { CERTIFICATE_CSS, certificatePresentation, certificateDuration, createBenchmarkCertificate, certificateHtml } from './benchmark-certificate.mjs';

// Synthetic test records only. Never installed into a real measurement workspace.
function bundle(mode='automation_version_a', ms=50000, reviewer='TEST ENGINEER') {
  const start=Date.UTC(2026,0,1),at=n=>new Date(start+n).toISOString(),id='TEST-ONLY-'+mode,criteria='sha256:'+'b'.repeat(64);
  const base={run_id:id,mode,task_id:'TEST-TASK',task_version:'v1',actor:'human',input_ref:'test-only://input',output_ref:'test-only://PRIVATE-RESULT-PATH',status:'completed',reason_code:'none'};
  const event=(event_id,event_type,begin,end,metadata={})=>({...base,event_id,event_type,started_at:at(begin),ended_at:at(end),duration_ms:end-begin,metadata});
  const events=[event('E1','run_started',0,0),event('E2','human_action',0,ms,{billable_human_active:true}),event('E3','run_completed',ms,ms),event('E4','review_submitted',ms+1000,ms+1000,{completion_basis:'user_confirmation',completion_criteria_ref:criteria,reviewer_ref:reviewer,timing_complete:true}),event('E5','acceptance_passed',ms+1000,ms+1000,{completion_basis:'user_confirmation',completion_criteria_ref:criteria,reviewer_ref:reviewer})];
  const manifest={manifest_version:'run-manifest-v0.3',completion_basis:'user_confirmation',run_id:id,mode,task_id:'TEST-TASK',task_version:'v1',automation_id:mode==='human_baseline'?'TEST-PLACEHOLDER':'TEST-TOOL',automation_manifest_id:'TEST-CONNECTION',automation_version_id:mode==='human_baseline'?'not-applicable-human-baseline':'test-release-1',benchmark_id:'TEST-PACKAGE',review_as_of:'2026-01-01',rubric_ref:criteria,completion_criteria_ref:criteria,original_output_ref:base.output_ref,operator_ref:reviewer,auditor_build_id:'TEST-BUILD',connectivity_evidence_id:'TEST-ACCESS',event_schema:'event-schema.v0.4.json',completion_record_status:'local-record-not-release-approval',started_at:at(0),completed_at:at(ms+1000),artifacts:{raw_event_log:'TEST-ONLY.json',review_output:base.output_ref,manual_review:reviewer,failure_record:''},input_refs:['sha256:'+'a'.repeat(64)]};
  return {bundle_version:'evidence-bundle-v0.1',manifest,events,metrics:{human_active_ms:1},connectivity_evidence:{target_url:'https://PRIVATE-TARGET.example.test/'}};
}
const context={tool:{id:'TEST-TOOL',name:'TEST ONLY tool'},task:{id:'TEST-TASK',version:'v1',name:'TEST ONLY summary task'}};

test('certificate presentation follows all exact 50, 20 and zero boundaries before display rounding',()=>{
  for(const [value,tier] of [[100,'gold'],[50,'gold'],[49.999,'green'],[20,'green'],[19.999,'blue'],[0.136,'blue'],[0,'blue'],[-0.0001,'red'],[-20,'red']]) {
    const actual=certificatePresentation(value);assert.equal(actual.tier,tier);assert.equal(actual.celebrate,tier==='gold');
  }
  assert.equal(certificatePresentation(49.999).number,'49.9');assert.equal(certificatePresentation(19.999).number,'19.9');
  assert.equal(certificatePresentation(0.01).number,'<0.1');assert.equal(certificatePresentation(-0.01).headline,'Less human work time');
  assert.equal(certificatePresentation(0).headline,'Same recorded human work time');assert.equal(certificatePresentation(null).number,'N/A');
  for(const x of [NaN,Infinity,-Infinity,101])assert.throws(()=>certificatePresentation(x),/Invalid/);
});

test('negative results carry a visible minus sign with the same less headline and a distinct red palette',async()=>{
  for(const value of [-16.221155410385024,-0.01,-0.0001,-1e-9,-125]) {
    const view=certificatePresentation(value);assert.ok(view.number.startsWith('−'));assert.notEqual(view.number,'−0');
    assert.equal(view.headline,'Less human work time');assert.equal(view.tier,'red');assert.equal(view.celebrate,false);
  }
  assert.equal(certificatePresentation(-16.29).number,'−16.2');
  assert.equal(certificatePresentation(-0.01).number,'−0.01');
  const Paper=await paperComponent(),cert=await createBenchmarkCertificate(bundle('human_baseline',100000),bundle('automation_version_a',125000));
  const paper=renderToStaticMarkup(createElement(Paper,{certificate:cert})),html=certificateHtml(cert,paper);
  assert.match(html,/data-tier="red"/);assert.match(paper,/−25\.0/);assert.match(paper,/Less human work time/);
  assert.match(paper,/Baseline minus automation: −0m 25\.000s/);assert.doesNotMatch(paper,/More human|more active|certificate-confetti/);
  assert.match(CERTIFICATE_CSS,/data-tier="red"\]\{--certificate-accent:#a5364b;--certificate-tint:#faedf0/);
  assert.doesNotMatch(CERTIFICATE_CSS,/data-tier="amber"/);
});

test('certificate derives time and reviewers from sealed evidence, not cached metrics, without mutation',async()=>{
  const human=bundle('human_baseline',100000,'TEST HUMAN'),tool=bundle(),before=JSON.stringify([human,tool]);
  const cert=await createBenchmarkCertificate(human,tool,context);
  assert.equal(cert.comparison.relative_improvement_pct,50);assert.equal(cert.comparison.baseline_human_active_ms,100000);
  assert.equal(cert.baseline_reviewer,'TEST HUMAN');assert.equal(cert.automation_reviewer,'TEST ENGINEER');
  assert.equal(cert.tool_version,'test-release-1');assert.equal(cert.task_name,context.task.name);assert.match(cert.certificate_id,/^AA-[A-F0-9]{16}$/);
  assert.equal(JSON.stringify([human,tool]),before);
  const again=await createBenchmarkCertificate(human,tool,context);assert.deepEqual(again,cert);
  const shuffled=JSON.parse(JSON.stringify(tool));shuffled.manifest=Object.fromEntries(Object.entries(shuffled.manifest).reverse());
  assert.deepEqual(await createBenchmarkCertificate(human,shuffled,context),cert);
});

test('signed percentage accepts higher costs, equal work and zero denominator without a savings claim',async()=>{
  const human=bundle('human_baseline',100000);
  assert.equal((await createBenchmarkCertificate(human,bundle('automation_version_a',125000))).comparison.relative_improvement_pct,-25);
  assert.equal((await createBenchmarkCertificate(human,bundle('automation_version_b',100000))).lane,'Version B');
  assert.equal(certificateDuration(256114),'4m 16.114s');assert.equal(certificateDuration(1448838),'24m 08.838s');
  for(const value of [-1,Infinity])assert.throws(()=>certificateDuration(value));
});

test('in-memory completed record without an export envelope has the same certificate, not a changed history',async()=>{
  const human=bundle('human_baseline',100000),a=bundle(),expected=await createBenchmarkCertificate(human,a);
  delete human.bundle_version;delete a.bundle_version;
  const before=JSON.stringify([human,a]);assert.deepEqual(await createBenchmarkCertificate(human,a),expected);
  assert.equal(JSON.stringify([human,a]),before);
  await assert.rejects(createBenchmarkCertificate(human,{...a,bundle_version:'unsupported'}),/requires an exported/);
});

test('incomplete, unconfirmed, mismatched and forged records cannot generate a certificate',async()=>{
  const human=bundle('human_baseline',100000);
  for(const modify of [r=>{r.events[3].metadata.timing_complete=false;},r=>{r.events[4].event_type='acceptance_failed';r.events[4].metadata.decision_note='TEST ONLY unfinished';},r=>{r.manifest.input_refs=['sha256:'+'c'.repeat(64)];},r=>{r.manifest.operator_ref='FORGED';},r=>{r.manifest.completed_at='FORGED';},r=>{r.events=r.events.slice(0,3);},r=>{r.manifest.manifest_version='run-manifest-v0.2';}]) {
    const current=bundle();modify(current);await assert.rejects(createBenchmarkCertificate(human,current));
  }
  await assert.rejects(createBenchmarkCertificate(human,bundle(),{tool:{id:'OTHER',name:'Wrong'}}),/does not match/);
  await assert.rejects(createBenchmarkCertificate(human,bundle(),{task:{id:'OTHER',version:'v1',name:'Wrong'}}),/does not match/);
  assert.equal((await createBenchmarkCertificate(human,bundle())).tool_name,'TEST-TOOL');
});

test('fingerprints change when record identity or display metadata changes, not when cached time changes',async()=>{
  const human=bundle('human_baseline',100000),a=bundle(),original=await createBenchmarkCertificate(human,a,context);
  a.metrics.human_active_ms=999999;assert.deepEqual(await createBenchmarkCertificate(human,a,context),original);
  const renamed=await createBenchmarkCertificate(human,a,{...context,tool:{...context.tool,name:'TEST renamed'}});
  assert.notEqual(renamed.certificate_id,original.certificate_id);assert.equal(renamed.evidence_sha256,original.evidence_sha256);
  a.manifest.auditor_build_id='OTHER-TEST-BUILD';assert.notEqual((await createBenchmarkCertificate(human,a)).evidence_sha256,original.evidence_sha256);
});

async function paperComponent() {
  const source=fs.readFileSync(new URL('../components/benchmark-certificate.tsx',import.meta.url),'utf8');
  let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const name of ['react','react/jsx-runtime','react-dom','react-dom/server','lucide-react'])js=js.replaceAll(`from '${name}'`,`from '${import.meta.resolve(name)}'`).replaceAll(`from "${name}"`,`from "${import.meta.resolve(name)}"`);
  js=js.replaceAll('@/lib/benchmark-certificate.mjs',new URL('./benchmark-certificate.mjs',import.meta.url).href);
  return (await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).CertificatePaper;
}

test('downloaded HTML uses the actual certificate component, escapes fields and exposes no task result paths',async()=>{
  const Paper=await paperComponent(),bad='<img src=x onerror="alert(1)"><script>bad()</script>';
  const cert=await createBenchmarkCertificate(bundle('human_baseline',100000,bad),bundle('automation_version_a',50000,bad),{...context,tool:{...context.tool,name:bad}});
  const paper=renderToStaticMarkup(createElement(Paper,{certificate:cert})),html=certificateHtml(cert,paper);
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<img src=x|PRIVATE-RESULT-PATH|PRIVATE-TARGET/);
  assert.match(html,/Content-Security-Policy/);assert.match(html,/default-src 'none'/);assert.match(html,/AA-[A-F0-9]{16}/);
  assert.match(html,/Not independent certification/);assert.match(html,/Same task, inputs and criteria/);
  assert.ok(!paper.includes('certificate-confetti'));assert.match(CERTIFICATE_CSS,/prefers-reduced-motion/);
  assert.match(CERTIFICATE_CSS,/@page aa-certificate/);assert.match(CERTIFICATE_CSS,/@media print/);
});

test('confetti is restricted to gold and absent in other tiers including tiny positive and negative values',async()=>{
  const Paper=await paperComponent(),human=bundle('human_baseline',100000);
  for(const [ms,gold] of [[50000,true],[50001,false],[80000,false],[100000,false],[100001,false]]) {
    const cert=await createBenchmarkCertificate(human,bundle('automation_version_a',ms));
    const markup=renderToStaticMarkup(createElement(Paper,{certificate:cert,celebration:true}));
    assert.equal(markup.includes('certificate-confetti'),gold);
  }
});
