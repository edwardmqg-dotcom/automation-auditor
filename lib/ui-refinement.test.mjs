import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Source/layout regression guards, not browser checks or evaluation evidence.
test('submitted output uses a single automatic reference editor, with pending changes blocking sealing',()=>{
  const run=component('RunConsole');
  assert.match(run,/<ResultReferenceField key=\{runId\} value=\{finalOutputRef \|\| reviewOutputRef\}/);
  assert.ok(!run.includes('Final output reference (optional, if corrected)')&&!run.includes('Locked review output'));
  assert.match(run,/!resultReferenceDirty && canSaveCompleteMeasurement/);
  assert.match(run,/!resultReferenceDirty && !humanActive/);
  assert.match(component('recordAcceptance'),/if \(resultReferenceDirty\)/);
  const editor=fs.readFileSync(new URL('../components/result-reference-field.tsx',import.meta.url),'utf8');
  assert.match(editor,/onBlur=\{commit\}/);assert.ok(!editor.includes('<button'));
  assert.match(editor,/disabled \|\| !dirty/);
});
test('incomplete records have a separate archive and repeat path, never a normal completion',()=>{
  const run=component('RunConsole'), results=component('TimeComparisonReport');
  assert.match(run,/disabled=\{!canFinishMeasurement\}/);
  assert.match(run,/if \(canFinishMeasurement\) onRecordAcceptance\(\)/);
  assert.match(run,/disabled=\{!canArchiveIncomplete\}/);
  assert.match(run,/Save incomplete record/);
  assert.match(run,/Measurement incomplete — repeat required/);
  assert.match(run,/onClick=\{\(\) => onModeChange\(mode\)\}>Prepare new measurement/);
  assert.match(run,/Only confirm full timing if it is true/);
  assert.match(results,/"Comparison not ready"/);
  assert.match(results,/disabled=\{comparisons.length === 0\}/);
  assert.match(results,/if \(comparisons.length === 0\) return/);
  assert.ok(!run.includes('onTimingCompleteChange(true)'));
});
const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function component(name){let result='';function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);return result;}
function rule(selector){return css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\{([^}]+)\\}'))?.[1]??'';}

test('page footer uses page-specific guidance and retains navigation and disabled gates',()=>{
  const footer=component('NextStepPanel');
  assert.match(footer,/workflowPageNextStep\(current, state\)/);
  assert.match(footer,/disabled=\{next.disabled \|\| next.page === current\}/);
  assert.match(footer,/onNavigate\(next.page\)/);
  assert.match(footer,/next.buttonLabel \?\?/);
  assert.match(page,/<NextStepPanel current=\{activeNav\} state=\{workflowState\}/);
  assert.match(page,/activeNav !== "home" && activeNav !== "automations" && <NextStepPanel/);
  assert.ok(!footer.includes('startRun')&&!footer.includes('toggleHumanWork'));
});

test('missing comparison recovery stays in results and only navigates to Run Console',()=>{
  const compare=component('Compare'),results=component('TimeComparisonReport');
  assert.match(compare,/onResolveMissing=\{\(\) => onNavigate\("run"\)\}/);
  assert.match(results,/comparisons.length === 0 && onResolveMissing/);
  assert.match(results,/onClick=\{onResolveMissing\}>Return to Run Console/);
  for(const removed of ['startRun','toggleHumanWork','recordAcceptance'])assert.ok(!compare.includes(removed)&&!results.includes(removed));
  assert.ok(!component('Report').includes('onResolveMissing'));
});

test('Home retains purpose, four steps and one start entry without explanatory cards',()=>{
  const home=component('WorkflowHome');
  assert.match(home,/Does your automation tool/);
  assert.match(home,/with and without automation/);
  assert.match(home,/workflowSteps\.map/);
  assert.equal((home.match(/Start evaluation/g)??[]).length,1);
  assert.match(home,/onNavigate\(guidance\.page\)/);
  assert.match(home,/disabled=\{guidance\.disabled\}/);
  for(const removed of ['workflow-resume','workflow-baseline-note','workflow-optional','Your next step','Start with a manual baseline'])assert.ok(!home.includes(removed));
  assert.ok(!home.includes('startRun')&&!home.includes('setHumanActive')&&!home.includes('clearLocal'));
});

test('Task family is not a form control; automatic reading and matching are retained',()=>{
  const form=component('Automations');
  assert.ok(!form.includes('aria-label="Task family"')&&!form.includes('task-family-help'));
  assert.match(page,/setDraftTaskKind\(/);
  assert.match(page,/task_kind/);
  assert.match(component('attachValidatedBenchmark'),/task_kind/);
});

test('URL is first and four unchanged selects are grouped and visible',()=>{
  const form=component('Automations');
  assert.ok(form.indexOf('aria-label={targetLabel}')<form.indexOf('aria-label="Automation name"'));
  const group=form.slice(form.indexOf('className="form-wide connection-settings"'),form.indexOf('</fieldset>'));
  assert.ok(!group.includes('<details'));
  assert.match(group,/<h3>Advanced Settings<\/h3>/);
  assert.ok(group.indexOf('id="connection-settings-help"')<group.indexOf('className="connection-settings-grid"'));
  for(const label of ['Adapter','Input transport','Output transport','Event source'])assert.ok(group.includes(`aria-label="${label}"`));
  assert.equal((group.match(/aria-describedby="connection-settings-help"/g)??[]).length,4);
  assert.match(group,/keep the default settings/);assert.match(group,/Developers can configure/);
  assert.equal((group.match(/<NativeSelectOption value=/g)??[]).length,12);
  assert.ok(!form.includes('Use manual file workflow')&&!form.includes('manual-workflow-choice'));
  assert.match(rule('.connection-settings-grid'),/minmax\(0, 1fr\)/);
});

test('check and save controls are above detailed checks and highlight the current eligible action',()=>{
  const form=component('Automations');
  const check=form.indexOf('onClick={onValidate}'),save=form.indexOf('onClick={onConnect}'),results=form.indexOf('className="contract-checks"');
  assert.ok(check<results&&save<results);
  assert.match(form,/className=\{validationCurrent && contractValidated \? "secondary-action" : "primary-action"\} disabled=\{locked\} onClick=\{onValidate\}/);
  assert.match(form,/className=\{validationCurrent && contractValidated \? "primary-action" : "secondary-action"\} disabled=\{!validationCurrent \|\| !contractValidated \|\| locked\}/);
  assert.equal((form.match(/>Check setup<\/button>/g)??[]).length,1);
  assert.equal((form.match(/Save and continue to Benchmarks/g)??[]).length,1);
});

test('Benchmarks offers raw materials with user-defined completion instructions; JSON is optional',()=>{
  const form=component('Benchmarks');
  assert.match(form,/Include a task package JSON if you have one; otherwise, describe your task below/);
  assert.match(form,/aria-label="Choose task files"/);
  assert.match(form,/imported.status === "needs_setup"/);
  assert.match(form,/aria-label="Task name"/);
  for(const question of ['What should be done?','What should be delivered?','When is the task complete?']) assert.ok(form.includes(`aria-label="${question}"`));
  assert.match(form,/onPrepare\(taskName, taskInstructions\)/);
  assert.match(form,/!taskName.trim\(\) \|\| taskInstructions === null/);
  assert.match(form,/composeTaskInstructions\(\{ work: taskWork, deliverable: taskDeliverable, completion: taskCompletion \}\)/);
  assert.match(component('importBenchmark'),/createLocalTaskPackage\(files, localSetup\) : await prepareBenchmarkFiles\(files\)/);
  assert.match(page,/validateBenchmarkFiles\(snapshot.benchmark.files\)/);
  for(const removed of ['Choose exactly one package JSON','Select the package JSON and every file it lists','The task type will be read from your imported package.'])assert.ok(!form.includes(removed));
});

test('three-question entry uses blank answers, examples, guarded preparation and resets on new materials',()=>{
  const form=component('Benchmarks');
  for(const field of ['taskWork','taskDeliverable','taskCompletion']) assert.ok(form.includes(`const [${field},`));
  for(const setter of ['setTaskWork','setTaskDeliverable','setTaskCompletion']) assert.ok(form.includes(`${setter}("")`));
  assert.match(form,/if \(taskInstructions !== null\) onPrepare\(taskName, taskInstructions\)/);
  assert.match(form,/Answer all three questions/);
  assert.match(form,/You decide when the task is complete/);
  assert.ok(!form.includes('aria-label="Task instructions and completion criteria"'));
  assert.equal((form.match(/rows=\{3\}/g)??[]).length,3);
  assert.ok(!form.includes('maxLength=')&&!form.includes('minLength='));
});

test('Benchmarks explains the alternative once and only renders task entry for unconfigured materials',()=>{
  const form=component('Benchmarks');
  assert.equal((form.match(/JSON/g)??[]).length,1);
  assert.match(form,/imported.status === "needs_setup" && <section[\s\S]*?<h2>Describe your task<\/h2>/);
  assert.match(form,/\{manifest && \([\s\S]*?\{manifest.display_name\}[\s\S]*?\{manifest.description\}/);
  assert.match(form,/imported.errors.map/);
  assert.match(form,/disabled=\{!ready \|\| !compatible \|\| Boolean\(attached\) \|\| busy\}/);
  for(const text of ['No JSON is needed','JSON is optional','you do not need to write a JSON'])assert.ok(!form.includes(text));
});

test('AI access controls occupy their own row, with bounded wrapping and unchanged call gates',()=>{
  const report=component('Report');
  assert.match(report,/<div className="analyst-intro">/);
  assert.match(report,/<label className="analyst-access">[\s\S]*?id="analyst-access-help"[\s\S]*?<\/label>/);
  assert.match(report,/disabled=\{completedRuns\.length < 1 \|\| analystState === "loading"\}/);
  assert.match(report,/onRunAiAnalysis\(reviewerAccessCode\)/);
  assert.match(report,/type="password"/);assert.match(report,/autoComplete="off"/);
  assert.match(rule('.analyst-actions'),/grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(rule('.analyst-access'),/min-width: 0/);
  assert.match(rule('.analyst-access small'),/overflow-wrap: anywhere/);
  assert.match(css,/\.analyst-actions \{ grid-template-columns: 1fr;/);
});

test('Run Console provides state-specific guidance, actual read-only instructions and bounded technical IDs',()=>{
  const run=component('RunConsole'),reader=component('TaskInstructionsReader');
  assert.match(run,/runConsolePrompt\(runState, humanActive,/);
  assert.ok(!run.includes('Step 1 prepares')&&!run.includes('人工计时未运行'));
  assert.match(run,/benchmark\.display_name/);
  assert.match(run,/<summary>Task ID<\/summary><code>\{benchmark.task_id\}<\/code>/);
  assert.match(run,/View task instructions/);
  assert.match(run,/files=\{benchmarkFiles\}/);
  assert.match(reader,/readTaskInstructions\(benchmark, files\)/);
  assert.match(reader,/<pre>\{content.text\}<\/pre>/);
  assert.ok(!reader.includes('dangerouslySetInnerHTML')&&!reader.includes('composeTaskInstructions'));
  assert.match(reader,/URL.revokeObjectURL/);
  assert.match(rule('.task-technical-details code'),/overflow-wrap: anywhere/);
  assert.match(rule('.benchmark-card .card-title-row > div'),/min-width: 0/);
  assert.match(rule('.task-instructions-content pre'),/white-space: pre-wrap/);
});

test('result reference is only requested when submitting, with explicit cancel and final guards',()=>{
  const run=component('RunConsole');
  assert.match(run,/runState === "running" && showResultSubmission && <form/);
  assert.match(run,/onClick=\{\(\) => setShowResultSubmission\(true\)\}/);
  assert.match(run,/Saved result file path or link/);
  assert.match(run,/does not save or upload the file/);
  assert.match(run,/canSubmitTaskResult\(runState, humanActive, reviewOutputRef, runPersistenceStatus === "ready"\)/);
  assert.match(run,/type="button"[\s\S]*?setShowResultSubmission\(false\)/);
  assert.ok(!run.includes('Output reference required before submit'));
  assert.match(run,/onClick=\{onToggleHuman\}/);
  assert.match(component('completeRun'),/Original run record and output reference locked/);
});

test('result guidance precedes the field, with optional explanation and no pause-reason action',()=>{
  const run=component('RunConsole');
  assert.match(run,/copy=\{runWorkInstructions\(mode, automation.name\)\}/);
  assert.match(run,/Submit task result/);
  assert.match(run,/<h2>Where is your saved task result\?<\/h2>/);
  assert.match(run,/Save your completed task result first, then enter its file path or online link below\./);
  assert.ok(run.indexOf('id="task-result-instructions"') < run.indexOf('aria-label="Saved result file path or link"'));
  assert.match(run,/aria-describedby="task-result-instructions task-result-help"/);
  assert.match(run,/<details className="task-technical-details"><summary>Why add a result\?<\/summary>/);
  assert.match(run,/not the contents or quality of result files/);
  assert.match(run,/Result reference recorded\. Continue timing any further checking or corrections/);
  assert.ok(!run.includes('Log system wait') && !run.includes('onLogWait') && !run.includes('Record pause reason'));
});

test('Run Console uses user-controlled timing without post-hoc timing correction controls',()=>{
  const run=component('RunConsole');
  for(const removed of ['Timing correction','Non-task segment','Timing confirmation by','Append timing exclusion','onExcludeTiming','timingTarget','timingReason','timingReviewer','timingConfirmation'])assert.ok(!run.includes(removed));
  assert.ok(!component('excludeTiming'));
  assert.match(run,/onClick=\{onToggleHuman\}/);
  assert.match(run,/Start human work/);
  assert.match(run,/Pause human work/);
  assert.match(run,/Start checking \/ correction/);
  assert.match(run,/Submit task result/);
  assert.match(run,/Task completion/);
  // Preserve event vocabulary and legacy timing calculations, not new edit controls.
  assert.match(page,/"timing_excluded"/);
  const timing=fs.readFileSync(new URL('./human-timing.mjs',import.meta.url),'utf8');
  assert.match(timing,/export function includedHumanEvents/);
  assert.match(timing,/correction.event_type !== "timing_excluded"/);
});
