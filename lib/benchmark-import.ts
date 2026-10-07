export const BENCHMARK_PACKAGE_SCHEMA_VERSION = "benchmark-package-manifest-v0.2";
export const LEGACY_BENCHMARK_PACKAGE_SCHEMA_VERSION = "benchmark-package-manifest-v0.1";

export type BenchmarkInputFile = {
  path: string;
  media_type: string;
  size_bytes: number;
  sha256: string;
};

type BenchmarkPackageBase = {
  benchmark_id: string;
  task_id: string;
  task_version: string;
  display_name: string;
  task_kind: string;
  description: string;
  review_as_of: string;
  input_files: BenchmarkInputFile[];
  created_at: string;
};

export type BenchmarkPackageManifest = BenchmarkPackageBase & ({
  schema_version: typeof BENCHMARK_PACKAGE_SCHEMA_VERSION;
  completion_criteria: {
    basis: "user_confirmation";
    instructions_file: string;
  };
} | {
  schema_version: typeof LEGACY_BENCHMARK_PACKAGE_SCHEMA_VERSION;
  rubric_ref: string;
  acceptance: {
    requirement_count: number;
  };
  reference_answers: {
    included_in_package: false;
    mode: "sealed_external";
    reference_set_id: string;
    unlock_policy: "after_output_submission";
  };
});

// v0.2 binds criteria to a verified local instruction file, never an answer key.
// v0.1 retains manual pre-run criteria entry; old objects are not rewritten.
export function benchmarkCompletionCriteriaRef(manifest: BenchmarkPackageManifest): string | null {
  if (manifest.schema_version !== BENCHMARK_PACKAGE_SCHEMA_VERSION) return null;
  const instructions = manifest.input_files.find((file) => file.path === manifest.completion_criteria.instructions_file);
  return instructions ? `sha256:${instructions.sha256}` : null;
}

export function benchmarkRubricRef(manifest: BenchmarkPackageManifest): string {
  return manifest.schema_version === LEGACY_BENCHMARK_PACKAGE_SCHEMA_VERSION ? manifest.rubric_ref : benchmarkCompletionCriteriaRef(manifest)!;
}

export function assertBenchmarkCompletionCriteria(manifest: BenchmarkPackageManifest, criteriaRef: string) {
  if (!criteriaRef.trim()) throw new Error("Shared completion criteria are required before starting.");
  const locked = benchmarkCompletionCriteriaRef(manifest);
  if (locked && locked !== criteriaRef.trim()) throw new Error("Completion criteria must match the verified task instructions fingerprint.");
}

export type ImportedFileCheck = BenchmarkInputFile & {
  selected_name: string | null;
  actual_size_bytes: number | null;
  actual_sha256: string | null;
  status: "valid" | "missing" | "size_mismatch" | "hash_mismatch";
};

export type BenchmarkImportResult = {
  manifest: BenchmarkPackageManifest | null;
  status: "idle" | "validating" | "invalid" | "ready";
  errors: string[];
  file_checks: ImportedFileCheck[];
  imported_file_count: number;
  selected_files: File[];
};

const taskKindPattern = /^[a-z0-9][a-z0-9_-]*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function inspectBenchmarkManifest(value: unknown): { manifest: BenchmarkPackageManifest | null; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(value)) return { manifest: null, errors: ["The manifest root must be a JSON object."] };

  const legacy = value.schema_version === LEGACY_BENCHMARK_PACKAGE_SCHEMA_VERSION;
  const current = value.schema_version === BENCHMARK_PACKAGE_SCHEMA_VERSION;
  if (!legacy && !current) errors.push(`Unsupported schema_version. Use ${BENCHMARK_PACKAGE_SCHEMA_VERSION} or legacy v0.1.`);
  for (const field of ["benchmark_id", "task_id", "task_version", "display_name", "description", "review_as_of", "created_at"] as const) {
    if (typeof value[field] !== "string" || !value[field].trim()) errors.push(`${field} is required.`);
  }
  if (typeof value.task_kind !== "string" || !taskKindPattern.test(value.task_kind)) errors.push("task_kind must be a lowercase machine identifier.");
  if (legacy) {
    if (typeof value.rubric_ref !== "string" || !value.rubric_ref.trim()) errors.push("rubric_ref is required for legacy v0.1.");
    if (!isObject(value.acceptance) || !Number.isInteger(value.acceptance.requirement_count) || Number(value.acceptance.requirement_count) < 1) errors.push("acceptance.requirement_count must be a positive integer.");
  }
  if (current) {
    const allowed = new Set(["schema_version", "benchmark_id", "task_id", "task_version", "display_name", "task_kind", "description", "review_as_of", "created_at", "input_files", "completion_criteria"]);
    for (const field of Object.keys(value)) if (!allowed.has(field)) errors.push(`v0.2 does not accept ${field}; answer keys and business scoring are not part of this task contract.`);
    if (!isObject(value.completion_criteria) || value.completion_criteria.basis !== "user_confirmation" || typeof value.completion_criteria.instructions_file !== "string" || !value.completion_criteria.instructions_file.trim()) errors.push("completion_criteria must declare user_confirmation and a listed instructions_file.");
    else if (Object.keys(value.completion_criteria).some((key) => !["basis", "instructions_file"].includes(key))) errors.push("Unknown completion_criteria field.");
    if (typeof value.review_as_of !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.review_as_of) || Number.isNaN(Date.parse(value.review_as_of)) || new Date(value.review_as_of).toISOString().slice(0, 10) !== value.review_as_of) errors.push("review_as_of must be a valid calendar date.");
    if (typeof value.created_at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value.created_at) || Number.isNaN(Date.parse(value.created_at))) errors.push("created_at must be an ISO timestamp.");
  }

  if (!Array.isArray(value.input_files) || value.input_files.length === 0) {
    errors.push("input_files must contain at least one file.");
  } else {
    const basenames = new Set<string>();
    for (const [index, file] of value.input_files.entries()) {
      if (!isObject(file)) {
        errors.push(`input_files[${index}] must be an object.`);
        continue;
      }
      const basename = typeof file.path === "string" ? file.path.split("/").pop() ?? "" : "";
      if (!basename) errors.push(`input_files[${index}].path is required.`);
      if (typeof file.path === "string" && (file.path.startsWith("/") || file.path.split("/").includes(".."))) errors.push(`input_files[${index}].path must be a safe relative path.`);
      if (current && (typeof file.path !== "string" || file.path.includes("\\") || file.path.includes("\0") || /^[a-zA-Z]:/.test(file.path) || file.path.split("/").some((part) => !part || part === "."))) errors.push(`input_files[${index}].path must be a safe relative path.`);
      if (current && Object.keys(file).some((key) => !["path", "media_type", "size_bytes", "sha256"].includes(key))) errors.push(`Unknown input_files[${index}] field.`);
      if (basenames.has(basename)) errors.push(`Duplicate input filename is not allowed: ${basename}.`);
      basenames.add(basename);
      if (typeof file.media_type !== "string" || !file.media_type) errors.push(`input_files[${index}].media_type is required.`);
      if (!Number.isInteger(file.size_bytes) || Number(file.size_bytes) < 0) errors.push(`input_files[${index}].size_bytes must be a non-negative integer.`);
      if (typeof file.sha256 !== "string" || !sha256Pattern.test(file.sha256)) errors.push(`input_files[${index}].sha256 must be a lowercase SHA-256 digest.`);
    }
  }

  if (legacy) {
    const references = value.reference_answers;
    if (!isObject(references) || references.included_in_package !== false || references.mode !== "sealed_external" || references.unlock_policy !== "after_output_submission" || typeof references.reference_set_id !== "string" || !references.reference_set_id) errors.push("reference_answers must remain sealed outside the imported input package.");
  }
  if (current && isObject(value.completion_criteria) && Array.isArray(value.input_files)) {
    const instructions = value.input_files.find((file) => isObject(file) && file.path === (value.completion_criteria as Record<string, unknown>).instructions_file);
    if (!isObject(instructions) || typeof instructions.size_bytes !== "number" || instructions.size_bytes < 1) errors.push("The completion instructions_file must be a non-empty listed input file.");
  }

  return { manifest: errors.length === 0 ? value as BenchmarkPackageManifest : null, errors };
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validateBenchmarkFiles(selectedFiles: File[]): Promise<BenchmarkImportResult> {
  const jsonFiles = selectedFiles.filter((file) => file.name.toLowerCase().endsWith(".json"));
  // Discover by declared schema, not extension count: JSON may itself be task input.
  const parsedJson = await Promise.all(jsonFiles.map(async (file) => {
    try { return { file, value: JSON.parse(await file.text()) as unknown }; }
    catch { return { file, value: null }; }
  }));
  const candidates = parsedJson.filter(({ value }) => isObject(value) && [BENCHMARK_PACKAGE_SCHEMA_VERSION, LEGACY_BENCHMARK_PACKAGE_SCHEMA_VERSION].includes(String(value.schema_version)));
  if (candidates.length !== 1) return { manifest: null, status: "invalid", errors: ["Select exactly one supported task package manifest JSON plus all listed input files."], file_checks: [], imported_file_count: selectedFiles.length, selected_files: selectedFiles };
  const { file: manifestFile, value: parsed } = candidates[0];

  const inspected = inspectBenchmarkManifest(parsed);
  if (!inspected.manifest) return { manifest: null, status: "invalid", errors: inspected.errors, file_checks: [], imported_file_count: selectedFiles.length, selected_files: selectedFiles };

  const inputSelections = selectedFiles.filter((file) => file !== manifestFile);
  const selectionByName = new Map(inputSelections.map((file) => [file.name, file]));
  const expectedNames = new Set(inspected.manifest.input_files.map((file) => file.path.split("/").pop()!));
  const unexpected = inputSelections.filter((file) => !expectedNames.has(file.name));
  const errors = unexpected.map((file) => `Unlisted file selected: ${file.name}.`);
  const selectedNameCounts = inputSelections.reduce((counts, file) => counts.set(file.name, (counts.get(file.name) ?? 0) + 1), new Map<string, number>());
  for (const [name, count] of selectedNameCounts) if (count > 1) errors.push(`Duplicate selected filename: ${name}.`);
  const fileChecks: ImportedFileCheck[] = [];

  for (const expected of inspected.manifest.input_files) {
    const basename = expected.path.split("/").pop()!;
    const selected = selectionByName.get(basename);
    if (!selected) {
      fileChecks.push({ ...expected, selected_name: null, actual_size_bytes: null, actual_sha256: null, status: "missing" });
      errors.push(`Missing required file: ${expected.path}.`);
      continue;
    }
    if (selected.size !== expected.size_bytes) {
      fileChecks.push({ ...expected, selected_name: selected.name, actual_size_bytes: selected.size, actual_sha256: null, status: "size_mismatch" });
      errors.push(`Size mismatch: ${expected.path}.`);
      continue;
    }
    const digest = await sha256(selected);
    const status = digest === expected.sha256 ? "valid" : "hash_mismatch";
    fileChecks.push({ ...expected, selected_name: selected.name, actual_size_bytes: selected.size, actual_sha256: digest, status });
    if (status !== "valid") errors.push(`SHA-256 mismatch: ${expected.path}.`);
  }

  return {
    manifest: inspected.manifest,
    status: errors.length === 0 ? "ready" : "invalid",
    errors,
    file_checks: fileChecks,
    imported_file_count: selectedFiles.length,
    selected_files: selectedFiles,
  };
}
