export type TimingEvent = {
  event_id?: string; run_id?: string; mode?: string; task_id?: string; task_version?: string;
  actor?: string; event_type?: string; duration_ms?: number; started_at?: string; ended_at?: string; status?: string;
  metadata?: { billable_human_active?: boolean; target_event_id?: string; exclusion_reason?: string; reviewer_ref?: string; confirmation_ref?: string };
};
export function includedHumanEvents<T extends TimingEvent>(events: T[]): T[];
export function humanElapsedMs(events: TimingEvent[], startedAt?: string | null, now?: number): number;
