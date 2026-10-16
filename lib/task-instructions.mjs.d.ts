export interface TaskInstructionAnswers {
  work: string;
  deliverable: string;
  completion: string;
}
export function composeTaskInstructions(answers: TaskInstructionAnswers): string | null;
