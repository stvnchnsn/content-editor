const DISCARD_MESSAGE = 'Discard unsaved changes?';

export function confirmDiscardUnsaved(isDirty: boolean): boolean {
  if (!isDirty) return true;
  return window.confirm(DISCARD_MESSAGE);
}
