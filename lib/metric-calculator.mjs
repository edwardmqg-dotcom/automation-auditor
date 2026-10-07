import { includedHumanEvents, humanElapsedMs } from "./human-timing.mjs";

const MODES = ["human_baseline", "automation_version_a", "automation_version_b"];
const ACTORS = new Set(["human", "system", "model"]);
const EVENT_TYPES = new Set(["run_started", "run_completed", "run_failed", "task_loaded", "human_action", "human_intervention", "human_review", "human_correction", "system_action", "system_wait", "model_call", "rework_started", "review_submitted", "acceptance_passed", "acceptance_failed", "timing_excluded"]);
const STATUSES = new Set(["started", "completed", "failed", "skipped"]);
const HUMAN_ACTIVE_EVENTS = new Set(["human_action", "human_intervention", "human_review", "human_correction"]);
const ACCEPTANCE_EVENTS = new Set(["acceptance_passed", "acceptance_failed"]);

const fail = (message) => { throw new Error(`EVENT_VALIDATION_FAILED: ${message}`); };
const parseTime = (value, field, eventIndex) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`event ${eventIndex} has invalid ${field}`);
  return parsed;
};

const validateEvent = (event, eventIndex) => {
  const required = ["run_id", "mode", "task_id", "task_version", "actor", "event_type", "started_at", "ended_at", "duration_ms", "input_ref", "output_ref", "status", "reason_code", "metadata"];
  for (const field of required) if (!(field in event)) fail(`event ${eventIndex} is missing ${field}`);
  if (!MODES.includes(event.mode)) fail(`event ${eventIndex} has unsupported mode ${event.mode}`);
  if (!ACTORS.has(event.actor)) fail(`event ${eventIndex} has unsupported actor ${event.actor}`);
  if (!EVENT_TYPES.has(event.event_type)) fail(`event ${eventIndex} has unsupported event_type ${event.event_type}`);
  if (!STATUSES.has(event.status)) fail(`event ${eventIndex} has unsupported status ${event.status}`);
  if (!Number.isInteger(event.duration_ms) || event.duration_ms < 0) fail(`event ${eventIndex} has invalid duration_ms`);
  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) fail(`event ${eventIndex} has invalid metadata`);
  const started = parseTime(event.started_at, "started_at", eventIndex);
  const ended = parseTime(event.ended_at, "ended_at", eventIndex);
  const computedDuration = ended - started;
  if (computedDuration < 0) fail(`event ${eventIndex} ends before it starts`);
  if (computedDuration !== event.duration_ms) fail(`event ${eventIndex} duration_ms does not match timestamps`);
  if (event.metadata.billable_human_active === true && (!HUMAN_ACTIVE_EVENTS.has(event.event_type) || event.actor !== "human")) fail(`event ${eventIndex} marks a non-human-active event as billable`);
  if (event.event_type === "review_submitted") {
    if (event.metadata.completion_basis === "user_confirmation") {
      if (event.actor !== "human" || event.duration_ms !== 0 || !event.output_ref.trim()
        || ["reviewer_ref", "completion_criteria_ref"].some((key) => typeof event.metadata[key] !== "string" || !event.metadata[key].trim())
        || typeof event.metadata.timing_complete !== "boolean") fail(`event ${eventIndex} has invalid user completion confirmation`);
      return { ...event, _started: started, _ended: ended };
    }
    const { conclusion_count: total, traceable_conclusion_count: traceable } = event.metadata;
    if (!Number.isInteger(total) || total <= 0) fail(`event ${eventIndex} has invalid conclusion count`);
    if (event.mode !== "human_baseline" && (!Number.isInteger(traceable) || traceable < 0 || traceable > total)) fail(`event ${eventIndex} has invalid evidence traceability counts`);
  }
  return { ...event, _started: started, _ended: ended };
};

const lastByTime = (events, predicate) => events.filter(predicate).sort((a, b) => a._started - b._started || a._ended - b._ended).at(-1);

const summarizeRun = (events) => {
  const included = includedHumanEvents(events);
  const ordered = [...events].sort((a, b) => a._started - b._started || a._ended - b._ended);
  const acceptances = ordered.filter((event) => ACCEPTANCE_EVENTS.has(event.event_type));
  if (!acceptances.length) fail(`run ${events[0].run_id} has no acceptance event`);
  if (!ordered.some((event) => event.event_type === "run_started")) fail(`run ${events[0].run_id} has no run_started event`);
  if (!ordered.some((event) => event.event_type === "run_completed")) fail(`run ${events[0].run_id} has no run_completed event`);
  const latestReview = lastByTime(ordered, (event) => event.event_type === "review_submitted");
  if (!latestReview) fail(`run ${events[0].run_id} has no review_submitted event`);
  if (latestReview.metadata.completion_basis === "user_confirmation") {
    if (acceptances.length !== 1 || ordered.filter((event) => event.event_type === "review_submitted").length !== 1
      || ordered.filter((event) => event.event_type === "run_started").length !== 1
      || ordered.filter((event) => event.event_type === "run_completed").length !== 1) fail("User-completion runs require one start, original submission and sealed decision; legacy decisions cannot be converted.");
    const decision = acceptances.at(-1);
    const start = ordered.find((event) => event.event_type === "run_started");
    const submission = lastByTime(ordered, (event) => event.event_type === "run_completed");
    if (new Set(events.map((event) => event.event_id)).size !== events.length || events.some((event) => typeof event.event_id !== "string" || !event.event_id.trim())) fail("User-completion evidence requires unique event IDs.");
    if (latestReview._started < submission._ended || submission._started < start._started) fail("Completion must follow output submission and run start.");
    if (start.metadata.completion_criteria_ref && start.metadata.completion_criteria_ref !== latestReview.metadata.completion_criteria_ref) fail("Predeclared completion criteria cannot be changed after run start.");
    if (decision.actor !== "human" || decision.duration_ms !== 0 || decision._started < latestReview._ended
      || decision.output_ref !== latestReview.output_ref
      || decision.metadata.completion_basis !== "user_confirmation"
      || decision.metadata.reviewer_ref !== latestReview.metadata.reviewer_ref
      || decision.metadata.completion_criteria_ref !== latestReview.metadata.completion_criteria_ref
      || (decision.event_type === "acceptance_failed" && !decision.metadata.decision_note?.trim())) fail("User completion decision must match the human confirmation.");
    const sealTime = decision._started;
    if (events.some((event) => event._ended > sealTime)) fail("Events cannot follow a sealed completion decision.");
    if (included.some((event) => event._ended > sealTime || event._started < start._started)) fail("Human work must be within the started, unsealed run.");
    const orderedHuman = [...included].sort((a, b) => a._started - b._started);
    if (orderedHuman.some((event, index) => index > 0 && event._started < orderedHuman[index - 1]._ended)) fail("Human work segments overlap.");
    return {
      run_id: events[0].run_id, mode: events[0].mode, task_id: events[0].task_id, task_version: events[0].task_version,
      metric_schema_version: "time-metrics-v0.1", evidence_standard: "user_completion",
      completion_criteria_ref: latestReview.metadata.completion_criteria_ref,
      timing_complete: latestReview.metadata.timing_complete,
      human_active_time_measured: included.length > 0, human_active_ms: humanElapsedMs(events),
      intervention_count: ordered.filter((event) => event.event_type === "human_intervention").length,
      rework_count: ordered.filter((event) => event.event_type === "rework_started").length,
      passed: decision.event_type === "acceptance_passed", first_pass: acceptances[0].event_type === "acceptance_passed",
      conclusion_count: null, traceable_conclusion_count: null, traceability_rate: null,
    };
  }
  const totalConclusions = latestReview.metadata.conclusion_count;
  const humanBaseline = events[0].mode === "human_baseline";
  const traceableConclusions = humanBaseline ? null : latestReview.metadata.traceable_conclusion_count;
  return {
    run_id: events[0].run_id,
    mode: events[0].mode,
    task_id: events[0].task_id,
    task_version: events[0].task_version,
    human_active_time_measured: included.length > 0,
    human_active_ms: humanElapsedMs(events),
    intervention_count: ordered.filter((event) => event.event_type === "human_intervention").length,
    rework_count: ordered.filter((event) => event.event_type === "rework_started").length,
    passed: acceptances.at(-1).event_type === "acceptance_passed",
    first_pass: acceptances[0].event_type === "acceptance_passed",
    conclusion_count: totalConclusions,
    evidence_standard: humanBaseline ? "human_accountability" : "automation_traceability",
    traceable_conclusion_count: traceableConclusions,
    traceability_rate: humanBaseline ? null : traceableConclusions / totalConclusions,
  };
};

const summarizeMode = (runs) => {
  const taskCount = runs.length;
  const passedTaskCount = runs.filter((run) => run.passed).length;
  const firstPassedTaskCount = runs.filter((run) => run.first_pass).length;
  const totalConclusions = runs.reduce((sum, run) => sum + run.conclusion_count, 0);
  const humanBaseline = runs[0].mode === "human_baseline";
  const traceableConclusions = humanBaseline ? null : runs.reduce((sum, run) => sum + run.traceable_conclusion_count, 0);
  return { mode: runs[0].mode, task_count: taskCount, human_active_time_measured: runs.every((run) => run.human_active_time_measured), human_active_ms: runs.reduce((sum, run) => sum + run.human_active_ms, 0), intervention_count: runs.reduce((sum, run) => sum + run.intervention_count, 0), rework_count: runs.reduce((sum, run) => sum + run.rework_count, 0), passed_task_count: passedTaskCount, pass_rate: passedTaskCount / taskCount, first_passed_task_count: firstPassedTaskCount, first_pass_rate: firstPassedTaskCount / taskCount, evidence_standard: runs[0].evidence_standard, traceable_conclusion_count: traceableConclusions, conclusion_count: totalConclusions, traceability_rate: humanBaseline ? null : traceableConclusions / totalConclusions };
};

export function calculateRunMetrics(events) {
  if (!Array.isArray(events) || events.length === 0) fail("input must be a non-empty event array");
  const validated = events.map(validateEvent);
  const identities = new Set(validated.map((event) => `${event.run_id}\u0000${event.mode}\u0000${event.task_id}\u0000${event.task_version}`));
  if (identities.size !== 1) fail("single-run calculation mixes run, mode, task_id, or task_version");
  return summarizeRun(validated);
}

export function calculateMetrics(events) {
  if (!Array.isArray(events) || events.length === 0) fail("input must be a non-empty event array");
  const validated = events.map(validateEvent);
  const taskVersions = new Set(validated.map((event) => event.task_version));
  if (taskVersions.size !== 1) fail("comparison mixes task versions");
  const taskIdsByMode = new Map();
  const grouped = new Map();
  for (const event of validated) {
    if (!grouped.has(event.run_id)) grouped.set(event.run_id, []);
    grouped.get(event.run_id).push(event);
    if (!taskIdsByMode.has(event.mode)) taskIdsByMode.set(event.mode, new Set());
    taskIdsByMode.get(event.mode).add(event.task_id);
  }
  for (const eventsForRun of grouped.values()) {
    const identities = new Set(eventsForRun.map((event) => `${event.mode}\u0000${event.task_id}\u0000${event.task_version}`));
    if (identities.size !== 1) fail(`run ${eventsForRun[0].run_id} mixes mode, task_id, or task_version`);
  }
  const runs = [...grouped.values()].map(summarizeRun);
  if (runs.some((run) => run.evidence_standard === "user_completion")) fail("User-completion runs require the time comparison engine; legacy quality metrics are not interchangeable.");
  if (runs.some((run) => !run.human_active_time_measured)) fail("cross-mode efficiency comparison requires measured human-active events in every run");
  const modesPresent = new Set(runs.map((run) => run.mode));
  for (const mode of MODES) if (!modesPresent.has(mode)) fail(`comparison is missing mode ${mode}`);
  const baselineTasks = [...taskIdsByMode.get("human_baseline")].sort().join("\n");
  for (const mode of MODES.slice(1)) if ([...taskIdsByMode.get(mode)].sort().join("\n") !== baselineTasks) fail(`mode ${mode} does not cover the same task set as human_baseline`);
  const modeSummaries = Object.fromEntries(MODES.map((mode) => [mode, summarizeMode(runs.filter((run) => run.mode === mode))]));
  const baseline = modeSummaries.human_baseline;
  const comparisons = Object.fromEntries(MODES.slice(1).map((mode) => {
    const current = modeSummaries[mode];
    const delta = baseline.human_active_ms - current.human_active_ms;
    const qualityConstraintSatisfied = current.pass_rate >= baseline.pass_rate;
    return [mode, { baseline_mode: "human_baseline", human_active_delta_ms: delta, relative_improvement_pct: baseline.human_active_ms === 0 ? null : (delta / baseline.human_active_ms) * 100, quality_constraint_satisfied: qualityConstraintSatisfied, net_improvement_qualified: qualityConstraintSatisfied && delta > 0 }];
  }));
  return { metric_schema_version: "metrics-v0.2", task_version: [...taskVersions][0], runs, by_mode: modeSummaries, comparisons };
}
