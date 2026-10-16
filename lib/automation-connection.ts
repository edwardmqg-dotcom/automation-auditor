export const AUTOMATION_CONNECTION_SCHEMA_VERSION = "automation-connection-manifest-v0.1";

export type AdapterType = "guided" | "events" | "api";
export type InputTransport = "manual_files" | "json_http" | "shared_reference";
export type OutputTransport = "manual_import" | "json_http" | "event_stream";
export type EventSource = "run_console" | "webhook" | "api_response";

export type ConnectionDraft = {
  name: string;
  taskKind: string;
  purpose: string;
  versionA: string;
  versionB: string;
  adapter: AdapterType;
  targetUrl: string;
  inputTransport: InputTransport;
  outputTransport: OutputTransport;
  eventSource: EventSource;
};

export type ContractCheck = {
  id: "identity" | "versions" | "adapter" | "input" | "output" | "events";
  label: string;
  passed: boolean;
  detail: string;
};

export type AutomationConnectionManifest = {
  schema_version: typeof AUTOMATION_CONNECTION_SCHEMA_VERSION;
  manifest_id: string;
  automation: {
    automation_id: string;
    display_name: string;
    task_kind: string;
    purpose: string;
  };
  versions: {
    current: { role: "A"; version_id: string };
    candidate: { role: "B"; version_id: string } | null;
  };
  adapter: {
    type: AdapterType;
    target_url: string;
    credential_ref: null;
  };
  contracts: {
    input: { transport: InputTransport; schema_ref: string };
    output: { transport: OutputTransport; schema_ref: string };
    events: { source: EventSource; schema_ref: "event-schema.v0.3.json" | "event-schema.v0.4.json" };
  };
  validation: {
    contract_status: "valid" | "invalid";
    connectivity_status: "not_tested" | "manual_confirmation_required";
    checked_at: string;
    checks: ContractCheck[];
  };
  created_at: string;
};

function stableSuffix(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return hash.toString(36).slice(0, 6).padStart(6, "0");
}

export function automationIdFromName(name: string) {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || `automation-${stableSuffix(name)}`;
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isTaskKind(value: string) {
  return /^[a-z0-9][a-z0-9_-]*$/.test(value);
}

// A prepared setup is not a connection manifest. Task identity is supplied only
// by a verified package when the user explicitly connects that task.
export function inspectToolSetupDraft(draft: ConnectionDraft): ContractCheck[] {
  return inspectConnectionDraft(draft).map((check) => check.id === "identity" ? {
    ...check,
    passed: Boolean(draft.name.trim() && draft.purpose.trim()),
    detail: draft.name.trim() && draft.purpose.trim() ? "Tool identity declared; task type will be read from your task package" : "Tool name and purpose are required",
  } : check);
}

export function bindToolSetupToTask(draft: ConnectionDraft, taskKind: string): ConnectionDraft {
  if (!isTaskKind(taskKind)) throw new Error("The verified package must supply a valid task type ID.");
  const bound = { ...draft, taskKind };
  if (!inspectConnectionDraft(bound).every((check) => check.passed)) throw new Error("Complete the tool setup before connecting this task.");
  return bound;
}

export function toolSetupSignature(draft: ConnectionDraft): string {
  return JSON.stringify({ ...draft, taskKind: "" });
}

export function inspectStoredToolSetup(value: unknown): ConnectionDraft {
  if (typeof value !== "object" || value === null) throw new Error("Saved tool setup is invalid.");
  const candidate = value as Record<string, unknown>;
  const fields = ["name", "taskKind", "purpose", "versionA", "versionB", "adapter", "targetUrl", "inputTransport", "outputTransport", "eventSource"] as const;
  if (Object.keys(candidate).some((key) => !fields.includes(key as typeof fields[number])) || fields.some((key) => typeof candidate[key] !== "string")) throw new Error("Saved tool setup has unsupported fields.");
  if (!["guided", "events", "api"].includes(candidate.adapter as string) || !["manual_files", "json_http", "shared_reference"].includes(candidate.inputTransport as string) || !["manual_import", "json_http", "event_stream"].includes(candidate.outputTransport as string) || !["run_console", "webhook", "api_response"].includes(candidate.eventSource as string)) throw new Error("Saved tool setup has unsupported integration settings.");
  const draft = candidate as ConnectionDraft;
  if (!inspectToolSetupDraft(draft).every((check) => check.passed)) throw new Error("Saved tool setup does not pass the settings checks.");
  return draft;
}

export function inspectConnectionDraft(draft: ConnectionDraft): ContractCheck[] {
  const labels: Record<AdapterType, string> = {
    guided: "launch URL",
    events: "event endpoint",
    api: "API endpoint",
  };
  const taskKindValid = isTaskKind(draft.taskKind.trim());
  return [
    {
      id: "identity",
      label: "Automation identity",
      passed: Boolean(draft.name.trim() && taskKindValid && draft.purpose.trim()),
      detail: draft.name.trim() && taskKindValid && draft.purpose.trim() ? `Identity and task family ${draft.taskKind.trim()} declared` : "Name, purpose, and a lowercase task_family ID are required",
    },
    {
      id: "versions",
      label: "Immutable version A",
      passed: Boolean(draft.versionA.trim()),
      detail: draft.versionA.trim() ? `Current version: ${draft.versionA.trim()}` : "A commit, release, or version ID is required",
    },
    {
      id: "adapter",
      label: "Adapter target",
      passed: isHttpUrl(draft.targetUrl.trim()),
      detail: isHttpUrl(draft.targetUrl.trim()) ? `${labels[draft.adapter]} declared` : `A valid HTTP(S) ${labels[draft.adapter]} is required`,
    },
    {
      id: "input",
      label: "Input contract",
      passed: Boolean(draft.inputTransport),
      detail: `Transport: ${draft.inputTransport}`,
    },
    {
      id: "output",
      label: "Output contract",
      passed: Boolean(draft.outputTransport),
      detail: `Transport: ${draft.outputTransport}`,
    },
    {
      id: "events",
      label: "Event responsibility",
      passed: Boolean(draft.eventSource),
      detail: `Source: ${draft.eventSource}`,
    },
  ];
}

export function buildConnectionManifest(draft: ConnectionDraft, now = new Date()): AutomationConnectionManifest {
  const checkedAt = now.toISOString();
  const checks = inspectConnectionDraft(draft);
  const automationId = automationIdFromName(draft.name.trim());
  return {
    schema_version: AUTOMATION_CONNECTION_SCHEMA_VERSION,
    manifest_id: `${automationId}--${draft.versionA.trim()}`,
    automation: {
      automation_id: automationId,
      display_name: draft.name.trim(),
      task_kind: draft.taskKind.trim(),
      purpose: draft.purpose.trim(),
    },
    versions: {
      current: { role: "A", version_id: draft.versionA.trim() },
      candidate: draft.versionB.trim() ? { role: "B", version_id: draft.versionB.trim() } : null,
    },
    adapter: {
      type: draft.adapter,
      target_url: draft.targetUrl.trim(),
      credential_ref: null,
    },
    contracts: {
      input: { transport: draft.inputTransport, schema_ref: "automation-input.v0.1" },
      output: { transport: draft.outputTransport, schema_ref: "automation-output.v0.1" },
      events: { source: draft.eventSource, schema_ref: "event-schema.v0.4.json" },
    },
    validation: {
      contract_status: checks.every((check) => check.passed) ? "valid" : "invalid",
      connectivity_status: draft.adapter === "guided" ? "manual_confirmation_required" : "not_tested",
      checked_at: checkedAt,
      checks,
    },
    created_at: checkedAt,
  };
}
