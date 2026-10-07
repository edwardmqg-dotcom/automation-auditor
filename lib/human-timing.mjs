// A callback schedules a repaint; its frequency is never a measurement of time.
export function includedHumanEvents(events) {
  const exclusions = new Set();
  for (const [index, correction] of events.entries()) {
    if (correction.event_type !== "timing_excluded") continue;
    const meta = correction.metadata ?? {};
    const target = events.slice(0, index).find((event) => event.event_id === meta.target_event_id);
    const matches = events.filter((event) => event.event_id === meta.target_event_id);
    if (typeof meta.target_event_id !== "string" || !meta.target_event_id.trim()
      || typeof correction.event_id !== "string" || !correction.event_id.trim()
      || events.filter((event) => event.event_id === correction.event_id).length !== 1
      || !target || matches.length !== 1 || exclusions.has(meta.target_event_id)
      || target.actor !== "human" || target.metadata?.billable_human_active !== true
      || !["human_action", "human_intervention", "human_review", "human_correction"].includes(target.event_type)
      || ["run_id", "mode", "task_id", "task_version"].some((key) => target[key] !== correction[key])
      || correction.actor !== "human" || correction.duration_ms !== 0
      || correction.started_at !== correction.ended_at || correction.status !== "completed"
      || !Number.isFinite(Date.parse(correction.started_at))
      || Date.parse(correction.started_at) < Date.parse(target.ended_at)
      || correction.metadata?.billable_human_active === true
      || ["exclusion_reason", "reviewer_ref", "confirmation_ref"].some((key) => typeof meta[key] !== "string" || !meta[key].trim())) {
      throw new Error("TIMING_EXCLUSION_INVALID: unique earlier billable segment, same run, zero duration and human confirmation are required.");
    }
    exclusions.add(meta.target_event_id);
  }
  return events.filter((event) => event.actor === "human" && event.metadata?.billable_human_active === true && !exclusions.has(event.event_id));
}

export function humanElapsedMs(events, startedAt = null, now = Date.now()) {
  const completed = includedHumanEvents(events).reduce((sum, event) => {
    if (!Number.isInteger(event.duration_ms) || event.duration_ms < 0) throw new Error("Invalid human duration.");
    return sum + event.duration_ms;
  }, 0);
  if (startedAt === null) return completed;
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start) || !Number.isFinite(now) || now < start) throw new Error("Invalid live human interval; check the system clock.");
  return completed + now - start;
}
