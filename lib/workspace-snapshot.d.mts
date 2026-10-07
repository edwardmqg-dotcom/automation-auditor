import type { AutomationConnectionManifest } from "./automation-connection";

export const LOCAL_WORKSPACE_SCHEMA_VERSION: "local-workspace-snapshot-v0.1";
export const ACTIVE_WORKSPACE_ID: "active";

export type StoredAutomationConnection = {
  name: string;
  versionA: string;
  versionB: string;
  adapter: AutomationConnectionManifest["adapter"]["type"];
  manifest: AutomationConnectionManifest;
};

export type LocalWorkspaceSnapshot = {
  schema_version: typeof LOCAL_WORKSPACE_SCHEMA_VERSION;
  snapshot_id: typeof ACTIVE_WORKSPACE_ID;
  saved_at: string;
  automation: StoredAutomationConnection;
  benchmark: { files: File[]; attached: boolean } | null;
  connectivity_evidence_persisted: false;
};

export function buildWorkspaceSnapshot(automation: StoredAutomationConnection, benchmarkFiles?: File[], benchmarkAttached?: boolean, now?: Date): LocalWorkspaceSnapshot;
export function inspectWorkspaceSnapshot(value: unknown): { snapshot: LocalWorkspaceSnapshot | null; errors: string[] };
