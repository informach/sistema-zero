'use client'

import type { MoldeDoVestuario, PublicoJogo } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import { AvatarConfiguratorClient } from './cosmetics/avatar3d/configurator-client'

export function ArquipelagoAvatarDialog({
  festa,
  publico,
  onFinish,
}: {
  festa: MoldeDoVestuario['festa']
  publico: PublicoJogo
  onFinish(saved: boolean): void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    const foco = document.activeElement instanceof HTMLElement ? document.activeElement : null
    d?.showModal()
    return () => {
      d?.close()
      if (foco?.isConnected) foco.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label="Roupas da festa"
      onCancel={(e) => e.preventDefault()}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-auto border-0 bg-background p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex h-dvh min-h-0 flex-col">
        <AvatarConfiguratorClient
          returnTo="/perfil"
          skin={publico === 'kids' ? 'kids' : 'adult'}
          festa={festa}
          onReturn={onFinish}
        />
      </div>
    </dialog>
  )
}
