// Build shared task instructions from the user's answers, without interpreting or grading them.
export function composeTaskInstructions({ work, deliverable, completion }) {
  if (![work, deliverable, completion].every(answer => typeof answer === "string" && answer.trim())) return null;
  return [
    `What should be done?\n${work.trim()}`,
    `What should be delivered?\n${deliverable.trim()}`,
    `When is the task complete?\n${completion.trim()}`,
  ].join("\n\n");
}
