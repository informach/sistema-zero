'use client'

import { Lock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ROOM_ITEM_INFO, ROOM_WALL_PALETTE, TROPHY_HINT } from '@/lib/room-catalog'
import type { RoomItemView, RoomThemeView } from '@/lib/types'

export function ShopGrid({
  items,
  owned,
  busy,
  confirmingId,
  onPick,
  onBuy,
}: {
  items: RoomItemView[]
  owned: (id: string) => boolean
  busy: string | null
  confirmingId: string | null
  onPick: (item: RoomItemView) => void
  onBuy: (id: string) => void
}) {
  if (items.length === 0) return <Empty />
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {items.map((it) => {
        const info = ROOM_ITEM_INFO[it.id]
        if (!info) return null
        const locked = !owned(it.id)
        return (
          <button
            key={it.id}
            type="button"
            disabled={!!busy && locked}
            onClick={() => (locked ? onBuy(it.id) : onPick(it))}
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border p-2 text-xs transition-colors hover:border-primary disabled:opacity-60"
          >
            <span className="text-2xl" aria-hidden="true">
              {info.emoji}
            </span>
            <span className="truncate font-semibold">{info.labelPt}</span>
            {locked ? <PriceChip price={it.price} confirming={confirmingId === it.id} /> : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Bandeja 🏆 dos troféus (07/2026): ganhos por CONQUISTA, nunca comprados. Ganho =
 * posicionável como qualquer enfeite; travado = cadeado + a DICA de como ganhar
 * (TROPHY_HINT) no lugar do preço.
 */
export function TrophyTray({
  trophies,
  owned,
  onPick,
}: {
  trophies: RoomItemView[]
  owned: (id: string) => boolean
  onPick: (item: RoomItemView) => void
}) {
  if (trophies.length === 0) return <Empty />
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-muted-foreground text-sm">
        Suas conquistas viram troféus de verdade no quarto! 🏆
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {trophies.map((t) => {
          const info = ROOM_ITEM_INFO[t.id]
          if (!info) return null
          const has = owned(t.id)
          return has ? (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-(--kids-lime) bg-(--kids-lime-tint) p-2 text-xs transition-colors hover:border-primary"
            >
              <span className="text-2xl" aria-hidden="true">
                {info.emoji}
              </span>
              <span className="truncate font-semibold">{info.labelPt}</span>
              <span className="text-muted-foreground">Conquistado!</span>
            </button>
          ) : (
            <div
              key={t.id}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border border-dashed p-2 text-center text-xs opacity-80"
            >
              <span className="grid size-8 place-items-center" aria-hidden="true">
                <Lock className="size-5 text-muted-foreground" />
              </span>
              <span className="truncate font-semibold">{info.labelPt}</span>
              <span className="text-muted-foreground">
                {TROPHY_HINT[t.id] ?? 'Continue criando!'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Preço do item travado; quando a confirmação está armada vira "Comprar?" em destaque. */
function PriceChip({ price, confirming }: { price: number; confirming: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        confirming
          ? 'rounded-full bg-primary px-1.5 py-0.5 font-bold text-primary-foreground'
          : 'text-muted-foreground',
      )}
    >
      <Lock className="size-3" /> {confirming ? `Comprar? ${price}` : price}
    </span>
  )
}

export function ChoiceGrid({
  choices,
  activeId,
  busy,
  confirmingId,
  onApply,
  onBuy,
  label,
  preview,
}: {
  choices: RoomThemeView[]
  activeId: string
  busy: string | null
  confirmingId: string | null
  onApply: (id: string) => void
  onBuy: (id: string) => void
  label: (id: string) => string
  preview: (id: string) => React.ReactNode
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={!!busy && c.locked}
          onClick={() => (c.locked ? onBuy(c.id) : onApply(c.id))}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs transition-colors',
            activeId === c.id ? 'border-primary' : 'border-border',
          )}
        >
          {preview(c.id)}
          <span className="truncate font-semibold">{label(c.id)}</span>
          {c.locked ? <PriceChip price={c.price} confirming={confirmingId === c.id} /> : null}
        </button>
      ))}
    </div>
  )
}

export function WallTray({ brush, onPick }: { brush: string; onPick: (hex: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-muted-foreground text-sm">
        Escolha uma cor e toque numa parede 🖌️
      </p>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
        {ROOM_WALL_PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            aria-label={`Pintar de ${c.labelPt}`}
            aria-pressed={brush === c.hex}
            onClick={() => onPick(c.hex)}
            className={cn(
              'aspect-square rounded-full border-2 transition-transform hover:scale-110',
              brush === c.hex ? 'border-foreground ring-2 ring-primary' : 'border-border',
            )}
            style={{ background: c.hex }}
          />
        ))}
      </div>
    </div>
  )
}

export function PetTray({
  pets,
  current,
  busy,
  confirmingId,
  onPick,
  onBuy,
}: {
  pets: RoomItemView[]
  current: string | null
  busy: string | null
  confirmingId: string | null
  onPick: (id: string | null) => void
  onBuy: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={cn(
          'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs',
          current === null ? 'border-primary' : 'border-border',
        )}
      >
        <span className="text-2xl" aria-hidden="true">
          🚫
        </span>
        <span className="font-semibold">Nenhum</span>
      </button>
      {pets.map((p) => {
        const info = ROOM_ITEM_INFO[p.id]
        if (!info) return null
        return (
          <button
            key={p.id}
            type="button"
            disabled={!!busy && p.locked}
            onClick={() => (p.locked ? onBuy(p.id) : onPick(p.id))}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs',
              current === p.id ? 'border-primary' : 'border-border',
            )}
          >
            <span className="text-2xl" aria-hidden="true">
              {info.emoji}
            </span>
            <span className="font-semibold">{info.labelPt}</span>
            {p.locked ? <PriceChip price={p.price} confirming={confirmingId === p.id} /> : null}
          </button>
        )
      })}
    </div>
  )
}

function Empty() {
  return <p className="py-4 text-center text-muted-foreground text-sm">Nada por aqui ainda.</p>
}
