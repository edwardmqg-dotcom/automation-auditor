# Using Automation Auditor

Measure the active human work needed to finish the same task manually and with an automation tool. Include uploading, operating, checking, necessary corrections and saving/exporting; pause for breaks or machine-only waiting. You decide whether the task is complete. Automation Auditor compares recorded time, not business-output quality.

## Home

Select **Start evaluation**. The core flow is **Automations → Benchmarks → Run Console → Compare**. **Audit Report** is optional for inspecting/exporting evidence and requesting AI explanations.

Home's **View example** displays the saved October 15 TEST ONLY summary rehearsal and its original certificate metadata. It does not seed workspace records, connect a tool/task, start timing, sign completion or request analysis. The negligible difference illustrates essentially equal work time, not a business-productivity gain.

## Automations

Enter **Launch URL**, **Automation name**, **Purpose** and **Current version A**. **Candidate version B** is optional. Record an actual release/model and relevant settings; a web rehearsal label is not an immutable provider snapshot.

Under **Advanced Settings**, keep the defaults if you open the tool, provide files and bring back its result yourself: **Guided external run**, **Manual files**, **Manual result import**, **Run Console instrumentation**. Developer transport options describe an integration contract; selecting them does not implement a task API or webhook receiver.

Select **Check setup**, then **Save and continue to Benchmarks**. This saves a draft; the final connection is confirmed with a task. Setup checking does not contact or prove access to the external tool.

The header and sidebar show the saved tool name with **Tool setup saved — awaiting task connection** until a prepared task is confirmed. A saved setup is not a connection or a proof that the external website is accessible.

## Benchmarks

Select **Choose files**. Use either of two paths:

- Include a supported task package JSON and every file it lists. A valid package supplies its task instructions, so the manual description form is hidden.
- Without a declared task package, enter **Task name**, **What should be done?**, **What should be delivered?** and **When is the task complete?**. Select **Prepare task**. The app creates the internal task record and instructions from your answers without adding requirements.

An ordinary JSON document may itself be task material. An invalid declared package is rejected, not silently treated as ordinary material. Check that you selected the intended files; without an external inventory, the app cannot detect files you forgot to select.

The task name and three answers are saved independently on this device. Changing files, switching pages or reloading does not intentionally clear them; check that the retained answers still apply. After a reload before final connection, select files again. Wait for the saved/restored message; copy the text before reloading if a save warning appears. Browser-local storage is not a backup.

Invalid selections, such as duplicate filenames, must be corrected before **Prepare task** is available. A read, fingerprint or preparation exception keeps the text and offers **Retry preparation**; re-select an inaccessible file if needed. **Import diagnostic** identifies the stage, filename and exception name without exposing the original exception detail. It does not certify the root cause or grade the business task.

Select **Confirm task connection with [tool name]**. **Task connected** confirms the explicit link. Reuse this same saved task for all lanes; changing materials, instructions or review date creates a different comparison scope. On an existing workspace, preparing another tool draft does not rewrite sealed records or require redefining the task.

In **Run Console → Version A/B**, select **Open tool**. It opens the external tool in a new tab; return to the same Run Console and personally select **Confirm tool opened** only when it has opened. The same action area then offers **Prepare run (timer stays off)**. If the tool did not open, select **Could not open tool** and retry. None of these access actions starts timing or confirms task completion. Run Console is the only access-check entry; Automations is for tool setup.

This is a session access check, not proof of task success. Access must be rechecked after a reload. Non-guided adapters use the existing unauthenticated HEAD check and do not offer a manual confirmation of a network response.

## Run Console

Select **Human**, **Version A** or an available **Version B**. Use **View task instructions** to read the actual connected instructions. Prepare materials and understand the procedure before timing; do not include coaching or project administration as task work.

**Prepare run (timer stays off)** only prepares a record. Personally select **Start human work**, confirm **COUNTING** and an advancing timer before working. Changing tabs or apps does not pause timing. Pause only for breaks or machine-only waiting, and resume before checking/correcting or exporting results. The current UI has no timing correction, estimated additions, segment-deletion or pause-reason form.

Save the real task result outside Automation Auditor, then pause and select **Submit task result**. In **Saved result file path or link**, enter its existing local path or online link, then select **Submit result**. This registers a location; it does not upload, save or verify the business file. It is not where the time report is exported.

If more checking or correction is needed, time that active work too. Save corrected files separately. Before sealing, edit the same result-reference field and leave it to save each valid update automatically; original submission and earlier references stay in history. Sealed records cannot be changed.

Under **Task completion**, enter **Reviewer reference**, make your own completion decision and confirm responsibility. Confirm **All required active work was timed…** only if true. If required work was not timed, retain an incomplete record and repeat the whole lane with a new ID; do not estimate missing time or check a box to continue. Pause before **Save completion decision**. **Completion record saved** means the original events and your decision were saved.

## Compare

A completed, fully timed Human baseline and at least one compatible automation run produce a time comparison; B is optional. Matching includes task/version, review date, input fingerprints and completion criteria. Human belongs to the task and can be reused for another tool under identical conditions; A/B must belong to the same actual tool and recorded versions. An old Human manifest's tool metadata is not rewritten.

**Export time report** exports the comparison. Displayed lane times are rounded to seconds; differences use original milliseconds and can be negative or negligible. One run cannot establish a general efficiency or ROI claim. Missing/incomplete measurements stay visible as gaps rather than invented savings.

Select **View certificate** in Compare or Audit Report for a shareable result. The certificate shows recorded active human time, the task/tool version and the original completion-confirmation IDs. These IDs are user-entered references, not authenticated signatures. Each certificate identifies its source records and fingerprints; generating one does not change or sign a run.

**User-confirmed time comparison** means the named users confirmed task completion and full timing. It is a record-based time comparison, not independent output-quality certification.

**Download HTML** saves a self-contained offline copy. **Print / Save as PDF** opens the browser print dialog: select Save as PDF rather than a physical printer when you want a file, choose the desired layout and turn off browser headers/footers if preferred. Preview before saving; long task or reviewer names may require a different layout. Downloaded copies can be sent to intended recipients, but doing so shares the task/reviewer information. No public link is created or data uploaded by these controls.

Gold with a short celebration is reserved for at least 50% recorded time reduction. From 20% to below 50% is green; 0% to below 20% is blue; negative values are deep red and carry an explicit minus sign. All nonzero results retain “Less human work time”; negative percentages mean additional human work. Exact zero says the times are the same. Classification uses the unrounded percentage; visible percentages truncate to one decimal to avoid crossing a boundary, with positive values below 0.1% shown as less than 0.1% and tiny negative values retaining two significant digits and their minus sign. Exact signed values appear under **Measurement details**. These visual tiers do not establish statistical or business significance. Reduced-motion preferences and printing disable the celebration.

## Audit Report and data safety

Use **Import saved run records**, **Technical details (JSON)** and **Export run records** to inspect or move evidence. Duplicate or active run IDs cannot be overwritten. JSON for evidence export/import is separate from the optional task-package JSON.

**AI analysis access code** comes privately from the deployment administrator, not from your reviewer name or Nebius API key. Timing/comparison/export do not require it. **Analyze evidence** sends recorded evidence to the configured Nebius analyst and may use the administrator's model budget; it is not needed to finish a time comparison. A saved old call remains historical evidence, not a new invocation.

Records are browser/device/origin-local. Export before maintenance. Keep the same URL to retain the workspace; another port, hostname, browser profile or device has separate storage. Do not clear site data to recover a missing record. If Chrome blocks multiple downloads, the user decides whether to grant permission; verify actual downloaded files rather than assuming a button click saved them.
