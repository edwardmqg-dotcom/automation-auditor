import { inspectRunDraft, RUN_DRAFT_KEY } from './run-draft.mjs';

// Reference bookkeeping only: never starts/stops timing or rewrites submission.
export function saveResultReference(storage, draft, nextValue, savedAt) {
  const inspected = inspectRunDraft(draft);
  if (!inspected.draft || draft.run_state !== 'submitted' || !draft.completion_form) throw new Error('Result editing requires an unsealed submitted run.');
  const submission = draft.events.find(event => event.event_type === 'run_completed');
  if (!submission || draft.events.some(event => ['review_submitted','acceptance_passed','acceptance_failed'].includes(event.event_type))) throw new Error('A sealed result cannot be edited.');
  if (submission.output_ref !== draft.review_output_ref) throw new Error('Original result reference does not match submission.');
  const next = nextValue.trim(), previous = draft.completion_form.final_output_ref.trim() || draft.review_output_ref.trim();
  if (!next) throw new Error('Enter a saved result file path or link. The previous reference is still saved.');
  if (next === previous) return { draft, changed: false };
  if (draft.events.length >= 248) throw new Error('This run has reached its reference history limit. Keep the saved reference and confirm or archive the run; do not discard history.');
  const at = Date.parse(savedAt);
  if (!Number.isFinite(at) || draft.events.some(event => Date.parse(event.ended_at) > at)) throw new Error('Result update timestamp cannot precede the recorded events.');
  const ids = new Set(draft.events.map(event => event.event_id));
  let sequence = draft.events.length + 1;
  while (ids.has(`EV-${String(sequence).padStart(3,'0')}`)) sequence++;
  const event = {
    event_id: `EV-${String(sequence).padStart(3,'0')}`, run_id: draft.run_id,
    mode: submission.mode, task_id: draft.task_id, task_version: draft.task_version,
    actor: 'system', event_type: 'system_action', started_at: savedAt, ended_at: savedAt,
    duration_ms: 0, input_ref: draft.input_ref, output_ref: next, status: 'completed', reason_code: 'none',
    metadata: { label: 'Result reference updated', detail: 'User edited the saved result location; previous references are retained.', reference_action: 'result_reference_updated', previous_output_ref: previous, next_output_ref: next, original_output_ref: draft.review_output_ref, billable_human_active: false },
  };
  const updated = { ...draft, saved_at: savedAt, events: [...draft.events,event], completion_form: { ...draft.completion_form, final_output_ref: next, confirmed: false, timing_complete: false } };
  // Persist first: a storage failure must not become a successful UI update.
  storage.setItem(RUN_DRAFT_KEY, JSON.stringify(updated));
  return { draft: updated, changed: true };
}
