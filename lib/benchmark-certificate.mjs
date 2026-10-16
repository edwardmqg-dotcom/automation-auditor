import { inspectCompletionBundle } from './completion-bundle-import.mjs';
import { calculateTimeComparison } from './time-comparison.mjs';

export const CERTIFICATE_VERSION = 'time-benchmark-certificate-v0.1';
export const CERTIFICATE_NOTE = 'Recorded active human work for this task, including checking and necessary corrections. Completion and full timing were confirmed by the named users. Not independent certification, an output-quality assessment or a general ROI claim.';

export function certificatePresentation(percent) {
  if (percent === null) return { tier: 'unavailable', number: 'N/A', unit: '', headline: 'Percentage unavailable', celebrate: false };
  if (!Number.isFinite(percent) || percent > 100) throw new Error('Invalid time comparison percentage.');
  const magnitude = Math.abs(percent);
  // Classify original precision, not the rounded display value.
  const tier = percent >= 50 ? 'gold' : percent >= 20 ? 'green' : percent >= 0 ? 'blue' : 'red';
  // Do not display a nonzero difference as zero, or round across a tier boundary.
  const decimal = magnitude === 0 ? '0' : magnitude < 0.1 ? '<0.1' : (Math.floor(magnitude * 10) / 10).toFixed(1);
  // Keep a visible minus sign, including tiny negative changes that would round to zero.
  const number = percent < 0 ? '−' + (magnitude < 0.1 ? Number(magnitude.toPrecision(2)).toString() : decimal) : decimal;
  return { tier, number, unit: '%', headline: percent === 0 ? 'Same recorded human work time' : 'Less human work time', celebrate: tier === 'gold' };
}

export function certificateDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) throw new Error('Invalid recorded duration.');
  const minutes = Math.floor(ms / 60000), seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes}m ${seconds.padStart(6, '0')}s`;
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
async function fingerprint(value) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createBenchmarkCertificate(baseline, automation, context = {}) {
  // Revalidate sealed records and recalculate; never certify a cached result.
  // The in-memory completed record omits only the export envelope version.
  // An explicitly supplied unsupported version is still rejected.
  const envelope = value => value && typeof value === 'object' && !Array.isArray(value) ? { bundle_version: 'evidence-bundle-v0.1', ...value } : value;
  const human = inspectCompletionBundle(envelope(baseline)), tool = inspectCompletionBundle(envelope(automation));
  const comparison = calculateTimeComparison(human, tool);
  if (context.tool && (context.tool.id !== tool.manifest.automation_id || !context.tool.name.trim())) throw new Error('Certificate tool label does not match the measured tool.');
  if (context.task && (context.task.id !== tool.manifest.task_id || context.task.version !== tool.manifest.task_version || !context.task.name.trim())) throw new Error('Certificate task label does not match the measured task.');
  const source = { baseline: { manifest: human.manifest, events: human.events }, automation: { manifest: tool.manifest, events: tool.events } };
  const data = {
    schema_version: CERTIFICATE_VERSION,
    evidence_sha256: await fingerprint(source),
    tool_name: context.tool?.name.trim() || tool.manifest.automation_id,
    tool_id: tool.manifest.automation_id,
    tool_version: tool.manifest.automation_version_id,
    lane: tool.manifest.mode === 'automation_version_b' ? 'Version B' : 'Version A',
    task_name: context.task?.name.trim() || tool.manifest.task_id,
    task_id: tool.manifest.task_id,
    task_version: tool.manifest.task_version,
    review_as_of: tool.manifest.review_as_of,
    baseline_run_id: human.manifest.run_id,
    automation_run_id: tool.manifest.run_id,
    baseline_reviewer: human.manifest.operator_ref,
    automation_reviewer: tool.manifest.operator_ref,
    baseline_completed_at: human.manifest.completed_at,
    automation_completed_at: tool.manifest.completed_at,
    completion_criteria_ref: comparison.completion_criteria_ref,
    baseline_build: human.manifest.auditor_build_id,
    automation_build: tool.manifest.auditor_build_id,
    input_refs: [...tool.manifest.input_refs].sort(),
    comparison,
    note: CERTIFICATE_NOTE,
    label_basis: 'Friendly names come from the matching current setup/task; run identities and versions come from sealed records.',
  };
  const certificate_sha256 = await fingerprint(data);
  return { ...data, certificate_sha256, certificate_id: `AA-${certificate_sha256.slice(0, 16).toUpperCase()}` };
}

export const CERTIFICATE_CSS = `
.certificate-paper{--certificate-accent:#245bc0;--certificate-tint:#eaf1ff;position:relative;isolation:isolate;background:#fcfaf4;color:#14243b;border:1px solid #d7d6ce;border-left:7px solid var(--certificate-accent);padding:30px 38px 24px;font-family:"Trebuchet MS",sans-serif;overflow:hidden;max-width:1080px;margin:auto;text-align:left}
.certificate-paper *{box-sizing:border-box}.certificate-paper[data-tier="gold"]{--certificate-accent:#a77c2d;--certificate-tint:#f6edda}.certificate-paper[data-tier="green"]{--certificate-accent:#137457;--certificate-tint:#e8f2ed}.certificate-paper[data-tier="red"]{--certificate-accent:#a5364b;--certificate-tint:#faedf0}
.certificate-paper:before{content:"";position:absolute;z-index:-1;right:-45px;top:95px;width:250px;height:250px;border:1px solid var(--certificate-accent);border-radius:50%;opacity:.12;box-shadow:0 0 0 24px #fcfaf4,0 0 0 25px var(--certificate-tint),0 0 0 48px #fcfaf4,0 0 0 49px var(--certificate-tint)}
.certificate-header{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:1px solid #d7d6ce;padding-bottom:15px}.certificate-brand{display:flex;gap:10px;align-items:center;font-weight:700;font-size:17px;letter-spacing:-.3px}.certificate-logo{width:31px;height:36px;flex-shrink:0;color:var(--certificate-accent)}.certificate-edition{text-align:right;font-size:10px;letter-spacing:1.3px;line-height:1.7;text-transform:uppercase;color:#586477}
.certificate-title{font-family:Georgia,serif;font-size:28px;font-weight:400;line-height:1.25;margin:25px 0 8px;letter-spacing:-.6px}.certificate-hero{text-align:center;margin:5px 0 19px}.certificate-number{font-family:Georgia,serif;font-size:clamp(65px,10vw,116px);font-weight:400;letter-spacing:-5px;line-height:1.05;color:var(--certificate-accent);overflow-wrap:anywhere}.certificate-number span{font-size:.48em;letter-spacing:-1px;margin-left:4px}.certificate-outcome{text-transform:uppercase;font-size:12px;font-weight:700;letter-spacing:2px;margin:5px 0 9px}.certificate-delta{font-size:12px;color:#586477;margin:0}
.certificate-context{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:16px 30px;padding:15px 0;border-top:1px solid #d7d6ce;border-bottom:1px solid #d7d6ce}.certificate-context p{margin:0}.certificate-label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#586477;margin-bottom:6px}.certificate-value{font-size:15px;line-height:1.4;overflow-wrap:anywhere}.certificate-version{font-size:11px;line-height:1.6;color:#586477;overflow-wrap:anywhere}.certificate-times{display:flex;gap:12px;margin:18px 0}.certificate-time{flex:1;background:var(--certificate-tint);padding:12px 17px}.certificate-time strong{display:block;font-family:Georgia,serif;font-size:24px;font-weight:400;line-height:1.2;overflow-wrap:anywhere}.certificate-basis{font-size:10px;line-height:1.6;color:#586477;margin:0 0 20px;max-width:850px}.certificate-signatures{display:flex;justify-content:space-between;align-items:end;gap:24px}.certificate-person{min-width:140px;max-width:65%;padding-top:8px;border-top:1px solid #9aa1aa;overflow-wrap:anywhere}.certificate-person strong{font-size:15px;font-weight:500}.certificate-person small{display:block;color:#586477;font-size:10px;margin-top:4px}.certificate-stamp{color:var(--certificate-accent);text-transform:uppercase;letter-spacing:1.5px;font-size:10px;line-height:1.6;text-align:right}.certificate-footer{border-top:1px solid #d7d6ce;margin-top:18px;padding-top:9px;font-size:9px;line-height:1.6;color:#586477;overflow-wrap:anywhere}.certificate-footer strong{color:#14243b;font-weight:600}
.certificate-technical{max-width:1080px;margin:18px auto;background:white;color:#14243b;border:1px solid #dce3ed;padding:14px 18px;font:12px/1.6 "Trebuchet MS",sans-serif}.certificate-technical summary{cursor:pointer;font-weight:700}.certificate-technical dl{display:grid;grid-template-columns:160px 1fr;gap:8px 16px;margin:14px 0}.certificate-technical dt{font-weight:700}.certificate-technical dd{margin:0;overflow-wrap:anywhere}.certificate-technical p{margin:8px 0}
.certificate-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}.certificate-confetti i{position:absolute;top:-20px;left:calc(var(--piece)*4.8%);width:6px;height:13px;background:#a77c2d;opacity:0;animation:certificate-confetti 2.2s ease-out both;animation-delay:calc(var(--piece)*35ms)}.certificate-confetti i:nth-child(3n){background:#d6bd7d;transform:rotate(40deg)}@keyframes certificate-confetti{10%{opacity:.8}100%{translate:25px 400px;rotate:180deg;opacity:0}}
@media(prefers-reduced-motion:reduce){.certificate-confetti{display:none}}
@media(max-width:650px){.certificate-paper{padding:20px 18px;border-left-width:4px}.certificate-title{font-size:23px}.certificate-brand{font-size:14px}.certificate-context{grid-template-columns:1fr}.certificate-times{flex-direction:column}.certificate-signatures{align-items:start}.certificate-person{max-width:65%}.certificate-technical dl{grid-template-columns:1fr;gap:3px}.certificate-technical dd{margin-bottom:9px}}
@page aa-certificate{size:A4 landscape;margin:10mm}
@media print{body:has(dialog.certificate-dialog[open])>:not(dialog.certificate-dialog){display:none!important}html,body{background:white!important}dialog.certificate-dialog[open]{position:static!important;display:block!important;border:0!important;max-width:none!important;max-height:none!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;box-shadow:none!important;background:white!important}dialog.certificate-dialog::backdrop{display:none}.certificate-toolbar,.certificate-confetti,.certificate-technical{display:none!important}.certificate-paper{page:aa-certificate;max-width:none;margin:0;padding:24px 30px;break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}.certificate-title{font-size:26px}.certificate-number{font-size:94px}.certificate-context{grid-template-columns:1fr 1fr}.certificate-times{flex-direction:row}.certificate-hero{margin:0 0 12px}}
`;

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function certificateDetails(certificate) {
  return [
    ['Tool identity', certificate.tool_id], ['Recorded tool version', certificate.tool_version],
    ['Task identity', certificate.task_id], ['Task version', certificate.task_version], ['Review as of', certificate.review_as_of],
    ['Human record', certificate.baseline_run_id], ['Automation record', certificate.automation_run_id],
    ['Human confirmed (UTC)', certificate.baseline_completed_at], ['Automation confirmed (UTC)', certificate.automation_completed_at],
    ['Human build', certificate.baseline_build], ['Automation build', certificate.automation_build],
    ['Exact signed time change (%)', String(certificate.comparison.relative_improvement_pct ?? 'N/A')],
    ['Completion criteria', certificate.completion_criteria_ref], ['Input fingerprints', certificate.input_refs.join('\n')],
    ['Full evidence fingerprint', certificate.evidence_sha256], ['Full certificate fingerprint', certificate.certificate_sha256],
  ];
}

// Inert, self-contained document: no task contents, local output paths, scripts,
// network calls, access codes or automatically triggered print/share actions.
export function certificateHtml(certificate, paperMarkup) {
  const details = certificateDetails(certificate).map(([key,value])=>`<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${escape(certificate.certificate_id)} — Automation Auditor</title><style>${CERTIFICATE_CSS}\nbody{margin:24px;background:#e9edf3}.offline-note{max-width:1080px;margin:0 auto 16px;font:13px/1.6 'Trebuchet MS',sans-serif;color:#14243b}@media print{body{margin:0}.offline-note{display:none}}</style></head><body><p class="offline-note">Saved result certificate. Use your browser's Print command to print or save as PDF. Share this file only with intended recipients; it includes task and reviewer information. Fingerprints identify records, not authenticated signatures.</p>${paperMarkup}<details class="certificate-technical"><summary>Measurement details</summary><dl>${details}</dl><p>${escape(certificate.label_basis)}</p></details></body></html>`;
}
