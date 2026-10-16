import test from 'node:test';
import assert from 'node:assert/strict';
import {saveResultReference} from './result-reference.mjs';
import {inspectRunDraft,RUN_DRAFT_KEY} from './run-draft.mjs';
import {calculateRunMetrics} from './metric-calculator.mjs';
import {inspectCompletionBundle} from './completion-bundle-import.mjs';

// Synthetic fixtures only, never loaded into the owner's measurement workspace.
function fixture() {
  const time=n=>new Date(Date.UTC(2026,0,1)+n*1000).toISOString();
  const base={run_id:'TEST-ONLY-REF',mode:'human_baseline',task_id:'TEST-TASK',task_version:'v1',actor:'system',input_ref:'test-only://input',output_ref:'',status:'completed',reason_code:'none'};
  const event=(id,type,start,end,extra={})=>({...base,event_id:id,event_type:type,started_at:time(start),ended_at:time(end),duration_ms:(end-start)*1000,metadata:{},...extra});
  const events=[event('EV-001','run_started',0,0),event('EV-002','human_action',1,9,{actor:'human',metadata:{billable_human_active:true}}),event('EV-003','run_completed',10,10,{actor:'human',output_ref:'test-only://original'})];
  return {schema_version:'active-run-v0.1',saved_at:time(11),run_id:base.run_id,run_sequence:1,run_state:'submitted',mode:'Human',automation_manifest_id:'test-connection',benchmark_id:'test-package',task_id:base.task_id,task_version:base.task_version,input_ref:base.input_ref,active_seconds:8,human_active:false,human_started_at:null,events,review_output_ref:'test-only://original',completion_form:{criteria_ref:'test-only://criteria',final_output_ref:'',reviewer_ref:'TEST-USER',decision_note:'',decision:'pass',confirmed:true,timing_complete:true}};
}
function storage(){const writes=[];return{writes,setItem:(key,value)=>writes.push({key,value})};}

test('each committed change appends a zero-time reference update and persists before returning',()=>{
  const initial=fixture(), before=JSON.stringify(initial), store=storage();
  let draft=initial;
  for(const [index,next] of ['test-only://v2','test-only://v3','test-only://original'].entries()) {
    const previous=draft.completion_form.final_output_ref||draft.review_output_ref;
    const saved=saveResultReference(store,draft,next,new Date(Date.UTC(2026,0,1,0,0,12+index)).toISOString());
    assert.equal(saved.changed,true);draft=saved.draft;
    assert.equal(draft.events.at(-1).metadata.previous_output_ref,previous);
    assert.equal(draft.events.at(-1).output_ref,next);assert.equal(draft.events.at(-1).duration_ms,0);
    assert.equal(draft.events.at(-1).metadata.billable_human_active,false);
    assert.equal(draft.review_output_ref,'test-only://original');
    assert.deepEqual(draft.events.slice(0,3),initial.events);
    assert.equal(draft.completion_form.confirmed,false);assert.equal(draft.completion_form.timing_complete,false);
    assert.ok(inspectRunDraft(draft).draft);
  }
  assert.equal(draft.events.length,6);assert.equal(store.writes.length,3);
  assert.equal(store.writes[0].key,RUN_DRAFT_KEY);
  assert.equal(JSON.stringify(initial),before);
});

test('unchanged and whitespace-normalized references do not create history or clear attestations',()=>{
  const draft=fixture(),store=storage();
  const result=saveResultReference(store,draft,' test-only://original ','2026-01-01T00:00:12Z');
  assert.equal(result.changed,false);assert.equal(result.draft,draft);assert.equal(store.writes.length,0);
  assert.equal(draft.completion_form.confirmed,true);assert.equal(draft.completion_form.timing_complete,true);
});

test('empty, sealed, mismatched and invalid-time updates fail without touching the draft',()=>{
  const initial=fixture(),before=JSON.stringify(initial),store=storage();
  for(const value of ['', '  '])assert.throws(()=>saveResultReference(store,initial,value,'2026-01-01T00:00:12Z'),/Enter a saved result/);
  assert.throws(()=>saveResultReference(store,{...initial,run_state:'reviewed'},'test-only://v2','2026-01-01T00:00:12Z'),/unsealed/);
  assert.throws(()=>saveResultReference(store,{...initial,events:[...initial.events,{...initial.events[2],event_id:'EV-004',event_type:'acceptance_passed'}]},'test-only://v2','2026-01-01T00:00:12Z'),/sealed/);
  assert.throws(()=>saveResultReference(store,{...initial,review_output_ref:'test-only://wrong'},'test-only://v2','2026-01-01T00:00:12Z'),/does not match/);
  for(const at of ['invalid','2026-01-01T00:00:05Z'])assert.throws(()=>saveResultReference(store,initial,'test-only://v2',at),/timestamp/);
  assert.equal(store.writes.length,0);assert.equal(JSON.stringify(initial),before);
});

test('storage failure leaves original references and events unchanged',()=>{
  const draft=fixture(),before=JSON.stringify(draft);
  assert.throws(()=>saveResultReference({setItem(){throw new Error('TEST ONLY quota');}},draft,'test-only://v2','2026-01-01T00:00:12Z'),/quota/);
  assert.equal(JSON.stringify(draft),before);
});

test('reference history reserves room for the sealed decision under the import limit',()=>{
  const draft=fixture();
  while(draft.events.length<248)draft.events.push({...draft.events[0],event_id:'TEST-'+draft.events.length,event_type:'system_action'});
  assert.throws(()=>saveResultReference(storage(),draft,'test-only://v2','2026-01-01T00:00:12Z'),/history limit/);
});

test('active timer start is preserved; bookkeeping adds no human time and round-trip import retains history',()=>{
  const initial=fixture();
  const active={...initial,human_active:true,human_started_at:'2026-01-01T00:00:11Z'};
  const saved=saveResultReference(storage(),active,'test-only://v2','2026-01-01T00:00:12Z').draft;
  assert.equal(saved.human_active,true);assert.equal(saved.human_started_at,active.human_started_at);assert.equal(saved.active_seconds,8);
  const base=initial.events[2],ref='test-only://v2',at='2026-01-01T00:00:14Z';
  const metadata={completion_basis:'user_confirmation',completion_criteria_ref:'test-only://criteria',reviewer_ref:'TEST-USER',timing_complete:true};
  const events=[...saved.events,{...base,event_id:'EV-005',event_type:'review_submitted',output_ref:ref,started_at:at,ended_at:at,metadata},{...base,event_id:'EV-006',event_type:'acceptance_passed',output_ref:ref,started_at:at,ended_at:at,metadata}];
  const metrics=calculateRunMetrics(events);assert.equal(metrics.human_active_ms,8000);
  const manifest={manifest_version:'run-manifest-v0.3',completion_basis:'user_confirmation',run_id:base.run_id,mode:base.mode,task_id:base.task_id,task_version:base.task_version,automation_id:'TEST-TOOL',automation_manifest_id:'TEST-MANIFEST',automation_version_id:'not-applicable-human-baseline',benchmark_id:'TEST-PACKAGE',review_as_of:'2026-01-01',rubric_ref:metadata.completion_criteria_ref,completion_criteria_ref:metadata.completion_criteria_ref,original_output_ref:initial.review_output_ref,operator_ref:'TEST-USER',auditor_build_id:'TEST-BUILD',connectivity_evidence_id:'not-required-human-baseline',input_refs:['sha256:'+'a'.repeat(64)],event_schema:'event-schema.v0.4.json',completion_record_status:'local-record-not-release-approval',started_at:events[0].started_at,completed_at:at,artifacts:{raw_event_log:'test-only.json',review_output:ref,manual_review:'TEST-USER',failure_record:''}};
  const restored=inspectCompletionBundle(JSON.parse(JSON.stringify({bundle_version:'evidence-bundle-v0.1',manifest,events,metrics})));
  assert.deepEqual(restored.events,events);assert.equal(restored.metrics.human_active_ms,8000);assert.equal(restored.manifest.original_output_ref,initial.review_output_ref);
});
