"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CertificatePaper } from "@/components/benchmark-certificate";
import { CERTIFICATE_CSS, certificateDuration, type BenchmarkCertificate } from "@/lib/benchmark-certificate.mjs";
import saved from "@/lib/examples/summary-certificate.json";

// Frozen display snapshot from the real October 15 rehearsal. Never imported
// into the workspace, re-signed or treated as a newly measured run.
const certificate: BenchmarkCertificate = { ...saved, comparison: { ...saved.comparison, metric_schema_version: "time-comparison-v0.1" } };

export function ReadonlyExample({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="certificate-dialog readonly-example" aria-label="Read-only complete example" onClose={onClose} onCancel={onClose}>
    <div className="certificate-toolbar"><div><strong>A complete example</strong><p>Read-only · Saved summary rehearsal · October 15, 2026</p></div><button className="certificate-close" onClick={onClose} aria-label="Close example"><X size={21} /></button></div>
    <p className="workflow-alert">These are saved observations, not your results. Viewing this example does not connect a tool, import records, start a timer or confirm completion.</p>
    <section className="benchmark-detail-card"><h2>1. One shared task</h2><p><strong>Tool:</strong> ChatGPT · {certificate.tool_version}</p><p><strong>What should be done?</strong> Read the TEST ONLY input.</p><p><strong>What should be delivered?</strong> A saved TEST ONLY summary.</p><p><strong>When is the task complete?</strong> The user confirms the TEST ONLY result is saved.</p></section>
    <section className="benchmark-detail-card"><h2>2. Record the human work</h2><p>The user completed the task manually, then used ChatGPT. Both records confirm completion and full timing. Operation, checking, corrections and saving count; breaks and machine-only waiting do not.</p><div className="certificate-times"><div className="certificate-time"><span className="certificate-label">Human baseline</span><strong>{certificateDuration(certificate.comparison.baseline_human_active_ms)}</strong></div><div className="certificate-time"><span className="certificate-label">With ChatGPT</span><strong>{certificateDuration(certificate.comparison.automation_human_active_ms)}</strong></div></div></section>
    <section className="benchmark-detail-card"><h2>3. See the difference</h2><p><strong>0.349 seconds less human work, displayed as 0.1%.</strong> Essentially the same time in this short rehearsal—not a meaningful efficiency gain. A measurement can show little or no benefit.</p><p>One user, prior exposure and a guided workflow. This is not a business-efficiency study or an independent output-quality assessment.</p></section>
    <section className="benchmark-detail-card"><h2>4. View the recorded certificate</h2><p>The original user confirmation and comparison are preserved. No new certificate or signature is created here.</p><button className="secondary-action" onClick={() => setShowCertificate(!showCertificate)}>{showCertificate ? "Hide recorded certificate" : "View recorded certificate"}</button>{showCertificate && <div className="example-certificate"><style>{CERTIFICATE_CSS}</style><CertificatePaper certificate={certificate} /></div>}</section>
  </dialog>, document.body);
}
