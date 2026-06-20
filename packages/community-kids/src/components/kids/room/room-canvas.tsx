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
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens é a identidade aqui.
            key={idx}
            style={style}
            className={cn(
              'absolute grid place-items-center',
              mode === 'edit' && 'cursor-grab touch-none active:cursor-grabbing',
              selected && 'rounded-lg ring-2 ring-(--sz-hot)',
            )}
            onPointerDown={
              mode === 'edit'
                ? (e) => {
                    e.stopPropagation()
                    draggingRef.current = idx
                    e.currentTarget.setPointerCapture(e.pointerId)
                    onSelect?.(idx)
                  }
                : undefined
            }
            onPointerMove={
              mode === 'edit'
                ? (e) => {
                    if (draggingRef.current !== idx) return
                    const cell = cellFromPointer(e)
                    if (cell) onMove?.(idx, cell.x, cell.y)
                  }
                : undefined
            }
            onPointerUp={
              mode === 'edit'
                ? (e) => {
                    draggingRef.current = null
                    e.currentTarget.releasePointerCapture(e.pointerId)
                  }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className={info.anim ? `kid-room-anim ${info.anim}` : undefined}
              style={{ fontSize: 'min(82cqw, 82cqh)', lineHeight: 1 }}
            >
              {info.emoji}
            </span>
          </div>
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
