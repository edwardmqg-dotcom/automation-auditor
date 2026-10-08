# Automation Auditor

Automation Auditor measures active human work required to reach user-confirmed completion of a fixed task. It supports a manual baseline and two automation versions. It does not independently grade business results, invent missing time or promise enterprise ROI.

Tools and task files are explicitly connected and imported from disk. The product starts with no automation and no task; Material Auditor and supplier materials are not runtime defaults. Users control Start/Pause and sign their completion and timing decisions. Original outputs, revisions and append-only events retain distinct references.

## Run locally

Use Node.js 22.13.0 or later and npm. Run inside this application directory:

```bash
npm ci --ignore-scripts --workspaces=false --include=dev --include=optional
node --test lib/*.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
npm run build
npm run start -- --port 5180
```

Open http://127.0.0.1:5180. For development, `npm run dev` uses port 5173. Do not rebuild over or restart an active real recorder workspace. Use a separate copy and origin for demonstrations.

No key or `.openai/hosting.json` is required for local deterministic recording, tests or building. Existing D1/R2 binding names are retained if the optional hosting file exists; malformed configurations fail instead of being silently replaced. Actual instance identifiers and real credentials stay outside this candidate. A disabled public deployment template is included separately. This local fallback is not a cloud database deployment.

The 2026-10-03 independent-directory check used Node v24.19.0 and npm 10.9.4 on macOS, a fresh dependency directory/cache and the original lockfile, without credentials or private hosting configuration. Installation with lifecycle scripts disabled, 85 library tests, 16 fixed-evidence checks, type checking, targeted lint and production build passed. This is not certification of every supported Node version, operating system or a separate machine. Dependency versions did not change.

Tests use four byte-identical offline fixtures in `lib/fixtures/`; provenance is recorded there. Their presence does not connect a tool, import tasks or replay a paid call.

See [fixture notes](lib/fixtures/README.md) for the distinction between synthetic tests and historical records, and [third-party notices](THIRD_PARTY_NOTICES.md) for retained code and dependency license information. This source package does not include installed dependencies, compiled bundles, Material Auditor implementations or supplier input documents.

## Task and evidence workflow

Register a tool and its versions with an Automation Connection Manifest. Import the task manifest and every inventoried input, validate file sizes and SHA-256, and explicitly attach the task. Task Package v0.2 fixes completion instructions without reference answers; Run Manifest v0.3 locks task, input and completion-condition references. Historical packages remain compatible without rewriting their records.

For each lane, verify the handoff and prepare the run. The user starts active work, pauses for non-work and system-only waiting, saves the original output, and resumes timing for checking or necessary correction. After pausing, the user confirms completion and actual timing coverage; the product saves and seals evidence. Submission alone is not completion. Agent actions do not substitute for real user timing or signatures.

Device-local IndexedDB stores credential-free connections, imported files, draft checkpoints and sealed evidence. Restored files are revalidated; live connectivity must be checked again. Export evidence before maintenance. Local checkpoints and exports are not server-authoritative storage or a guarantee against all data loss.

Deterministic code owns timing and comparisons. Missing, incomplete or mismatched evidence blocks savings claims. Unknown Human time is not zero; do not fill historical events for a recording.

## Optional Nebius analysis

Paid analysis is disabled by default, even if a server key is present. The exact server-side value `NEBIUS_ANALYST_ENABLED=true` is necessary but not sufficient: the protected handler also requires the key, reviewer-code digest, verified pricing, idempotency identity and migrated D1 budget binding described below. No automatic retry is performed. The opt-in alone is not authentication or a spending cap.

For separately authorized local analysis, configure all required protection privately, including a local migrated D1 binding. Copy `.dev.vars.example` to the ignored `.dev.vars` only as a starting point; a key and opt-in by themselves will still fail closed. Do not use a `NEXT_PUBLIC_` variable, paste a key into the browser, or commit the file. `.env.example` documents the same server settings. The configured model is `nvidia/nemotron-3-super-120b-a12b`; the default endpoint is https://api.tokenfactory.nebius.com/v1.

For a built Worker, resolve the root secret file explicitly:

```bash
npm run start -- --port 5180 --env-file "$PWD/.dev.vars"
```

This command loads private settings; it can permit paid calls only if all protection prerequisites are valid. Do not use it for a no-cost demonstration. Complete or import reviewed evidence, then enter **Reviewer access code** under **Nebius Evidence Analyst** and use **Analyze evidence** only with separate authorization. A disabled or unconfigured server returns 503 with `model_call_made=false`; deterministic inspection and export remain available.

The server validates requests, permits only HTTPS Nebius Token Factory endpoints, does not follow redirects, and times out after 45 seconds. Generation requests JSON with temperature 0.1 and a 4096-token output cap. Refused, truncated, incomplete and invalid responses are rejected. Provider errors do not erase recorded runs.

Prompt `evidence-analyst-v0.8` presents deterministic observations and limitations. The model selects observations and adds explicitly uncertain hypotheses, evidence requests and an experiment suggestion, not numerical measurements or business acceptance scores. A limited known-wording guard rejects certain automatic business-acceptance premises; it is not complete semantic validation. All model suggestions require human review.

Call provenance contains model, prompt/generation versions, request identifiers, time, token usage when provided and fingerprints. The product returns call evidence and the upstream text fingerprint, not the full raw provider payload. Users must retain exported responses; server-side permanent archiving and provider zero retention are not claimed.

## Current study limitations

Supplier014 A and B are sealed, user-confirmed records. A recorded 1,448,838 milliseconds and B 271,016. The difference is descriptive only. Net manual time is unknown, so no manual savings percentage is available. Repeated material, fixed Human→A→B order and B development exposure are not controlled.

A separately authorized v0.8 Nebius/NVIDIA call succeeded, but a hypothesis mistakenly treated A as the user's first exposure to the material. Only verified facts, limitations and integration evidence are used for demonstration; the full suggestions are not accepted. Offline fixtures are historical evidence, not new live calls or a release approval.

## Release gates

As of October 8, 2026, the approved 152-file source snapshot is published at [edwardmqg-dotcom/automation-auditor](https://github.com/edwardmqg-dotcom/automation-auditor), commit `e40c0b0566d44d57432d42848613cb3c29adb95a`. A protected application was deployed separately on October 7; its frozen local source is commit `083f525fd923bfc6f1732f59edc06a7b4a9a6137`, Worker version `fe566df2-a63c-4ba6-a6cb-6986cfb33934`. The current public repository does not yet contain that update.

This independent candidate keeps that frozen application implementation and replaces instance-specific deployment configuration with a disabled blank template. It also updates documentation and configuration exclusions; it is not byte-identical to the deployed snapshot, a new deployment or an approved public update. The owner approved MIT licensing for their own code under EddieM. Exact new publication scope, private reviewer delivery, availability, video and final submission remain subject to review. See [source scope and provenance](docs/source-scope.md) and [deployment guide](docs/deployment.md). A static-only export cannot exercise the server route.

## Reviewer access and cumulative budget

The owner approved using existing Nebius credits with a **US$25 cumulative total budget**, not a daily allowance or permission for another $10 outside the balance. The local implementation requires all of the following before calling the provider: exact server opt-in, the server API key, a valid reviewer access code, current pricing verification, an idempotency UUID and a migrated D1 binding named `ANALYST_BUDGET_DB`. Missing protection fails closed. Do not expose an older unprotected build.

The **Reviewer access code** field is a password input held in memory only. It is not a Nebius API key, is not added to exports or device-local storage, and must not appear in public Git, URLs or recordings. The server stores only its SHA-256 digest as `ANALYST_REVIEWER_TOKEN_SHA256`. Generate a strong random 32–256-character URL-safe code separately; no production code is generated by tests. The browser retains an idempotency identity following uncertain transport/settlement, with no automatic retry. A new intentional analysis after success gets a new identity; refresh does not preserve the client identity.

For Cloudflare D1, use the numbered files in `deployment/cloud-migrations/`, in order, through the migration runner before enabling inference. The first is the deployed compatibility variant of `migrations/0001-analyst-budget.sql`, with CASE expressions parenthesized; the original version previously failed in the cloud runner and is retained for provenance, not offered as the successful production migration. The second migration is byte-identical in both directories and must run once in a transaction; it preserves charges, requests, halt state and the original ledger identity `reviewer-10usd-v1` (a legacy identifier, not the current cap). Atomic insertion triggers reserve funds, enforce one shared in-flight request and at most ten attempts per rolling minute. Replays are rejected before dispatch. Reuse the same cumulative database across instances and releases: switching to a fresh database is not permission to spend another $25. In the optional hosting configuration, `d1: "ANALYST_BUDGET_DB"` names a local binding; that declaration is not provisioning or applying a cloud migration. See the deployment guide before any remote action.

Accounting uses integer nano-USD. [Official Nebius pricing](https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference), checked on 2026-10-07, lists Super at $0.30 per million input tokens and $0.90 per million output tokens, with a 256K context. Each attempt conservatively reserves the entire 262,144-token input allowance plus 4,096 output tokens, multiplied by two: $0.1646592. This avoids treating bytes as a token estimate. Known consistent returned usage settles with the same twofold buffer; reasoning already included in output is not charged again. Unknown or inconsistent usage keeps the full reservation; model/usage assumptions being exceeded halt further calls. Timeout, provider errors and settlement uncertainty do not automatically refund or retry. Crashed in-flight reservations require audited reconciliation, not a database reset.

Pricing configuration must match `ANALYST_PRICING_VERSION=nemotron-super-2026-10-07-buffer2-v1` and include explicit `ANALYST_PRICING_VERIFIED_AT` and `ANALYST_PRICING_VALID_UNTIL` timestamps covering the request, no more than seven days apart. These attestations require an actual current price check; do not blindly renew dates. The protected path pins `nvidia/nemotron-3-super-120b-a12b` and `https://api.tokenfactory.nebius.com/v1`. Different endpoints/models need a separately verified policy. All example values remain blank/disabled.

This is a conservative application budget, **not a provider invoice or whole-account hard cap**. The buffer is not a guarantee against arbitrary price changes, taxes or costs caused by other users of the key. Verify the account tariff, billing settings, any credit expiry and isolation before live activation. [Nebius billing documentation](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new) describes possible automatic card charging; prepaid credit is not assumed to stop all charges. The separately authorized October 7 protected product-HTTP call succeeded once: 3,421 tokens and 9.479 seconds, with $0.0038682 conservatively settled by the application ledger, not a provider invoice. Preparing this candidate creates no additional cloud resource, credential or paid call. Loaded-evidence browser analysis/export and availability-through-judging are not yet fully verified. Budget/pricing stops must not be presented as satisfying unrestricted normal judging access.

Exclude secrets, private runtime directories, unrelated personal files and unapproved evidence from a public release.

## License

Automation Auditor's own code is licensed under the [MIT License](LICENSE), copyright (c) 2026 EddieM. Third-party code and dependencies remain under their respective licenses. Preserve `build/sites-vite-plugin.LICENSE`, `vendor/shadcn-tailwind-4.13.0.LICENSE.md` and applicable dependency notices. Material Auditor A/B are separately licensed external tested tools; this license does not relicense them or the parent workspace's unrelated files.
