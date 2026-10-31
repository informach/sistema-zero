'use client'

import type { ModuleAnimation } from '@sistemazero/core/course/module-animation'
import { EdiAnimation } from '@sistemazero/edisvg/react'
import { type ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { type TrailArtPlacement, type TrailArtSide, trailArtPlacement } from './trail-layout'

/** Os nós continuam vindo do servidor; só a colocação da arte precisa de medidas do navegador. */
export function TrailUnitBody({
  src,
  preferredSide,
  children,
}: {
  src: ModuleAnimation | null
  preferredSide: TrailArtSide
  children: ReactNode
}) {
  const identity = src?.url ?? null
  const body = useRef<HTMLDivElement>(null)
  const nodes = useRef<HTMLDivElement>(null)
  const art = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<TrailArtPlacement | null>(null)
  // A mesma URL pode voltar após ser removida/trocada; cada montagem precisa carregar.
  // Resetar só o estado da arte preserva as aulas e o estado do baú dentro de children.
  const [load, setLoad] = useState({ src: identity, ready: false })
  if (load.src !== identity) setLoad({ src: identity, ready: false })
  const ready = identity !== null && load.src === identity && load.ready
  const loaded = useCallback(
    () =>
      setLoad((current) => (current.src === identity ? { src: identity, ready: true } : current)),
    [identity],
  )

  // Uma nova árvore de nós vinda do servidor exige observar também os novos elementos.
  // biome-ignore lint/correctness/useExhaustiveDependencies: children identifica a troca dos nós medidos no DOM.
  useLayoutEffect(() => {
    const root = body.current
    const list = nodes.current
    const drawing = art.current
    if (!identity || !root || !list || !drawing) return
    let active = true
    const obstacles = [
      ...list.querySelectorAll<HTMLElement>('[data-trail-obstacle], .kids-balloon'),
    ]
    const measure = () => {
      if (!active) return
      const bounds = root.getBoundingClientRect()
      const artBounds = drawing.getBoundingClientRect()
      if (bounds.width <= 0 || artBounds.width <= 0) return
      const next = trailArtPlacement(
        {
          width: bounds.width,
          height: list.getBoundingClientRect().height,
          artWidth: artBounds.width,
          artHeight: artBounds.height,
          obstacles: obstacles.map((element) => {
            const box = element.getBoundingClientRect()
            return {
              left: box.left - bounds.left,
              top: box.top - bounds.top,
              width: box.width,
              height: box.height,
            }
          }),
        },
        preferredSide,
      )
      setPlacement((previous) =>
        previous?.side === next.side &&
        previous.top === next.top &&
        previous.extraHeight === next.extraHeight
          ? previous
          : next,
      )
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    for (const element of [root, list, drawing, ...obstacles]) observer?.observe(element)
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [identity, preferredSide, children])

  return (
    <div
      ref={body}
      className="relative mt-10"
      data-trail-body
      style={{ paddingBottom: ready ? (placement?.extraHeight ?? 0) : 0 }}
    >
      {src ? (
        <div
          ref={art}
          data-trail-art
          data-trail-art-ready={ready && placement !== null}
          aria-hidden="true"
          className={`kids-trail-art ${placement?.side === 'right' || (!placement && preferredSide === 'right') ? 'kids-trail-art--right' : 'kids-trail-art--left'}`}
          style={{
            // visibility:hidden ainda entra no overflow rolável. A caixa só vai
            // para a posição final quando a altura adicional também está reservada.
            top: ready ? (placement?.top ?? 0) : 0,
            visibility: ready && placement ? 'visible' : 'hidden',
          }}
        >
          <EdiAnimation
            key={src.url}
            src={src.url}
            poster={src.poster.url}
            width={src.poster.width}
            height={src.poster.height}
            className="size-full"
            style={{ position: 'absolute', inset: 0 }}
            onReady={loaded}
            onPosterReady={loaded}
          />
        </div>
      ) : null}
      <div ref={nodes}>{children}</div>
    </div>
  )
}
