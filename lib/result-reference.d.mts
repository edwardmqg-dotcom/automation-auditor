import type { RunDraft } from './run-draft.mjs';
export function saveResultReference(storage: Pick<Storage,'setItem'>, draft: RunDraft, nextValue: string, savedAt: string): {draft: RunDraft; changed: boolean};
