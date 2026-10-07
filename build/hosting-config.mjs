import { readFileSync } from "node:fs";

/** Read optional instance bindings without requiring private files in a release. */
export function loadHostingBindings(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    // Only absence gets a local fallback. Malformed/unreadable config must fail.
    if (error.code === "ENOENT") return { d1: null, r2: null };
    throw error;
  }
  const config = JSON.parse(text);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Hosting configuration must be a JSON object.");
  }
  for (const name of ["d1", "r2"]) {
    if (config[name] != null && (typeof config[name] !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(config[name]))) {
      throw new Error(`Hosting ${name} must be a valid binding name or null.`);
    }
  }
  return { d1: config.d1 ?? null, r2: config.r2 ?? null };
}
