export type AnalystRuntimeConfig = {
  NEBIUS_ANALYST_ENABLED?: string;
  NEBIUS_API_KEY?: string;
  NEBIUS_BASE_URL?: string;
  NEBIUS_MODEL?: string;
  ANALYST_REVIEWER_TOKEN_SHA256?: string;
  ANALYST_PRICING_VERSION?: string;
  ANALYST_PRICING_VERIFIED_AT?: string;
  ANALYST_PRICING_VALID_UNTIL?: string;
  ANALYST_BUDGET_DB?: D1Database;
};
export function handleAnalystRequest(request: Request, config: AnalystRuntimeConfig): Promise<Response>;
