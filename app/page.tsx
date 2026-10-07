"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleDashed,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  History,
  Link2,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  Plug,
  ShieldCheck,
  Sparkles,
  Square,
  TriangleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  buildConnectionManifest,
  inspectConnectionDraft,
  type AdapterType,
  type AutomationConnectionManifest,
  type ConnectionDraft,
  type ContractCheck,
  type EventSource,
  type InputTransport,
  type OutputTransport,
} from "@/lib/automation-connection";
import {
  validateBenchmarkFiles,
  BENCHMARK_PACKAGE_SCHEMA_VERSION,
  assertBenchmarkCompletionCriteria,
  benchmarkCompletionCriteriaRef,
  benchmarkRubricRef,
  type BenchmarkImportResult,
  type BenchmarkPackageManifest,
} from "@/lib/benchmark-import";
import { calculateRunMetrics } from "@/lib/metric-calculator.mjs";
import { calculateTimeComparison, type TimeComparison } from "@/lib/time-comparison.mjs";
import { inspectCompletionBundle } from "@/lib/completion-bundle-import.mjs";
import { clearEvidenceBundles, listEvidenceBundles, saveEvidenceBundle } from "@/lib/evidence-store";
import { hasMeasuredHumanTime } from "@/lib/timing-evidence.mjs";
import { humanElapsedMs, includedHumanEvents } from "@/lib/human-timing.mjs";
import { inspectRunDraft, recoverInterruptedRun, RUN_DRAFT_KEY, RUN_DRAFT_VERSION } from "@/lib/run-draft.mjs";
import type { RunDraft } from "@/lib/run-draft.mjs";
import { loadLocalWorkspace, saveLocalWorkspace } from "@/lib/workspace-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type NavKey = "automations" | "benchmarks" | "run" | "compare" | "report";
type RunMode = "Human" | "Version A" | "Version B";
type RunState = "ready" | "running" | "submitted" | "reviewed";
type AutomationConnection = {
  name: string;
  versionA: string;
  versionB: string;
  adapter: AdapterType;
  manifest: AutomationConnectionManifest;
};

type ConnectivityEvidence = {
  evidence_id: string;
  automation_manifest_id: string;
  adapter_type: AdapterType;
  target_url: string;
  started_at: string;
  completed_at: string | null;
  outcome: "pending_manual_confirmation" | "verified" | "failed";
  verification_method: "guided_handoff" | "unauthenticated_head";
  http_status: number | null;
  note: string;
};

type AuditEvent = {
  event_id: string;
  run_id: string;
  mode: "human_baseline" | "automation_version_a" | "automation_version_b";
  task_id: string;
  task_version: string;
  actor: "system" | "human";
  event_type: "task_loaded" | "run_started" | "human_action" | "human_review" | "human_correction" | "system_wait" | "run_completed" | "review_submitted" | "acceptance_passed" | "acceptance_failed" | "timing_excluded";
  started_at: string;
  ended_at: string;
  duration_ms: number;
  input_ref: string;
  output_ref: string;
  status: "started" | "completed";
  reason_code: string;
  metadata: {
    label: string;
    detail: string;
    billable_human_active?: boolean;
    conclusion_count?: number;
    traceable_conclusion_count?: number;
    reviewer_ref?: string;
    decision_note?: string;
    target_event_id?: string;
    exclusion_reason?: string;
    confirmation_ref?: string;
    completion_basis?: "user_confirmation";
    completion_criteria_ref?: string;
    timing_complete?: boolean;
  };
};

type RunMetrics = {
  run_id: string;
  mode: AuditEvent["mode"];
  task_id: string;
  task_version: string;
  human_active_time_measured: boolean;
  human_active_ms: number;
  intervention_count: number;
  rework_count: number;
  passed: boolean;
  first_pass: boolean;
  conclusion_count: number | null;
  evidence_standard: "human_accountability" | "automation_traceability" | "user_completion";
  completion_criteria_ref?: string;
  timing_complete?: boolean;
  traceable_conclusion_count: number | null;
  traceability_rate: number | null;
};

type AiAnalystEnvelope = {
  status: "succeeded" | "unavailable" | "failed" | "rejected";
  error?: string;
  analysis?: {
    executive_summary: string;
    comparison_scope: "single_run" | "multi_run";
    findings: Array<{
      title: string;
      observation: string;
      observation_confidence: "high" | "medium" | "low";
      possible_explanations: string[];
      evidence_needed: string[];
      evidence_refs: string[];
    }>;
    residual_human_work: Array<{
      work: string;
      observed_context: string;
      cause_not_established: true;
      evidence_needed: string[];
      evidence_refs: string[];
    }>;
    recommended_next_experiment: string;
    limitations: string[];
  };
  call_evidence?: {
    provider: string;
    model: string;
    endpoint_origin?: string;
    prompt_version: string;
    model_call_made: boolean;
    http_status?: number | null;
    request_id?: string;
    started_at?: string;
    completed_at?: string;
    latency_ms?: number;
    input_sha256?: string;
    output_sha256?: string;
    input_run_ids?: string[];
  };
};

type RunManifest = {
  manifest_version: "run-manifest-v0.2" | "run-manifest-v0.3";
  completion_basis?: "user_confirmation";
  completion_criteria_ref?: string;
  original_output_ref?: string;
  run_id: string;
  mode: AuditEvent["mode"];
  automation_manifest_id: string;
  automation_id?: string;
  automation_version_id: string;
  benchmark_id: string;
  task_id: string;
  task_version: string;
  review_as_of: string;
  input_refs: string[];
  rubric_ref: string;
  auditor_build_id: "local-development-uncommitted";
  event_schema: "event-schema.v0.4.json";
  connectivity_evidence_id: string;
  started_at: string;
  completed_at: string;
  operator_ref: string;
  artifacts: {
    raw_event_log: string;
    review_output: string;
    failure_record: string;
    manual_review: string;
  };
  completion_record_status?: "local-record-not-release-approval";
  release_gate?: {
    same_input_bundle: true;
    same_rubric: true;
    raw_events_preserved: true;
    automation_version_recorded: true;
    manual_review_complete: true;
  };
};

type CompletedRun = {
  manifest: RunManifest;
  connectivity_evidence: ConnectivityEvidence | null;
  events: AuditEvent[];
  metrics: RunMetrics;
};

const navigation = [
  { key: "automations" as const, label: "Automations", icon: Plug },
  { key: "benchmarks" as const, label: "Benchmarks", icon: FlaskConical },
  { key: "run" as const, label: "Run Console", icon: Activity },
  { key: "compare" as const, label: "Compare", icon: BarChart3 },
  { key: "report" as const, label: "Audit Report", icon: FileText },
];

const modes: RunMode[] = ["Human", "Version A", "Version B"];

const modeIds: Record<RunMode, AuditEvent["mode"]> = {
  Human: "human_baseline",
  "Version A": "automation_version_a",
  "Version B": "automation_version_b",
};

const adapterLabels: Record<AdapterType, string> = {
  guided: "Guided external",
  events: "Event / webhook",
  api: "HTTP API",
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function runToken(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "TASK";
}

function StatusDot({ tone }: { tone: "good" | "warn" | "idle" }) {
  return <span className={`status-dot status-dot-${tone}`} />;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavKey>("automations");
  const [automation, setAutomation] = useState<AutomationConnection | null>(null);
  const [connectivityEvidence, setConnectivityEvidence] = useState<ConnectivityEvidence | null>(null);
  const [benchmarkImport, setBenchmarkImport] = useState<BenchmarkImportResult>({ manifest: null, status: "idle", errors: [], file_checks: [], imported_file_count: 0, selected_files: [] });
  const [attachedBenchmark, setAttachedBenchmark] = useState<BenchmarkPackageManifest | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftTaskKind, setDraftTaskKind] = useState("");
  const [draftPurpose, setDraftPurpose] = useState("");
  const [draftVersionA, setDraftVersionA] = useState("");
  const [draftVersionB, setDraftVersionB] = useState("");
  const [draftAdapter, setDraftAdapter] = useState<AdapterType>("guided");
  const [draftTargetUrl, setDraftTargetUrl] = useState("");
  const [draftInputTransport, setDraftInputTransport] = useState<InputTransport>("manual_files");
  const [draftOutputTransport, setDraftOutputTransport] = useState<OutputTransport>("manual_import");
  const [draftEventSource, setDraftEventSource] = useState<EventSource>("run_console");
  const [validatedDraftSignature, setValidatedDraftSignature] = useState<string | null>(null);
  const [mode, setMode] = useState<RunMode>("Version A");
  const [runState, setRunState] = useState<RunState>("ready");
  const [humanActive, setHumanActive] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [runSequence, setRunSequence] = useState(1);
  const [reviewOutputRef, setReviewOutputRef] = useState("");
  const [reviewerRef, setReviewerRef] = useState("");
  const [completionCriteriaRef, setCompletionCriteriaRef] = useState("");
  const [finalOutputRef, setFinalOutputRef] = useState("");
  const [timingComplete, setTimingComplete] = useState(false);
  const [acceptanceDecision, setAcceptanceDecision] = useState<"pass" | "fail" | "">("");
  const [decisionNote, setDecisionNote] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [evidenceImportNotice, setEvidenceImportNotice] = useState("");
  const [completedRuns, setCompletedRuns] = useState<CompletedRun[]>([]);
  const [evidenceStoreStatus, setEvidenceStoreStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [workspaceStoreStatus, setWorkspaceStoreStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [runPersistenceStatus, setRunPersistenceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [runRecoveryNotice, setRunRecoveryNotice] = useState("");
  const [analystState, setAnalystState] = useState<"idle" | "loading" | "succeeded" | "unavailable" | "failed">("idle");
  const [analystEnvelope, setAnalystEnvelope] = useState<AiAnalystEnvelope | null>(null);
  const modeRef = useRef(mode);
  const runStateRef = useRef(runState);
  const humanActiveRef = useRef(humanActive);
  const activeSecondsRef = useRef(activeSeconds);
  const humanStartedAtRef = useRef<string | null>(null);
  const automationRef = useRef(automation);
  const connectivityEvidenceRef = useRef(connectivityEvidence);
  const benchmarkImportRef = useRef(benchmarkImport);
  const attachedBenchmarkRef = useRef(attachedBenchmark);
  const eventsRef = useRef(events);
  const runIdRef = useRef("");
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sealingRef = useRef(false);

  useEffect(() => {
    const refresh = () => {
      try {
        const seconds = Math.floor(humanElapsedMs(events, humanActive && ["running", "submitted"].includes(runState) ? humanStartedAtRef.current : null) / 1000);
        setActiveSeconds(seconds);
        activeSecondsRef.current = seconds;
      } catch (error) {
        setRunPersistenceStatus("error");
        setRunRecoveryNotice(error instanceof Error ? error.message : "Timing calculation failed. Export the event JSON.");
      }
    };
    refresh();
    if (!humanActive || !["running", "submitted"].includes(runState)) return;
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [events, humanActive, runState]);

  useEffect(() => {
    let active = true;
    void listEvidenceBundles<CompletedRun>()
      .then((records) => {
        if (!active) return;
        setCompletedRuns(records.map((record) => record.payload));
        setEvidenceStoreStatus("ready");
      })
      .catch(() => {
        if (active) setEvidenceStoreStatus("error");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void loadLocalWorkspace()
      .then(async (snapshot) => {
        if (!active) return;
        if (!snapshot) {
          setWorkspaceStoreStatus("ready");
          setRunPersistenceStatus("ready");
          return;
        }
        const restored = snapshot.automation as AutomationConnection;
        const restoredDraft: ConnectionDraft = {
          name: restored.manifest.automation.display_name,
          taskKind: restored.manifest.automation.task_kind,
          purpose: restored.manifest.automation.purpose,
          versionA: restored.manifest.versions.current.version_id,
          versionB: restored.manifest.versions.candidate?.version_id ?? "",
          adapter: restored.manifest.adapter.type,
          targetUrl: restored.manifest.adapter.target_url,
          inputTransport: restored.manifest.contracts.input.transport,
          outputTransport: restored.manifest.contracts.output.transport,
          eventSource: restored.manifest.contracts.events.source,
        };
        if (!inspectConnectionDraft(restoredDraft).every((check) => check.passed)) throw new Error("The stored automation connection no longer passes the current contract checks.");

        setAutomation(restored);
        automationRef.current = restored;
        setDraftName(restoredDraft.name);
        setDraftTaskKind(restoredDraft.taskKind);
        setDraftPurpose(restoredDraft.purpose);
        setDraftVersionA(restoredDraft.versionA);
        setDraftVersionB(restoredDraft.versionB);
        setDraftAdapter(restoredDraft.adapter);
        setDraftTargetUrl(restoredDraft.targetUrl);
        setDraftInputTransport(restoredDraft.inputTransport);
        setDraftOutputTransport(restoredDraft.outputTransport);
        setDraftEventSource(restoredDraft.eventSource);
        setValidatedDraftSignature(JSON.stringify(restoredDraft));
        setConnectivityEvidence(null);
        connectivityEvidenceRef.current = null;

        if (snapshot.benchmark) {
          const result = await validateBenchmarkFiles(snapshot.benchmark.files);
          if (!active) return;
          if (result.status !== "ready" || !result.manifest) throw new Error("The stored benchmark package failed integrity revalidation.");
          setBenchmarkImport(result);
          benchmarkImportRef.current = result;
          if (snapshot.benchmark.attached && result.manifest.task_kind === restored.manifest.automation.task_kind) {
            setAttachedBenchmark(result.manifest);
            attachedBenchmarkRef.current = result.manifest;
            setCompletionCriteriaRef(benchmarkCompletionCriteriaRef(result.manifest) ?? "");
          }
        }
        const rawDraft = window.localStorage.getItem(RUN_DRAFT_KEY);
        if (rawDraft) {
          const inspected = inspectRunDraft(JSON.parse(rawDraft));
          if (!inspected.draft) throw new Error(`Saved run could not be restored: ${inspected.errors.join(" ")}`);
          const draft = inspected.draft;
          if (draft.automation_manifest_id !== restored.manifest.manifest_id || draft.benchmark_id !== attachedBenchmarkRef.current?.benchmark_id) {
            throw new Error("Saved run does not match the connected automation and verified benchmark.");
          }
          const criteria = attachedBenchmarkRef.current && benchmarkCompletionCriteriaRef(attachedBenchmarkRef.current);
          if (criteria && draft.completion_form?.criteria_ref !== criteria) throw new Error("Saved run criteria do not match the verified task instructions. Original checkpoint was not changed.");
          const recovered = recoverInterruptedRun(draft);
          setMode(recovered.mode);
          modeRef.current = recovered.mode;
          setRunSequence(recovered.run_sequence);
          setRunState(recovered.run_state);
          runStateRef.current = recovered.run_state;
          setHumanActive(false);
          humanActiveRef.current = false;
          humanStartedAtRef.current = null;
          if (recovered.completion_form) {
            const form = recovered.completion_form;
            setCompletionCriteriaRef(form.criteria_ref);
            setFinalOutputRef(form.final_output_ref);
            setReviewerRef(form.reviewer_ref);
            setDecisionNote(form.decision_note);
            setAcceptanceDecision(form.decision);
            setReviewConfirmed(recovered.human_active || draft.human_active ? false : form.confirmed);
            setTimingComplete(draft.human_active ? false : form.timing_complete);
          }
          setActiveSeconds(recovered.active_seconds);
          activeSecondsRef.current = recovered.active_seconds;
          setEvents(recovered.events as AuditEvent[]);
          eventsRef.current = recovered.events as AuditEvent[];
          setReviewOutputRef(recovered.review_output_ref);
          setActiveNav("run");
          setRunRecoveryNotice(draft.human_active
            ? `Recovered ${draft.run_id}; human timing is paused. Only work observed through ${new Date(draft.saved_at).toLocaleString()} was counted.`
            : `Recovered ${draft.run_id} from the local run checkpoint.`);
        }
        setWorkspaceStoreStatus("ready");
        setRunPersistenceStatus("ready");
      })
      .catch((error) => {
        if (active) {
          setWorkspaceStoreStatus("error");
          setRunPersistenceStatus("error");
          setRunRecoveryNotice(error instanceof Error ? error.message : "Local run recovery failed.");
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    modeRef.current = mode;
    runStateRef.current = runState;
    humanActiveRef.current = humanActive;
    activeSecondsRef.current = activeSeconds;
    automationRef.current = automation;
    connectivityEvidenceRef.current = connectivityEvidence;
    benchmarkImportRef.current = benchmarkImport;
    attachedBenchmarkRef.current = attachedBenchmark;
    eventsRef.current = events;
  }, [activeSeconds, attachedBenchmark, automation, benchmarkImport, connectivityEvidence, events, humanActive, mode, runState]);

  const runId = useMemo(
    () => `RUN-${mode.replace("Version ", "").toUpperCase()}-${runToken(attachedBenchmark?.task_id ?? "TASK")}-${String(runSequence).padStart(2, "0")}`,
    [attachedBenchmark?.task_id, mode, runSequence],
  );

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    if (runPersistenceStatus !== "ready" || !automation || !attachedBenchmark) return;
    if (runState === "reviewed") {
      if (evidenceStoreStatus === "ready") window.localStorage.removeItem(RUN_DRAFT_KEY);
      return;
    }
    if (runState === "ready") return;
    const save = () => {
      const now = new Date().toISOString();
      const draft: RunDraft = {
        schema_version: RUN_DRAFT_VERSION,
        saved_at: now,
        run_id: runId,
        run_sequence: runSequence,
        run_state: runState,
        mode,
        automation_manifest_id: automation.manifest.manifest_id,
        benchmark_id: attachedBenchmark.benchmark_id,
        task_id: attachedBenchmark.task_id,
        task_version: attachedBenchmark.task_version,
        input_ref: `benchmark://${attachedBenchmark.benchmark_id}/${attachedBenchmark.task_id}`,
        active_seconds: activeSeconds,
        human_active: humanActive,
        human_started_at: humanStartedAtRef.current,
        events,
        review_output_ref: reviewOutputRef,
        completion_form: { criteria_ref: completionCriteriaRef, final_output_ref: finalOutputRef, reviewer_ref: reviewerRef, decision_note: decisionNote, decision: acceptanceDecision, confirmed: reviewConfirmed, timing_complete: timingComplete },
      };
      try {
        window.localStorage.setItem(RUN_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        setRunPersistenceStatus("error");
        setRunRecoveryNotice("Local run checkpoint failed. Pause work and export the event JSON before leaving this page.");
      }
    };
    save();
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [activeSeconds, attachedBenchmark, automation, events, evidenceStoreStatus, humanActive, mode, reviewOutputRef, runId, runPersistenceStatus, runSequence, runState, completionCriteriaRef, finalOutputRef, reviewerRef, decisionNote, acceptanceDecision, reviewConfirmed, timingComplete]);

  const connectionDraft = useMemo<ConnectionDraft>(() => ({
    name: draftName,
    taskKind: draftTaskKind,
    purpose: draftPurpose,
    versionA: draftVersionA,
    versionB: draftVersionB,
    adapter: draftAdapter,
    targetUrl: draftTargetUrl,
    inputTransport: draftInputTransport,
    outputTransport: draftOutputTransport,
    eventSource: draftEventSource,
  }), [draftAdapter, draftEventSource, draftInputTransport, draftName, draftOutputTransport, draftPurpose, draftTargetUrl, draftTaskKind, draftVersionA, draftVersionB]);
  const contractChecks = useMemo(() => inspectConnectionDraft(connectionDraft), [connectionDraft]);
  const currentDraftSignature = JSON.stringify(connectionDraft);
  const contractValidated = validatedDraftSignature === currentDraftSignature && contractChecks.every((check) => check.passed);

  function addEvent(
    eventType: AuditEvent["event_type"],
    label: string,
    detail: string,
    actor: "system" | "human" = "system",
    startedAt?: string,
    metadata?: Partial<AuditEvent["metadata"]>,
    outputRef = "",
  ) {
    const endedAt = new Date();
    const resolvedStartedAt = startedAt ? new Date(startedAt) : endedAt;
    setEvents((current) => {
      const next: AuditEvent[] = [
        ...current,
        {
        event_id: `EV-${String(current.length + 1).padStart(3, "0")}`,
        run_id: runId,
        mode: modeIds[mode],
        task_id: attachedBenchmark?.task_id ?? "unattached-task",
        task_version: attachedBenchmark?.task_version ?? "unattached-version",
        actor,
        event_type: eventType,
        started_at: resolvedStartedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_ms: endedAt.getTime() - resolvedStartedAt.getTime(),
        input_ref: attachedBenchmark ? `benchmark://${attachedBenchmark.benchmark_id}/${attachedBenchmark.task_id}` : "",
        output_ref: outputRef,
        status: eventType === "run_started" ? "started" as const : "completed" as const,
        reason_code: "none",
        metadata: {
          label,
          detail,
          ...(["human_action", "human_review", "human_correction"].includes(eventType) ? { billable_human_active: true } : {}),
          ...metadata,
        },
      },
      ];
      eventsRef.current = next;
      return next;
    });
  }

  function startRun() {
    if (!attachedBenchmark) return;
    if (!completionCriteriaRef.trim()) {
      setReviewError("Specify the shared, versioned task completion criteria before starting.");
      return;
    }
    try { assertBenchmarkCompletionCriteria(attachedBenchmark, completionCriteriaRef); }
    catch (error) { setReviewError(error instanceof Error ? error.message : "Task criteria mismatch."); return; }
    if (runPersistenceStatus !== "ready") {
      setReviewError("Local run checkpoint is unavailable; starting would risk losing the timer again.");
      return;
    }
    if (mode !== "Human" && connectivityEvidence?.outcome !== "verified") {
      setReviewError("Automation runs require verified connectivity evidence. Human baseline remains available.");
      return;
    }
    setReviewError("");
    setRunState("running");
    addEvent("task_loaded", "Task loaded", `Verified benchmark ${attachedBenchmark.task_id} attached to this run`);
    addEvent("run_started", "Run started", `${mode} · ${mode === "Human" ? "manual baseline" : automation ? adapterLabels[automation.adapter] : "adapter unavailable"}`, "system", undefined, { completion_criteria_ref: completionCriteriaRef.trim() });
  }

  function toggleHumanWork() {
    if (sealingRef.current || !["running", "submitted"].includes(runStateRef.current) || (!humanActiveRef.current && runPersistenceStatus !== "ready")) return;
    const next = !humanActiveRef.current;
    humanActiveRef.current = next;
    setHumanActive(next);
    // A new work segment invalidates an earlier completion/timing attestation.
    setReviewConfirmed(false);
    setTimingComplete(false);
    if (next) {
      humanStartedAtRef.current = new Date().toISOString();
    } else if (humanStartedAtRef.current) {
      addEvent(runStateRef.current === "submitted" ? "human_review" : "human_action", runStateRef.current === "submitted" ? "Output checking / correction segment" : "Human work segment", `Active handling captured; cumulative timestamp time ${formatDuration(Math.floor(humanElapsedMs(eventsRef.current, humanStartedAtRef.current) / 1000))}`, "human", humanStartedAtRef.current);
      humanStartedAtRef.current = null;
    }
  }

  function logWait() {
    addEvent("system_wait", "System wait marker", "External automation is processing; excluded from human-active time");
  }

  function excludeTiming(targetId: string, reason: string, reviewer: string, confirmationRef: string) {
    if (humanActive || !["running", "submitted"].includes(runState)) {
      setReviewError("Pause human work first. Sealed runs cannot be changed.");
      return;
    }
    const now = new Date().toISOString();
    const metadata = { label: "Human timing exclusion", detail: `${targetId}: ${reason.trim()} (confirmed by ${reviewer.trim()})`, target_event_id: targetId, exclusion_reason: reason.trim(), reviewer_ref: reviewer.trim(), confirmation_ref: confirmationRef.trim() };
    try {
      const sample: AuditEvent = { ...eventsRef.current[0], event_id: `EV-${String(eventsRef.current.length + 1).padStart(3, "0")}`, event_type: "timing_excluded", actor: "human", started_at: now, ended_at: now, duration_ms: 0, metadata, status: "completed", reason_code: "human_confirmed_non_task_work", output_ref: confirmationRef.trim() };
      includedHumanEvents([...eventsRef.current, sample]);
      addEvent("timing_excluded", metadata.label, metadata.detail, "human", undefined, metadata, confirmationRef.trim());
      setReviewError("");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Invalid timing exclusion.");
    }
  }

  function completeRun() {
    if (runStateRef.current !== "running") return;
    if (humanActiveRef.current) {
      setReviewError("Pause human work yourself before submitting the output.");
      return;
    }
    if (!reviewOutputRef.trim()) {
      setReviewError("Attach a review output reference before submitting the run.");
      return;
    }
    setHumanActive(false);
    setRunState("submitted");
    runStateRef.current = "submitted";
    addEvent("run_completed", "Output submitted", "Original run record and output reference locked for acceptance review", "human", undefined, undefined, reviewOutputRef.trim());
  }

  function resetConsole(nextMode: RunMode) {
    setMode(nextMode);
    setRunState("ready");
    setHumanActive(false);
    setActiveSeconds(0);
    setEvents([]);
    eventsRef.current = [];
    setRunSequence((value) => value + 1);
    setReviewOutputRef("");
    setReviewerRef("");
    setCompletionCriteriaRef(attachedBenchmark ? benchmarkCompletionCriteriaRef(attachedBenchmark) ?? "" : "");
    setFinalOutputRef("");
    setTimingComplete(false);
    setAcceptanceDecision("");
    setDecisionNote("");
    setReviewConfirmed(false);
    setReviewError("");
    humanStartedAtRef.current = null;
  }

  async function recordAcceptance() {
    if (sealingRef.current || !automation || !attachedBenchmark || runState !== "submitted") return;
    try { assertBenchmarkCompletionCriteria(attachedBenchmark, completionCriteriaRef); }
    catch (error) { setReviewError(error instanceof Error ? error.message : "Task criteria mismatch."); return; }
    if (humanActiveRef.current) {
      setReviewError("Pause human work yourself before sealing the completion record.");
      return;
    }
    if (!reviewOutputRef.trim() || !reviewerRef.trim() || !completionCriteriaRef.trim() || !acceptanceDecision || !reviewConfirmed) {
      setReviewError("Provide the responsible operator, shared completion criteria reference, completion decision, and confirmation.");
      return;
    }
    if (acceptanceDecision === "fail" && !decisionNote.trim()) {
      setReviewError("A not-completed decision requires a reason.");
      return;
    }

    const now = new Date().toISOString();
    const base = {
      run_id: runId,
      mode: modeIds[mode],
      task_id: attachedBenchmark.task_id,
      task_version: attachedBenchmark.task_version,
      started_at: now,
      ended_at: now,
      duration_ms: 0,
      input_ref: `benchmark://${attachedBenchmark.benchmark_id}/${attachedBenchmark.task_id}`,
      status: "completed" as const,
      reason_code: "none" as const,
    };
    const reviewEvent: AuditEvent = {
      ...base,
      event_id: `EV-${String(eventsRef.current.length + 1).padStart(3, "0")}`,
      actor: "human",
      event_type: "review_submitted",
      output_ref: finalOutputRef.trim() || reviewOutputRef.trim(),
      metadata: { label: "User completion confirmation", detail: "Completion is decided by the user, not scored by Automation Auditor.", completion_basis: "user_confirmation", completion_criteria_ref: completionCriteriaRef.trim(), timing_complete: timingComplete, reviewer_ref: reviewerRef.trim() },
    };
    const acceptanceEvent: AuditEvent = {
      ...base,
      event_id: `EV-${String(eventsRef.current.length + 2).padStart(3, "0")}`,
      actor: "human",
      event_type: acceptanceDecision === "pass" ? "acceptance_passed" : "acceptance_failed",
      output_ref: finalOutputRef.trim() || reviewOutputRef.trim(),
      reason_code: acceptanceDecision === "pass" ? "none" : "manual_acceptance_failed",
      metadata: { label: acceptanceDecision === "pass" ? "Task completed (user confirmed)" : "Task not completed (user confirmed)", detail: decisionNote.trim() || "User confirmed completion against the shared task criteria", completion_basis: "user_confirmation", completion_criteria_ref: completionCriteriaRef.trim(), reviewer_ref: reviewerRef.trim(), decision_note: decisionNote.trim() },
    };
    const finalEvents = [...eventsRef.current, reviewEvent, acceptanceEvent];

    sealingRef.current = true;
    try {
      const metrics = calculateRunMetrics(finalEvents) as RunMetrics;
      const startedAt = finalEvents.find((event) => event.event_type === "run_started")?.started_at ?? now;
      const versionId = mode === "Human" ? "not-applicable-human-baseline" : mode === "Version A" ? automation.versionA : automation.versionB;
      const manifest: RunManifest = {
        manifest_version: "run-manifest-v0.3",
        completion_basis: "user_confirmation",
        completion_criteria_ref: completionCriteriaRef.trim(),
        original_output_ref: reviewOutputRef.trim(),
        run_id: runId,
        mode: modeIds[mode],
        automation_manifest_id: automation.manifest.manifest_id,
        automation_id: automation.manifest.automation.automation_id,
        automation_version_id: versionId || "version-not-registered",
        benchmark_id: attachedBenchmark.benchmark_id,
        task_id: attachedBenchmark.task_id,
        task_version: attachedBenchmark.task_version,
        review_as_of: attachedBenchmark.review_as_of,
        input_refs: attachedBenchmark.input_files.map((file) => `sha256:${file.sha256}`),
        rubric_ref: benchmarkRubricRef(attachedBenchmark),
        auditor_build_id: "local-development-uncommitted",
        event_schema: "event-schema.v0.4.json",
        connectivity_evidence_id: mode === "Human" ? "not-required-human-baseline" : connectivityEvidence?.evidence_id ?? "missing-connectivity-evidence",
        started_at: startedAt,
        completed_at: now,
        operator_ref: reviewerRef.trim(),
        artifacts: { raw_event_log: `${runId}-events.v0.4.json`, review_output: finalOutputRef.trim() || reviewOutputRef.trim(), failure_record: acceptanceDecision === "fail" ? decisionNote.trim() : "", manual_review: `completion-confirmed-by:${reviewerRef.trim()}` },
        completion_record_status: "local-record-not-release-approval",
      };
      const completed = { manifest, connectivity_evidence: mode === "Human" ? null : connectivityEvidence, events: finalEvents, metrics };
      setEvidenceStoreStatus("saving");
      await saveEvidenceBundle(completed);
      setEvidenceStoreStatus("ready");
      setEvents(finalEvents);
      eventsRef.current = finalEvents;
      setCompletedRuns((current) => [...current.filter((item) => item.manifest.run_id !== runId), completed]);
      setAnalystState("idle");
      setAnalystEnvelope(null);
      setRunState("reviewed");
      runStateRef.current = "reviewed";
      setReviewError("");
    } catch (error) {
      setEvidenceStoreStatus("error");
      setReviewError(error instanceof Error ? error.message : "The deterministic metric check failed.");
    } finally {
      sealingRef.current = false;
    }
  }

  function exportEvidenceBundle() {
    const completed = completedRuns.find((item) => item.manifest.run_id === runId);
    if (!completed) return;
    downloadEvidenceBundle(completed);
  }

  function exportEvidenceBundleByRunId(selectedRunId: string) {
    const completed = completedRuns.find((item) => item.manifest.run_id === selectedRunId);
    if (!completed) return;
    downloadEvidenceBundle(completed);
  }

  async function importCompletionEvidence(file: File) {
    if (sealingRef.current || evidenceStoreStatus !== "ready") {
      setEvidenceImportNotice("Wait for the local evidence store to be ready.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setEvidenceImportNotice("Evidence bundle exceeds the 10 MiB local import limit."); return; }
    try {
      const completed = inspectCompletionBundle(JSON.parse(await file.text())) as CompletedRun;
      if (completedRuns.some((run) => run.manifest.run_id === completed.manifest.run_id) || (["running", "submitted"].includes(runState) && completed.manifest.run_id === runId)) throw new Error("That run ID is already stored or active. Import will not overwrite it.");
      await saveEvidenceBundle(completed, true);
      setCompletedRuns((current) => [...current, completed]);
      setAnalystState("idle"); setAnalystEnvelope(null);
      setEvidenceImportNotice(`Imported ${completed.manifest.run_id}; metrics recomputed from events. No timers or original records were changed.`);
    } catch (error) { setEvidenceImportNotice(error instanceof Error ? error.message : "Evidence import failed."); }
  }

  function downloadEvidenceBundle(completed: CompletedRun) {
    const blob = new Blob([JSON.stringify({ bundle_version: "evidence-bundle-v0.1", ...completed }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${completed.manifest.run_id}-evidence-bundle.v0.1.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
  }

  async function clearLocalEvidence() {
    setEvidenceStoreStatus("saving");
    try {
      await clearEvidenceBundles();
      setCompletedRuns([]);
      setAnalystState("idle");
      setAnalystEnvelope(null);
      setEvidenceStoreStatus("ready");
    } catch {
      setEvidenceStoreStatus("error");
    }
  }

  async function runAiAnalysis() {
    if (completedRuns.length < 1 || analystState === "loading") return;
    setAnalystState("loading");
    setAnalystEnvelope(null);
    try {
      const response = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runs: completedRuns }),
      });
      const payload = await response.json() as AiAnalystEnvelope;
      setAnalystEnvelope(payload);
      if (payload.status === "succeeded" && payload.analysis) setAnalystState("succeeded");
      else if (payload.status === "unavailable") setAnalystState("unavailable");
      else setAnalystState("failed");
    } catch {
      setAnalystEnvelope({ status: "failed", error: "The analyst endpoint could not be reached." });
      setAnalystState("failed");
    }
  }

  function exportAiAnalysis() {
    if (!analystEnvelope) return;
    const blob = new Blob([JSON.stringify({ evidence_type: "nebius-ai-analysis-v0.1", ...analystEnvelope }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `automation-auditor-ai-analysis-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
  }

  function exportEvents() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${runId}-events.v0.4.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  function validateConnectionContract() {
    setValidatedDraftSignature(currentDraftSignature);
  }

  async function persistWorkspace(connection: AutomationConnection, files: File[] = [], attached = false) {
    setWorkspaceStoreStatus("saving");
    const saveOperation = workspaceSaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveLocalWorkspace(connection, files, attached));
    workspaceSaveQueueRef.current = saveOperation;
    try {
      await saveOperation;
      setWorkspaceStoreStatus("ready");
      return true;
    } catch {
      setWorkspaceStoreStatus("error");
      return false;
    }
  }

  function connectAutomation() {
    if (!contractValidated) return;
    const manifest = buildConnectionManifest(connectionDraft);
    const connection = {
      name: manifest.automation.display_name,
      versionA: manifest.versions.current.version_id,
      versionB: manifest.versions.candidate?.version_id ?? "",
      adapter: manifest.adapter.type,
      manifest,
    };
    setAutomation(connection);
    automationRef.current = connection;
    setConnectivityEvidence(null);
    connectivityEvidenceRef.current = null;
    setBenchmarkImport({ manifest: null, status: "idle", errors: [], file_checks: [], imported_file_count: 0, selected_files: [] });
    benchmarkImportRef.current = { manifest: null, status: "idle", errors: [], file_checks: [], imported_file_count: 0, selected_files: [] };
    setAttachedBenchmark(null);
    attachedBenchmarkRef.current = null;
    setActiveNav("benchmarks");
    void persistWorkspace(connection);
  }

  async function beginConnectivityDryRun() {
    if (!automation) return;
    const startedAt = new Date().toISOString();
    const base: ConnectivityEvidence = {
      evidence_id: `CONNECT-${automation.manifest.automation.automation_id}-${Date.now()}`,
      automation_manifest_id: automation.manifest.manifest_id,
      adapter_type: automation.adapter,
      target_url: automation.manifest.adapter.target_url,
      started_at: startedAt,
      completed_at: null,
      outcome: "pending_manual_confirmation",
      verification_method: automation.adapter === "guided" ? "guided_handoff" : "unauthenticated_head",
      http_status: null,
      note: automation.adapter === "guided" ? "Target opened; waiting for a human to confirm that the launch succeeded. Input/output handoff remains unverified until exercised." : "Unauthenticated HEAD request started.",
    };
    setConnectivityEvidence(base);
    connectivityEvidenceRef.current = base;
    if (automation.adapter === "guided") {
      window.open(automation.manifest.adapter.target_url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const response = await fetch(automation.manifest.adapter.target_url, { method: "HEAD", credentials: "omit", redirect: "follow" });
      const result: ConnectivityEvidence = { ...base, completed_at: new Date().toISOString(), outcome: response.ok ? "verified" : "failed", http_status: response.status, note: response.ok ? "Unauthenticated endpoint responded successfully." : `Endpoint returned HTTP ${response.status}.` };
      setConnectivityEvidence(result);
      connectivityEvidenceRef.current = result;
    } catch {
      const result: ConnectivityEvidence = { ...base, completed_at: new Date().toISOString(), outcome: "failed", note: "Browser request failed or was not CORS-visible. Use a server-side adapter or guided confirmation." };
      setConnectivityEvidence(result);
      connectivityEvidenceRef.current = result;
    }
  }

  function resolveGuidedConnectivity(verified: boolean) {
    if (!connectivityEvidence || connectivityEvidence.outcome !== "pending_manual_confirmation") return;
    const result: ConnectivityEvidence = { ...connectivityEvidence, completed_at: new Date().toISOString(), outcome: verified ? "verified" : "failed", note: verified ? "Human confirmed that the target launched. Input/output handoff has not yet been exercised." : "Human reported that the target did not launch successfully." };
    setConnectivityEvidence(result);
    connectivityEvidenceRef.current = result;
  }

  function exportConnectionManifest() {
    if (!automation) return;
    const blob = new Blob([JSON.stringify(automation.manifest, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${automation.manifest.automation.automation_id}.connection.v0.1.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function importBenchmark(files: File[]) {
    if (["running", "submitted"].includes(runStateRef.current)) { setReviewError("Finish the current run before changing its locked task package."); return; }
    if (runState === "reviewed") resetConsole(mode);
    setCompletionCriteriaRef("");
    setAttachedBenchmark(null);
    attachedBenchmarkRef.current = null;
    setBenchmarkImport({ manifest: null, status: "validating", errors: [], file_checks: [], imported_file_count: files.length, selected_files: files });
    const result = await validateBenchmarkFiles(files);
    setBenchmarkImport(result);
    benchmarkImportRef.current = result;
    if (automation) await persistWorkspace(automation, result.status === "ready" ? result.selected_files : [], false);
  }

  function attachValidatedBenchmark() {
    const imported = benchmarkImportRef.current;
    if (runStateRef.current !== "ready") return;
    if (!automation || imported.status !== "ready" || !imported.manifest || imported.manifest.task_kind !== automation.manifest.automation.task_kind) return;
    setAttachedBenchmark(imported.manifest);
    attachedBenchmarkRef.current = imported.manifest;
    setCompletionCriteriaRef(benchmarkCompletionCriteriaRef(imported.manifest) ?? "");
    setActiveNav("run");
    void persistWorkspace(automation, imported.selected_files, true);
  }

  useEffect(() => {
    type WebMcpContext = {
      registerTool: (
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
          execute: (input: unknown) => unknown;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };

    const modelContext = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    const register = (tool: Parameters<WebMcpContext["registerTool"]>[0]) => {
      void Promise.resolve(modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    };
    const currentRunId = () => runIdRef.current || `RUN-${modeRef.current.replace("Version ", "").toUpperCase()}-${runToken(attachedBenchmarkRef.current?.task_id ?? "TASK")}-01`;
    const pushEvent = (
      eventType: AuditEvent["event_type"],
      label: string,
      detail: string,
      actor: "system" | "human" = "system",
      startedAt?: string,
      outputRef = "",
      metadata?: Partial<AuditEvent["metadata"]>,
    ) => {
      const endedAt = new Date();
      const resolvedStartedAt = startedAt ? new Date(startedAt) : endedAt;
      const benchmark = attachedBenchmarkRef.current;
      setEvents((current) => {
        const next: AuditEvent[] = [
          ...current,
          {
          event_id: `EV-${String(current.length + 1).padStart(3, "0")}`,
          run_id: currentRunId(),
          mode: modeIds[modeRef.current],
          task_id: benchmark?.task_id ?? "unattached-task",
          task_version: benchmark?.task_version ?? "unattached-version",
          actor,
          event_type: eventType,
          started_at: resolvedStartedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_ms: endedAt.getTime() - resolvedStartedAt.getTime(),
          input_ref: benchmark ? `benchmark://${benchmark.benchmark_id}/${benchmark.task_id}` : "",
          output_ref: outputRef,
          status: eventType === "run_started" ? "started" as const : "completed" as const,
          reason_code: "none",
          metadata: {
            label,
            detail,
            ...(eventType === "human_action" ? { billable_human_active: true } : {}),
            ...metadata,
          },
          },
        ];
        eventsRef.current = next;
        return next;
      });
    };

    register({
      name: "connect_automation",
      title: "Connect automation",
      description: "Register an automation-under-test and its version identifiers before configuring a benchmark.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          taskKind: { type: "string", pattern: "^[a-z0-9][a-z0-9_-]*$" },
          purpose: { type: "string", minLength: 1 },
          versionA: { type: "string", minLength: 1 },
          versionB: { type: "string" },
          adapter: { type: "string", enum: ["guided", "events", "api"] },
          targetUrl: { type: "string", pattern: "^https?://" },
          inputTransport: { type: "string", enum: ["manual_files", "json_http", "shared_reference"] },
          outputTransport: { type: "string", enum: ["manual_import", "json_http", "event_stream"] },
          eventSource: { type: "string", enum: ["run_console", "webhook", "api_response"] },
        },
        required: ["name", "taskKind", "purpose", "versionA", "adapter", "targetUrl", "inputTransport", "outputTransport", "eventSource"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const supplied = input as Partial<ConnectionDraft>;
        const draft = { ...supplied, versionB: supplied.versionB ?? "" } as ConnectionDraft;
        const checks = inspectConnectionDraft(draft);
        if (!checks.every((check) => check.passed)) throw new Error(`Connection contract is invalid: ${checks.filter((check) => !check.passed).map((check) => check.label).join(", ")}`);
        const manifest = buildConnectionManifest(draft);
        const connection: AutomationConnection = {
          name: manifest.automation.display_name,
          versionA: manifest.versions.current.version_id,
          versionB: manifest.versions.candidate?.version_id ?? "",
          adapter: manifest.adapter.type,
          manifest,
        };
        automationRef.current = connection;
        connectivityEvidenceRef.current = null;
        benchmarkImportRef.current = { manifest: null, status: "idle", errors: [], file_checks: [], imported_file_count: 0, selected_files: [] };
        attachedBenchmarkRef.current = null;
        setAutomation(connection);
        setConnectivityEvidence(null);
        setBenchmarkImport(benchmarkImportRef.current);
        setAttachedBenchmark(null);
        setActiveNav("benchmarks");
        await persistWorkspace(connection);
        return { connected: true, manifestId: manifest.manifest_id, automation: connection.name, adapter: connection.adapter, contractStatus: manifest.validation.contract_status, connectivityStatus: manifest.validation.connectivity_status };
      },
    });

    register({
      name: "attach_validated_benchmark",
      title: "Attach validated benchmark",
      description: "Attach the benchmark package already selected and cryptographically validated in the visible Benchmark workspace.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => {
        if (!automationRef.current) throw new Error("Connect an automation before attaching a benchmark.");
        if (runStateRef.current !== "ready") throw new Error("Select a new ready run before attaching a task package; existing run evidence remains locked.");
        const imported = benchmarkImportRef.current;
        if (imported.status !== "ready" || !imported.manifest) throw new Error("Import and validate a local benchmark package before attaching it.");
        if (automationRef.current.manifest.automation.task_kind !== imported.manifest.task_kind) throw new Error(`Task family mismatch: automation is ${automationRef.current.manifest.automation.task_kind}, benchmark is ${imported.manifest.task_kind}.`);
        attachedBenchmarkRef.current = imported.manifest;
        setAttachedBenchmark(imported.manifest);
        setCompletionCriteriaRef(benchmarkCompletionCriteriaRef(imported.manifest) ?? "");
        setActiveNav("run");
        await persistWorkspace(automationRef.current, imported.selected_files, true);
        return { attached: true, benchmarkId: imported.manifest.benchmark_id, taskId: imported.manifest.task_id, automation: automationRef.current.name };
      },
    });

    register({
      name: "start_evaluation_run",
      title: "Start evaluation run",
      description: "Start the currently selected Human, Version A, or Version B evaluation run and create its first visible event.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        if (runPersistenceStatus !== "ready") throw new Error("Local run checkpoint is unavailable.");
        if (!automationRef.current) throw new Error("Connect an automation before starting a run.");
        if (!attachedBenchmarkRef.current) throw new Error("Attach a validated benchmark before starting a run.");
        if (!completionCriteriaRef.trim()) throw new Error("The user must provide shared task completion criteria before starting.");
        assertBenchmarkCompletionCriteria(attachedBenchmarkRef.current, completionCriteriaRef);
        if (modeRef.current !== "Human" && connectivityEvidenceRef.current?.outcome !== "verified") throw new Error("Verify automation connectivity before starting Version A or Version B.");
        if (runStateRef.current !== "ready") throw new Error("The selected run is not ready to start.");
        runStateRef.current = "running";
        setRunState("running");
        pushEvent("task_loaded", "Task loaded", `Verified benchmark ${attachedBenchmarkRef.current.task_id} attached to this run`);
        pushEvent("run_started", "Run started", `${modeRef.current} · ${modeRef.current === "Human" ? "manual baseline" : adapterLabels[automationRef.current.adapter]}`, "system", undefined, "", { completion_criteria_ref: completionCriteriaRef.trim() });
        return { runId: currentRunId(), status: "running", mode: modeRef.current };
      },
    });

    register({
      name: "set_human_work_tracking",
      title: "Set human work tracking",
      description: "Start or pause human-active time tracking for the running evaluation.",
      inputSchema: {
        type: "object",
        properties: { active: { type: "boolean" } },
        required: ["active"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const active = (input as { active?: unknown })?.active;
        if (typeof active !== "boolean") throw new Error("active must be a boolean.");
        throw new Error("Human work tracking is user-controlled. Use the visible Start/Pause button yourself; automation cannot change the timer.");
      },
    });

    register({
      name: "record_system_wait",
      title: "Record system wait",
      description: "Append a system-wait event that is excluded from human-active time.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        if (runStateRef.current !== "running") throw new Error("Start the run before recording system wait.");
        pushEvent("system_wait", "System wait marker", "External automation is processing; excluded from human-active time");
        return { runId: currentRunId(), recorded: true, excludedFromHumanActiveTime: true };
      },
    });

    register({
      name: "submit_run_output",
      title: "Submit run output",
      description: "Complete the running evaluation and lock its visible raw event record for acceptance review.",
      inputSchema: { type: "object", properties: { outputRef: { type: "string", minLength: 1 } }, required: ["outputRef"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        if (runStateRef.current !== "running") throw new Error("Only a running evaluation can be submitted.");
        const outputRef = (input as { outputRef?: unknown }).outputRef;
        if (typeof outputRef !== "string" || !outputRef.trim()) throw new Error("A non-empty outputRef is required before submission.");
        if (humanActiveRef.current) throw new Error("The user must pause human work before submitting output.");
        humanActiveRef.current = false;
        runStateRef.current = "submitted";
        setReviewOutputRef(outputRef.trim());
        setHumanActive(false);
        setRunState("submitted");
        pushEvent("run_completed", "Output submitted", "Original run record and output reference locked for acceptance review", "human", undefined, outputRef.trim());
        return { runId: currentRunId(), status: "submitted", outputLocked: true, nextRequiredAction: "record_acceptance_review", humanActiveSeconds: activeSecondsRef.current };
      },
    });

    return () => lifecycle.abort();
  }, [runPersistenceStatus, completionCriteriaRef]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark"><ShieldCheck size={19} /></div>
          <div>
            <p className="brand-name">Automation Auditor</p>
            <p className="brand-meta">Human effort, measured</p>
          </div>
        </div>

        <nav className="main-nav" aria-label="Product navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item ${activeNav === key ? "nav-item-active" : ""}`}
              onClick={() => setActiveNav(key)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {key === "run" && !attachedBenchmark && <LockKeyhole className="nav-lock" size={12} />}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="environment-card">
          <div className="environment-row">
            <StatusDot tone={workspaceStoreStatus === "error" ? "warn" : workspaceStoreStatus === "ready" ? "good" : "idle"} />
            <span>{workspaceStoreStatus === "loading" ? "Restoring local workspace" : workspaceStoreStatus === "saving" ? "Saving local workspace" : workspaceStoreStatus === "error" ? "Local workspace unavailable" : automation ? "Device-local workspace saved" : "Device-local workspace ready"}</span>
          </div>
          <div className="environment-row">
            <StatusDot tone="good" />
            <span>{evidenceStoreStatus === "loading" ? "Loading local evidence" : evidenceStoreStatus === "saving" ? "Saving local evidence" : evidenceStoreStatus === "error" ? "Local evidence unavailable" : `Device-local evidence · ${completedRuns.length}`}</span>
          </div>
          <div className="environment-row muted-row">
            <StatusDot tone={analystState === "succeeded" ? "good" : analystState === "loading" ? "warn" : "idle"} />
            <span>{analystState === "succeeded" ? "Nebius analyst verified" : analystState === "loading" ? "Nebius analyst running" : analystState === "unavailable" ? "Nebius analyst unavailable" : analystState === "failed" ? "Nebius analyst failed" : "Nebius analyst not yet verified"}</span>
          </div>
        </div>
        <button className="workspace-switcher">
          <span className="avatar">{automation ? automation.name.slice(0, 2).toUpperCase() : "—"}</span>
          <span>
            <strong>{automation?.name ?? "No automation selected"}</strong>
            <small>{automation ? `${automation.versionA} · ${automation.adapter}` : "Connect an automation"}</small>
          </span>
          <ChevronDown size={15} />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{automation?.name ?? "Evaluation workspace"}</span>
            <span>/</span>
            <strong>{navigation.find((item) => item.key === activeNav)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="protocol-badge"><LockKeyhole size={13} /> Protocol v0.6</span>
            <button className="icon-button" aria-label="Run history" onClick={() => setActiveNav("report")}><History size={17} /></button>
            <button className="new-run-button" disabled={!automation || !attachedBenchmark} onClick={() => setActiveNav("run")}><Plus size={16} /> New run</button>
          </div>
        </header>

        {activeNav === "run" && automation && attachedBenchmark ? (
          <RunConsole
            automation={automation}
            connectivityEvidence={connectivityEvidence}
            benchmark={attachedBenchmark}
            mode={mode}
            runId={runId}
            runState={runState}
            humanActive={humanActive}
            activeSeconds={activeSeconds}
            events={events}
            reviewOutputRef={reviewOutputRef}
            reviewerRef={reviewerRef}
            completionCriteriaRef={completionCriteriaRef}
            finalOutputRef={finalOutputRef}
            timingComplete={timingComplete}
            acceptanceDecision={acceptanceDecision}
            decisionNote={decisionNote}
            reviewConfirmed={reviewConfirmed}
            reviewError={reviewError}
            completedRun={completedRuns.find((item) => item.manifest.run_id === runId) ?? null}
            runPersistenceStatus={runPersistenceStatus}
            runRecoveryNotice={runRecoveryNotice}
            sealing={evidenceStoreStatus === "saving"}
            onModeChange={resetConsole}
            onStart={startRun}
            onToggleHuman={toggleHumanWork}
            onLogWait={logWait}
            onExcludeTiming={excludeTiming}
            onComplete={completeRun}
            onReviewOutputRefChange={setReviewOutputRef}
            onReviewerRefChange={setReviewerRef}
            onCompletionCriteriaRefChange={(value) => { setCompletionCriteriaRef(value); setReviewConfirmed(false); }}
            onFinalOutputRefChange={(value) => { setFinalOutputRef(value); setReviewConfirmed(false); }}
            onTimingCompleteChange={setTimingComplete}
            onAcceptanceDecisionChange={setAcceptanceDecision}
            onDecisionNoteChange={setDecisionNote}
            onReviewConfirmedChange={setReviewConfirmed}
            onRecordAcceptance={recordAcceptance}
            onExportEvidenceBundle={exportEvidenceBundle}
            onExport={exportEvents}
            onOpenBenchmark={() => setActiveNav("benchmarks")}
          />
        ) : activeNav === "run" ? (
          <SetupRequired automationConnected={Boolean(automation)} onConnect={() => setActiveNav("automations")} onBenchmark={() => setActiveNav("benchmarks")} />
        ) : activeNav === "automations" ? (
          <Automations
            automation={automation}
            connectivityEvidence={connectivityEvidence}
            draftName={draftName}
            draftTaskKind={draftTaskKind}
            draftPurpose={draftPurpose}
            draftVersionA={draftVersionA}
            draftVersionB={draftVersionB}
            draftAdapter={draftAdapter}
            draftTargetUrl={draftTargetUrl}
            draftInputTransport={draftInputTransport}
            draftOutputTransport={draftOutputTransport}
            draftEventSource={draftEventSource}
            contractChecks={contractChecks}
            validationAttempted={validatedDraftSignature !== null}
            validationCurrent={validatedDraftSignature === currentDraftSignature}
            contractValidated={contractValidated}
            onNameChange={setDraftName}
            onTaskKindChange={setDraftTaskKind}
            onPurposeChange={setDraftPurpose}
            onVersionAChange={setDraftVersionA}
            onVersionBChange={setDraftVersionB}
            onAdapterChange={setDraftAdapter}
            onTargetUrlChange={setDraftTargetUrl}
            onInputTransportChange={setDraftInputTransport}
            onOutputTransportChange={setDraftOutputTransport}
            onEventSourceChange={setDraftEventSource}
            onValidate={validateConnectionContract}
            onConnect={connectAutomation}
            onExport={exportConnectionManifest}
            onBeginConnectivityDryRun={beginConnectivityDryRun}
            onResolveGuidedConnectivity={resolveGuidedConnectivity}
          />
        ) : activeNav === "benchmarks" ? (
          <Benchmarks automation={automation} imported={benchmarkImport} attached={attachedBenchmark} onImport={importBenchmark} onAttach={attachValidatedBenchmark} />
        ) : activeNav === "compare" ? (
          <Compare automation={automation} completedRuns={completedRuns} />
        ) : (
          <Report
            automation={automation}
            completedRuns={completedRuns}
            analystState={analystState}
            analystEnvelope={analystEnvelope}
            evidenceImportNotice={evidenceImportNotice}
            onImportCompletionEvidence={importCompletionEvidence}
            onRunAiAnalysis={runAiAnalysis}
            onExportAiAnalysis={exportAiAnalysis}
            onExportEvidenceBundle={exportEvidenceBundleByRunId}
            onClearLocalEvidence={clearLocalEvidence}
          />
        )}
      </section>
    </main>
  );
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function RunConsole({
  automation,
  connectivityEvidence,
  benchmark,
  mode,
  runId,
  runState,
  humanActive,
  activeSeconds,
  events,
  reviewOutputRef,
  reviewerRef,
  completionCriteriaRef,
  finalOutputRef,
  timingComplete,
  acceptanceDecision,
  decisionNote,
  reviewConfirmed,
  reviewError,
  completedRun,
  runPersistenceStatus,
  runRecoveryNotice,
  sealing,
  onModeChange,
  onStart,
  onToggleHuman,
  onLogWait,
  onExcludeTiming,
  onComplete,
  onReviewOutputRefChange,
  onReviewerRefChange,
  onCompletionCriteriaRefChange,
  onFinalOutputRefChange,
  onTimingCompleteChange,
  onAcceptanceDecisionChange,
  onDecisionNoteChange,
  onReviewConfirmedChange,
  onRecordAcceptance,
  onExportEvidenceBundle,
  onExport,
  onOpenBenchmark,
}: {
  automation: AutomationConnection;
  connectivityEvidence: ConnectivityEvidence | null;
  benchmark: BenchmarkPackageManifest;
  mode: RunMode;
  runId: string;
  runState: RunState;
  humanActive: boolean;
  activeSeconds: number;
  events: AuditEvent[];
  reviewOutputRef: string;
  reviewerRef: string;
  completionCriteriaRef: string;
  finalOutputRef: string;
  timingComplete: boolean;
  acceptanceDecision: "pass" | "fail" | "";
  decisionNote: string;
  reviewConfirmed: boolean;
  reviewError: string;
  completedRun: CompletedRun | null;
  runPersistenceStatus: "loading" | "ready" | "error";
  runRecoveryNotice: string;
  sealing: boolean;
  onModeChange: (mode: RunMode) => void;
  onStart: () => void;
  onToggleHuman: () => void;
  onLogWait: () => void;
  onExcludeTiming: (targetId: string, reason: string, reviewer: string, confirmationRef: string) => void;
  onComplete: () => void;
  onReviewOutputRefChange: (value: string) => void;
  onReviewerRefChange: (value: string) => void;
  onCompletionCriteriaRefChange: (value: string) => void;
  onFinalOutputRefChange: (value: string) => void;
  onTimingCompleteChange: (value: boolean) => void;
  onAcceptanceDecisionChange: (value: "pass" | "fail" | "") => void;
  onDecisionNoteChange: (value: string) => void;
  onReviewConfirmedChange: (value: boolean) => void;
  onRecordAcceptance: () => void;
  onExportEvidenceBundle: () => void;
  onExport: () => void;
  onOpenBenchmark: () => void;
}) {
  const [timingTarget, setTimingTarget] = useState("");
  const [timingReason, setTimingReason] = useState("");
  const [timingReviewer, setTimingReviewer] = useState("");
  const [timingConfirmation, setTimingConfirmation] = useState("");
  const eligibleTiming = includedHumanEvents(events);
  const evidenceChecklist = [
    { label: "Review output attached", complete: Boolean(reviewOutputRef.trim()) },
    { label: "User completion decision recorded", complete: runState === "reviewed" },
    { label: "Complete timing confirmed", complete: completedRun?.metrics.timing_complete === true },
    { label: "Shared completion criteria recorded", complete: Boolean(completedRun?.metrics.completion_criteria_ref) },
  ];
  const completedChecklistItems = evidenceChecklist.filter((item) => item.complete).length;
  const automationRunBlocked = mode !== "Human" && connectivityEvidence?.outcome !== "verified";
  return (
    <div className="page-content run-page">
      <div className="heading-row">
        <PageHeading
          eyebrow="Controlled evaluation"
          title="Run Console"
          copy={`Measure human work for ${automation.name}, including output checking and necessary corrections. You decide when the task is completed; this app does not grade business outputs.`}
        />
        <div className={`run-state run-state-${runState}`}>
          <StatusDot tone={runState === "reviewed" ? "good" : runState === "running" || runState === "submitted" ? "warn" : "idle"} />
          {runState === "reviewed" ? "Recorded & sealed" : humanActive ? "Human timer running" : runState === "ready" ? "Ready — timer not started" : runState === "submitted" ? "Timer stopped — awaiting completion decision" : "Run prepared — human timer stopped"}
        </div>
      </div>

      {(runRecoveryNotice || runPersistenceStatus !== "ready") && (
        <div className="review-error" role="status">
          <TriangleAlert size={15} />
          {runRecoveryNotice || (runPersistenceStatus === "loading" ? "Restoring local run checkpoint…" : "Local run checkpoint unavailable. Do not start a timed run.")}
        </div>
      )}

      <section className="mode-strip" aria-label="Evaluation mode">
        <div>
          <p className="field-label">Evaluation lane</p>
          <div className="segmented-control">
            {modes.map((item) => (
              <button key={item} disabled={runState === "running" || runState === "submitted"} className={mode === item ? "selected" : ""} onClick={() => onModeChange(item)}>
                {item}
                {item === "Version B" && <small>pending</small>}
              </button>
            ))}
          </div>
        </div>
        <div className="run-identity">
          <p className="field-label">Run ID</p>
          <code>{runId}</code>
        </div>
        <div className="run-identity">
          <p className="field-label">Adapter</p>
          <strong>{mode === "Human" ? "Manual baseline" : `${adapterLabels[automation.adapter]} · ${mode === "Version A" ? automation.versionA : automation.versionB || "version not registered"}`}</strong>
        </div>
      </section>

      <div className="run-grid">
        <div className="run-main-column">
          <section className="console-card timer-card">
            <div className="card-header">
              <div>
                <p className="field-label">Human-active time</p>
                <div className="timer-value">{formatDuration(activeSeconds)}</div>
              </div>
              <div className={`live-indicator ${humanActive ? "is-live" : ""}`}>
                <span /> {humanActive ? "Counting" : "Not counting"}
              </div>
            </div>
            <p className="timer-note">Elapsed time is calculated from timestamps, including work in other tabs or apps. Pause for breaks. Confirmed non-task segments are excluded through append-only corrections.</p>
            {runState === "ready" && <p className="timer-note">Step 1 prepares the run only. Then click Start human work and check that COUNTING appears and the timer advances before doing the task.</p>}
            {(runState === "running" || runState === "submitted") && !humanActive && <div className="review-error" role="status"><TriangleAlert size={15} />人工计时未运行。继续审核前，请点击下方开始按钮，确认 COUNTING 且数字递增。 Human timer is stopped; starting the run alone does not record human work.</div>}
            <div className="console-actions">
              {runState === "ready" && (
                  <button className="primary-action" disabled={automationRunBlocked || runPersistenceStatus !== "ready" || !completionCriteriaRef.trim()} onClick={onStart}><Play size={17} fill="currentColor" /> {automationRunBlocked ? "Connectivity verification required" : runPersistenceStatus !== "ready" ? "Checkpoint unavailable" : "Prepare run (timer stays off)"}</button>
              )}
              {(runState === "running" || runState === "submitted") && (
                <>
                  <button disabled={sealing || (!humanActive && runPersistenceStatus !== "ready")} className={humanActive ? "pause-action" : "primary-action"} onClick={onToggleHuman}>
                    {humanActive ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
                    {humanActive ? "Pause human work" : runState === "submitted" ? "Start checking / correction" : "Start human work"}
                  </button>
                  <button className="secondary-action" disabled={humanActive} onClick={onLogWait}><Clock3 size={17} /> Log system wait</button>
                  {runState === "running" && <button className="complete-action" disabled={humanActive || !reviewOutputRef.trim()} onClick={onComplete}><Square size={15} fill="currentColor" /> Submit output</button>}
                </>
              )}
              {runState === "submitted" && (
                <div className="locked-message"><LockKeyhole size={17} /> Original output preserved. Time any further checking or correction before confirming completion.</div>
              )}
              {runState === "reviewed" && (
                <><div className="locked-message"><ShieldCheck size={17} /> Evidence validated and sealed.</div><button className="secondary-action" onClick={onExportEvidenceBundle}>Export evidence bundle</button></>
              )}
            </div>
            {runState === "ready" && automationRunBlocked && <div className="review-error"><TriangleAlert size={15} />Verify the automation connection in Automations before starting an automated lane. Human baseline remains available.</div>}
            {runState === "ready" && <label className="output-reference"><span>Shared completion criteria (required before starting)</span><Input readOnly={Boolean(benchmarkCompletionCriteriaRef(benchmark))} value={completionCriteriaRef} onChange={(event) => onCompletionCriteriaRefChange(event.target.value)} placeholder="Versioned task instructions / completion checklist; identical across lanes" />{benchmark.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION && <span>Locked to verified instructions: {benchmark.completion_criteria.instructions_file}. Read this file before starting; completion remains your decision.</span>}</label>}
            {runState === "running" && <label className="output-reference"><span>Output reference required before submit</span><Input value={reviewOutputRef} onChange={(event) => onReviewOutputRefChange(event.target.value)} placeholder="File, URL, or content-addressed output ID" /></label>}
          </section>

          {(runState === "running" || runState === "submitted") && events.some((event) => event.metadata.billable_human_active) && (
            <section className="console-card acceptance-card">
              <div className="card-title-row"><div><h2>Timing correction</h2><p>Exclude a whole non-task segment only with human confirmation. The original event stays unchanged.</p></div></div>
              <div className="acceptance-form">
                <label><span>Non-task segment</span><NativeSelect value={timingTarget} onChange={(event) => setTimingTarget(event.target.value)}><NativeSelectOption value="">Select…</NativeSelectOption>{eligibleTiming.map((event) => <NativeSelectOption key={event.event_id} value={event.event_id}>{event.event_id} · {(event.duration_ms / 1000).toFixed(3)} seconds</NativeSelectOption>)}</NativeSelect></label>
                <label><span>Timing confirmation by</span><Input value={timingReviewer} onChange={(event) => setTimingReviewer(event.target.value)} placeholder="Operator ID" /></label>
                <label className="form-wide"><span>Exclusion reason</span><Input value={timingReason} onChange={(event) => setTimingReason(event.target.value)} /></label>
                <label className="form-wide"><span>Human confirmation reference</span><Input value={timingConfirmation} onChange={(event) => setTimingConfirmation(event.target.value)} placeholder="Saved confirmation record" /></label>
              </div>
              {reviewError && <div className="review-error">{reviewError}</div>}
              <button className="secondary-action" disabled={humanActive || !eligibleTiming.some((event) => event.event_id === timingTarget) || !timingReason.trim() || !timingReviewer.trim() || !timingConfirmation.trim()} onClick={() => onExcludeTiming(timingTarget, timingReason, timingReviewer, timingConfirmation)}>Append timing exclusion</button>
            </section>
          )}

          {(runState === "submitted" || runState === "reviewed") && (
            <section className="console-card acceptance-card">
              <div className="card-title-row"><div><h2>Task completion</h2><p>You or your company decide whether the agreed task is finished. Automation Auditor records that decision and the time, without judging individual business conclusions.</p></div><span className="schema-badge">user confirmation</span></div>
              {runState === "submitted" ? (
                <>
                  <div className="acceptance-form">
                    <div className="form-wide locked-output"><span>Locked review output</span><code>{reviewOutputRef}</code></div>
                    <label><span>Reviewer reference</span><Input value={reviewerRef} onChange={(event) => onReviewerRefChange(event.target.value)} placeholder="Initials or reviewer ID" /></label>
                    <label><span>Decision</span><NativeSelect value={acceptanceDecision} onChange={(event) => onAcceptanceDecisionChange(event.target.value as "pass" | "fail" | "")}><NativeSelectOption value="">Select…</NativeSelectOption><NativeSelectOption value="pass">Task completed</NativeSelectOption><NativeSelectOption value="fail">Task not completed</NativeSelectOption></NativeSelect></label>
                    <label className="form-wide"><span>Shared completion criteria reference</span><Input readOnly={Boolean(benchmarkCompletionCriteriaRef(benchmark)) || events.some((event) => event.event_type === "run_started" && Boolean(event.metadata.completion_criteria_ref))} value={completionCriteriaRef} onChange={(event) => onCompletionCriteriaRefChange(event.target.value)} placeholder="Versioned task instructions / completion checklist; identical across lanes" /></label>
                    <label className="form-wide"><span>Final output reference (optional, if corrected)</span><Input value={finalOutputRef} onChange={(event) => onFinalOutputRefChange(event.target.value)} placeholder="Leave empty to keep the original output" /></label>
                    <label className="form-wide"><span>Decision note {acceptanceDecision === "fail" ? "(required)" : "(optional)"}</span><Input value={decisionNote} onChange={(event) => onDecisionNoteChange(event.target.value)} placeholder="Completion context or reason the task is not finished" /></label>
                  </div>
                  <label className="review-confirmation"><input type="checkbox" checked={reviewConfirmed} onChange={(event) => onReviewConfirmedChange(event.target.checked)} /><span>I am responsible for this completion decision against the shared task criteria; Automation Auditor did not judge the output.</span></label>
                  <label className="review-confirmation"><input type="checkbox" checked={timingComplete} onChange={(event) => onTimingCompleteChange(event.target.checked)} /><span>All required active work was timed, including operation, export, checking and necessary corrections. Leave unchecked if any time is missing; no savings claim will be made.</span></label>
                  {reviewError && <div className="review-error"><TriangleAlert size={15} />{reviewError}</div>}
                  <div className="acceptance-actions"><span>Pause first. Sealing preserves the original output and every event.</span><button className="primary-action" disabled={humanActive || sealing} onClick={onRecordAcceptance}>{sealing ? "Saving evidence…" : "Record completion decision"}</button></div>
                </>
              ) : completedRun ? (
                <div className="metric-grid compact-metrics">
                  <div className="metric-card"><p>Human-active</p><strong>{hasMeasuredHumanTime(completedRun.events) ? formatDuration(Math.round(completedRun.metrics.human_active_ms / 1000)) : "Not measured"}</strong><small>{hasMeasuredHumanTime(completedRun.events) ? "from billable events" : "functional run only"}</small></div>
                  <div className="metric-card"><p>Completion</p><strong>{completedRun.metrics.passed ? "Completed" : "Not completed"}</strong><small>User decision; not a quality score</small></div>
                  <div className="metric-card"><p>Timing coverage</p><strong>{completedRun.metrics.timing_complete ? "Confirmed" : "Incomplete / unknown"}</strong><small>No estimated time is added</small></div>
                </div>
              ) : null}
            </section>
          )}

          <section className="console-card event-card">
            <div className="card-title-row">
              <div>
                <h2>Event stream</h2>
                <p>Append-only activity generated by this run</p>
              </div>
              <div className="event-header-actions">
                <span className="schema-badge">event schema v0.4</span>
                <button className="export-button" disabled={events.length === 0} onClick={onExport}>Export JSON</button>
              </div>
            </div>
            {events.length === 0 ? (
              <div className="empty-events">
                <Activity size={24} />
                <strong>No events recorded</strong>
                <span>Start the run to create the first timestamped event.</span>
              </div>
            ) : (
              <div className="event-list">
                {events.map((event) => (
                  <div className="event-row" key={event.event_id}>
                    <span className={`event-icon event-${event.actor}`}>{event.actor === "human" ? "H" : "S"}</span>
                    <div className="event-copy"><strong>{event.metadata.label}</strong><span>{event.metadata.detail}</span></div>
                    <code>{event.event_id}</code>
                    <time>{new Date(event.ended_at).toLocaleTimeString("en-GB", { hour12: false })}</time>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="run-side-column">
          <section className="console-card benchmark-card">
            <div className="card-title-row compact">
              <div><p className="field-label">Locked benchmark</p><h2>{benchmark.task_id}</h2></div>
              <LockKeyhole size={17} />
            </div>
            <p className="scenario">{benchmark.description}</p>
            <div className="mini-stats">
              <div><strong>{benchmark.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION ? "User" : benchmark.acceptance.requirement_count}</strong><span>{benchmark.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION ? "confirms completion" : "legacy requirements"}</span></div>
              <div><strong>{benchmark.input_files.length}</strong><span>input files</span></div>
              <div><strong>{benchmark.task_version}</strong><span>task version</span></div>
            </div>
            <button className="text-action" onClick={onOpenBenchmark}>Inspect benchmark <ArrowRight size={15} /></button>
          </section>

          <section className="console-card checklist-card">
            <div className="card-title-row compact"><h2>Evidence checklist</h2><span className="count-badge">{completedChecklistItems} / {evidenceChecklist.length}</span></div>
            <div className="checklist">
              {evidenceChecklist.map((item) => <div className={item.complete ? "check-complete" : ""} key={item.label}>{item.complete ? <Check size={14} /> : <span className="check-ring" />} {item.label}</div>)}
            </div>
          </section>

          <section className="guardrail-card">
            <ShieldCheck size={18} />
            <div><strong>Completion belongs to the user</strong><p>Use identical task instructions and completion criteria across lanes. This app measures effort; it does not import an answer key or independently score output quality.</p></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Automations({
  automation,
  connectivityEvidence,
  draftName,
  draftTaskKind,
  draftPurpose,
  draftVersionA,
  draftVersionB,
  draftAdapter,
  draftTargetUrl,
  draftInputTransport,
  draftOutputTransport,
  draftEventSource,
  contractChecks,
  validationAttempted,
  validationCurrent,
  contractValidated,
  onNameChange,
  onTaskKindChange,
  onPurposeChange,
  onVersionAChange,
  onVersionBChange,
  onAdapterChange,
  onTargetUrlChange,
  onInputTransportChange,
  onOutputTransportChange,
  onEventSourceChange,
  onValidate,
  onConnect,
  onExport,
  onBeginConnectivityDryRun,
  onResolveGuidedConnectivity,
}: {
  automation: AutomationConnection | null;
  connectivityEvidence: ConnectivityEvidence | null;
  draftName: string;
  draftTaskKind: string;
  draftPurpose: string;
  draftVersionA: string;
  draftVersionB: string;
  draftAdapter: AdapterType;
  draftTargetUrl: string;
  draftInputTransport: InputTransport;
  draftOutputTransport: OutputTransport;
  draftEventSource: EventSource;
  contractChecks: ContractCheck[];
  validationAttempted: boolean;
  validationCurrent: boolean;
  contractValidated: boolean;
  onNameChange: (value: string) => void;
  onTaskKindChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onVersionAChange: (value: string) => void;
  onVersionBChange: (value: string) => void;
  onAdapterChange: (value: AdapterType) => void;
  onTargetUrlChange: (value: string) => void;
  onInputTransportChange: (value: InputTransport) => void;
  onOutputTransportChange: (value: OutputTransport) => void;
  onEventSourceChange: (value: EventSource) => void;
  onValidate: () => void;
  onConnect: () => void;
  onExport: () => void;
  onBeginConnectivityDryRun: () => void;
  onResolveGuidedConnectivity: (verified: boolean) => void;
}) {
  const targetLabel = draftAdapter === "guided" ? "Launch URL" : draftAdapter === "events" ? "Event endpoint" : "API endpoint";
  return (
    <div className="page-content">
      <PageHeading eyebrow="Automation under test" title="Connect before you evaluate" copy="Automation Auditor does not assume what your tool does. Register its versions and choose how runs will be observed before attaching any benchmark." />

      {automation && (
        <>
          <section className="connected-banner">
            <span className="connected-icon"><Check size={17} /></span>
            <div><p className="field-label">Connected automation</p><h2>{automation.name}</h2><p>{automation.manifest.automation.task_kind} · {automation.manifest.manifest_id} · Current: {automation.versionA} · Candidate: {automation.versionB || "not registered"}</p></div>
            <div className="connected-actions"><span className="connection-status"><StatusDot tone="good" /> Contract valid · connectivity {connectivityEvidence?.outcome.replaceAll("_", " ") ?? automation.manifest.validation.connectivity_status.replaceAll("_", " ")}</span><button className="export-button" onClick={onExport}>Export manifest</button></div>
          </section>
          <section className={`connectivity-panel connectivity-${connectivityEvidence?.outcome ?? "not-tested"}`}>
            <div><p className="field-label">Controlled connectivity dry run</p><h3>{connectivityEvidence?.outcome === "verified" ? "Connection verified" : connectivityEvidence?.outcome === "failed" ? "Verification failed" : connectivityEvidence?.outcome === "pending_manual_confirmation" ? automation.adapter === "guided" ? "Waiting for human confirmation" : "Checking endpoint" : "Not tested"}</h3><p>{connectivityEvidence?.note ?? `The ${adapterLabels[automation.adapter]} target has not been exercised. Contract validity alone does not unlock automated runs.`}</p>{connectivityEvidence && <code>{connectivityEvidence.evidence_id}</code>}</div>
            <div className="connectivity-actions">
              {!connectivityEvidence || connectivityEvidence.outcome !== "pending_manual_confirmation" ? <button className="secondary-action" onClick={onBeginConnectivityDryRun}>{automation.adapter === "guided" ? "Open target for dry run" : "Run unauthenticated HEAD check"}</button> : automation.adapter === "guided" ? <><button className="secondary-action" onClick={() => onResolveGuidedConnectivity(false)}>Record failure</button><button className="primary-action" onClick={() => onResolveGuidedConnectivity(true)}>Confirm target launched</button></> : <button className="secondary-action" disabled>Checking…</button>}
            </div>
          </section>
        </>
      )}

      <div className="connection-grid connection-grid-single">
        <section className="connector-form-card">
          <div className="card-title-row">
            <div><h2>Connection contract</h2><p>Define identity and observation method. No benchmark is selected here.</p></div>
            <Link2 size={19} />
          </div>
          <div className="connector-form">
            <label><span>Automation name</span><Input value={draftName} onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. Invoice Reconciliation Agent" /></label>
            <label><span>Task family</span><Input value={draftTaskKind} onChange={(event) => onTaskKindChange(event.target.value)} placeholder="e.g. invoice_reconciliation" /></label>
            <label className="form-wide"><span>Purpose</span><Input value={draftPurpose} onChange={(event) => onPurposeChange(event.target.value)} placeholder="What repeatable task does this automation perform?" /></label>
            <label><span>Current version A</span><Input value={draftVersionA} onChange={(event) => onVersionAChange(event.target.value)} placeholder="Commit, release, or version ID" /></label>
            <label><span>Candidate version B <small>optional for now</small></span><Input value={draftVersionB} onChange={(event) => onVersionBChange(event.target.value)} placeholder="Commit, release, or version ID" /></label>
            <label><span>Adapter</span>
              <NativeSelect value={draftAdapter} onChange={(event) => onAdapterChange(event.target.value as AdapterType)}>
                <NativeSelectOption value="guided">Guided external run</NativeSelectOption>
                <NativeSelectOption value="events">Event / webhook adapter</NativeSelectOption>
                <NativeSelectOption value="api">HTTP API adapter</NativeSelectOption>
              </NativeSelect>
            </label>
            <label><span>{targetLabel}</span><Input type="url" value={draftTargetUrl} onChange={(event) => onTargetUrlChange(event.target.value)} placeholder="https://…" /></label>
            <label><span>Input transport</span>
              <NativeSelect value={draftInputTransport} onChange={(event) => onInputTransportChange(event.target.value as InputTransport)}>
                <NativeSelectOption value="manual_files">Manual files</NativeSelectOption>
                <NativeSelectOption value="json_http">JSON over HTTP</NativeSelectOption>
                <NativeSelectOption value="shared_reference">Shared object reference</NativeSelectOption>
              </NativeSelect>
            </label>
            <label><span>Output transport</span>
              <NativeSelect value={draftOutputTransport} onChange={(event) => onOutputTransportChange(event.target.value as OutputTransport)}>
                <NativeSelectOption value="manual_import">Manual result import</NativeSelectOption>
                <NativeSelectOption value="json_http">JSON over HTTP</NativeSelectOption>
                <NativeSelectOption value="event_stream">Event stream</NativeSelectOption>
              </NativeSelect>
            </label>
            <label><span>Event source</span>
              <NativeSelect value={draftEventSource} onChange={(event) => onEventSourceChange(event.target.value as EventSource)}>
                <NativeSelectOption value="run_console">Run Console instrumentation</NativeSelectOption>
                <NativeSelectOption value="webhook">Automation webhook</NativeSelectOption>
                <NativeSelectOption value="api_response">API response lifecycle</NativeSelectOption>
              </NativeSelect>
            </label>
          </div>

          <section className="contract-check-panel">
            <div className="contract-check-heading"><div><p className="field-label">Manifest validation</p><h3>{!validationAttempted ? "Not checked" : !validationCurrent ? "Draft changed — run again" : contractValidated ? "Contract valid" : "Needs attention"}</h3></div><span>Structural check only · no external request</span></div>
            <div className="contract-checks">
              {contractChecks.map((check) => {
                const state = !validationCurrent ? "pending" : check.passed ? "passed" : "failed";
                return <div className={`contract-check ${state}`} key={check.id}><span>{state === "passed" ? <Check size={13} /> : state === "failed" ? "!" : "·"}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></div>;
              })}
            </div>
          </section>

          <div className="connector-actions">
            <span>Credentials are never stored in this manifest. Real connectivity remains unverified until a controlled dry run.</span>
            <div><button className="secondary-action" onClick={onValidate}>Run contract check</button><button className="primary-action" disabled={!contractValidated} onClick={onConnect}>Save manifest <ArrowRight size={16} /></button></div>
          </div>
        </section>

      </div>
    </div>
  );
}

function SetupRequired({ automationConnected, onConnect, onBenchmark }: { automationConnected: boolean; onConnect: () => void; onBenchmark: () => void }) {
  return (
    <div className="page-content">
      <PageHeading eyebrow="Run prerequisites" title="Complete setup before recording" copy="A run is valid only when an automation connection and a versioned benchmark are explicitly attached." />
      <section className="setup-steps">
        <div className={automationConnected ? "setup-step done" : "setup-step active"}>
          <span>01</span><div><h2>Connect an automation</h2><p>Register version identity and the adapter used to observe it.</p></div>
          <button className="secondary-action" onClick={onConnect}>{automationConnected ? "Review" : "Connect"}</button>
        </div>
        <div className={!automationConnected ? "setup-step locked" : "setup-step active"}>
          <span>02</span><div><h2>Attach a benchmark</h2><p>Choose versioned inputs, rubric, and sealed reference answers.</p></div>
          <button className="secondary-action" disabled={!automationConnected} onClick={onBenchmark}>Choose benchmark</button>
        </div>
      </section>
    </div>
  );
}

function Benchmarks({
  automation,
  imported,
  attached,
  onImport,
  onAttach,
}: {
  automation: AutomationConnection | null;
  imported: BenchmarkImportResult;
  attached: BenchmarkPackageManifest | null;
  onImport: (files: File[]) => void;
  onAttach: () => void;
}) {
  const manifest = imported.manifest;
  const compatible = Boolean(automation && manifest && automation.manifest.automation.task_kind === manifest.task_kind);
  const ready = imported.status === "ready" && Boolean(manifest);
  return (
    <div className="page-content">
      <PageHeading eyebrow="Benchmark workspace" title="Import an evaluation package" copy="Automation Auditor ships with no benchmark. Select one package manifest and every input file from your local disk; inventory, size, SHA-256, and task-family compatibility are checked before attachment." />

      <section className="benchmark-import-card">
        <div className="import-dropzone">
          <div className="document-mark"><BookOpenCheck size={23} /></div>
          <div><h2>Select package files</h2><p>Choose exactly one manifest JSON plus all files listed by that manifest. After verification, files are stored only in this browser&apos;s device-local database and are never uploaded to a server.</p></div>
          <label className="primary-action file-picker">Choose files<Input aria-label="Choose benchmark package files" type="file" multiple onChange={(event) => { void onImport(Array.from(event.target.files ?? [])); }} /></label>
        </div>
        <div className={`import-status import-status-${imported.status}`}>
          <StatusDot tone={imported.status === "ready" ? "good" : imported.status === "validating" ? "warn" : "idle"} />
          <div><strong>{imported.status === "idle" ? "No package selected" : imported.status === "validating" ? "Checking package…" : imported.status === "ready" ? "Package integrity verified" : "Package rejected"}</strong><span>{imported.status === "idle" ? "Nothing is bundled or preselected." : `${imported.imported_file_count} local files selected`}</span></div>
        </div>
        {imported.errors.length > 0 && <div className="import-errors">{imported.errors.map((error) => <div key={error}><TriangleAlert size={14} />{error}</div>)}</div>}
      </section>

      {manifest && (
        <section className="benchmark-detail-card">
          <div className="benchmark-summary">
            <div className="document-mark"><BookOpenCheck size={23} /></div>
            <div><span className="protocol-badge"><LockKeyhole size={12} /> Imported & verified</span><h2>{manifest.display_name}</h2><p>{manifest.task_kind} · {manifest.benchmark_id}</p></div>
            <button className="primary-action" disabled={!ready || !compatible || Boolean(attached)} onClick={onAttach}>{attached ? "Attached" : !automation ? "Connect automation first" : !compatible ? "Incompatible task family" : `Attach to ${automation.name}`} {!attached && compatible && <ArrowRight size={16} />}</button>
          </div>
          <div className="benchmark-facts"><div><span>Task version</span><strong>{manifest.task_version}</strong></div><div><span>Review as of</span><strong>{manifest.review_as_of}</strong></div><div><span>Completion basis</span><strong>{manifest.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION ? "User confirmation · no answer key" : "Legacy v0.1 · no business scoring"}</strong></div><div><span>{manifest.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION ? "Verified task instructions" : "Legacy rubric"}</span><strong>{manifest.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION ? manifest.completion_criteria.instructions_file : `${manifest.acceptance.requirement_count} recorded requirements`}</strong></div></div>
          {!compatible && automation && <div className="compatibility-warning"><TriangleAlert size={16} /><span>Task family mismatch: automation is <code>{automation.manifest.automation.task_kind}</code>; benchmark is <code>{manifest.task_kind}</code>.</span></div>}
          <div className="file-grid">
            {imported.file_checks.map((file) => <div className={`file-item file-${file.status}`} key={file.path}><FileText size={16} /><span>{file.path}</span>{file.status === "valid" ? <Check size={15} /> : <TriangleAlert size={15} />}</div>)}
          </div>
        </section>
      )}
    </div>
  );
}

function Compare({ automation, completedRuns }: { automation: AutomationConnection | null; completedRuns: CompletedRun[] }) {
  const completionRuns = completedRuns.filter((run) => run.metrics.evidence_standard === "user_completion" && (!automation || run.manifest.automation_id === automation.manifest.automation.automation_id));
  return <div className="page-content"><PageHeading eyebrow="Deterministic timing" title="Human / A / B time comparison" copy="Same inputs and shared completion criteria. Completion is confirmed by the user; output quality is not scored here." /><TimeComparisonReport completedRuns={completionRuns} />{completedRuns.length > completionRuns.length && <p>Older quality-review bundles and records for other tools remain available in Audit Report. They are not converted into completion or timing evidence.</p>}</div>;
}

function TimeComparisonReport({ completedRuns }: { completedRuns: CompletedRun[] }) {
  const latest = new Map<AuditEvent["mode"], CompletedRun>();
  for (const run of [...completedRuns].sort((a, b) => b.manifest.completed_at.localeCompare(a.manifest.completed_at))) if (!latest.has(run.manifest.mode)) latest.set(run.manifest.mode, run);
  const baseline = latest.get("human_baseline");
  const comparisons: TimeComparison[] = [];
  const messages: string[] = [];
  for (const lane of ["automation_version_a", "automation_version_b"] as const) {
    const run = latest.get(lane);
    if (!baseline || !run) {
      messages.push(`${lane}: a user-confirmed Human baseline and automation run are required.`);
      continue;
    }
    try { comparisons.push(calculateTimeComparison(baseline, run)); }
    catch (error) { messages.push(`${lane}: ${error instanceof Error ? error.message : "Comparison unavailable"}`); }
  }
  const exportReport = () => {
    const payload = { report_version: "time-report-v0.1", comparisons, incomplete: messages, evidence_run_ids: [...latest.values()].map((run) => run.manifest.run_id), limitation: "User-confirmed controlled task. No independent quality score, production-safety assessment or enterprise ROI claim." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "automation-auditor-time-report.v0.1.json"; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="console-card">
    <div className="card-title-row"><div><h2>Human effort report</h2><p>Only completed tasks with confirmed full timing can produce a time comparison. A-only comparisons are provisional until B is available.</p></div><button className="secondary-action" onClick={exportReport}>Export time report</button></div>
    <div className="comparison-table">
      <div className="comparison-row table-head"><span>Lane</span><span>Recorded active time</span><span>User completion</span><span>Timing coverage</span><span>Status</span></div>
      {modes.map((label) => {
        const run = latest.get(modeIds[label]);
        return <div className="comparison-row" key={label}><strong>{label}</strong><span>{run ? hasMeasuredHumanTime(run.events) ? formatDuration(Math.round(run.metrics.human_active_ms / 1000)) : "Not measured" : "—"}</span><span>{run ? run.metrics.passed ? "Completed" : "Not completed" : "—"}</span><span>{run ? run.metrics.timing_complete ? "Confirmed" : "Incomplete / unknown" : "—"}</span><span>{run ? "User-confirmed record" : "Not recorded"}</span></div>;
      })}
    </div>
    {comparisons.map((result) => <div className="gate-banner" key={result.automation_run_id}><Clock3 size={20} /><div><strong>{result.automation_run_id}: {result.observed_time_reduction ? "less human-active time observed" : "no human-active time reduction observed"}</strong><p>Baseline minus automation: {(result.human_active_delta_ms / 1000).toFixed(3)} seconds ({result.relative_improvement_pct?.toFixed(1) ?? "N/A"}%).</p><p>{result.limitation}</p></div></div>)}
    {messages.map((message) => <p className="review-error" key={message}>{message}</p>)}
  </section>;
}

function Report({
  automation,
  completedRuns,
  analystState,
  analystEnvelope,
  evidenceImportNotice,
  onImportCompletionEvidence,
  onRunAiAnalysis,
  onExportAiAnalysis,
  onExportEvidenceBundle,
  onClearLocalEvidence,
}: {
  automation: AutomationConnection | null;
  completedRuns: CompletedRun[];
  analystState: "idle" | "loading" | "succeeded" | "unavailable" | "failed";
  analystEnvelope: AiAnalystEnvelope | null;
  evidenceImportNotice: string;
  onImportCompletionEvidence: (file: File) => Promise<void>;
  onRunAiAnalysis: () => void;
  onExportAiAnalysis: () => void;
  onExportEvidenceBundle: (runId: string) => void;
  onClearLocalEvidence: () => void;
}) {
  const analysis = analystEnvelope?.analysis;
  const callEvidence = analystEnvelope?.call_evidence;
  return (
    <div className="page-content">
      <PageHeading eyebrow="Audit report" title="Evidence chain" copy="Every claim in the final report must resolve to a run, event, source reference, or acceptance decision." />
      <section className="console-card"><h2>Import completion evidence</h2><p>Import an exported user-completion bundle from another workspace. Event timing is recalculated; duplicate or active run IDs cannot be overwritten. Referenced business files are not validated by this import.</p><Input type="file" accept=".json,application/json" aria-label="Import completion evidence bundle" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImportCompletionEvidence(file); event.target.value = ""; }} />{evidenceImportNotice && <p role="status">{evidenceImportNotice}</p>}</section>
      <TimeComparisonReport completedRuns={completedRuns.filter((run) => run.metrics.evidence_standard === "user_completion" && (!automation || run.manifest.automation_id === automation.manifest.automation.automation_id))} />
      <section className="report-empty">
        <div className="report-icon"><FileCheck2 size={26} /></div>
        <h2>Saved evidence bundles</h2>
        <p>{automation ? `${automation.name} is connected and ${completedRuns.length} reviewed evidence bundle${completedRuns.length === 1 ? " is" : "s are"} available in this session.` : "No automation is connected. Automation Auditor will not assume a target or manufacture missing evidence."}</p>
        <div className="report-requirements"><span>{automation ? <Check size={14} /> : <CircleDashed size={14} />} Automation connection</span><span>{completedRuns.length ? <Check size={14} /> : <CircleDashed size={14} />} Saved evidence bundles: {completedRuns.length}</span><span><CircleDashed size={14} /> Comparable Human and Version A runs</span><span><CircleDashed size={14} /> Version B comparison when available</span></div>
        {completedRuns.length > 0 && <div className="evidence-history" aria-label="Reviewed evidence history">
          {completedRuns.map((run) => <div className="evidence-history-item" key={run.manifest.run_id}>
            <div className="evidence-history-row">
              <span><strong>{run.manifest.run_id}</strong><small>{run.metrics.evidence_standard === "user_completion" ? `${run.metrics.passed ? "Completed" : "Not completed"} · user decision · timing ${run.metrics.timing_complete ? "confirmed" : "incomplete / unknown"}` : `Legacy quality review · ${run.metrics.passed ? "Passed" : "Failed"}`}</small></span>
              <button className="secondary-action" onClick={() => onExportEvidenceBundle(run.manifest.run_id)}>Export bundle</button>
            </div>
            <details><summary>Inspect bundle JSON</summary><pre>{JSON.stringify({ bundle_version: "evidence-bundle-v0.1", ...run }, null, 2)}</pre></details>
          </div>)}
        </div>}
        {completedRuns.length > 0 && <AlertDialog><AlertDialogTrigger asChild><button className="danger-text-action">Clear device-local history</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear local evidence history?</AlertDialogTitle><AlertDialogDescription>This removes {completedRuns.length} completed evidence bundle{completedRuns.length === 1 ? "" : "s"} from this browser. Export anything you need first. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onClearLocalEvidence}>Clear history</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      </section>

      <section className={`analyst-card analyst-${analystState}`}>
        <div className="analyst-heading">
          <div className="analyst-mark"><Sparkles size={21} /></div>
          <div>
            <p className="field-label">Required NVIDIA model path</p>
            <h2>Nebius Evidence Analyst</h2>
            <p>NVIDIA Nemotron on Nebius Token Factory explains reviewed evidence. Deterministic metrics and release decisions remain locked.</p>
          </div>
          <div className="analyst-actions">
            <span className="protocol-badge"><StatusDot tone={analystState === "succeeded" ? "good" : analystState === "loading" ? "warn" : "idle"} /> {analystState === "succeeded" ? "Verified model output" : analystState === "loading" ? "Calling Token Factory" : analystState === "unavailable" ? "Analysis unavailable" : analystState === "failed" ? "Call failed" : "Not yet run"}</span>
            <button className="primary-action" disabled={completedRuns.length < 1 || analystState === "loading"} onClick={onRunAiAnalysis}>{analystState === "loading" ? "Analyzing…" : analystState === "succeeded" ? "Run again" : "Analyze evidence"}</button>
          </div>
        </div>

        {completedRuns.length < 1 && <div className="analyst-empty"><CircleDashed size={18} /><span>Complete at least one human-reviewed run before sending evidence to the model.</span></div>}

        {(analystState === "unavailable" || analystState === "failed") && (
          <>
            <div className="analyst-error">
              <TriangleAlert size={18} />
              <div><strong>{analystState === "unavailable" ? "Evidence analysis is unavailable" : "The recorded model call did not complete"}</strong><p>{analystEnvelope?.error ?? "No error detail was returned."}</p>{callEvidence && <small>{callEvidence.provider} · {callEvidence.model} · model call made: {callEvidence.model_call_made ? "yes" : "no"}</small>}</div>
            </div>
            {analystEnvelope && <div className="analyst-failure-evidence">
              <div><strong>Rejected call evidence</strong><button className="secondary-action" onClick={onExportAiAnalysis}><Download size={15} /> Export call evidence</button></div>
              <details><summary>Inspect call evidence JSON</summary><pre>{JSON.stringify({ evidence_type: "nebius-ai-analysis-v0.1", ...analystEnvelope }, null, 2)}</pre></details>
            </div>}
          </>
        )}

        {analystState === "succeeded" && analysis && callEvidence && (
          <div className="analyst-result">
            <div className="analyst-summary"><span>Evidence-grounded summary</span><p>{analysis.executive_summary}</p></div>
            <div className="analyst-findings">
              {analysis.findings.map((finding, index) => (
                <article key={`${finding.title}-${index}`}>
                  <div><strong>{finding.title}</strong><span>{finding.observation_confidence} observation confidence</span></div>
                  <p>{finding.observation}</p>
                  {finding.possible_explanations.length > 0 ? <div className="analyst-interpretation"><strong>Hypotheses to test — not established causes</strong><ul>{finding.possible_explanations.map((item) => <li key={item}>{item.replace(/^Hypothesis:\s*/i, "")}</li>)}</ul></div> : <p className="analyst-interpretation">No cause or capability conclusion is supported by this evidence.</p>}
                  <div className="analyst-evidence-needed"><strong>Evidence needed</strong><ul>{finding.evidence_needed.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <div className="evidence-refs">{finding.evidence_refs.map((ref) => <code key={ref}>{ref}</code>)}</div>
                </article>
              ))}
            </div>
            {analysis.residual_human_work.length > 0 && <div className="analyst-residual"><h3>Residual human work</h3>{analysis.residual_human_work.map((item, index) => <article key={`${item.work}-${index}`}><strong>{item.work}</strong><p>{item.observed_context}</p><p className="analyst-interpretation">Cause not established by the supplied run evidence.</p><div className="analyst-evidence-needed"><strong>Evidence needed</strong><ul>{item.evidence_needed.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></div><div className="evidence-refs">{item.evidence_refs.map((ref) => <code key={ref}>{ref}</code>)}</div></article>)}</div>}
            <div className="analyst-next"><span>Recommended next experiment</span><p>{analysis.recommended_next_experiment}</p></div>
            <div className="analyst-provenance">
              <div><span>Provider</span><strong>{callEvidence.provider}</strong></div>
              <div><span>Model</span><strong>{callEvidence.model}</strong></div>
              <div><span>Request ID</span><code>{callEvidence.request_id}</code></div>
              <div><span>Latency</span><strong>{callEvidence.latency_ms} ms</strong></div>
              <button className="secondary-action" onClick={onExportAiAnalysis}><Download size={15} /> Export call evidence</button>
            </div>
            {analysis.limitations.length > 0 && <div className="analyst-limitations"><strong>Deterministic evidence limitations</strong><ul>{analysis.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </div>
        )}
      </section>
    </div>
  );
}
