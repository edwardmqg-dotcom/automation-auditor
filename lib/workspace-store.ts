import { ACTIVE_WORKSPACE_ID, buildWorkspaceSnapshot, inspectWorkspaceSnapshot, type LocalWorkspaceSnapshot, type StoredAutomationConnection } from "./workspace-snapshot.mjs";

const DATABASE_NAME = "automation-auditor-local-workspace-v0.1";
const STORE_NAME = "workspace_snapshots";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "snapshot_id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local workspace store."));
  });
}

export async function saveLocalWorkspace(automation: StoredAutomationConnection, benchmarkFiles: File[] = [], benchmarkAttached = false) {
  const snapshot = buildWorkspaceSnapshot(automation, benchmarkFiles, benchmarkAttached);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(snapshot);
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
