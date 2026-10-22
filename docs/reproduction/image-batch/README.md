# Try an image-batch time comparison

[Download the image replay kit](image-replay-kit.zip?raw=true) · [English walkthrough](WALKTHROUGH.en.md) · [Recorded observation and limits](../../image-batch-observation.md)

Use [Automation Auditor](https://automation-auditor-reviewer.edwardmqg.workers.dev/) to measure the same image task manually and with [Bulk Resize Photos](https://bulkresizephotos.com/en). The ZIP contains 12 synthetic PNGs, fresh working copies, empty result folders, fixed English instructions and an offline verification script. No customer photos, account or API key is included. Use a desktop browser; the recorded manual method uses macOS Preview. The external tool is operated by a third party and can change.

## Start here

1. Download and extract the whole ZIP. Read its `README.md` or follow the walkthrough above. Folder names refer to the extracted kit, not folders beside this web page.
2. Use a separate browser profile or clean workspace so your test does not replace an existing tool/task connection. Never clear another workspace's site data. Use your own reviewer reference and real timing.
3. Connect Bulk Resize Photos. Import only the 12 PNGs and answer the three task questions from the instructions; alternatively select all 14 files in `Optional_task_package`. JSON is optional; do not mix the routes.
4. Complete Human and Version A with the same task and completion conditions. Personally start/pause timing; include checking, corrections and export. Save each real result and confirm completion/full timing only when true.
5. Open Compare and **View certificate**. **Download HTML** or **Print / Save as PDF** preserves your result. Paid AI analysis is optional and unnecessary for this comparison.

The result-reference form registers where you already saved the task output; it does not create or upload JPEGs. Its current field is **Saved result file path or link**, under **Where is your saved task result?**. The bundled walkthrough's “Task result file or link” refers to this same field.

## Check the download and recorded arithmetic

ZIP: 818,053 bytes. SHA-256 (also in [SHA256SUMS](SHA256SUMS)):

```text
dc098c7d2d6688b0f94773f8731d729ed2916a189ba7c90f2aa11bd1cbd4bf5a
```

With Node.js 22.13 or later, run this from the extracted kit; no dependencies, network or model call are needed:

```bash
node verify-inputs.mjs
```

This checks image fingerprints/dimensions and the labelled arithmetic excerpt: 755,930ms manual, 569,850ms assisted, 186,080ms less, displayed as 24.6%. It does not authenticate signatures or independently verify output quality. The excerpt is **not an importable run bundle** and does not insert someone else's run into your workspace. Full-record validation is separate private material, not included here.

New measurements need not reproduce 24.6%. The old observation used one operator, synthetic images, fixed manual-before-automation order, prior instruction and a single-image Preview baseline. Preview also supports batching: this does not claim to beat the fastest manual method, establish causal superiority or predict enterprise ROI.

## Scope and privacy

The owner approved this exact ZIP and accompanying English documentation on October 23, 2026. The excerpt includes EddieM, original run IDs, two active-work segment timestamps, durations and source-record hashes. Local absolute result paths, complete private evidence bundles, processed images, certificate HTML/PDF, Material Auditor source/materials, credentials and production configuration are excluded. No task/tool is automatically loaded. The frozen ZIP's “local publication candidate until the owner approves” sentence records its preparation condition; approval has now been given for this hash.

The optional manifest is reconstructed from historical task metadata and unchanged inputs; it is not a recovered original export and contains no run events or completion decisions. Images retain their included CC0 declaration; scripts/guide additions their included MIT notice. This documentation/download publication does not modify deployed application code or model access/budget.
