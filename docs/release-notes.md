# Local workflow update since October 8

## October 16 result certificate

The shared Compare/Audit Report result block now opens a printable Time Benchmark Certificate. Sealed bundles are revalidated and time recalculated; cached metrics, the AI analyst and estimates cannot supply the certificate's time. Original reviewer references and recorded tool versions are used. A content fingerprint identifies the source records and presentation, not an authenticated signature or independent accreditation.

Owner-approved presentation bands are ≥50% gold with celebration, ≥20% and <50% green, ≥0% and <20% blue, and negative deep red with an explicit minus sign. All nonzero results use “Less human work time”; the signed number distinguishes reduction from additional work. Exact zero says same time; a nonzero tiny change stays nonzero. Classification uses original precision. Self-contained HTML download and browser Print / Save as PDF do not upload data or create public links. Certificates omit task contents, result-file paths and credentials, but contain task names/reviewer references: users review recipients before sharing. Old records, timing rules, model path and storage formats are unchanged. This is a local addition, not a hosted release.

Status: current local source and a refreshed release candidate, not a new public release or deployment. The previous public main is `9674b093f103ebd4f9037d9b8a9147edeb447b8a`; the hosted protection-window version is `1c308932-df27-46bd-8739-78583c2c6572`. Source, deployment, recordings and evidence must be identified separately.

## User-facing changes

- Home provides a concise introduction, four steps and **Start evaluation**; page handoffs point to their actual next step. Audit Report remains optional after Compare.
- Setup separates **Check setup**, draft save, explicit task connection and **Check tool access**. Launch URL is first. Four visible **Advanced Settings** defaults share a short explanation; users no longer guess Task family.
- Task package JSON is optional. Users can import actual materials and answer three task questions; a supported package instead supplies the instructions. The generated internal record and file checks remain mandatory.
- Run Console distinguishes preparation from counting, displays the actual instructions, wraps long technical IDs and explains where task results are created. Submission registers a saved result path, not a report destination or task completion.
- One editable result-reference field records valid changes automatically before sealing; original references and events remain. No separate final-reference/update button or reason field is required.
- The UI no longer offers timing correction, whole-segment deletion or pause-reason logging. Historical exclusion/wait events remain readable and keep their calculation semantics.
- Normal completion requires actual full timing and the user's own responsibility/completion decisions. Incomplete records stay archived and direct the user to a new full measurement rather than a misleading comparison result.
- Same-task Human baselines can be reused across tools without rewriting their history. Automation A/B remain scoped to the same actual tool and registered versions. Compare and Audit Report use the same scope.
- AI explanations use simpler wording and a separate access-code layout. The runtime analyst, model prompt and provider path are unchanged.

## Evidence and compatibility

Run/event/metric formats are retained; no historical timer, output or signature is rewritten. The time-comparison eligibility rule changed to task-scoped Human reuse, while matching task/files/date/criteria, completion and full timing remain required. Workspace IndexedDB opens version 2 and adds a setup-draft store without deleting the existing workspace store. Export records before any hosted upgrade; closing other same-origin tabs may be necessary for the database upgrade. The already-version-2 local rehearsal is not by itself a full production version-1 migration test.

The October 15 TEST ONLY Human/ChatGPT sequence verified a real completed comparison and refresh restoration. It is distinct from historical Supplier014 business observations and the October 8 saved Nemotron call. Historical model evidence remains valid for the code/prompt and inputs it recorded, not as a newly executed call on this UI.

## Release checklist

Use the current guide and instructions, keep supported legacy bundles compatible, verify imported historical records and failure cases, and run the candidate tests/type/lint/build checks. Preserve the current origin and cumulative D1 ledger during a separately approved deployment; do not reset spending, credentials or browser storage. Recheck real tariff/production settings and take backups before any authorized change. Confirm legacy version-1 workspace migration in an isolated test before rollout. Replace footage showing changed forms/labels rather than overlaying new captions and calling it current UI. Publishing source, deploying, recording/uploading the final video and submitting to the hackathon each remain separate actions requiring the relevant review.
