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

No key or `.openai/hosting.json` is required for local deterministic recording, tests or building. Existing D1/R2 binding names are retained if the optional hosting file exists; malformed configurations fail instead of being silently replaced. Instance bindings and real credentials stay outside the release. This local fallback is not a cloud database deployment.

The 2026-10-03 independent-directory check used Node v24.19.0 and npm 10.9.4 on macOS, a fresh dependency directory/cache and the original lockfile, without credentials or private hosting configuration. Installation with lifecycle scripts disabled, 85 library tests, 16 fixed-evidence checks, type checking, targeted lint and production build passed. This is not certification of every supported Node version, operating system or a separate machine. Dependency versions did not change.

Tests use four byte-identical offline fixtures in `lib/fixtures/`; provenance is recorded there. Their presence does not connect a tool, import tasks or replay a paid call.

See [fixture notes](lib/fixtures/README.md) for the distinction between synthetic tests and historical records, and [third-party notices](THIRD_PARTY_NOTICES.md) for retained code and dependency license information. This source package does not include installed dependencies, compiled bundles, Material Auditor implementations or supplier input documents.

## Task and evidence workflow

Register a tool and its versions with an Automation Connection Manifest. Import the task manifest and every inventoried input, validate file sizes and SHA-256, and explicitly attach the task. Task Package v0.2 fixes completion instructions without reference answers; Run Manifest v0.3 locks task, input and completion-condition references. Historical packages remain compatible without rewriting their records.

For each lane, verify the handoff and prepare the run. The user starts active work, pauses for non-work and system-only waiting, saves the original output, and resumes timing for checking or necessary correction. After pausing, the user confirms completion and actual timing coverage; the product saves and seals evidence. Submission alone is not completion. Agent actions do not substitute for real user timing or signatures.

Device-local IndexedDB stores credential-free connections, imported files, draft checkpoints and sealed evidence. Restored files are revalidated; live connectivity must be checked again. Export evidence before maintenance. Local checkpoints and exports are not server-authoritative storage or a guarantee against all data loss.

Deterministic code owns timing and comparisons. Missing, incomplete or mismatched evidence blocks savings claims. Unknown Human time is not zero; do not fill historical events for a recording.

## Optional Nebius analysis

Paid analysis is disabled by default, even if a server key is present. Only the exact server-side value `NEBIUS_ANALYST_ENABLED=true` opens the local readiness gate. No automatic retry is performed. This opt-in is not public authentication, rate limiting or a shared quota cap.

For a separately authorized local call, copy `.dev.vars.example` to the ignored `.dev.vars`, set the key privately and explicitly enable analysis. Do not use a `NEXT_PUBLIC_` variable, paste a key into the browser, or commit the file. `.env.example` documents the same server settings. The configured model is `nvidia/nemotron-3-super-120b-a12b`; the default endpoint is https://api.tokenfactory.nebius.com/v1.

For a built Worker, resolve the root secret file explicitly:

```bash
npm run start -- --port 5180 --env-file "$PWD/.dev.vars"
```

This command may enable paid calls if the file contains both explicit opt-in and a valid key. Do not use it for a no-cost demonstration. Complete or import reviewed evidence, then use Audit Report → Analyze evidence. A disabled or unconfigured server returns 503 with `model_call_made=false`; deterministic inspection and export remain available.

The server validates requests, permits only HTTPS Nebius Token Factory endpoints, does not follow redirects, and times out after 45 seconds. Generation requests JSON with temperature 0.1 and a 4096-token output cap. Refused, truncated, incomplete and invalid responses are rejected. Provider errors do not erase recorded runs.

Prompt `evidence-analyst-v0.8` presents deterministic observations and limitations. The model selects observations and adds explicitly uncertain hypotheses, evidence requests and an experiment suggestion, not numerical measurements or business acceptance scores. A limited known-wording guard rejects certain automatic business-acceptance premises; it is not complete semantic validation. All model suggestions require human review.

Call provenance contains model, prompt/generation versions, request identifiers, time, token usage when provided and fingerprints. The product returns call evidence and the upstream text fingerprint, not the full raw provider payload. Users must retain exported responses; server-side permanent archiving and provider zero retention are not claimed.

## Current study limitations

Supplier014 A and B are sealed, user-confirmed records. A recorded 1,448,838 milliseconds and B 271,016. The difference is descriptive only. Net manual time is unknown, so no manual savings percentage is available. Repeated material, fixed Human→A→B order and B development exposure are not controlled.

A separately authorized v0.8 Nebius/NVIDIA call succeeded, but a hypothesis mistakenly treated A as the user's first exposure to the material. Only verified facts, limitations and integration evidence are used for demonstration; the full suggestions are not accepted. Offline fixtures are historical evidence, not new live calls or a release approval.

## Release gates

This is a local release candidate, not a public deployment or completed hackathon submission. The owner has approved MIT licensing for their own code under the public copyright name EddieM. An empty public repository was created on 2026-10-07 at [edwardmqg-dotcom/automation-auditor](https://github.com/edwardmqg-dotcom/automation-auditor); this does not mean the product has been uploaded. Release commit, remaining third-party and privacy review, free reviewer access, actual video and final human approval remain pending. See [source scope and provenance](docs/source-scope.md).

Do not publicly enable `POST /api/analyst` as-is: access control, rate limits and shared quota protection have not been implemented or verified. Keeping the key server-side and defaulting analysis off does not make an enabled public endpoint safe. A static-only export cannot exercise the server route.

Exclude secrets, private runtime directories, unrelated personal files and unapproved evidence from a public release.

## License

Automation Auditor's own code is licensed under the [MIT License](LICENSE), copyright (c) 2026 EddieM. Third-party code and dependencies remain under their respective licenses. Preserve `build/sites-vite-plugin.LICENSE`, `vendor/shadcn-tailwind-4.13.0.LICENSE.md` and applicable dependency notices. Material Auditor A/B are separately licensed external tested tools; this license does not relicense them or the parent workspace's unrelated files.
