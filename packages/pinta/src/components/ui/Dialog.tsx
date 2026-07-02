/**
 * Modal interno mínimo e acessível (mesma mecânica do Dialog do pensa): foco
 * vai para o card ao abrir (e volta ao acionador ao fechar), Esc fecha,
 * aria-modal + aria-labelledby, trap simples de Tab. Renderiza INLINE (sem
 * portal), então permanece dentro do escopo [data-pinta-theme] do root.
 */
import type { JSX, KeyboardEvent, ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
  const titleId = useId()

  // Foca o card ao abrir e devolve o foco ao acionador ao fechar/desmontar.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cardRef.current?.focus()
    return () => {
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const card = cardRef.current
    if (!card) return
    const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (!first || !last) return
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === card)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-scrim p-4">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-full overflow-y-auto rounded-3xl border-2 border-pin-border bg-pin-surface p-6 shadow-xl outline-none`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-bold text-pin-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mt-1 flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-lg text-pin-muted transition hover:bg-pin-bg hover:text-pin-text"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}
