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
import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]'),
  ).filter((element) => {
    if (element.getAttribute('tabindex') === '-1') return false
    return !('disabled' in element && element.disabled)
  })
}

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
  // Em refs porque o `keydown` é registrado UMA vez: sem isso o Esc fecharia com o
  // `busy`/`onClose` da primeira renderização. Atualizadas em efeito, nunca durante o
  // render (o React 19 pode descartar uma renderização pela metade).
  const busyRef = useRef(busy)
  const closeRef = useRef(onClose)
  useEffect(() => {
    busyRef.current = busy
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const card = cardRef.current
    if (!card) return

    function handleKeyDown(event: KeyboardEvent) {
      const active = cardRef.current
      if (!active || event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        // Fechar no meio da gravação deixaria a criança sem saber se apagou.
        if (!busyRef.current) closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable(active)
      const first = items[0]
      const last = items.at(-1)
      const focused = document.activeElement
      if (!first || !last) {
        event.preventDefault()
        active.focus()
      } else if (!focused || !active.contains(focused)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && (focused === first || focused === active)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    card.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const back = returnFocusTo?.current
      if (back?.isConnected) back.focus()
      else if (previous?.isConnected && previous !== document.body) previous.focus()
    }
  }, [open, returnFocusTo])

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
