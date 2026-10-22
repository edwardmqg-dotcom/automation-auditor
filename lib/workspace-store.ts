import { ACTIVE_WORKSPACE_ID, buildWorkspaceSnapshot, inspectWorkspaceSnapshot, type LocalWorkspaceSnapshot, type StoredAutomationConnection } from "./workspace-snapshot.mjs";
import { inspectStoredToolSetup, type ConnectionDraft } from "./automation-connection";
import { inspectTaskInputDraft, type TaskInputDraft } from "./task-input-draft";

const DATABASE_NAME = "automation-auditor-local-workspace-v0.1";
const STORE_NAME = "workspace_snapshots";
const SETUP_STORE_NAME = "tool_setup_drafts";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "snapshot_id" });
      if (!database.objectStoreNames.contains(SETUP_STORE_NAME)) database.createObjectStore(SETUP_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local workspace store."));
    request.onblocked = () => reject(new Error("Close other Automation Auditor tabs on this address, then reload to update the local workspace."));
  });
}

export async function saveToolSetupDraft(draft: ConnectionDraft) {
  const checked = inspectStoredToolSetup(draft);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(SETUP_STORE_NAME, "readwrite");
      tx.objectStore(SETUP_STORE_NAME).put(checked, "prepared");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Tool setup could not be saved."));
      tx.onabort = () => reject(tx.error ?? new Error("Tool setup save was interrupted."));
    });
  } finally { database.close(); }
}

export async function loadToolSetupDraft(): Promise<ConnectionDraft | null> {
  const database = await openDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction(SETUP_STORE_NAME, "readonly").objectStore(SETUP_STORE_NAME).get("prepared");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Tool setup could not be restored."));
    });
    return value === null ? null : inspectStoredToolSetup(value);
  } finally { database.close(); }
}

// Reuse the existing v2 draft store; never migrate or rewrite workspace/run data.
export async function saveTaskInputDraft(draft: TaskInputDraft) {
  const checked = inspectTaskInputDraft(draft);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(SETUP_STORE_NAME, "readwrite");
      tx.objectStore(SETUP_STORE_NAME).put(checked, "task-input-v1");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Task description could not be saved."));
      tx.onabort = () => reject(tx.error ?? new Error("Task description save was interrupted."));
    });
  } finally { database.close(); }
}

export async function loadTaskInputDraft(): Promise<TaskInputDraft | null> {
  const database = await openDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction(SETUP_STORE_NAME, "readonly").objectStore(SETUP_STORE_NAME).get("task-input-v1");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Task description could not be restored."));
    });
    return value === null ? null : inspectTaskInputDraft(value);
  } finally { database.close(); }
}

export async function clearToolSetupDraft() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(SETUP_STORE_NAME, "readwrite");
      tx.objectStore(SETUP_STORE_NAME).delete("prepared");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Prepared setup could not be cleared."));
      tx.onabort = () => reject(tx.error ?? new Error("Prepared setup cleanup was interrupted."));
    });
  } finally { database.close(); }
}

export async function saveLocalWorkspace(automation: StoredAutomationConnection, benchmarkFiles: File[] = [], benchmarkAttached = false, completePreparedSetup = false) {
  const snapshot = buildWorkspaceSnapshot(automation, benchmarkFiles, benchmarkAttached);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(completePreparedSetup ? [STORE_NAME, SETUP_STORE_NAME] : STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(snapshot);
      if (completePreparedSetup) transaction.objectStore(SETUP_STORE_NAME).delete("prepared");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the local workspace."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The local workspace save was aborted."));
    });
  } finally {
    database.close();
  }
}

export async function loadLocalWorkspace(): Promise<LocalWorkspaceSnapshot | null> {
  const database = await openDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(ACTIVE_WORKSPACE_ID);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read the local workspace."));
    });
    if (value === null) return null;
    const inspected = inspectWorkspaceSnapshot(value);
    if (!inspected.snapshot) throw new Error(`Stored workspace rejected: ${inspected.errors.join(" ")}`);
    return inspected.snapshot;
  } finally {
    database.close();
  }
}

export async function clearLocalWorkspace() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(ACTIVE_WORKSPACE_ID);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear the local workspace."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The local workspace clear was aborted."));
    });
  } finally {
    database.close();
  }
}
