# Run your own image comparison

## Before timing

Use a desktop browser and a separate Automation Auditor workspace. For the recorded manual method you need macOS Preview. If you choose another operating system or a faster manual method, record it before starting and treat your measurement as a new comparison, not a reproduction of the same manual procedure.

Extract the complete kit. Keep the input folder unchanged. The working copies and result folders must be fresh. Practice separately if necessary, then agree which work will be timed. Preparation and teaching are not silently counted as task work; required file handling, checking, corrections and saving during the task are counted.

### 1. Automations

Click **Start evaluation**. Enter:

- **Automation name:** `Bulk Resize Photos`
- **Launch URL:** `https://bulkresizephotos.com/en`
- **Purpose:** `Convert and resize a batch of images for a web image library.`
- **Current version A:** record your actual test date, for example `Web observed YYYY-MM-DD`. This is an observation label, not the vendor's release number.

Keep the four manual-file defaults under **Advanced Settings**. Click **Check setup**, then **Save and continue to Benchmarks**. A second tool version is optional and is not needed for this test.

### 2. Benchmarks

Click **Choose files** and select only the 12 PNGs from `01_Input_images`. Copy the **Task name** and three answers from `02_Shared_task/task-fields.json` or the adjacent English TXT. The headings match **What should be done?**, **What should be delivered?**, and **When is the task complete?**. Do not change the requirements after seeing results.

Click **Prepare task**, then **Confirm task connection** and continue to **Run Console**. Use this one connected task for both modes; do not re-import it between Human and Version A.

Alternative: select all 14 files from `Optional_task_package` together instead of using the form. The product reads the fixed instructions and historical task date from that manifest. Do not select only its JSON or fill another task description.

### 3. Human baseline

Select **Human**, read **View task instructions**, and click **Prepare run (timer stays off)**. This prepares only the recorder. Find `03_Human_working_copies` and the empty `04_Human_result` before you begin.

Click **Start human work** yourself and check that **COUNTING** appears and the time advances. For each working copy:

1. Open it in Preview. If its longest edge exceeds 1200 pixels, choose **Tools → Adjust Size**, use pixels, keep proportions and resampling enabled, and set the longest edge to 1200. Do not enlarge a smaller image.
2. Choose **File → Export**, select **JPEG**, preserve the `IMG-XX` filename stem and save into `04_Human_result`. Use quality that keeps the calibration labels readable. The observed method exported one image at a time.
3. Repeat for all 12 images. Check the final folder contains exactly 12 readable JPEGs, with complete IDs and corner markers, correct dimensions and no cropping, stretching, rotation or enlargement. Keep timing during checks, corrections and saving.

Pause yourself when all required work is finished. Pure machine waiting and breaks may be paused; switching apps does not pause automatically. If you forgot to time required work, do not attest full timing: retain an incomplete record and redo the entire mode under a new run ID.

Click **Submit task result**. In **Task result file or link**, enter the actual location of your `04_Human_result`, then **Submit result**. Automation Auditor registers the reference; it does not save or produce the images for you. Use your own **Reviewer reference**, choose **Task completed**, and confirm responsibility and full timing only when true. Click **Save completion decision**. Complete any remaining required active checking before sealing, with timing resumed where needed.

### 4. Version A

Return to **Run Console** and choose **Version A**. On this same page click **Open tool**. Check the external site opened normally, return and click **Confirm tool opened** yourself. Then **Prepare run (timer stays off)**. If you reload the workspace, access confirmation may need to be repeated; this does not start timing.

Keep `01_Input_images` and the empty `05_Version_A_result` ready. Start human timing yourself before the required image handling. Work at Bulk Resize Photos in these two batches:

| Batch | Inputs | Settings |
| --- | --- | --- |
| 1: nine images | IMG-01 through IMG-07, plus IMG-11 and IMG-12 | **Longest Side → 1200 pixels**, JPEG, Image Quality 90 |
| 2: three smaller images | IMG-08, IMG-09, IMG-10 | **Percentage → 100%**, JPEG, Image Quality 90 |

Click the tool's **Start** after checking each batch's settings. For the second batch, return to initial image selection and choose the three smaller originals, rather than retaining the first selection. Save and extract the actual downloads, then merge the JPEGs into `05_Version_A_result`. Keep ZIPs outside that final folder. The two-batch method avoids the enlargement observed with Longest Side on small images.

Check all 12 JPEGs against the same completion conditions. Count handling, downloads, extracting/merging, checks, any corrections and saving as active human work. Pause only when appropriate, then register the actual `05_Version_A_result` location and complete the same truthful completion process under your own reference. Do not reuse EddieM's original completion decisions.

### 5. Compare and certificate

Open **Compare**. Both modes must be completed, have confirmed full timing, and match the task, input fingerprints and completion conditions. The product calculates baseline minus automation; it does not independently score the images. A result may show more time rather than savings.

Click **View certificate** to inspect your result and reviewer reference. **Download HTML** saves a local shareable copy; **Print / Save as PDF** uses the browser's printing options. Inspect it before sharing. **Audit Report** is optional for record export or AI explanations; do not run the paid analyst just to finish the time comparison.

The recorded 24.6% is not a target you must reach. Report your own result, environment, method, date, version observation and any interruptions. If the external tool's controls change or the site is unavailable, stop and document that change; do not silently replace the tool while retaining its identity.

## Target dimensions

| ID | Original | Final JPEG |
| --- | --- | --- |
| IMG-01 | 2400 × 1600 | 1200 × 800 |
| IMG-02 | 1600 × 2400 | 800 × 1200 |
| IMG-03 | 2000 × 2000 | 1200 × 1200 |
| IMG-04 | 3000 × 1500 | 1200 × 600 |
| IMG-05 | 1500 × 3000 | 600 × 1200 |
| IMG-06 | 1800 × 1200 | 1200 × 800 |
| IMG-07 | 1200 × 1800 | 800 × 1200 |
| IMG-08 | 960 × 640 | 960 × 640 |
| IMG-09 | 640 × 960 | 640 × 960 |
| IMG-10 | 800 × 800 | 800 × 800 |
| IMG-11 | 1200 × 600 | 1200 × 600 |
| IMG-12 | 600 × 1200 | 600 × 1200 |

Reference: [Apple resize guide](https://support.apple.com/guide/preview/crop-resize-or-rotate-an-image-prvw2015/mac) and [JPEG export guide](https://support.apple.com/guide/preview/convert-image-file-types-prvw1012/mac). Preview's batch capabilities are deliberately not used in this recorded single-image baseline.
