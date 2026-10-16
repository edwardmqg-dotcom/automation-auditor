import { calculateTimeComparison, type TimeComparison } from "./time-comparison.mjs";
import { calculateRunMetrics } from "./metric-calculator.mjs";

export type WorkflowPage = "automations" | "benchmarks" | "run" | "compare" | "report";
type ComparisonRun = {
  manifest: { mode: string; run_id: string; completed_at: string; automation_id?: string; benchmark_id?: string; task_id: string; task_version: string; manifest_version?: string; completion_basis?: string; review_as_of?: string; input_refs?: string[]; completion_criteria_ref?: string };
  events: unknown[];
};

type ComparisonTask = { benchmark_id: string; task_id: string; task_version: string; review_as_of?: string; input_files?: { path: string; sha256: string }[]; completion_criteria?: { instructions_file: string } };

export function isRunInComparisonToolScope(run: { manifest: { mode: string; automation_id?: string } }, automationId?: string) {
  if (run.manifest.mode === "human_baseline") return true;
  return ["automation_version_a", "automation_version_b"].includes(run.manifest.mode) && Boolean(run.manifest.automation_id?.trim()) && (!automationId || run.manifest.automation_id === automationId);
}

function isRunInComparisonTaskScope(run: ComparisonRun, task?: ComparisonTask) {
  if (!task) return true;
  if (!["benchmark_id", "task_id", "task_version"].every((key) => run.manifest[key as "benchmark_id" | "task_id" | "task_version"] === task[key as "benchmark_id" | "task_id" | "task_version"])) return false;
  if (task.review_as_of !== undefined && run.manifest.review_as_of !== task.review_as_of) return false;
  if (task.input_files && (!Array.isArray(run.manifest.input_refs) || JSON.stringify([...run.manifest.input_refs].sort()) !== JSON.stringify(task.input_files.map((file) => `sha256:${file.sha256}`).sort()))) return false;
  if (task.completion_criteria) {
    const instructions = task.input_files?.find((file) => file.path === task.completion_criteria?.instructions_file);
    if (!instructions || run.manifest.completion_criteria_ref !== `sha256:${instructions.sha256}`) return false;
  }
  return true;
}

export function inspectWorkflowComparisons<T extends ComparisonRun>(runs: T[], automationId?: string, task?: ComparisonTask) {
  const latest = new Map<string, T>();
  const taskRuns = runs.filter((run) => run.manifest.manifest_version === "run-manifest-v0.3" && run.manifest.completion_basis === "user_confirmation" && isRunInComparisonTaskScope(run, task));
  // Without a selected tool, choose one tool group deterministically; do not
  // combine another tool's A/B merely because their lane labels are the same.
  const scope = automationId || [...taskRuns].sort((a, b) => b.manifest.completed_at.localeCompare(a.manifest.completed_at)).find((run) => run.manifest.mode !== "human_baseline" && isRunInComparisonToolScope(run))?.manifest.automation_id;
  const eligible = taskRuns.filter((run) => isRunInComparisonToolScope(run, scope));
  for (const run of [...eligible].sort((a, b) => b.manifest.completed_at.localeCompare(a.manifest.completed_at))) if (!latest.has(run.manifest.mode)) latest.set(run.manifest.mode, run);
  const comparisons: TimeComparison[] = [], messages: string[] = [];
  const incompleteLanes = [...latest.entries()].filter(([, run]) => {
    const metrics = calculateRunMetrics(run.events);
    return metrics.evidence_standard !== "user_completion" || !metrics.passed || !metrics.timing_complete || !metrics.human_active_time_measured;
  }).map(([lane]) => lane);
  for (const lane of incompleteLanes) messages.push(`${lane === "human_baseline" ? "Human" : lane === "automation_version_a" ? "Version A" : "Version B"}: completion or full timing is not confirmed. Repeat this measurement in Run Console before comparing its time.`);
  const human = latest.get("human_baseline");
  for (const lane of ["automation_version_a", "automation_version_b"]) {
    const run = latest.get(lane);
    if (!human || !run) continue;
    try { comparisons.push(calculateTimeComparison(human, run)); }
    catch (error) { messages.push(error instanceof Error ? error.message : "Comparison unavailable."); }
  }
  return { latest, comparisons, messages, incompleteLanes };
}

export type WorkflowState = { loading: boolean; storageError: boolean; activeRun: boolean; prepared: boolean; setupDirty?: boolean; connected: boolean; attached: boolean; comparable: boolean; hasHuman: boolean; accessChecked: boolean; needsRepeat?: boolean };
export type WorkflowGuidance = { page: WorkflowPage; title: string; detail: string; disabled?: boolean; optional?: boolean; buttonLabel?: string };

export function workflowNextStep(state: WorkflowState): WorkflowGuidance {
  if (state.loading) return { page: "automations", title: "Restoring your workspace", detail: "Wait until your saved setup and records have loaded.", disabled: true };
  if (state.activeRun) return { page: "run", title: "Continue your current run", detail: "Finish the current task and save your completion decision. Navigation does not pause your timer." };
  if (state.storageError) return { page: "report", title: "Check local storage before continuing", detail: "Your records could not be restored or saved. Inspect the warning and export available records; do not replace them." };
  if (state.setupDirty) return { page: "automations", title: "Save your updated tool settings", detail: "The settings changed after the draft was saved. Check and save them in Automations before connecting the task." };
  if (state.prepared) return { page: "benchmarks", title: "Import and connect your task", detail: "Your tool setup is saved as a draft. Select task materials, define completion instructions and confirm the connection. A task package JSON is optional." };
  if (state.comparable) return { page: "compare", title: "View your time comparison", detail: "A same-task Human baseline and automation run have passed the completion and timing checks." };
  if (!state.connected) return { page: "automations", title: "Set up your automation tool", detail: "Enter the tool, version and how you will use it." };
  if (!state.attached) return { page: "benchmarks", title: "Import your task files", detail: "Choose task materials and define what counts as complete, then connect the task. A prepared task package JSON is optional." };
  if (state.needsRepeat) return { page: "run", title: "Repeat the incomplete measurement", detail: "The saved record is not a complete time measurement. Repeat the full task in Run Console with all active work timed; the previous record stays saved." };
  if (state.hasHuman && !state.accessChecked) return { page: "automations", title: "Check access before the automation run", detail: "Open the connected tool and confirm that it opens. This does not start human timing." };
  return { page: "run", title: state.hasHuman ? "Record work with automation" : "Record your manual baseline", detail: state.hasHuman ? "Use the same task and completion instructions. Include checking and necessary corrections in your human work time." : "First complete this task without automation, then repeat it with the tool. You control Start and Pause." };
}

// Page footers explain that page's handoff, not the workspace's first missing step.
// Only recovery and unfinished work override the local sequence.
export function workflowPageNextStep(current: WorkflowPage, state: WorkflowState): WorkflowGuidance {
  if (state.loading || state.activeRun || state.storageError) return workflowNextStep(state);
  const setupReady = (state.prepared || state.connected) && !state.setupDirty;
  const taskReady = state.connected && state.attached && !state.setupDirty;
  switch (current) {
    case "automations": return { page: "benchmarks", title: "Next: prepare your task", detail: setupReady ? "Import your task files and completion instructions in Benchmarks." : "Check and save your tool setup to continue to Benchmarks.", disabled: !setupReady };
    case "benchmarks": return { page: "run", title: "Next: record your work", detail: taskReady ? "Record manual work and work with automation on the same task in Run Console." : "Prepare and connect your task before recording work. Save your tool setup in Automations first if needed.", disabled: !taskReady };
    case "run": return state.needsRepeat && !state.comparable ? { page: "run", title: "Repeat the incomplete measurement", detail: "Repeat the full task using the measurement controls above. Start timing before working; the saved incomplete record cannot be used for comparison.", disabled: true } : { page: "compare", title: "Next: compare the time", detail: state.comparable ? "Your completed runs are ready to compare." : "Save a completed manual baseline and an automation run on the same task, with full timing confirmed, to compare time.", disabled: !state.comparable };
    case "compare": return { page: "report", title: "Inspect or export the records", detail: "Review the supporting records or explore optional AI explanations in Audit Report.", optional: true, buttonLabel: "Open Audit Report" };
    case "report": return { page: "compare", title: "Return to the time comparison", detail: "Compare shows the time difference and any records still needed. AI analysis is not required to view it." };
  }
}
