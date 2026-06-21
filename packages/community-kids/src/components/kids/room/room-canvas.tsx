'use client'

import { type CSSProperties, type PointerEvent as ReactPointerEvent, useRef } from 'react'
import type { AvatarConfig } from '@/lib/avatar-catalog'
import { cn } from '@/lib/cn'
import { isDarkTheme, ROOM_GRID, ROOM_ITEM_INFO, themeInfo } from '@/lib/room-catalog'
import type { RoomStateView } from '@/lib/types'
import { KidsAvatar } from '../kids-avatar'

/**
 * Renderer do quarto (DOM+CSS, SSR-safe). Itens em camadas absolutas (emoji escalado
 * por container-query), tema no fundo, pet andando, avatar ancorado. As animações
 * (planta cresce, balão flutua, pet anda…) são `@keyframes` no globals, gateadas por
 * `prefers-reduced-motion`. Modo `edit` permite arrastar (pointer) e selecionar.
 */
export function RoomCanvas({
  state,
  mode,
  avatarConfig,
  selectedIndex = null,
  onSelect,
  onMove,
}: {
  state: RoomStateView
  mode: 'edit' | 'view'
  /** Avatar da criança ancorado no quarto (`undefined` = não mostra). */
  avatarConfig?: AvatarConfig | null
  selectedIndex?: number | null
  onSelect?: (index: number | null) => void
  /** Move um item para a célula (x,y) — o pai valida/clampa contra a grade. */
  onMove?: (index: number, x: number, y: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const theme = themeInfo(state.theme)
  const dark = isDarkTheme(state.theme)
  const pet = state.pet ? ROOM_ITEM_INFO[state.pet] : undefined

  function cellFromPointer(e: ReactPointerEvent): { x: number; y: number } | null {
    const el = ref.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * ROOM_GRID.cols)
    const y = Math.floor(((e.clientY - r.top) / r.height) * ROOM_GRID.rows)
    return { x, y }
  }

  const draggingRef = useRef<number | null>(null)

  return (
    <div
      ref={ref}
      className="relative aspect-[3/2] w-full select-none overflow-hidden rounded-2xl border-2 border-border"
      style={{ background: theme.bg }}
    >
      {/* Fundo navegável (botão real) — tocar no vazio deseleciona, sem furar a a11y. */}
      {mode === 'edit' ? (
        <button
          type="button"
          aria-label="Fundo do quarto"
          onClick={() => onSelect?.(null)}
          className="absolute inset-0 cursor-default"
          tabIndex={-1}
        />
      ) : null}
      {state.placedItems.map((p, idx) => {
        const info = ROOM_ITEM_INFO[p.itemId]
        if (!info) return null
        const style: CSSProperties = {
          left: `${(p.x / ROOM_GRID.cols) * 100}%`,
          top: `${(p.y / ROOM_GRID.rows) * 100}%`,
          width: `${(info.w / ROOM_GRID.cols) * 100}%`,
          height: `${(info.h / ROOM_GRID.rows) * 100}%`,
          containerType: 'size',
        }
        const selected = mode === 'edit' && selectedIndex === idx
        const emoji = (
          <span
            aria-hidden="true"
            className={info.anim ? `kid-room-anim ${info.anim}` : undefined}
            style={{ fontSize: 'min(82cqw, 82cqh)', lineHeight: 1 }}
          >
            {info.emoji}
          </span>
        )
        // VIEW: item decorativo, fora da ordem de tabulação (emoji é aria-hidden).
        if (mode !== 'edit') {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens é a identidade aqui.
            <div key={idx} style={style} className="absolute grid place-items-center">
              {emoji}
            </div>
          )
        }
        // EDIT: controle FOCÁVEL — arrasta por pointer E move por teclado (setas);
        // Enter/Espaço seleciona (revela o botão "Tirar", que é focável). Sem isto o
        // item era um <div> só-pointer = beco sem saída p/ teclado/AT. aria-label =
        // rótulo PT, já que o emoji é aria-hidden.
        return (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens é a identidade aqui.
            key={idx}
            type="button"
            aria-label={`${info.labelPt}${selected ? ' (selecionado)' : ''}`}
            aria-pressed={selected}
            style={style}
            className={cn(
              'absolute grid cursor-grab touch-none place-items-center bg-transparent p-0 active:cursor-grabbing',
              'focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected && 'rounded-lg ring-2 ring-(--sz-hot)',
            )}
            onClick={() => onSelect?.(idx)}
            onKeyDown={(e) => {
              const nudges: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              }
              const d = nudges[e.key]
              if (d) {
                e.preventDefault()
                onSelect?.(idx)
                onMove?.(idx, p.x + d[0], p.y + d[1])
              }
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              draggingRef.current = idx
              e.currentTarget.setPointerCapture(e.pointerId)
              onSelect?.(idx)
            }}
            onPointerMove={(e) => {
              if (draggingRef.current !== idx) return
              const cell = cellFromPointer(e)
              if (cell) onMove?.(idx, cell.x, cell.y)
            }}
            onPointerUp={(e) => {
              draggingRef.current = null
              e.currentTarget.releasePointerCapture(e.pointerId)
            }}
          >
            {emoji}
          </button>
        )
      })}

      {pet ? (
        <span
          aria-hidden="true"
          className="kid-room-anim kid-room-walk absolute bottom-1 text-[clamp(1.5rem,8vw,3rem)]"
        >
          {pet.emoji}
        </span>
      ) : null}

      {avatarConfig !== undefined ? (
        <div className="absolute bottom-2 left-2 w-[18%]">
          <KidsAvatar config={avatarConfig} size="lg" className="size-full" />
        </div>
      ) : null}

      {state.placedItems.length === 0 && mode === 'edit' ? (
        <p
          className={cn(
            'absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center font-semibold text-sm',
            dark ? 'text-white/80' : 'text-foreground/60',
          )}
        >
          Toque numa peça na lojinha para começar a montar! 🛋️
        </p>
      ) : null}
    </div>
  )
}
