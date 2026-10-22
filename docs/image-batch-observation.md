# Image-processing observation

One operator completed a fixed task on 12 synthetic images: convert PNG to JPEG, limit the longest edge to 1200 pixels without enlarging smaller images, preserve proportions/content and save all 12 results. Both modes used the same input fingerprints and completion instructions.

| Workflow | Recorded active human work |
| --- | --- |
| Manual, Preview single-image workflow | 755,930ms (12m 35.930s) |
| Bulk Resize Photos, two-batch workflow | 569,850ms (9m 29.850s) |
| Difference in this task | 186,080ms less (3m 06.080s), displayed as 24.6% |

Manual work was completed October 20, 2026; automation-assisted work October 22. The user confirmed completion and full timing. Code recalculated original events. File counts, names, formats and dimensions were checked; visual completeness was the user's judgment. Required handling, checking, corrections and saving are active work. Preparation/instruction outside the task is not silently added to measured time.

This is not a randomized experiment, independent quality certification or enterprise ROI estimate. There was one operator, repeated material, fixed manual-before-automation order and prior instruction. Preview supports batching; the baseline represents the predefined single-image method, not the fastest possible manual process. Do not advertise a universal 24.6% saving or fill an unrelated task's missing baseline with this value.

No default tool or task is installed by this observation. The owner-authorized [image replay kit](reproduction/image-batch/README.md) separately provides synthetic original PNGs, fresh working copies, fixed instructions and a derived arithmetic excerpt with EddieM, original run IDs, active-segment timestamps and source-record hashes. The excerpt is not an importable run bundle or independent authentication. Full private records, processed outputs, local absolute paths and the downloaded certificate remain excluded. The recorded tool version is an operator observation label, not a vendor release guarantee. New measurements need not match the old percentage.
