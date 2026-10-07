declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NEBIUS_API_KEY?: string;
    NEBIUS_ANALYST_ENABLED?: string;
    NEBIUS_BASE_URL?: string;
    NEBIUS_MODEL?: string;
  }
}
