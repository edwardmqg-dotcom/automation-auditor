import type { TimeComparison } from './time-comparison.mjs';
export type CertificateContext = { tool?: {id:string;name:string}; task?: {id:string;version:string;name:string} };
export type CertificatePresentation = {tier:'gold'|'green'|'blue'|'red'|'unavailable';number:string;unit:string;headline:string;celebrate:boolean};
export type BenchmarkCertificate = {
  schema_version:string; certificate_id:string; certificate_sha256:string; evidence_sha256:string;
  tool_name:string;tool_id:string;tool_version:string;lane:string;task_name:string;task_id:string;task_version:string;review_as_of:string;
  baseline_run_id:string;automation_run_id:string;baseline_reviewer:string;automation_reviewer:string;
  baseline_completed_at:string;automation_completed_at:string;baseline_build:string;automation_build:string;
  completion_criteria_ref:string;input_refs:string[];comparison:TimeComparison;note:string;label_basis:string;
};
export const CERTIFICATE_VERSION:string;
export const CERTIFICATE_NOTE:string;
export const CERTIFICATE_CSS:string;
export function certificatePresentation(percent:number|null):CertificatePresentation;
export function certificateDuration(ms:number):string;
export function createBenchmarkCertificate(baseline:unknown,automation:unknown,context?:CertificateContext):Promise<BenchmarkCertificate>;
export function certificateDetails(certificate:BenchmarkCertificate):string[][];
export function certificateHtml(certificate:BenchmarkCertificate,paperMarkup:string):string;
