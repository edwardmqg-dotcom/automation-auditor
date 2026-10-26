const DATABASE_NAME = "automation-auditor-local-evidence-v0.1";
const STORE_NAME = "evidence_bundles";
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME))
                database.createObjectStore(STORE_NAME, { keyPath: "run_id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Could not open the local evidence store."));
    });
}
export async function saveEvidenceBundle(payload) {
    const database = await openDatabase();
    try {
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, "readwrite");
            const record = { run_id: payload.manifest.run_id, saved_at: new Date().toISOString(), payload };
            // Run IDs are immutable evidence keys. `put` silently replaces a record
            // when another tab calculated the same next ID from a stale snapshot.
            let duplicateRunId = false;
            const request = transaction.objectStore(STORE_NAME).add(record);
            request.onerror = () => {
                duplicateRunId = request.error?.name === "ConstraintError";
            };
            const saveError = (fallback) => duplicateRunId
                ? new Error(`Run ${payload.manifest.run_id} is already stored. The existing evidence was left unchanged. Reload the workspace before continuing.`)
                : transaction.error ?? new Error(fallback);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(saveError("Could not save the evidence bundle."));
            transaction.onabort = () => reject(saveError("The evidence save was aborted."));
        });
    }
    finally {
        database.close();
    }
}
export async function listEvidenceBundles() {
    const database = await openDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result.sort((a, b) => b.saved_at.localeCompare(a.saved_at)));
            request.onerror = () => reject(request.error ?? new Error("Could not read the local evidence store."));
        });
    }
    finally {
        database.close();
    }
}
export async function clearEvidenceBundles() {
    const database = await openDatabase();
    try {
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear the local evidence store."));
            transaction.onabort = () => reject(transaction.error ?? new Error("The evidence clear was aborted."));
        });
    }
    finally {
        database.close();
    }
}
