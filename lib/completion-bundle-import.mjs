import { calculateRunMetrics } from "./metric-calculator.mjs";

export function inspectCompletionBundle(value) {
  const fail = (message) => { throw new Error(`COMPLETION_IMPORT_REJECTED: ${message}`); };
  if (!value || value.bundle_version !== "evidence-bundle-v0.1" || !value.manifest || !Array.isArray(value.events) || value.events.length > 250) fail("requires an exported evidence bundle with at most 250 events");
  const manifest = value.manifest;
  if (manifest.manifest_version !== "run-manifest-v0.3" || manifest.completion_basis !== "user_confirmation") fail("only new user-completion bundles are supported; legacy reviews are not converted");
  for (const field of ["run_id", "automation_id", "automation_manifest_id", "automation_version_id", "benchmark_id", "task_id", "task_version", "review_as_of", "rubric_ref", "completion_criteria_ref", "original_output_ref", "operator_ref", "auditor_build_id", "connectivity_evidence_id"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) fail(`missing ${field}`);
  }
  if (manifest.event_schema !== "event-schema.v0.4.json" || manifest.completion_record_status !== "local-record-not-release-approval") fail("unsupported event schema or completion record status");
  if (!Array.isArray(manifest.input_refs) || !manifest.input_refs.length || manifest.input_refs.some((ref) => typeof ref !== "string" || !/^sha256:[a-f0-9]{64}$/.test(ref))) fail("missing input fingerprints");
  if (!manifest.artifacts || ["raw_event_log", "review_output", "manual_review"].some((key) => typeof manifest.artifacts[key] !== "string" || !manifest.artifacts[key].trim()) || typeof manifest.artifacts.failure_record !== "string") fail("missing artifact references");
  const metrics = calculateRunMetrics(value.events);
  if (metrics.evidence_standard !== "user_completion") fail("no user completion confirmation");
  for (const key of ["run_id", "mode", "task_id", "task_version", "completion_criteria_ref"]) if (manifest[key] !== metrics[key]) fail(`manifest and events disagree on ${key}`);
  const submission = value.events.find((event) => event.event_type === "run_completed");
  const confirmation = value.events.find((event) => event.event_type === "review_submitted");
  const decision = value.events.find((event) => ["acceptance_passed", "acceptance_failed"].includes(event.event_type));
  const start = value.events.find((event) => event.event_type === "run_started");
  if (manifest.original_output_ref !== submission.output_ref || manifest.artifacts.review_output !== confirmation.output_ref || manifest.operator_ref !== confirmation.metadata.reviewer_ref) fail("output/operator references disagree");
  if (manifest.started_at !== start.started_at || manifest.completed_at !== decision.ended_at) fail("manifest timestamps disagree");
  // Import is local validation, not proof that referenced business files exist or are correct.
  return { manifest, events: value.events, metrics, connectivity_evidence: value.connectivity_evidence ?? null };
}
