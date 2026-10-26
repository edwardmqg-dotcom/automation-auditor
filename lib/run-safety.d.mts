export function isRunSetupLocked(input: { runState: string; workspaceStoreStatus: string; evidenceStoreStatus: string }): boolean;
export function getRunStartBlocker(input: {
  runPersistenceStatus: string;
  automationConnected: boolean;
  benchmarkAttached: boolean;
  criteria: string;
  criteriaMatches: boolean;
  connectivityVerified: boolean;
  runState: string;
  runIdStored: boolean;
}): string | null;
