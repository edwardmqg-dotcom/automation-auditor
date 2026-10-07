/**
 * Local cost opt-in, not public authorization, rate limiting or a quota cap.
 * @param {{NEBIUS_ANALYST_ENABLED?: string, NEBIUS_API_KEY?: string}} config
 * @returns {string | null}
 */
export function analystUnavailableReason(config) {
  if (config.NEBIUS_ANALYST_ENABLED !== "true") {
    return "Paid evidence analysis is disabled on the server. Set NEBIUS_ANALYST_ENABLED=true explicitly to enable it.";
  }
  if (!config.NEBIUS_API_KEY?.trim()) return "NEBIUS_API_KEY is not configured on the server.";
  return null;
}
