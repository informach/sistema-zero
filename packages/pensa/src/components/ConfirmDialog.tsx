/**
 * A janela que pergunta antes de algo sem volta (apagar o plano, voltar a uma versão). Nada de
 * `window.confirm`: a caixa do navegador não veste o tema nem fala a língua da casa.
 *
 * A11y: `role="dialog"` + `aria-modal`, o foco entra no card ao abrir e volta a quem abriu ao
 * fechar, Esc fecha (nunca no meio de uma gravação) e o Tab fica preso dentro da janela.
 */
import { type ReactNode, type RefObject, useId, useRef } from 'react'
import { useDialogFocus } from './dialogFocus'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  art,
  busy = false,
  error,
  onConfirm,
  onClose,
  returnFocusTo,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  /** O que o botão diz enquanto grava; sem ele, repete o rótulo. */
  busyLabel?: string
  cancelLabel?: string
  /** `danger` apaga; `action` é uma escolha que dá para desfazer depois. */
  tone?: 'danger' | 'action'
  /** O Zappy dormindo no "apagar" do Kids (decorativo). */
  art?: ReactNode
  busy?: boolean
  /** Deu errado: a janela FICA aberta com o recado, para tentar de novo. */
  error?: string | null
  onConfirm: () => void
  onClose: () => void
  /** Para onde o foco volta ao fechar (lido no fechamento, nunca na abertura). */
  returnFocusTo?: RefObject<HTMLElement | null>
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const bodyId = useId()
  useDialogFocus({ open, cardRef, busy, onClose, returnFocusTo })

  if (!open) return null

  return (
    <div className="pz-scrim">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="pz-dialog pz-dialog--confirm"
      >
        {art}
        <h2 id={titleId} className="pz-title pz-title--md">
          {title}
        </h2>
        <p id={bodyId} className="pz-dialog__body">
          {body}
        </p>
        {error ? (
          <p className="pz-alert-text" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pz-dialog__actions">
          <button type="button" className="pz-btn pz-btn--card" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`pz-btn ${tone === 'danger' ? 'pz-btn--danger' : 'pz-btn--action'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
