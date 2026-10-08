# Source scope and provenance

This source candidate contains Automation Auditor's application code, local build configuration, schemas, tests, four offline fixtures, dependency lockfile, credential-free configuration templates and license notices. It starts with an empty tool and task workspace. Users explicitly connect an external tool and import their own task package.

## Retained and developed components

The project retains a starter framework, shadcn UI components and stylesheet, and a Sites Vite plugin. These are distinct from Automation Auditor's connection manifests, file integrity checks, append-only run events, user completion and timing records, deterministic reports, device-local recovery and Nebius analyst integration. Third-party source and notices remain under their own licenses. No unverified date of creation is assigned to retained starter code.

Material Auditor is an existing external system used in development and experiments. Its A and B implementations are not included in this source candidate. Offline records of those experiments are clearly labelled in `lib/fixtures/`; they do not automatically load a tested tool or task. Supplier PDF/XLSX inputs and the user's Numbers results are not included.

## Excluded files

The candidate excludes actual `.dev.vars` and `.env` files, API credentials, reviewer access codes and their real digest, instance-specific deployment identifiers and pricing attestations, installed dependencies, build output, browser databases, personal documents, the parent workspace's project management files and Git history, and original evidence archives. `.dev.vars.example`, `.env.example` and `deployment/wrangler.example.json` are credential-free templates; all keep analysis disabled. The Worker template is not a provisioned instance. Its local filled-in copy is ignored by Git.

## Current evidence limits

Historical Supplier014 A/B records are descriptive observations from one operator, repeated material and fixed Human→A→B order, with development exposure for B. Net Human baseline time is unknown. The source does not certify business accuracy, enterprise ROI, causal efficiency or production safety. Users decide task completion; code calculates recorded time; the model only explains constrained observations and uncertain hypotheses.

## Publication status

The 152-file initial source release was published on October 7, 2026 at commit `e40c0b0566d44d57432d42848613cb3c29adb95a`. The protected application was separately deployed from frozen local commit `083f525fd923bfc6f1732f59edc06a7b4a9a6137`, Worker version `fe566df2-a63c-4ba6-a6cb-6986cfb33934`. This candidate updates that implementation for public reproduction; it is prepared locally and has not been uploaded or newly deployed. The public repository still contains the earlier implementation as of October 8.

Compared with the frozen deployed snapshot, this candidate updates README, this scope note and Git exclusions, replaces the enabled instance configuration with `deployment/wrangler.example.json`, and adds [deployment instructions](deployment.md). Application code, lockfile, migrations, license notices and four labelled offline fixtures remain unchanged. An accepted update must append to the existing public Git history, not replace it with the unrelated frozen root commit. A new publication commit can be recorded only after publication is separately approved and performed.

The current implementation includes reviewer-code authentication, D1 reservations, cumulative US$25 protection and pricing expiry checks. An opt-in flag alone does not enable a valid call; the template leaves protection settings blank and analysis off. One separately authorized protected product-HTTP call succeeded on October 7. Loaded-evidence UI analysis/export, private reviewer delivery, ongoing availability, video and final submission remain distinct outstanding work. No paid model request is needed to run offline tests.
