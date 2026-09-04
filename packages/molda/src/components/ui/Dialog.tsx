/**
 * Modal interno mínimo e acessível (cópia por valor do Dialog do Pinta): foco
 * vai para o card ao abrir (e volta ao acionador ao fechar), Esc fecha,
 * aria-modal + aria-labelledby, trap simples de Tab. Renderiza INLINE (sem
 * portal), então permanece dentro do escopo [data-molda-theme] do root.
 */
import type { JSX, ReactNode, RefObject } from 'react'
import { useEffect, useId, useRef } from 'react'
import { COPY } from '../../core/copy'
import { X } from './icons'

/** Ordem modal real; só o card do topo pode capturar teclado/foco. */
const dialogStack: HTMLElement[] = []

function registerDialog(card: HTMLElement): void {
  const existingIndex = dialogStack.indexOf(card)
  if (existingIndex >= 0) dialogStack.splice(existingIndex, 1)
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

/** Os atalhos do editor consultam isto para não agir com um modal aberto. */
export function isMoldaDialogOpen(): boolean {
  return dialogStack.length > 0
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

export function handleDialogDocumentKeyDown(
  event: globalThis.KeyboardEvent,
  card: HTMLElement,
  onClose: () => void,
): void {
  if (event.defaultPrevented) return
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
  returnFocusTo,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
  /** Quem recebe o foco ao fechar, no lugar de "quem estava focado ao abrir". */
  returnFocusTo?: RefObject<HTMLElement | null>
}): JSX.Element | null {
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

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
      ;(returnFocusTo?.current ?? previous)?.focus()
    }
  }, [open, returnFocusTo])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mld-scrim p-4">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Marca DO MOLDA: os atalhos do editor consultam este atributo para
        // saber que há um modal aberto (o `role` um painel do host também usa).
        data-molda-dialog=""
        tabIndex={-1}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-full overflow-y-auto overscroll-contain rounded-2xl border-2 border-mld-border bg-mld-surface p-6 shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="mld-display text-xl text-mld-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={COPY.a11y.closeDialog}
            className="-mt-1 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-mld-muted transition hover:bg-mld-bg hover:text-mld-text"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}
