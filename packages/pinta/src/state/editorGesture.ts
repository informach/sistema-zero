import type { PintaAsset } from '../core/project'
import type { PintaEditorStore } from './editorStore'

/** Owns only its surviving RAM revision; persistence remains the editor's responsibility. */
export function createEditorGesture(editor: PintaEditorStore) {
  const base = editor.getState().asset
  let produced = base,
    open = true
  const isCurrent = (): boolean => open && editor.getState().asset === produced
  const cancel = (): boolean => {
    const current = isCurrent()
    open = false
    if (current && produced !== base) editor.getState().replaceIfCurrent(produced, base)
    return current
  }
  return {
    base,
    isCurrent,
    cancel,
    replace(next: PintaAsset): boolean {
      if (!isCurrent()) {
        open = false
        return false
      }
      if (next === produced) return true
      const written = editor.getState().replaceIfCurrent(produced, next)
      if (!written) {
        cancel()
        return false
      }
      produced = written
      return true
    },
    finish(): boolean {
      const current = isCurrent()
      open = false
      if (current && produced !== base) editor.getState().commitGesture(base)
      return current
    },
  }
}

export type EditorGesture = ReturnType<typeof createEditorGesture>
