'use client'

import type { PublicoJogo } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import { RoomBuilder } from './cosmetics/room/room-builder'
import { AdultRoomBuilder } from './cosmetics/room/room-builder-adult'

/**
 * O editor do Meu Quarto por cima do jogo (§6.28, A10): o mesmo editor da plataforma, que grava pela
 * rota de sempre. "Voltar ao jogo" fecha; o host relê o quarto e devolve ao jogo.
 */
export function ArquipelagoQuartoDialog({
  publico,
  onFinish,
}: {
  publico: PublicoJogo
  onFinish(): void
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
  const voltar = (
    <button
      type="button"
      onClick={onFinish}
      className="rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold"
    >
      Voltar ao jogo
    </button>
  )
  return (
    <dialog
      ref={ref}
      aria-label="Meu quarto"
      onCancel={(e) => {
        e.preventDefault()
        onFinish()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-auto border-0 bg-background p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex h-dvh min-h-0 flex-col">
        {publico === 'kids' ? (
          <RoomBuilder header={voltar} />
        ) : (
          <AdultRoomBuilder header={voltar} />
        )}
      </div>
    </dialog>
  )
}
