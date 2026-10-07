# Offline test fixture provenance

These files support offline regression tests only. They are not imported into the default workspace, connected tools, supplier input packages, current approvals or new AI calls. Original bytes and hashes are recorded in [provenance.json](provenance.json).

| File | Meaning | Test use |
| --- | --- | --- |
| `product-request.prepared.json` | Historical prepared input containing Supplier014 A/B event records, pseudonymous `HUMAN-01`, relative artifact references and local target URLs | Completion and analyst input regressions |
| `v0.7-product-response.json` | Historical Nebius product response, with provider request/response IDs and usage metadata; contains known unsupported automatic pass criteria premises | Rejection regression for those premises, not an accepted analysis |
| `test-only-benchmark.json` | Synthetic copy-task manifest | Task import compatibility tests |
| `smoke-runs.json` | Synthetic events using the older evaluation vocabulary | Timing compatibility tests, not observed human performance |

The historical artifact references name files in the private development workspace. Those original files are not bundled here, and these references are not runnable links or required local paths. The test code reads these JSON fixtures directly. No absolute home path or API key is included in them.

Historical timestamps, run identities and event values remain unchanged. `status: succeeded` in the historical response describes the original transport/product status; current tests reject its unsupported premises. The fixtures do not prove efficiency, quality or enterprise ROI. Publication of this candidate remains subject to the owner's review of these retained records.
