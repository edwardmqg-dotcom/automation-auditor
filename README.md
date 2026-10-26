# Automation Auditor

Automation Auditor measures active human work required to reach user-confirmed completion of a fixed task. It supports a manual baseline and two automation versions. It does not independently grade business results, invent missing time or promise enterprise ROI.

Tools and task files are explicitly connected and imported from disk. The product starts with no automation and no task; Material Auditor and supplier materials are not runtime defaults. Users control Start/Pause and sign their completion and timing decisions. Original outputs, revisions and append-only events retain distinct references.

For exact screen labels and the four-step path, see the [user guide](docs/user-guide.md), [release notes](docs/release-notes.md) and [deployment guidance](docs/deployment.md). Source and hosted builds use the same reviewed release; preparation alone does not publish or deploy it.

## Try a complete comparison

[Download the image replay kit and follow the English walkthrough](docs/reproduction/image-batch/README.md). It contains 12 synthetic PNGs, fresh working copies, fixed instructions and an offline arithmetic check. Measure a manual Preview workflow against Bulk Resize Photos, then view/download your own certificate. JSON and paid AI analysis are not required. Use your own reviewer reference and a separate workspace; your result need not match the recorded 24.6%. This is an explicit download, not a preloaded product task. Full private evidence, Material Auditor builds and credentials are excluded.

Comparable completed runs now offer **View certificate** in Compare and Audit Report. The certificate recalculates sealed evidence, shows the tool/task/version and the original reviewers, and supports offline HTML download and browser **Print / Save as PDF**. Presentation tiers use the unrounded time reduction: at least 50% gold/celebration; 20–less than 50% green; 0–less than 20% blue; negative deep red with a visible minus sign. Nonzero results keep the same “Less human work time” headline; a negative value represents additional human work. Exact zero says the recorded times are the same. These are visual tiers, not statistical significance or independent certification; the comparison formula and original events remain unchanged. Certificate files share task/reviewer information but omit result-file paths, task contents, credentials and live sharing links.

## Unified workflow

Run Console is the only tool-access entry: **Open tool → Confirm tool opened → Prepare run (timer stays off)** for Version A/B. Failed access can be reported and retried in place. Automations contains tool setup, not duplicate access controls. Opening or confirming a tool does not prepare a run or start timing. Recheck access after reloading; saved task and run evidence remain separate from this session check.

The October 22 unified release builds on public commit `4ee038c2b46bd7aff19bcee6e1dda6083389b024`. Release records map the exact reviewed source manifest to its actual Git commit and hosted artifact after separately authorized publication/deployment. No saved run receives a retroactively invented build identifier.

Home's **View example** displays the saved October 15 TEST ONLY summary rehearsal and original certificate metadata. It does not seed workspace records, connect a tool/task, start timing, sign completion or request analysis. The negligible difference illustrates essentially equal work time, not a business-productivity gain. See [source scope](docs/source-scope.md) for included metadata and excluded archives.

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

Home explains the four-step workflow: Automations → Benchmarks → Run Console → Compare. Audit Report is an optional evidence, import/export and AI-explanation view, not a prerequisite for viewing a time comparison. Automations uses its single **Save and continue to Benchmarks** handoff; other pages offer their next step without starting or pausing human timing.

In Automations, enter the tool and its versions, keep the four **Advanced Settings** defaults for manual file work, select **Check setup**, then **Save and continue to Benchmarks**. The eligible next action is blue. This saves a credential-free setup draft, not a final Automation Connection Manifest.

In Benchmarks, choose actual task materials and use one of two setup paths: include a supported task package JSON with its listed files, or describe the task in the app. The page explains this choice once. The **Describe your task** form appears only when selected materials do not include a declared task package; enter **Task name**, then answer **What should be done?**, **What should be delivered?** and **When is the task complete?**. Each answer must be nonempty, with no word-count, quotation or business-scoring requirement. **Prepare task** combines the answers in that order into the generated instructions TXT without interpreting or adding requirements. A valid package instead displays its task name, description and verified instruction-file reference as a summary, without editable setup fields; existing free-text instructions are not converted or rewritten. The app-generated v0.2 record fingerprints materials and locks the same criteria for Human/A/B. Changed answers create a different task and completion-criteria reference. A new local task uses internal `local_task`; an existing connection keeps its declared type. This is a task contract, not proof of tool capability. Generated IDs are content-based and date-bound; reuse the saved task for all comparison lanes.

If you have a supported task package JSON, include it with every file it lists; the declared inventory and hashes are checked. Ordinary JSON may also be task material. Multiple or invalid declared task packages are rejected rather than silently replacing their instructions. Raw-file preparation records the files actually chosen; without an external inventory it cannot tell whether the user forgot a document.

Explicitly confirm the prepared task connection. Only this confirmation builds the full connection and atomically saves it with task files and internal records. Merely preparing a draft does not replace existing connections or evidence. Tool settings and the task name/three answers are saved separately on this device; re-select pending files after reloading before final connection. Wait for the saved/restored message; if saving fails, copy the text before reloading. Check retained answers against newly selected materials. After confirmation, refresh restores and rechecks the record and file hashes. Internal JSON and JSON evidence exports do not require users to create a task package JSON.

Invalid file selections must be corrected before **Prepare task** is enabled. Read, fingerprint or preparation exceptions retain the description and offer a retry. **Import diagnostic** reports stage, filename and safe exception name, not a proven root cause. The button and handler share one eligibility rule; neither retries nor retained answers bypass manifest, inventory, fingerprint or comparison checks.

The manual-file preset is for users who open and operate the external tool themselves, provide its files, and import its result. Advanced transport and event-source options declare a handoff contract; choosing them does not implement an automatic task API or webhook receiver. Task Package v0.2 fixes completion instructions without reference answers; Run Manifest v0.3 locks task, input and completion-condition references. Historical packages remain compatible without rewriting their records.

For each lane, verify the handoff and prepare the run. The user starts active work, pauses for non-work and system-only waiting, saves the original output, and resumes timing for checking or necessary correction. After pausing, the user confirms completion and actual timing coverage; the product saves and seals evidence. Submission alone is not completion. Agent actions do not substitute for real user timing or signatures.

Run Console refers to the current button at each stage; preparing a run leaves timing off. **View task instructions** displays the actual connected text file after rechecking its size and SHA-256, with a local download for other formats. The task name is primary; full task IDs and instruction fingerprints remain in expandable technical details. No answers or completion criteria are regenerated by the reader.

Run Console distinguishes completing the task manually from using the connected tool. After saving the task result and pausing human work, select **Submit task result**. The form asks **Where is your saved task result?**; enter **Saved result file path or link**, followed by **Submit result**. This is a local path or online link to the task's original result, not the destination for Automation Auditor's report. Recording a reference does not save, upload or verify the business file. **Why add a result?** explains the purpose without opening by default: it links recorded time to the output, not an automated content or quality comparison. Cancel leaves the running lane and timer unchanged; submission requires a nonempty reference and a paused timer. Before final completion, edit the same result-path field if a corrected result was saved separately; leaving the field saves each valid change, with no extra update button or reason. Original submission events and all earlier references remain unchanged. Failed saves do not replace the prior reference; sealed records cannot be edited. Reference bookkeeping does not add human-active time. Pausing does not require a reason; the former **Log system wait** button is removed, while historical wait events remain readable and excluded from active human time.

Device-local IndexedDB stores credential-free connections, imported files, draft checkpoints and sealed evidence. Restored files are revalidated; live connectivity must be checked again. Export evidence before maintenance. Local checkpoints and exports are not server-authoritative storage or a guarantee against all data loss.

Human timing is controlled with Start/Pause. Run Console no longer provides **Timing correction**, segment exclusion or a pause-reason form; it does not add missed time or subtract estimated interruptions. Checking/correcting the task result can still be timed after submission. Historical timing-exclusion events remain readable and retain their original calculation semantics; this UI change does not delete or reinterpret them.

Deterministic code owns timing and comparisons. A comparable Human baseline and at least one automation version are required; version B is optional for a second version comparison. Missing, incomplete or mismatched evidence blocks savings claims. Unknown Human time is not zero; do not fill historical events for a recording.

**Save completion decision** requires the user's own completion decision, responsibility confirmation and truthful confirmation that all required active work was timed. If timing was incomplete, retain an incomplete record and repeat the whole task in that lane with a new run ID. Do not check the full-timing box merely to continue, estimate missing time, overwrite the earlier record or ask an agent to confirm on the user's behalf.

## Optional Nebius analysis

The UI's **AI analysis access code** is provided privately by the deployment administrator, not a Nebius API key or reviewer identity. It is held in memory. Without a code, users can still record timing, compare valid runs and export reports. This wording does not remove hosted authentication or budget protection.

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

An October 22 image-processing observation recorded 755,930ms for a predefined manual single-image Preview workflow and 569,850ms with Bulk Resize Photos: 186,080ms less active work, displayed as 24.6%. Both records share task inputs and completion criteria, with user-confirmed completion/full timing. This is one operator using synthetic images in a fixed order, not a universal performance or quality claim. See the [observation and limitations](docs/image-batch-observation.md). The separate image kit provides synthetic originals and a labelled arithmetic excerpt; full private run archives, processed outputs and the original downloaded certificate remain excluded. Nothing is automatically loaded into a workspace.

Manual baselines are matched by task, task version, inputs, review date and completion instructions, not by the tool name that happened to be connected during manual work. Original sealed manifests and events are preserved. Automation A/B records remain scoped to their actual tool and recorded version; different tools are not combined as versions of one tool. Completion and full-timing requirements remain mandatory.

Supplier014 A and B are sealed, user-confirmed records. A recorded 1,448,838 milliseconds and B 271,016. A reconstructed manual elapsed reference of approximately 20m47s includes communication and diagnostics; it is not equivalent to their active-work measurements. Net manual active time remains unknown, so no precise manual savings percentage is available. Repeated material, fixed Human→A→B order and B development exposure are not controlled.

A separate TEST ONLY summary rehearsal completed a same-task Human/ChatGPT A comparison on October 15: 256,463ms versus 256,114ms, a 349ms difference (about 0.136%). This verifies the workflow, not material productivity. It cannot fill the Supplier014 baseline gap, be combined with those A/B times or establish an immutable ChatGPT model snapshot. The read-only example contains a display copy of certificate metadata, including original reviewer/run IDs and fingerprints. Original task contents, PDFs, output locations and full private run archives are not shipped. Certificates are user-confirmed time comparisons, not independent quality certification.

A separately authorized v0.8 Nebius/NVIDIA call succeeded, but a hypothesis mistakenly treated A as the user's first exposure to the material. Only verified facts, limitations and integration evidence are used for demonstration; the full suggestions are not accepted. Offline fixtures are historical evidence, not new live calls or a release approval.

## Release gates

The public repository is [edwardmqg-dotcom/automation-auditor](https://github.com/edwardmqg-dotcom/automation-auditor). The October 22 unified application was published as commit `74bd582f1b2f609c016aa5f9bea5754185e7a386` and deployed as Worker `4a1de4ba-7c3a-45a8-9c82-54827ab5cab0`, as documented in [source scope](docs/source-scope.md). Public `main` was subsequently read at `937c0ecdc74a84d9148169e946ff915010bf8257`; its October 23 update was documentation-only. These are dated readbacks, not claims of current live status. Do not infer that this isolated follow-up has been published or deployed. MIT covers the owner's code under EddieM attribution; third-party notices and licenses remain in force.

The historical October 14 protection-only Worker `1c308932-df27-46bd-8739-78583c2c6572` predates the October 18 workflow UI baseline identified above. Do not describe this follow-up as deployed or older recordings as its current footage. Publication, deployment, live-call evidence, video and submission are distinct states. A static-only export cannot exercise the server route. See [source scope](docs/source-scope.md) and [deployment guidance](docs/deployment.md).

## Reviewer access and cumulative budget

The owner approved using existing Nebius credits with a **US$25 cumulative total budget**, not a daily allowance or permission for another $10 outside the balance. The local implementation requires all of the following before calling the provider: exact server opt-in, the server API key, a valid reviewer access code, current pricing verification, an idempotency UUID and a migrated D1 binding named `ANALYST_BUDGET_DB`. Missing protection fails closed. Do not expose an older unprotected build.

The current **AI analysis access code** field (called **Reviewer access code** in earlier UI versions) is a password input held in memory only. It is not a Nebius API key, is not added to exports or device-local storage, and must not appear in public Git, URLs or recordings. The server stores only its SHA-256 digest as `ANALYST_REVIEWER_TOKEN_SHA256`. Generate a strong random 32–256-character URL-safe code separately; no production code is generated by tests. The browser retains an idempotency identity following uncertain transport/settlement, with no automatic retry. A new intentional analysis after success gets a new identity; refresh does not preserve the client identity.

Apply `migrations/0001-analyst-budget.sql` followed by `0002-reviewer-budget-25usd.sql` to the isolated reviewer database before enabling inference. The second migration must run once in a transaction through the migration runner; it preserves charges, requests, halt state and the original ledger identity `reviewer-10usd-v1` (a legacy identifier, not the current cap). Atomic insertion triggers reserve funds, enforce one shared in-flight request and at most ten attempts per rolling minute. Replays are rejected before dispatch. Reuse the same cumulative database across instances and releases: switching to a fresh database is not permission to spend another $25. In the existing optional hosting configuration, `d1: "ANALYST_BUDGET_DB"` names the local binding; that declaration is not provisioning or applying a cloud migration.

Accounting uses integer nano-USD. [Official Nebius pricing](https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference), checked on 2026-10-07, lists Super at $0.30 per million input tokens and $0.90 per million output tokens, with a 256K context. Each attempt conservatively reserves the entire 262,144-token input allowance plus 4,096 output tokens, multiplied by two: $0.1646592. This avoids treating bytes as a token estimate. Known consistent returned usage settles with the same twofold buffer; reasoning already included in output is not charged again. Unknown or inconsistent usage keeps the full reservation; model/usage assumptions being exceeded halt further calls. Timeout, provider errors and settlement uncertainty do not automatically refund or retry. Crashed in-flight reservations require audited reconciliation, not a database reset.

The same official tariff was reverified on 2026-10-14. The owner-approved hackathon policy now requires `ANALYST_PRICING_VERSION=nemotron-super-2026-10-14-buffer2-hackathon-v2` and explicit `ANALYST_PRICING_VERIFIED_AT` and `ANALYST_PRICING_VALID_UNTIL` timestamps covering the request. Verification cannot precede the actual official tariff snapshot at `2026-10-14T00:00:03.604Z` or lie in the future. The validity ceiling is `2027-01-31T15:59:59.000Z` (Beijing January 31, 2027, 23:59:59); requests fail closed at that exact instant. A shorter configured window is still enforced. This replaces the previous seven-day forced expiry; it is not a provider price lock, an automatic price check, or permission to increase the $25 cap. Recheck actual tariffs during the event and before deployment; changed prices require a revised, reviewed policy rather than extending timestamps. Historical request pricing versions remain unchanged. The protected path pins `nvidia/nemotron-3-super-120b-a12b` and `https://api.tokenfactory.nebius.com/v1`. Different endpoints/models need a separately verified policy. All example values remain blank/disabled. The window was deployed October 14 and retained in the October 18 workflow baseline; this follow-up does not alter it or claim a new deployment.

This is a conservative application budget, **not a provider invoice or whole-account hard cap**. The buffer is not a guarantee against arbitrary price changes, taxes or costs caused by other users of the key. Verify the account tariff, billing settings, any credit expiry and isolation before live activation. [Nebius billing documentation](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new) describes possible automatic card charging; prepaid credit is not assumed to stop all charges. Historical protected deployments and calls remain evidence of those versions, not a new paid test or deployment of this local redesign. Budget/pricing stops must not be presented as satisfying unrestricted normal judging access.

Exclude secrets, private runtime directories, unrelated personal files and unapproved evidence from a public release.

## License

Automation Auditor's own code is licensed under the [MIT License](LICENSE), copyright (c) 2026 EddieM. Third-party code and dependencies remain under their respective licenses. Preserve `build/sites-vite-plugin.LICENSE`, `vendor/shadcn-tailwind-4.13.0.LICENSE.md` and applicable dependency notices. Material Auditor A/B are separately licensed external tested tools; this license does not relicense them or the parent workspace's unrelated files.
