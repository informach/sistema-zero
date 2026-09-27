/**
 * A janela que pergunta antes de algo sem volta (apagar um plano, apagar um Cartão
 * de Criação). Nasceu no pacote porque o Pensa não depende do `@sistemazero/ui`; o
 * molde é o `ConfirmDialog` do Molda, que por sua vez veio do Pinta.
 *
 * Nada de `window.confirm`: a caixa cinza do navegador não veste o tema, não fala a
 * língua da casa e a linha kids já a aposentou nas outras ferramentas.
 *
 * A11y: `role="dialog"` + `aria-modal`, o foco entra no card ao abrir e volta a quem
 * abriu ao fechar, Esc fecha (nunca no meio de uma gravação) e o Tab fica preso
 * dentro da janela.
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
  /** O que o botão diz enquanto grava ("Apagando…"); sem ele, repete o rótulo. */
  busyLabel?: string
  cancelLabel?: string
  busy?: boolean
  /** Deu errado: a janela FICA aberta com o recado, para a criança tentar de novo. */
  error?: string | null
  onConfirm: () => void
  onClose: () => void
  /**
   * Para onde o foco volta ao fechar. É QUEM ABRIU, e quem abre atualiza a ref quando
   * sabe que ele vai sumir (o cartão apagado leva a própria lixeira junto). Lida no
   * fechamento, nunca na abertura: `document.activeElement` não serve de âncora porque
   * clicar num botão nem sempre o foca.
   */
  returnFocusTo?: RefObject<HTMLElement | null>
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const bodyId = useId()
  // O foco (entrar, prender o Tab, Esc, voltar a quem abriu) é o `useDialogFocus`, o MESMO da
  // janela da equipe: duas janelas com dois focos era como uma delas ia apodrecer.
  useDialogFocus({ open, cardRef, busy, onClose, returnFocusTo })

  if (!open) return null

  return (
    <div className="pensa-dialog-scrim">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="pensa-dialog"
      >
        <h2 id={titleId} className="pensa-dialog__title">
          {title}
        </h2>
        <p id={bodyId} className="pensa-dialog__body">
          {body}
        </p>
        {error ? (
          <p className="pensa-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pensa-dialog__actions">
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="sz-tool-pill pensa-dialog__danger"
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
