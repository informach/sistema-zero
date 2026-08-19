/**
 * Modal interno mínimo e acessível (mesma mecânica do Dialog do pensa): foco
 * vai para o card ao abrir (e volta ao acionador ao fechar), Esc fecha,
 * aria-modal + aria-labelledby, trap simples de Tab. Renderiza INLINE (sem
 * portal), então permanece dentro do escopo [data-pinta-theme] do root.
 */
import type { JSX, ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { COPY } from '../../core/copy'
import { X } from './icons'

/** Ordem modal real; só o card do topo pode capturar teclado/foco. */
const dialogStack: HTMLElement[] = []

function registerDialog(card: HTMLElement): void {
  const existingIndex = dialogStack.indexOf(card)
  if (existingIndex >= 0) dialogStack.splice(existingIndex, 1)
  // Efeitos de filhos podem rodar antes dos pais. A contenção do DOM corrige
  // essa ordem: um diálogo aninhado sempre fica depois do seu ancestral.
  const firstDescendant = dialogStack.findIndex((candidate) => card.contains(candidate))
  if (firstDescendant >= 0) dialogStack.splice(firstDescendant, 0, card)
  else dialogStack.push(card)
}

function unregisterDialog(card: HTMLElement): void {
  const index = dialogStack.indexOf(card)
  if (index >= 0) dialogStack.splice(index, 1)
}

function isTopDialog(card: HTMLElement): boolean {
  return dialogStack.at(-1) === card
}

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter((element) => {
    if (element.getAttribute('tabindex') === '-1') return false
    if ('disabled' in element && element.disabled) return false
    if (element.hasAttribute('tabindex')) return true
    if (element.tagName === 'A') return element.hasAttribute('href')
    return ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
  })
}

/** Trap do modal; separado para manter a regra testável sem simular o Tab nativo. */
export function handleDialogDocumentKeyDown(
  event: globalThis.KeyboardEvent,
  card: HTMLElement,
  onClose: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    onClose()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusableElements(card)
  const first = items[0]
  const last = items.at(-1)
  const active = document.activeElement
  if (!first || !last) {
    event.preventDefault()
    card.focus()
  } else if (!active || !card.contains(active)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && (active === first || active === card)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

export function handleDialogDocumentFocusIn(event: globalThis.FocusEvent, card: HTMLElement): void {
  // Não usa `instanceof Node`: em testes/iframes o alvo pode vir de outro
  // realm. `nodeType` + `contains` preserva o mesmo contrato do DOM.
  const target = event.target
  if (target && typeof target === 'object' && 'nodeType' in target) {
    if (card.contains(target as Node)) return
  }
  const first = focusableElements(card)[0]
  ;(first ?? card).focus()
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}): JSX.Element | null {
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Foca o card, captura o teclado no DOCUMENTO e devolve o foco ao acionador
  // ao fechar. O listener global continua funcionando se o foco escapar do
  // subtree inline do modal.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const card = cardRef.current
    if (!card) return
    registerDialog(card)

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      const activeCard = cardRef.current
      if (activeCard && isTopDialog(activeCard)) {
        handleDialogDocumentKeyDown(event, activeCard, () => onCloseRef.current())
      }
    }

    function handleFocusIn(event: globalThis.FocusEvent): void {
      const activeCard = cardRef.current
      if (activeCard && isTopDialog(activeCard)) handleDialogDocumentFocusIn(event, activeCard)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    card.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      unregisterDialog(card)
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-scrim p-4">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Marca DO PINTA: os atalhos do editor consultam este atributo (não `role`, que um
        // painel do host sempre montado também usa) para saber que há um modal aberto.
        data-pinta-dialog=""
        tabIndex={-1}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-full overflow-y-auto overscroll-contain rounded-2xl border-2 border-pin-border bg-pin-surface p-6 shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="pin-display text-xl text-pin-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={COPY.a11y.close}
            className="-mt-1 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-pin-muted transition hover:bg-pin-bg hover:text-pin-text"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}
