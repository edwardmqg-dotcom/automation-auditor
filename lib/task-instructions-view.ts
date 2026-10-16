import type { BenchmarkPackageManifest } from "./benchmark-import";

// Read the actual selected/stored file, not a regenerated copy of the answers.
export async function readTaskInstructions(manifest: BenchmarkPackageManifest, files: File[]): Promise<{ file: File; text: string | null }> {
  if (manifest.schema_version !== "benchmark-package-manifest-v0.2") throw new Error("This older task uses a manually recorded completion reference.");
  const path = manifest.completion_criteria.instructions_file;
  const expected = manifest.input_files.find(item => item.path === path);
  const matches = files.filter(file => file.name === path.split("/").pop());
  if (!expected || matches.length !== 1) throw new Error("The task instructions file is unavailable. Check the connected files in Benchmarks.");
  const file = matches[0];
  if (file.size !== expected.size_bytes) throw new Error("The task instructions file does not match the connected task (size mismatch).");
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  if (fingerprint !== expected.sha256) throw new Error("The task instructions file does not match the connected task (fingerprint mismatch).");
  const readable = expected.media_type.startsWith("text/") || /\.(txt|md|json)$/i.test(file.name);
  if (!readable || file.size > 1024 * 1024) return { file, text: null };
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return { file, text: null }; }
  if (Array.from(text).some(character => character.charCodeAt(0) < 32 && !"\t\n\r".includes(character))) return { file, text: null };
  return { file, text };
}
