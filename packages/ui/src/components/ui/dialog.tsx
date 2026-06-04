'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../../lib/cn'

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
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          'sz-modal relative my-8 w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-xl',
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
