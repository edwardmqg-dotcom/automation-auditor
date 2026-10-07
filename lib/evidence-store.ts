const DATABASE_NAME = "automation-auditor-local-evidence-v0.1";
const STORE_NAME = "evidence_bundles";

export type StoredEvidenceBundle<T> = {
  run_id: string;
  saved_at: string;
  payload: T;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "run_id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local evidence store."));
  });
}

export async function saveEvidenceBundle<T extends { manifest: { run_id: string } }>(payload: T, preventOverwrite = false) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const record = { run_id: payload.manifest.run_id, saved_at: new Date().toISOString(), payload } satisfies StoredEvidenceBundle<T>;
      if (preventOverwrite) transaction.objectStore(STORE_NAME).add(record);
      else transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the evidence bundle."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The evidence save was aborted."));
    });
  } finally {
    database.close();
  }
}

export async function listEvidenceBundles<T>(): Promise<StoredEvidenceBundle<T>[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as StoredEvidenceBundle<T>[]).sort((a, b) => b.saved_at.localeCompare(a.saved_at)));
      request.onerror = () => reject(request.error ?? new Error("Could not read the local evidence store."));
    });
  } finally {
    database.close();
  }
}

export async function clearEvidenceBundles() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear the local evidence store."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The evidence clear was aborted."));
    });
  } finally {
    database.close();
  }
}
