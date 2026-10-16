"use client";

import { useState } from 'react';
import { Input } from './ui/input';

export function ResultReferenceField({ value, disabled, onSave, onDirtyChange }: { value: string; disabled: boolean; onSave: (value: string) => boolean; onDirtyChange: (dirty: boolean) => void }) {
  const [editing, setEditing] = useState(value);
  const [status, setStatus] = useState('');
  const dirty = editing.trim() !== value.trim();
  function commit() {
    if (disabled || !dirty) return;
    if (onSave(editing)) {
      setEditing(editing.trim()); setStatus('Saved automatically.'); onDirtyChange(false);
    } else setStatus('Not saved. Check the warning and try again.');
  }
  return <label className="form-wide"><span>Saved result file path or link</span><Input aria-label="Saved result file path or link" value={editing} disabled={disabled} aria-invalid={dirty && !editing.trim()} onChange={event => { const next = event.target.value; setEditing(next); setStatus(''); onDirtyChange(next.trim() !== value.trim()); }} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} /><small role="status">{status || (dirty ? 'Changes save when you leave this field.' : 'You can edit this until completion is confirmed. Changes save automatically.')}</small></label>;
}
