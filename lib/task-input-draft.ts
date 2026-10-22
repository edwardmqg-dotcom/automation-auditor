export type TaskInputDraft = { name: string; work: string; deliverable: string; completion: string };
export const emptyTaskInputDraft = (): TaskInputDraft => ({ name: "", work: "", deliverable: "", completion: "" });
export function inspectTaskInputDraft(value: unknown): TaskInputDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Saved task description is invalid.");
  const item = value as Record<string, unknown>;
  const keys = ["name", "work", "deliverable", "completion"] as const;
  if (Object.keys(item).some(key => !keys.includes(key as typeof keys[number])) || keys.some(key => typeof item[key] !== "string")) throw new Error("Saved task description has unsupported fields.");
  return { name: item.name as string, work: item.work as string, deliverable: item.deliverable as string, completion: item.completion as string };
}
