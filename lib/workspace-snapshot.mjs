export const LOCAL_WORKSPACE_SCHEMA_VERSION = "local-workspace-snapshot-v0.1";
export const ACTIVE_WORKSPACE_ID = "active";

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildWorkspaceSnapshot(automation, benchmarkFiles = [], benchmarkAttached = false, now = new Date()) {
  if (!isObject(automation) || !isObject(automation.manifest)) throw new Error("A valid automation connection is required.");
  if (automation.manifest.adapter?.credential_ref !== null) throw new Error("Credentials must not be stored in the local workspace snapshot.");
  if (!Array.isArray(benchmarkFiles)) throw new Error("Benchmark files must be an array.");
  return {
    schema_version: LOCAL_WORKSPACE_SCHEMA_VERSION,
    snapshot_id: ACTIVE_WORKSPACE_ID,
    saved_at: now.toISOString(),
    automation,
    benchmark: benchmarkFiles.length > 0 ? { files: benchmarkFiles, attached: Boolean(benchmarkAttached) } : null,
    connectivity_evidence_persisted: false,
  };
}

export function inspectWorkspaceSnapshot(value) {
  const errors = [];
  if (!isObject(value)) return { snapshot: null, errors: ["The workspace snapshot must be an object."] };
  if (value.schema_version !== LOCAL_WORKSPACE_SCHEMA_VERSION) errors.push(`schema_version must be ${LOCAL_WORKSPACE_SCHEMA_VERSION}.`);
  if (value.snapshot_id !== ACTIVE_WORKSPACE_ID) errors.push(`snapshot_id must be ${ACTIVE_WORKSPACE_ID}.`);
  if (typeof value.saved_at !== "string" || !value.saved_at || Number.isNaN(Date.parse(value.saved_at))) errors.push("saved_at must be a valid timestamp.");
  if (value.connectivity_evidence_persisted !== false) errors.push("Connectivity evidence must not be persisted across browser sessions.");
  if ("connectivity_evidence" in value || "connectivityEvidence" in value) errors.push("Connectivity evidence is forbidden in a local workspace snapshot.");

  if (!isObject(value.automation) || !isObject(value.automation.manifest)) {
    errors.push("A stored automation connection is required.");
  } else {
    const manifest = value.automation.manifest;
    if (manifest.schema_version !== "automation-connection-manifest-v0.1") errors.push("The stored automation manifest version is unsupported.");
    if (manifest.adapter?.credential_ref !== null) errors.push("Stored automation credentials are forbidden.");
    if (manifest.validation?.contract_status !== "valid") errors.push("The stored automation contract is not valid.");
  }

  if (value.benchmark !== null) {
    if (!isObject(value.benchmark) || !Array.isArray(value.benchmark.files) || value.benchmark.files.length < 1 || typeof value.benchmark.attached !== "boolean") {
      errors.push("The stored benchmark package is malformed.");
    } else {
      for (const [index, file] of value.benchmark.files.entries()) {
        if (!isObject(file) || typeof file.name !== "string" || !file.name || !Number.isInteger(file.size) || file.size < 0 || typeof file.type !== "string") {
          errors.push(`benchmark.files[${index}] is not a valid stored file.`);
        }
      }
    }
  }

  return { snapshot: errors.length === 0 ? value : null, errors };
}
