'use client'

import type { ButtonProps } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { useCallback, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  /** Use `destructive` em exclusões. */
  confirmVariant?: ButtonProps['variant']
  /** Executado ao confirmar; pode ser assíncrono (mostra spinner). */
  onConfirm: () => void | Promise<void>
}

/**
 * Hook para confirmações da plataforma (substitui `window.confirm()`). Devolve
 * `confirm(opts)` p/ abrir e `confirmDialog` para renderizar UMA vez no JSX. Um
 * único modal serve todos os pontos de confirmação do componente.
 *
 * O `onConfirm` roda ao confirmar; no fim (sucesso) o modal fecha. Se o handler
 * relançar (erro não tratado), o modal permanece aberto — mas o padrão do admin
 * é o handler tratar o erro (toast) e resolver normalmente.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => setState(opts), [])

  const confirmDialog = (
    <ConfirmDialog
      open={state !== null}
      onClose={() => setState(null)}
      title={state?.title ?? ''}
      message={state?.message}
      confirmText={state?.confirmText}
      cancelText={state?.cancelText}
      confirmVariant={state?.confirmVariant}
      onConfirm={async () => {
        await state?.onConfirm()
        setState(null)
      }}
    />
  )

  return { confirm, confirmDialog }
}
