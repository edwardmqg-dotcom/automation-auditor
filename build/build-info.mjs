export function resolveAuditorBuildId({ configuredId = "", gitRevision = "", gitDirty = false } = {}) {
  if (configuredId.trim()) return configuredId.trim();
  if (gitRevision.trim() && !gitDirty) return gitRevision.trim();
  return "local-development-uncommitted";
}
