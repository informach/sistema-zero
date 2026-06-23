'use client'

import { useEffect, useRef, useState } from 'react'
import type { RoomStateView } from '@/lib/types'
import { RoomCanvas } from './room-canvas'

/**
 * Monta o quarto 3D (WebGL pesado) SÓ quando entra na viewport — usado no perfil PÚBLICO de um
 * colega, onde a cena costuma ficar abaixo da dobra. Sem isto, visitar um perfil sobe um 2º
 * contexto WebGL de imediato (memória/inicialização num tablet fraco, e risco do limite de
 * contextos por página). Reserva o espaço (aspecto 3/2) p/ não causar pulo de layout.
 */
export function LazyRoomCanvas({
  state,
  avatarPhotoUrl,
}: {
  state: RoomStateView
  avatarPhotoUrl?: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (show) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [show])

  return (
    <div ref={ref}>
      {show ? (
        <RoomCanvas state={state} mode="view" avatarPhotoUrl={avatarPhotoUrl} staticView />
      ) : (
        <div className="aspect-[3/2] w-full rounded-2xl border-2 border-border bg-muted" />
      )}
    </div>
  )
}
