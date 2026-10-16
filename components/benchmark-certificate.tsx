"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowRight, Download, Printer, ShieldCheck, X } from 'lucide-react';
import { CERTIFICATE_CSS, certificateDetails, certificateDuration, certificateHtml, certificatePresentation, createBenchmarkCertificate, type BenchmarkCertificate, type CertificateContext } from '@/lib/benchmark-certificate.mjs';
import type { TimeComparison } from '@/lib/time-comparison.mjs';

export function CertificatePaper({ certificate, celebration = false }: { certificate: BenchmarkCertificate; celebration?: boolean }) {
  const view = certificatePresentation(certificate.comparison.relative_improvement_pct);
  const delta = certificate.comparison.human_active_delta_ms;
  return <article className="certificate-paper" data-tier={view.tier} aria-label="Time benchmark certificate">
    {celebration && view.celebrate && <div className="certificate-confetti" aria-hidden="true">{Array.from({ length: 21 }, (_, i) => <i key={i} style={{ '--piece': i } as React.CSSProperties} />)}</div>}
    <header className="certificate-header"><div className="certificate-brand"><ShieldCheck className="certificate-logo" aria-hidden="true" />Automation Auditor</div><div className="certificate-edition">A recorded comparison<br />{certificate.automation_completed_at.slice(0, 10)} · UTC</div></header>
    <h1 className="certificate-title">Time Benchmark Certificate</h1>
    <div className="certificate-hero"><div className="certificate-number">{view.number}<span>{view.unit}</span></div><p className="certificate-outcome">{view.headline}</p><p className="certificate-delta">{delta === 0 ? 'No difference in recorded active work.' : `Baseline minus automation: ${delta < 0 ? '−' : ''}${certificateDuration(Math.abs(delta))}.`}</p></div>
    <div className="certificate-context"><div><span className="certificate-label">Automation tool</span><p className="certificate-value">{certificate.tool_name}</p><p className="certificate-version">{certificate.lane} · {certificate.tool_version}</p></div><div><span className="certificate-label">Task evaluated</span><p className="certificate-value">{certificate.task_name}</p><p className="certificate-version">Task version · {certificate.task_version}</p></div></div>
    <div className="certificate-times"><div className="certificate-time"><span className="certificate-label">Human baseline</span><strong>{certificateDuration(certificate.comparison.baseline_human_active_ms)}</strong></div><div className="certificate-time"><span className="certificate-label">With automation</span><strong>{certificateDuration(certificate.comparison.automation_human_active_ms)}</strong></div></div>
    <p className="certificate-basis">{certificate.note}</p>
    <div className="certificate-signatures"><div className="certificate-person"><strong>{certificate.automation_reviewer}</strong><small>Automation completion confirmed by</small>{certificate.baseline_reviewer !== certificate.automation_reviewer && <><strong>{certificate.baseline_reviewer}</strong><small>Human baseline confirmed by</small></>}{certificate.baseline_reviewer === certificate.automation_reviewer && <small>Also confirmed the Human baseline</small>}</div><div className="certificate-stamp">Automation Auditor<br />Time measured from recorded work</div></div>
    <footer className="certificate-footer"><strong>{certificate.certificate_id}</strong> · User-confirmed completion · Same task, inputs and criteria<br />Human: {certificate.baseline_run_id}<br />Automation: {certificate.automation_run_id}</footer>
  </article>;
}

function saveHtml(certificate: BenchmarkCertificate) {
  const html = certificateHtml(certificate, renderToStaticMarkup(<CertificatePaper certificate={certificate} />));
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${certificate.certificate_id}.html`;
  document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CertificateDialog({ certificate, onClose }: { certificate: BenchmarkCertificate; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current, previous = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={dialogRef} className="certificate-dialog" aria-label="Result certificate" onCancel={onClose} onClose={onClose}>
    <div className="certificate-toolbar"><div><strong>Your result certificate</strong><p>Save a copy to share. No data is uploaded.</p></div><div className="certificate-toolbar-actions"><button className="secondary-action" onClick={() => saveHtml(certificate)}><Download size={16} />Download HTML</button><button className="primary-action" onClick={() => window.print()}><Printer size={16} />Print / Save as PDF</button><button className="certificate-close" onClick={onClose} aria-label="Close certificate"><X size={21} /></button></div></div>
    <CertificatePaper certificate={certificate} celebration />
    <details className="certificate-technical"><summary>Measurement details</summary><dl>{certificateDetails(certificate).map(([key, value]) => <div className="certificate-detail-row" key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p>{certificate.label_basis}</p><p>Percentage = (Human active time − automation active time) / Human active time × 100. Negative values mean additional human work. Display is truncated to one decimal, except tiny changes below 0.1%: positive values use &lt;0.1%, negative values retain two significant digits. Classification uses the original value. Fingerprints identify records, not authenticated signatures.</p><p>Sharing the downloaded file or PDF shares its task and reviewer information. Review recipients before sending.</p></details>
  </dialog>, document.body);
}

export function BenchmarkCertificateResult({ result, baseline, automation, context }: { result: TimeComparison; baseline: unknown; automation: unknown; context: CertificateContext }) {
  const view = certificatePresentation(result.relative_improvement_pct);
  const [certificate, setCertificate] = useState<BenchmarkCertificate | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  async function openCertificate() {
    const current = ++request.current; setBusy(true); setError('');
    try { const next = await createBenchmarkCertificate(baseline, automation, context); if (current === request.current) setCertificate(next); }
    catch (cause) { if (current === request.current) setError(cause instanceof Error ? cause.message : 'The certificate could not be prepared. Your saved records have not changed.'); }
    finally { if (current === request.current) setBusy(false); }
  }
  return <><style>{CERTIFICATE_CSS}</style><div className={`certificate-result certificate-result-${view.tier}`}>
    <div className="certificate-result-number">{view.number}<span>{view.unit}</span></div><div className="certificate-result-copy"><span className="eyebrow">Recorded result · {result.automation_run_id}</span><h3>{view.headline}</h3><p>Human {certificateDuration(result.baseline_human_active_ms)} → with automation {certificateDuration(result.automation_human_active_ms)}.</p><p>For this task, based on user-confirmed completion and full timing.</p></div><button className="primary-action" disabled={busy} onClick={() => void openCertificate()}>{busy ? 'Preparing certificate…' : 'View certificate'}<ArrowRight size={16} /></button>
  </div>{error && <p className="review-error" role="alert">{error}</p>}{certificate && <CertificateDialog certificate={certificate} onClose={() => setCertificate(null)} />}</>;
}
