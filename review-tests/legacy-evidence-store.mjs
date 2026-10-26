// Regression control reproducing the old saveEvidenceBundle default (`put`).
const dbName = "automation-auditor-local-evidence-v0.1";
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("evidence_bundles", { keyPath: "run_id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveEvidenceBundle(payload) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("evidence_bundles", "readwrite");
      tx.objectStore("evidence_bundles").put({ run_id: payload.manifest.run_id, saved_at: new Date().toISOString(), payload });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function listEvidenceBundles() {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("evidence_bundles", "readonly");
      const request = tx.objectStore("evidence_bundles").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
