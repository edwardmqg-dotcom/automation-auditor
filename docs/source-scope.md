# Source scope and provenance

This source candidate contains Automation Auditor's application code, local build configuration, schemas, tests, four offline fixtures, dependency lockfile, credential-free configuration templates and license notices. It starts with an empty tool and task workspace. Users explicitly connect an external tool and import their own task package.

## Retained and developed components

The project retains a starter framework, shadcn UI components and stylesheet, and a Sites Vite plugin. These are distinct from Automation Auditor's connection manifests, file integrity checks, append-only run events, user completion and timing records, deterministic reports, device-local recovery and Nebius analyst integration. Third-party source and notices remain under their own licenses. No unverified date of creation is assigned to retained starter code.

Material Auditor is an existing external system used in development and experiments. Its A and B implementations are not included in this source candidate. Offline records of those experiments are clearly labelled in `lib/fixtures/`; they do not automatically load a tested tool or task. Supplier PDF/XLSX inputs and the user's Numbers results are not included.

## Excluded files

The candidate excludes actual `.dev.vars` and `.env` files, API credentials, private deployment bindings, installed dependencies, build output, browser databases, personal documents, the parent workspace's project management files and Git history, and original evidence archives. Only the two empty configuration templates `.dev.vars.example` and `.env.example` are included; both keep analysis disabled.

## Current evidence limits

Historical Supplier014 A/B records are descriptive observations from one operator, repeated material and fixed Human→A→B order, with development exposure for B. Net Human baseline time is unknown. The source does not certify business accuracy, enterprise ROI, causal efficiency or production safety. Users decide task completion; code calculates recorded time; the model only explains constrained observations and uncertain hypotheses.

## Publication status

The public GitHub repository was created empty on 2026-10-07. This candidate is prepared locally and is not a public release, deployment or completed submission. There is no release commit yet. The owner must review publication scope and retained records before upload. A free reviewer route, any safe public AI access, actual video and final submission are separate remaining work.

Do not publicly enable the analyst endpoint with a shared key as-is. Its default-disabled gate is not authentication, rate limiting or a quota cap. No paid model request is needed to run the offline tests.
