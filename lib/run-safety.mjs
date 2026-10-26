export function isRunSetupLocked({ runState, workspaceStoreStatus, evidenceStoreStatus }) {
  return ["running", "submitted"].includes(runState)
    || workspaceStoreStatus !== "ready"
    || evidenceStoreStatus === "saving";
}

export function getRunStartBlocker({
  runPersistenceStatus,
  automationConnected,
  benchmarkAttached,
  criteria,
  criteriaMatches,
  connectivityVerified,
  runState,
  runIdStored,
}) {
  if (runPersistenceStatus !== "ready") return "Local run checkpoint is unavailable.";
  if (!automationConnected) return "Connect an automation before starting a run.";
  if (!benchmarkAttached) return "Attach a validated benchmark before starting a run.";
  if (!criteria?.trim()) return "The user must provide shared task completion criteria before starting.";
  if (!criteriaMatches) return "Task completion criteria do not match the attached benchmark.";
  if (!connectivityVerified) return "Verify automation connectivity before starting this automation run.";
  if (runState !== "ready") return "The selected run is not ready to start.";
  if (runIdStored) return "This run ID is already stored. Reload the workspace to select a new run ID.";
  return null;
}
