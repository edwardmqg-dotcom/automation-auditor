# Source scope and provenance

This repository contains Automation Auditor's application code, local build configuration, schemas, tests, four offline fixtures, dependency lockfile, credential-free configuration templates and license notices. It also provides the separately downloadable image replay kit below. Users explicitly connect an external tool and import task materials. A user-supplied task package JSON is optional: supported packages provide the instructions, or the user answers three task questions and the application generates its internal versioned record. Neither path loads business reference answers or grades output quality.

## Retained and developed components

The project retains a starter framework, shadcn UI components and stylesheet, and a Sites Vite plugin. These are distinct from Automation Auditor's connection manifests, file integrity checks, append-only run events, user completion and timing records, deterministic reports, device-local recovery and Nebius analyst integration. Third-party source and notices remain under their own licenses. No unverified date of creation is assigned to retained starter code.

Material Auditor is an existing external system used in development and experiments. Its A and B implementations are not included in this source candidate. Offline records of those experiments are clearly labelled in `lib/fixtures/`; they do not automatically load a tested tool or task. Supplier PDF/XLSX inputs and the user's Numbers results are not included.

## Excluded files

The candidate excludes actual `.dev.vars` and `.env` files, API credentials, reviewer access codes and their actual digest, instance-specific production bindings and pricing attestations, installed dependencies, generated runtime files, build output, browser databases, personal documents, the parent workspace's project management files and Git history, and original evidence archives. `.dev.vars.example`, `.env.example` and `deployment/wrangler.example.json` are credential-free templates; analysis remains off and account/database/pricing fields remain blank. Original Supplier and ChatGPT task contents, PDFs, output locations and full private run archives are excluded. The display-only certificate metadata described below is an explicit exception, not a full evidence archive.

## Read-only example metadata

`lib/examples/summary-certificate.json` is a byte-identical display copy of saved October 15 TEST ONLY certificate metadata. It contains original dates, tool/task names and versions, recorded times, reviewer reference EddieM, certificate/run identifiers and fingerprints. It does not contain original task contents, PDFs, result-file paths, raw events or credentials. View example displays it separately and never imports it into user records, connects a tool, starts timing, signs completion or calls a model.

The owner explicitly approved this metadata in the unified release, published as commit `74bd582f1b2f609c016aa5f9bea5754185e7a386` on October 22, 2026. It illustrates essentially equal-time rehearsal observations, not business efficiency or independent quality certification.

## Current evidence limits

The English [image-batch observation](image-batch-observation.md) summarizes a separate user-completed task: manual 755,930ms, automation 569,850ms, difference 186,080ms (display 24.6%). This adds a non-document-review observation, not a replacement for the Supplier014 manual gap.

On October 23, 2026, the owner separately authorized the [image replay kit and English guide](reproduction/image-batch/README.md). ZIP SHA-256: `dc098c7d2d6688b0f94773f8731d729ed2916a189ba7c90f2aa11bd1cbd4bf5a`. It contains 12 synthetic PNG originals and working copies, fixed instructions, an optional reconstructed manifest, integrity scripts/licenses, empty output folders and a labelled derived arithmetic excerpt. That excerpt includes EddieM, original run IDs, two active-work segment timestamps, durations and source-record hashes. It is not an importable evidence bundle or independent authentication. The manifest is reconstructed, not a recovered original export. Images retain the original CC0 declaration and scripts/guide additions the included MIT notice. Nothing is preloaded into a workspace.

Full raw run bundles, local absolute paths, processed JPEG results, certificate HTML/PDF and private reviewer packets remain excluded. Neither the private image-evidence ZIP nor the private Material Auditor test-build ZIP is authorized for public release. New testers must use their own records/reviewer reference; their measured percentage need not match 24.6%.

Historical Supplier014 A/B records are descriptive observations from one operator, repeated material and fixed Human→A→B order, with development exposure for B. The approximate 20m47s reconstructed manual elapsed reference includes communication/diagnostics; net active baseline time remains unknown. A separate October 15 TEST ONLY Human/ChatGPT rehearsal recorded 256,463ms and 256,114ms; those records must not fill the Supplier014 gap. The source does not certify business accuracy, enterprise ROI, causal efficiency or production safety. Users decide completion; code calculates time; the model explains constrained observations and uncertain hypotheses.

## Publication status

The October 22 unified application was published as commit `74bd582f1b2f609c016aa5f9bea5754185e7a386`, retaining parent `4ee038c2b46bd7aff19bcee6e1dda6083389b024`, and deployed as Worker `4a1de4ba-7c3a-45a8-9c82-54827ab5cab0`. It combines saved drafts/import diagnostics, the read-only example and the single Run Console access flow. The October 23 image-kit publication is documentation/download-only: no application runtime, deployment, production configuration or saved browser records are changed. Its Git parent and changed-file manifest identify that distinction; a documentation commit is not a new deployed application build.

Runtime Nemotron model, prompt and provider code have not changed in this follow-up. Historical live calls prove their recorded versions; documentation and offline regression do not claim a new paid call. Credential templates keep analysis disabled; the backend retains reviewer authentication and its US$25 cumulative ledger. The fixed ceiling is January 31, 2027, 15:59:59 UTC: an application protection window, not a provider price guarantee or increased budget. Publication, hosted deployment, private access delivery, video adoption and submission remain distinct actions. See [deployment guidance](deployment.md).
