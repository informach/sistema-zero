'use client'

import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useModalA11y } from './use-modal-a11y'

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
  // Gestão de foco do modal (a11y) compartilhada: foca o card ao abrir, prende o Tab,
  // fecha no Esc e devolve o foco ao gatilho — ver `useModalA11y`.
  const cardRef = useModalA11y<HTMLDivElement>({ open, onClose })

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
          // max-h + flex-col: o card nunca passa da viewport (mesmo com conteúdo alto, ex.: o
          // Estúdio embutido) → cabeçalho e rodapé ficam FIXOS e só o corpo rola. Sem isto o
          // card transbordava e o `items-center` do overlay cortava o TOPO (header inalcançável).
          'sz-modal relative my-8 flex max-h-[calc(100dvh-6rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl outline-none',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative shrink-0 border-b border-border p-5">
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
            <h2 className="max-w-full min-w-0 break-words text-lg font-semibold leading-none [overflow-wrap:anywhere]">
              {title}
            </h2>
            {description ? (
              <p className="max-w-full min-w-0 break-words text-muted-foreground text-sm [overflow-wrap:anywhere]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
