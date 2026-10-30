'use client'

import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { useEffect, useRef } from 'react'
import { PublicPlayer } from './creator/public-player'

/** A mesma publicação pública, com a mesma resolução e descarte do player do Mural. */
export function ArquipelagoMuralPlayer({
  playId,
  publico,
  onClose,
}: {
  playId: string
  publico: 'kids' | 'adulto'
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useBodyScrollLock(true)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    return () => {
      if (anterior?.isConnected) anterior.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-label="Jogo do Mural"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto flex h-[96dvh] max-h-none w-[96vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b p-2">
        <h2 className="min-w-0 font-bold">Jogo do Mural</h2>
        <button
          type="button"
          onClick={onClose}
          className={`${publico === 'adulto' ? 'sz-btn' : 'sz-btn-gradient'} min-h-11 shrink-0 px-4`}
        >
          Voltar ao jogo
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <PublicPlayer id={playId} skin={publico === 'adulto' ? 'adult' : 'kids'} embedded />
      </div>
    </dialog>
  )
}
