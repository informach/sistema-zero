import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import type { PintaEditorState } from '../../state/editorStore'
import { Check, TriangleAlert } from '../ui/icons'

/**
 * O salvamento local na pílula da tela-modelo: menta com o visto quando está salvo, quieta
 * enquanto salva e vermelha (com o recado do erro) quando falhou. O texto mora DIRETO na região
 * viva (`role="status"`), que é como o leitor anuncia e como os testes a encontram.
 */
export function SaveBadge({
  saveState,
  saveError,
}: Pick<PintaEditorState, 'saveState' | 'saveError'>): JSX.Element {
  const label =
    saveState === 'saved'
      ? COPY.editor.saved
      : saveState !== 'error'
        ? COPY.editor.saving
        : (saveError ?? COPY.editor.saveError)
  const tone = saveState === 'saved' ? 'ok' : saveState !== 'error' ? 'muted' : 'danger'
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`pin-bar-seal pin-bar-seal--${tone}`}
    >
      {tone === 'ok' ? <Check aria-hidden="true" /> : null}
      {tone === 'danger' ? <TriangleAlert aria-hidden="true" /> : null}
      {label}
    </span>
  )
}
