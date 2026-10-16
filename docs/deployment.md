# Independent deployment and protected updates

Use the README and user guide for local deterministic recording first. Building or preparing this source does not authorize deployment, credentials, database changes, publication or spending. The normal scripts do not deploy. Historical online versions are not automatically updated when local files change.

## Public packaging and private instance settings

The release package includes credential-free `.env.example`, `.dev.vars.example` and `deployment/wrangler.example.json`, plus compatible cloud migrations. Analysis is disabled; account/database IDs and pricing attestations stay blank. The template targets built `dist/server/index.js` and `dist/client`, relative to its deployment directory. It is not the existing instance configuration and is not ready to publish unchanged.

After separate approval, use an ignored `deployment/wrangler.local.json` and supply approved identifiers privately. Never commit production JSON, real pricing timestamps, API keys, reviewer codes/digests or browser databases. Server secrets must not enter client bundles or URLs. Build assets before packaging; a static-only export cannot run `/api/analyst`.

## Existing service upgrade

Keep the existing hostname, original D1 binding and cumulative ledger, secret bindings and approved budget. Do not create a replacement database, clear site data or reuse an old deployment merely to avoid migration. Export browser evidence first; an origin change creates a separate browser workspace, not migrated history.

The current UI uses IndexedDB version 2, adding the tool-setup draft store without deleting the original workspace store. Test a legacy version-1 workspace upgrade in an isolated environment before changing the hosted UI; the version-2 local rehearsal alone is not proof of that migration. Close extra same-origin tabs if an upgrade is blocked. Preserve sealed manifests and legacy exclusion-event semantics.

## Database and budget protection

The required D1 binding is `ANALYST_BUDGET_DB`. Fresh independent instances use numbered `deployment/cloud-migrations/` files in order. The first is the already-reviewed SQLite trigger compatibility variant; the original `migrations/0001-analyst-budget.sql` remains for provenance. The second sets the cumulative US$25 cap while preserving original ledger identity, charges, request history and protections. A legacy ledger ID containing `10usd` does not change the actual cap.

For an existing instance, inspect applied migrations and back up before an approved change; do not rerun migrations blindly. Read back cap, cumulative charges, in-flight requests, halt state and bindings after deployment. No reset or refund is implied by a new source version.

Activation requires exact opt-in, the server API key, reviewer digest, supported model/endpoint, valid pricing attestation, idempotency UUID and migrated budget binding. All fail closed; no automatic model retry is introduced. Deliver the **AI analysis access code** privately to authorized reviewers, never the Nebius key. The existing older hosted UI calls it **Reviewer access code**.

## Current protection window

The implementation pins `nvidia/nemotron-3-super-120b-a12b` at `https://api.tokenfactory.nebius.com/v1` and policy `nemotron-super-2026-10-14-buffer2-hackathon-v2`. `ANALYST_PRICING_VERIFIED_AT` must come from an actual tariff check, not a future/invented date; `ANALYST_PRICING_VALID_UNTIL` cannot exceed `2027-01-31T15:59:59.000Z` (Beijing January 31, 2027, 23:59:59). This replaces the earlier seven-day ceiling and does not increase the cumulative US$25 budget or lock a provider's price. Current tariffs and settings must be rechecked before an authorized rollout. A changed tariff requires reviewed policy changes, not fabricated timestamps. Public templates remain blank.

The protected October 14 service came from local commit `49bbc23fb89ec57d22e5db40ee63d831f71b9d6e`, Worker `1c308932-df27-46bd-8739-78583c2c6572`, retaining the older UI. This current workflow candidate is not that deployed build. Its existing saved calls are historical evidence; offline tests/builds do not invoke the provider or prove a new production inference succeeded. Budget/expiry protection is not proof that unrestricted judge access is fully satisfied. Reviewer delivery and continued availability need explicit operational review.

## Required record for a future release

Record the exact source commit, reviewed file manifest, deployed version/environment, task versions, original event/metric outputs, failures and human review. Append to existing Git history. Verify source/runtime/video agreement and the old-workspace migration before rollout. A dry run is not a deployment; a source publication is not a working-service update; a historical successful model call is not a newly executed one.
