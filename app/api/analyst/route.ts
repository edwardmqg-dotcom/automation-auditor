import { env } from "cloudflare:workers";
import { handleAnalystRequest, type AnalystRuntimeConfig } from "@/lib/analyst-handler.mjs";

export async function POST(request: Request) {
  const bindings = env as unknown as AnalystRuntimeConfig;
  const nodeEnv: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env;
  const config: AnalystRuntimeConfig = {
    NEBIUS_ANALYST_ENABLED: bindings.NEBIUS_ANALYST_ENABLED ?? nodeEnv.NEBIUS_ANALYST_ENABLED,
    NEBIUS_API_KEY: bindings.NEBIUS_API_KEY ?? nodeEnv.NEBIUS_API_KEY,
    NEBIUS_BASE_URL: bindings.NEBIUS_BASE_URL ?? nodeEnv.NEBIUS_BASE_URL,
    NEBIUS_MODEL: bindings.NEBIUS_MODEL ?? nodeEnv.NEBIUS_MODEL,
    ANALYST_REVIEWER_TOKEN_SHA256: bindings.ANALYST_REVIEWER_TOKEN_SHA256 ?? nodeEnv.ANALYST_REVIEWER_TOKEN_SHA256,
    ANALYST_PRICING_VERSION: bindings.ANALYST_PRICING_VERSION ?? nodeEnv.ANALYST_PRICING_VERSION,
    ANALYST_PRICING_VERIFIED_AT: bindings.ANALYST_PRICING_VERIFIED_AT ?? nodeEnv.ANALYST_PRICING_VERIFIED_AT,
    ANALYST_PRICING_VALID_UNTIL: bindings.ANALYST_PRICING_VALID_UNTIL ?? nodeEnv.ANALYST_PRICING_VALID_UNTIL,
    ANALYST_BUDGET_DB: bindings.ANALYST_BUDGET_DB,
  };
  return handleAnalystRequest(request, config);
}
