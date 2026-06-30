'use client'

import { useState } from 'react'
import { Button, type ButtonProps } from './button'
import { Dialog } from './dialog'
import { Spinner } from './spinner'

/**
 * Modal de confirmação da plataforma — substitui o `window.confirm()` nativo.
 * Envolve o `Dialog` com um rodapé Cancelar/Confirmar. O `onConfirm` pode ser
 * assíncrono: enquanto roda, mostra spinner e trava os botões; o chamador fecha
 * (via `onClose`) no sucesso e mantém aberto no erro (geralmente com um toast).
 *
 * `children` (opcional) entra abaixo da mensagem — use p/ contexto extra ou um
 * campo de confirmação (ex.: digitar o e-mail antes de excluir um usuário), com
 * o botão Confirmar travado por `confirmDisabled`.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  children,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'default',
  confirmDisabled = false,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** Texto/elemento principal da confirmação (corpo do modal). */
  message: React.ReactNode
  children?: React.ReactNode
  onConfirm: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
  /** Variante do botão de confirmar — use `destructive` em exclusões. */
  confirmVariant?: ButtonProps['variant']
  /** Trava o botão Confirmar (ex.: aguardando o usuário digitar o e-mail). */
  confirmDisabled?: boolean
  className?: string
}) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    if (busy) return
    try {
      setBusy(true)
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? <Spinner /> : null}
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-muted-foreground">
        <div>{message}</div>
        {children}
      </div>
    </Dialog>
  )
}
