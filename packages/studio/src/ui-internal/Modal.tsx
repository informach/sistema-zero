import type { JSX } from 'react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStudioPortalContainer } from '../studio/portal-container'
import { useStudioSheets } from '../studio/sheet-context'
import { StudioThemeScope } from '../studio/theme'
import { cn } from './cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps): JSX.Element | null {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const portalContainer = useStudioPortalContainer()
  // No Pro do celular a janela vira folha que sobe de baixo (o mesmo `<dialog>`, só a forma).
  const sheet = useStudioSheets()

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialog && !dialog.open) dialog.showModal()

    const firstFocusable = dialog?.querySelector<HTMLElement>(
      ['button', '[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'].join(
        ',',
      ),
    )
    ;(firstFocusable ?? dialog)?.focus()

    return () => {
      if (dialog?.open) dialog.close()
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null
  // Portala para fora do root do <Studio> — o StudioThemeScope reaplica o
  // [data-sz-theme] para os tokens de cor valerem dentro do modal.
  return createPortal(
    <StudioThemeScope>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-sz-sheet={sheet ? '' : undefined}
        className={cn(
          'fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none justify-center border-0 bg-black/60 text-inherit backdrop:bg-transparent backdrop-blur-sm',
          sheet ? 'items-end p-0' : 'items-center p-4',
        )}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        onCancel={(e) => {
          // Modal ANINHADO (TileConfigDialog, Trazer do Pinta): o `cancel` do
          // dialog de cima borbulha pela árvore REACT (portal propaga pelo
          // componente, não pelo DOM) — sem o guard, um Esc fechava OS DOIS.
          if (e.target !== e.currentTarget) return
          e.preventDefault()
          onClose()
        }}
      >
        {/* max-h + corpo rolável: conteúdo comprido (ex.: extensões) rola por
            dentro com header/footer fixos — antes transbordava e cortava. */}
        <div
          className={
            // Na folha o `className` de quem chama (larguras de janela) não vale: ela é a tela toda.
            sheet
              ? 'sz-sheet sz-sheet--dialog'
              : cn(
                  'flex max-h-[85vh] w-full max-w-[640px] min-w-[320px] flex-col rounded-2xl border-2 border-sz-border bg-sz-panel shadow-2xl',
                  className,
                )
          }
          role="document"
        >
          <header
            id={titleId}
            className="shrink-0 border-b border-sz-border px-5 py-3.5 text-sm font-semibold text-sz-fg"
          >
            {title}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-sz-fg-soft">
            {children}
          </div>
          {footer && (
            <footer className="flex shrink-0 justify-end gap-2 border-t border-sz-border px-5 py-3.5">
              {footer}
            </footer>
          )}
        </div>
      </dialog>
    </StudioThemeScope>,
    portalContainer ?? document.body,
  )
}
