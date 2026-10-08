# Independent deployment and access protection

Run deterministic recording, tests and a local build using README before considering hosted analysis. The public template contains no real account, database, key, reviewer code or pricing attestation. It does not target the existing production instance. Preparing or building this source does not authorize cloud resource creation, deployment, spending or publication.

## Configuration and build paths

`deployment/wrangler.example.json` describes the built Worker at `dist/server/index.js` and assets at `dist/client`, relative to the configuration directory. It is a disabled starting point, not an immediately deployable instance: `account_id` and `database_id` are deliberately blank, analysis is off, and workers.dev and preview publication are off.

After separate authorization, create a private working copy named `deployment/wrangler.local.json`; Git ignores that filename. Supply the operator's approved account, distinct Worker name, routes and database identifiers there. Never commit a filled-in file or overwrite the existing application's instance configuration. Secret values belong in server-side secrets, not JSON vars, client bundles or URLs. No deploy command is part of the normal build/test scripts.

The generated `dist/server/wrangler.json` is for the application's local build/runtime path. It is not the reviewer production configuration and must not be mistaken for a migrated hosted budget database. A static-assets-only deployment cannot execute `/api/analyst`.

## Budget database and migrations

Keep one cumulative ledger for one approved budget across updates. Do not create a replacement database to reset spending. The required binding is `ANALYST_BUDGET_DB`.

Use the numbered files in `deployment/cloud-migrations/`, in order, through the D1 migration runner. The first migration is the compatibility variant used for the October 7 deployment: it parenthesizes CASE expressions in SQLite triggers. The original `migrations/0001-analyst-budget.sql` is retained unchanged for provenance; an earlier cloud attempt with it failed. The second file is identical in both directories and transactionally preserves charges, requests, halt state and protections while changing the cumulative cap to US$25. The legacy ledger ID `reviewer-10usd-v1` does not mean a US$10 cap.

For an existing database, inspect the applied migration history and back up before any authorized change; do not blindly rerun migrations. Confirm the cap, preserved totals, request history, foreign-key checks and protection triggers afterwards. Fresh local test databases are synthetic checks, not production budget resets.

## Activation and private reviewer access

Analysis stays closed unless the exact opt-in, server key, reviewer-code digest, supported model/endpoint, current pricing attestations, request idempotency UUID and migrated budget binding are all valid. A key alone is insufficient. Generate and deliver the actual **Reviewer access code** only through an approved private channel; the server stores its SHA-256 digest. Never distribute the Nebius API key to reviewers.

The current policy pins `nvidia/nemotron-3-super-120b-a12b`, `https://api.tokenfactory.nebius.com/v1` and pricing version `nemotron-super-2026-10-07-buffer2-v1`. Pricing timestamps must follow an actual tariff check and span no more than seven days. The template supplies no timestamps. Expired pricing or missing protection closes analysis; do not copy expired dates, disable protection or invent a new verification date to maintain availability.

The cumulative US$25 application ledger is not a provider invoice or a whole-account/card hard cap. Key isolation, credit terms, automatic billing, taxes and a continued reviewer-access plan require operator review. Remote credentials, migrations, activation and paid validation need separately approved scope.

## Deployment and evidence are different records

The October 7 protected deployment came from local commit `083f525fd923bfc6f1732f59edc06a7b4a9a6137`; its Worker version was `fe566df2-a63c-4ba6-a6cb-6986cfb33934`. This public candidate changes documentation and configuration packaging, not application behavior. It is not a new deployed version or byte-identical copy of the production configuration.

Record the actual source commit, deployed version, environment, task version, original events, metrics, failures and human review for each future release. Missing Human active time remains unknown: it blocks Human savings claims, not historical A/B replay. A saved HTTP model response is not proof of a loaded-evidence browser call. No automatic model retry or new human timer/signature is required for offline replay.
