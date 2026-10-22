"use client";
import { useEffect, useRef, useState } from "react";
import { emptyTaskInputDraft, type TaskInputDraft } from "@/lib/task-input-draft";
import { loadTaskInputDraft, saveTaskInputDraft } from "@/lib/workspace-store";

// Separate from file handles, task identity and sealed evidence. Writes stay ordered.
export function useTaskInputDraft() {
  const [draft, setDraft] = useState<TaskInputDraft>(emptyTaskInputDraft);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("Restoring task description…");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    loadTaskInputDraft().then(saved => {
      if (!active) return;
      if (saved) setDraft(saved);
      setNotice(saved ? "Task description restored. Select your task files again if needed." : "");
    }).catch(() => {
      if (active) setNotice("The saved task description could not be restored. Existing task and run records have not been changed.");
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; mounted.current = false; };
  }, []);
  function update(next: TaskInputDraft) {
    if (!ready) return;
    setDraft(next);
    setNotice("Saving task description…");
    const current = ++revision.current;
    queue.current = queue.current.then(async () => {
      try {
        await saveTaskInputDraft(next);
        if (mounted.current && revision.current === current) setNotice("Task description saved on this device.");
      } catch {
        if (mounted.current && revision.current === current) setNotice("Task description is kept in this page, but could not be saved on this device. Copy it before reloading.");
      }
    });
  }
  return { draft, update, ready, notice };
}
