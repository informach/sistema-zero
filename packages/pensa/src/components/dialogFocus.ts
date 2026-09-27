/**
 * O foco de uma janela modal do Pensa (26/09/2026, extraído do `ConfirmDialog` para a janela
 * da equipe usar o MESMO comportamento): o foco entra no card ao abrir, o Tab fica preso
 * dentro, Esc fecha (nunca no meio de uma gravação) e, ao fechar, o foco volta a quem abriu.
 *
 * A11y é contrato, não enfeite: sem a prisão do Tab o leitor de tela vai parar atrás do
 * scrim, e sem a volta do foco a criança que fechou pelo teclado cai no `body`.
 */
import { type RefObject, useEffect, useRef } from 'react'

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]'),
  ).filter((element) => {
    if (element.getAttribute('tabindex') === '-1') return false
    return !('disabled' in element && element.disabled)
  })
}

export function useDialogFocus({
  open,
  cardRef,
  busy,
  onClose,
  returnFocusTo,
}: {
  open: boolean
  cardRef: RefObject<HTMLElement | null>
  /** Gravando: o Esc não fecha (fechar no meio deixaria a criança sem saber o que valeu). */
  busy: boolean
  onClose: () => void
  /**
   * Para onde o foco volta ao fechar. É QUEM ABRIU, e quem abre atualiza a ref quando sabe
   * que ele vai sumir. Lida no fechamento, nunca na abertura: `document.activeElement` não
   * serve de âncora porque clicar num botão nem sempre o foca.
   */
  returnFocusTo?: RefObject<HTMLElement | null>
}): void {
  // Em refs porque o `keydown` é registrado UMA vez: sem isso o Esc fecharia com o
  // `busy`/`onClose` da primeira renderização. Atualizadas em efeito, nunca durante o render
  // (o React 19 pode descartar uma renderização pela metade).
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
  }, [open, cardRef, returnFocusTo])
}
