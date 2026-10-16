# Source scope and provenance

This source candidate contains Automation Auditor's application code, local build configuration, schemas, tests, four offline fixtures, dependency lockfile, credential-free configuration templates and license notices. Users explicitly connect an external tool and import task materials. A user-supplied task package JSON is optional: supported packages provide the instructions, or the user answers three task questions and the application generates its internal versioned record. Neither path loads business reference answers or grades output quality.

## Retained and developed components

The project retains a starter framework, shadcn UI components and stylesheet, and a Sites Vite plugin. These are distinct from Automation Auditor's connection manifests, file integrity checks, append-only run events, user completion and timing records, deterministic reports, device-local recovery and Nebius analyst integration. Third-party source and notices remain under their own licenses. No unverified date of creation is assigned to retained starter code.

Material Auditor is an existing external system used in development and experiments. Its A and B implementations are not included in this source candidate. Offline records of those experiments are clearly labelled in `lib/fixtures/`; they do not automatically load a tested tool or task. Supplier PDF/XLSX inputs and the user's Numbers results are not included.

## Excluded files

The candidate excludes actual `.dev.vars` and `.env` files, API credentials, reviewer access codes and their actual digest, instance-specific production bindings and pricing attestations, installed dependencies, generated runtime files, build output, browser databases, personal documents, the parent workspace's project management files and Git history, and original evidence archives. `.dev.vars.example`, `.env.example` and `deployment/wrangler.example.json` are credential-free templates; analysis remains off and account/database/pricing fields remain blank. Original Supplier and new ChatGPT rehearsal materials, outputs and private records are not added to the candidate.

## Current evidence limits

Historical Supplier014 A/B records are descriptive observations from one operator, repeated material and fixed Human→A→B order, with development exposure for B. The approximate 20m47s reconstructed manual elapsed reference includes communication/diagnostics; net active baseline time remains unknown. A separate October 15 TEST ONLY Human/ChatGPT rehearsal recorded 256,463ms and 256,114ms; those records must not fill the Supplier014 gap. The source does not certify business accuracy, enterprise ROI, causal efficiency or production safety. Users decide completion; code calculates time; the model explains constrained observations and uncertain hypotheses.

## Publication status

The public repository's 161-file October 8 snapshot is commit `9674b093f103ebd4f9037d9b8a9147edeb447b8a`, still the main ref observed October 15. The hosted October 14 protection-window update uses frozen local source commit `49bbc23fb89ec57d22e5db40ee63d831f71b9d6e` and Worker `1c308932-df27-46bd-8739-78583c2c6572`, retaining the older UI. This new local candidate combines current workflow code with credential-free public packaging; it is not uploaded, deployed or submitted. Preserve the existing public Git history rather than replacing it with a separate release-root history.

Runtime Nemotron model, prompt and provider code have not changed in this workflow update. Historical live calls prove their recorded versions; no new paid call is required or claimed for documentation and offline regression. The backend includes reviewer authentication and a persistent US$25 cumulative ledger, but current examples remain disabled. The fixed policy ceiling is January 31, 2027, 15:59:59 UTC; this is an application protection window, not a provider price guarantee or an increase in budget. Actual credentials, production configuration, private judge delivery, updated UI/video agreement and final submission remain separate approval gates. See [deployment guidance](deployment.md).
