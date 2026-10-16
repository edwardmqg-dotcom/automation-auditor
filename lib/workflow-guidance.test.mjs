import test from 'node:test';
import assert from 'node:assert/strict';
import { workflowNextStep, workflowPageNextStep, inspectWorkflowComparisons, isRunInComparisonToolScope } from './workflow-guidance.ts';
const state={loading:false,storageError:false,activeRun:false,prepared:false,connected:false,attached:false,comparable:false,hasHuman:false,accessChecked:false};
// Synthetic unit fixtures only. These are never imported as user measurements.
function run(mode, timing=true) {
  const id='TEST-ONLY-'+mode, at=n=>new Date(Date.UTC(2026,0,1)+n*1000).toISOString();
  const base={run_id:id,mode,task_id:'TEST-TASK',task_version:'v1',input_ref:'test-only://input',actor:'human',output_ref:'test-only://output',status:'completed',reason_code:'none'};
  const event=(event_id,event_type,start,end,metadata={})=>({...base,event_id,event_type,started_at:at(start),ended_at:at(end),duration_ms:(end-start)*1000,metadata});
  const criteria='test-only://criteria';
  const events=[event('E1','run_started',0,0),event('E2','human_action',1,10,{billable_human_active:true}),event('E3','run_completed',10,10),event('E4','review_submitted',12,12,{completion_basis:'user_confirmation',completion_criteria_ref:criteria,reviewer_ref:'TEST-USER',timing_complete:timing}),event('E5','acceptance_passed',12,12,{completion_basis:'user_confirmation',completion_criteria_ref:criteria,reviewer_ref:'TEST-USER'})];
  return {manifest:{manifest_version:'run-manifest-v0.3',completion_basis:'user_confirmation',completion_criteria_ref:criteria,run_id:id,mode,task_id:'TEST-TASK',task_version:'v1',automation_id:'TEST-TOOL',automation_manifest_id:'TEST-TOOL--test-v1',benchmark_id:'TEST-PACKAGE',input_refs:['sha256:'+'a'.repeat(64)],automation_version_id:'test-v1',review_as_of:'2026-01-01',completed_at:at(12)},events,metrics:{human_active_ms:9999999,passed:true,timing_complete:true}};
}
test('empty, prepared and connected workspaces have distinct next steps',()=>{
  assert.equal(workflowNextStep(state).page,'automations');
  assert.equal(workflowNextStep({...state,prepared:true}).page,'benchmarks');
  assert.equal(workflowNextStep({...state,connected:true}).page,'benchmarks');
  assert.match(workflowNextStep({...state,connected:true,attached:true}).title,/manual baseline/);
});
test('unfinished work takes priority over comparison and setup; no automatic start',()=>{
  const result=workflowNextStep({...state,activeRun:true,comparable:true,prepared:true});
  assert.equal(result.page,'run');assert.match(result.detail,/does not pause/);
});
test('loading and local storage failure do not claim completion',()=>{
  assert.equal(workflowNextStep({...state,loading:true}).disabled,true);
  assert.equal(workflowNextStep({...state,storageError:true,comparable:true}).page,'report');
});
test('changed setup sends users back to save, rather than leaving a disabled task connection unexplained',()=>{
  const result=workflowNextStep({...state,prepared:true,setupDirty:true,comparable:true});
  assert.equal(result.page,'automations');assert.match(result.title,/updated/);
});
test('manual baseline then access check then automation is guided explicitly',()=>{
  assert.equal(workflowNextStep({...state,connected:true,attached:true,hasHuman:true}).page,'automations');
  assert.equal(workflowNextStep({...state,connected:true,attached:true,hasHuman:true,accessChecked:true}).page,'run');
});
test('Human plus one automation version is enough; B is optional and cached time ignored',()=>{
  const result=inspectWorkflowComparisons([run('human_baseline'),run('automation_version_a')]);
  assert.equal(result.comparisons.length,1);assert.deepEqual(result.messages,[]);
  assert.equal(result.comparisons[0].baseline_human_active_ms,9000);
  assert.equal(workflowNextStep({...state,comparable:true}).page,'compare');
});
test('A/B alone and an incomplete baseline never establish savings against human work',()=>{
  assert.equal(inspectWorkflowComparisons([run('automation_version_a'),run('automation_version_b')]).comparisons.length,0);
  const result=inspectWorkflowComparisons([run('human_baseline',false),run('automation_version_a')]);
  assert.equal(result.comparisons.length,0);assert.match(result.messages[0],/timing/);
});
test('current tool and task selection exclude unrelated saved comparisons',()=>{
  const runs=[run('human_baseline'),run('automation_version_a')];
  assert.equal(inspectWorkflowComparisons(runs,'OTHER-TOOL').latest.size,1);
  assert.equal(inspectWorkflowComparisons(runs,'OTHER-TOOL').comparisons.length,0);
  assert.equal(inspectWorkflowComparisons(runs,'TEST-TOOL',{benchmark_id:'OTHER',task_id:'TEST-TASK',task_version:'v1'}).latest.size,0);
  assert.equal(inspectWorkflowComparisons(runs,'TEST-TOOL',{benchmark_id:'TEST-PACKAGE',task_id:'TEST-TASK',task_version:'v1'}).comparisons.length,1);
});

test('shared page filtering retains Human for another tool but isolates automation records',()=>{
  assert.equal(isRunInComparisonToolScope(run('human_baseline'),'CHATGPT'),true);
  assert.equal(isRunInComparisonToolScope(run('automation_version_a'),'CHATGPT'),false);
  const current=run('automation_version_a');current.manifest.automation_id='CHATGPT';
  assert.equal(isRunInComparisonToolScope(current,'CHATGPT'),true);
  const result=inspectWorkflowComparisons([run('human_baseline'),current,run('automation_version_b')],'CHATGPT');
  assert.equal(result.comparisons.length,1);assert.equal(result.latest.has('automation_version_b'),false);
});

test('unselected reports never mix A and B from different automation identities',()=>{
  const other=run('automation_version_b');other.manifest.automation_id='OTHER-TOOL';other.manifest.completed_at='2026-01-02T00:00:00Z';
  const result=inspectWorkflowComparisons([run('human_baseline'),run('automation_version_a'),other]);
  assert.equal(result.latest.has('automation_version_a'),false);assert.equal(result.comparisons.length,1);assert.equal(result.comparisons[0].automation_run_id,other.manifest.run_id);
});

test('attached task filters manual reuse by inputs, review date and locked completion criteria',()=>{
  const human=run('human_baseline'),current=run('automation_version_a');
  const criteria='sha256:'+'a'.repeat(64);
  for(const record of [human,current]){record.manifest.completion_criteria_ref=criteria;for(const event of record.events)if(event.metadata.completion_criteria_ref)event.metadata.completion_criteria_ref=criteria;}
  const task={benchmark_id:'TEST-PACKAGE',task_id:'TEST-TASK',task_version:'v1',review_as_of:'2026-01-01',input_files:[{path:'instructions.txt',sha256:'a'.repeat(64)}],completion_criteria:{instructions_file:'instructions.txt'}};
  assert.equal(inspectWorkflowComparisons([human,current],'TEST-TOOL',task).comparisons.length,1);
  for(const changes of [{review_as_of:'2026-01-02'},{input_files:[{path:'instructions.txt',sha256:'b'.repeat(64)}]},{completion_criteria:{instructions_file:'missing.txt'}}])assert.equal(inspectWorkflowComparisons([human,current],'TEST-TOOL',{...task,...changes}).latest.size,0);
});

test('latest incompatible evidence blocks readiness rather than selecting an older convenient result',()=>{
  const current=run('automation_version_a');current.manifest.completed_at='2026-01-02T00:00:00Z';current.manifest.input_refs=['sha256:'+'b'.repeat(64)];
  const result=inspectWorkflowComparisons([run('human_baseline'),run('automation_version_a'),current]);
  assert.equal(result.comparisons.length,0);assert.match(result.messages[0],/fingerprints/);
});
test('legacy quality records are not converted into completion evidence',()=>{
  const old=run('human_baseline');old.manifest.manifest_version='run-manifest-v0.2';
  assert.equal(inspectWorkflowComparisons([old,run('automation_version_a')]).latest.has('human_baseline'),false);
});

test('a single archived incomplete Human run is not a baseline ready for automation',()=>{
  const result=inspectWorkflowComparisons([run('human_baseline',false)]);
  assert.deepEqual(result.incompleteLanes,['human_baseline']);
  assert.match(result.messages[0],/Repeat this measurement/);
  assert.equal(result.comparisons.length,0);
  const current={...state,connected:true,attached:true,hasHuman:false,needsRepeat:true};
  assert.match(workflowNextStep(current).title,/Repeat/);
  assert.match(workflowPageNextStep('run',current).detail,/Repeat the full task/);
  assert.equal(workflowPageNextStep('run',current).disabled,true);
});

test('incomplete optional B does not erase a valid Human and A comparison',()=>{
  const result=inspectWorkflowComparisons([run('human_baseline'),run('automation_version_a'),run('automation_version_b',false)]);
  assert.equal(result.comparisons.length,1);
  assert.deepEqual(result.incompleteLanes,['automation_version_b']);
  assert.equal(workflowNextStep({...state,connected:true,attached:true,comparable:true,needsRepeat:true}).page,'compare');
});

test('empty workspace footers describe distinct page handoffs rather than repeating setup',()=>{
  const pages=['automations','benchmarks','run','compare','report'];
  const footers=pages.map(page=>workflowPageNextStep(page,state));
  assert.deepEqual(footers.map(next=>next.page),['benchmarks','run','compare','report','compare']);
  assert.equal(new Set(footers.map(next=>next.title)).size,5);
  assert.deepEqual(footers.map(next=>Boolean(next.disabled)),[true,true,true,false,false]);
  for(const next of [...footers,workflowNextStep(state)])assert.doesNotMatch(next.detail,/guess|task type/i);
});
test('saved setup hands off to Benchmarks, including connected tools without a package',()=>{
  for(const ready of [{prepared:true},{connected:true}]){
    const next=workflowPageNextStep('automations',{...state,...ready});
    assert.equal(next.page,'benchmarks');assert.equal(next.disabled,false);
  }
  assert.equal(workflowPageNextStep('automations',{...state,prepared:true,setupDirty:true}).disabled,true);
});
test('Benchmarks enables Run Console only after explicit connection and attachment',()=>{
  for(const missing of [{prepared:true},{connected:true},{attached:true},{connected:true,attached:true,setupDirty:true}])assert.equal(workflowPageNextStep('benchmarks',{...state,...missing}).disabled,true);
  const next=workflowPageNextStep('benchmarks',{...state,connected:true,attached:true});
  assert.equal(next.page,'run');assert.equal(next.disabled,false);
});
test('Run Console enables Compare only when deterministic comparison is available',()=>{
  assert.equal(workflowPageNextStep('run',{...state,connected:true,attached:true,hasHuman:true}).disabled,true);
  const next=workflowPageNextStep('run',{...state,comparable:true});
  assert.equal(next.page,'compare');assert.equal(next.disabled,false);
});
test('Compare footer always offers the optional report without claiming comparison complete',()=>{
  for(const current of [state,{...state,connected:true,attached:true},{...state,comparable:true},{...state,setupDirty:true}]){
    const next=workflowPageNextStep('compare',current);
    assert.equal(next.page,'report');assert.equal(next.optional,true);
    assert.equal(next.buttonLabel,'Open Audit Report');assert.ok(!next.disabled);
    assert.doesNotMatch(next.detail,/comparison is complete|set up|missing|Run Console/i);
  }
  assert.equal(workflowPageNextStep('report',state).page,'compare');
});
test('active run, restoration and storage recovery take priority on every page',()=>{
  for(const page of ['automations','benchmarks','run','compare','report']){
    assert.equal(workflowPageNextStep(page,{...state,activeRun:true,comparable:true,setupDirty:true}).page,'run');
    assert.equal(workflowPageNextStep(page,{...state,loading:true,comparable:true}).disabled,true);
    assert.equal(workflowPageNextStep(page,{...state,storageError:true,comparable:true}).page,'report');
  }
});
