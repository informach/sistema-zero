'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

let bodyScrollLocks = 0
let previousBodyOverflow: string | null = null
let dialogIdSequence = 0
const openDialogStack: number[] = []

function lockBodyScroll() {
  if (bodyScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLocks++
}

function unlockBodyScroll() {
  bodyScrollLocks = Math.max(0, bodyScrollLocks - 1)
  if (bodyScrollLocks === 0) {
    document.body.style.overflow = previousBodyOverflow ?? ''
    previousBodyOverflow = null
  }
}

function removeDialogFromStack(id: number) {
  const index = openDialogStack.lastIndexOf(id)
  if (index !== -1) openDialogStack.splice(index, 1)
}

/**
 * Modal controlado e leve (sem dep externa): overlay + card, fecha no Esc/backdrop.
 * `titleAlign: 'center'` + `onBack` servem fluxos multi-passo (título centralizado
 * com link "Voltar" no canto esquerdo — estilo Udemy).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  titleAlign = 'left',
  onBack,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** Alinhamento do título no header (default `left`). */
  titleAlign?: 'left' | 'center'
  /** Presente → renderiza o link "Voltar" no canto esquerdo do header. */
  onBack?: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const dialogIdRef = useRef(0)
  if (dialogIdRef.current === 0) dialogIdRef.current = ++dialogIdSequence

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Gestão de foco do modal (a11y): ao abrir, leva o foco para dentro (o leitor de tela
  // anuncia o diálogo pelo `aria-label`); prende o Tab no card (não escapa pro fundo); e
  // devolve o foco ao gatilho ao fechar. Sem isto, teclado/leitor ficam "presos" atrás do modal.
  useEffect(() => {
    if (!open) return
    const dialogId = dialogIdRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    const card = cardRef.current
    removeDialogFromStack(dialogId)
    openDialogStack.push(dialogId)
    // Foca o container (anuncia o título) — evita cair no "X"/"Voltar" como 1º foco.
    card?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (openDialogStack[openDialogStack.length - 1] !== dialogId) return
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !card) return
      const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) {
        e.preventDefault()
        card.focus()
        return
      }
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      removeDialogFromStack(dialogId)
      unlockBodyScroll()
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={cn(
          'sz-modal relative my-8 w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-xl outline-none',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative border-b border-border p-5">
          {onBack ? (
            <button
              onClick={onBack}
              className="absolute left-5 top-5 text-sm font-medium text-primary hover:underline"
            >
              Voltar
            </button>
          ) : null}
          <div
            className={cn(
              'flex flex-col gap-1',
              titleAlign === 'center' ? 'items-center px-14 text-center' : 'pr-8',
              titleAlign === 'left' && onBack && 'pl-14',
            )}
          >
            <h2 className="text-lg font-semibold leading-none">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
