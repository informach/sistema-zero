'use client'

import { Ban, Check, Lock, LockOpen } from 'lucide-react'
import type { ReactNode } from 'react'
import { ROOM_ITEM_INFO, ROOM_WALL_PALETTE } from '../../../lib/room-catalog'
import type { RoomItemView, RoomThemeView } from '../../../lib/types'
import { adultPrice, ADULT_ROOM_COPY as copy } from '../skin'
import { RoomItemIcon } from './room-item-icon'
import { RoomItemThumb } from './room-item-thumb'

/** A miniatura da peça; sem a imagem, o ícone de linha na caixinha de sempre. */
function TileThumb({ id }: { id: string }) {
  return (
    <RoomItemThumb
      id={id}
      className="sz-cos-tile-thumb"
      fallback={
        <span className="sz-cos-tile-icon">
          <RoomItemIcon id={id} />
        </span>
      }
    />
  )
}

/**
 * As bandejas da pele ADULTA do construtor (prancha "Meu espaço 3D"): os mesmos gestos das do
 * Kids (`room-builder-trays.tsx`: tocar no item travado arma a compra, tocar de novo compra), com
 * ícone de linha no lugar do emoji, preço com a palavra "moedas" e estado sempre em texto.
 */

export function AdultShopGrid({
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
    <div className="sz-cos-tiles">
      {items.map((it) => {
        const info = ROOM_ITEM_INFO[it.id]
        if (!info) return null
        const locked = !owned(it.id)
        const confirming = locked && confirmingId === it.id
        return (
          <button
            key={it.id}
            type="button"
            disabled={!!busy && locked}
            onClick={() => (locked ? onBuy(it.id) : onPick(it))}
            className="sz-cos-tile"
            data-confirming={confirming ? 'true' : undefined}
          >
            <TileThumb id={it.id} />
            <span className="sz-cos-tile-name">{info.labelPt}</span>
            {locked ? <PriceChip price={it.price} confirming={confirming} /> : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Troféus: ganhos por conquista, nunca comprados. Travado mostra COMO ganhar: a dica vem do app
 * (`hints`, na voz dele; o guarda de vocabulário do Kids varre este pacote).
 */
export function AdultTrophyTray({
  trophies,
  owned,
  onPick,
  hints,
}: {
  trophies: RoomItemView[]
  owned: (id: string) => boolean
  onPick: (item: RoomItemView) => void
  hints?: Readonly<Record<string, string>>
}) {
  if (trophies.length === 0) return <Empty />
  return (
    <div className="sz-cos-tray">
      <p className="sz-cos-hint">{copy.trophiesIntro}</p>
      <div className="sz-cos-trophies">
        {trophies.map((t) => {
          const info = ROOM_ITEM_INFO[t.id]
          if (!info) return null
          return owned(t.id) ? (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="sz-cos-trophy"
              data-owned="true"
            >
              <span className="sz-cos-trophy-icon">
                <RoomItemThumb
                  id={t.id}
                  className="sz-cos-trophy-thumb"
                  fallback={<RoomItemIcon id={t.id} />}
                />
              </span>
              <span className="sz-cos-trophy-text">
                <strong>{info.labelPt}</strong>
                <span className="sz-cos-trophy-status">{copy.trophyOwned}</span>
              </span>
            </button>
          ) : (
            <div key={t.id} className="sz-cos-trophy" data-owned="false">
              <span className="sz-cos-trophy-icon">
                <Lock aria-hidden="true" />
              </span>
              <span className="sz-cos-trophy-text">
                <strong>{info.labelPt}</strong>
                <span className="sz-cos-trophy-status">{hints?.[t.id] ?? copy.trophyFallback}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Piso, clima e tema: o que está em uso diz "Em uso" (nunca só a cor da borda). */
export function AdultChoiceGrid({
  choices,
  activeId,
  busy,
  confirmingId,
  onApply,
  onBuy,
  label,
  swatch,
}: {
  choices: RoomThemeView[]
  activeId: string
  busy: string | null
  confirmingId: string | null
  onApply: (id: string) => void
  onBuy: (id: string) => void
  label: (id: string) => string
  /** Fundo da amostra (cor ou degradê CSS do catálogo). */
  swatch: (id: string) => { background: string; borderColor?: string }
}) {
  if (choices.length === 0) return <Empty />
  return (
    <div className="sz-cos-tiles">
      {choices.map((c) => {
        const active = !c.locked && activeId === c.id
        const confirming = c.locked && confirmingId === c.id
        return (
          <button
            key={c.id}
            type="button"
            disabled={!!busy && c.locked}
            onClick={() => (c.locked ? onBuy(c.id) : onApply(c.id))}
            aria-pressed={c.locked ? undefined : active}
            className="sz-cos-tile"
            data-confirming={confirming ? 'true' : undefined}
          >
            <span className="sz-cos-choice-swatch" style={swatch(c.id)} aria-hidden="true" />
            <span className="sz-cos-tile-name">{label(c.id)}</span>
            {c.locked ? (
              <PriceChip price={c.price} confirming={confirming} />
            ) : active ? (
              <InUse />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Pintar é grátis: escolhe a cor e toca na parede. A cor escolhida também vai escrita. */
export function AdultWallTray({ brush, onPick }: { brush: string; onPick: (hex: string) => void }) {
  const chosen = ROOM_WALL_PALETTE.find((c) => c.hex === brush)
  return (
    <div className="sz-cos-tray">
      <p className="sz-cos-hint">{copy.wallHint}</p>
      <div role="group" aria-label={copy.wallGroup} className="sz-cos-swatches">
        {ROOM_WALL_PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            aria-label={copy.paint(c.labelPt)}
            title={c.labelPt}
            aria-pressed={brush === c.hex}
            onClick={() => onPick(c.hex)}
            className="sz-cos-swatch"
            style={{ backgroundColor: c.hex }}
          >
            {brush === c.hex ? <Check aria-hidden="true" strokeWidth={3} /> : null}
          </button>
        ))}
      </div>
      {chosen ? <p className="sz-cos-muted">{copy.wallChosen(chosen.labelPt)}</p> : null}
    </div>
  )
}

export function AdultPetTray({
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
    <div className="sz-cos-tiles">
      <button
        type="button"
        onClick={() => onPick(null)}
        aria-pressed={current === null}
        className="sz-cos-tile"
      >
        <span className="sz-cos-tile-icon">
          <Ban aria-hidden="true" />
        </span>
        <span className="sz-cos-tile-name">{copy.none}</span>
        {current === null ? <InUse /> : null}
      </button>
      {pets.map((p) => {
        const info = ROOM_ITEM_INFO[p.id]
        if (!info) return null
        const confirming = p.locked && confirmingId === p.id
        return (
          <button
            key={p.id}
            type="button"
            disabled={!!busy && p.locked}
            onClick={() => (p.locked ? onBuy(p.id) : onPick(p.id))}
            aria-pressed={p.locked ? undefined : current === p.id}
            className="sz-cos-tile"
            data-confirming={confirming ? 'true' : undefined}
          >
            <TileThumb id={p.id} />
            <span className="sz-cos-tile-name">{info.labelPt}</span>
            {p.locked ? (
              <PriceChip price={p.price} confirming={confirming} />
            ) : current === p.id ? (
              <InUse />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Preço do item travado. Com a compra armada, o cadeado abre e o leitor ouve o próximo passo. */
function PriceChip({ price, confirming }: { price: number; confirming: boolean }) {
  return (
    <span className="sz-cos-price" data-confirming={confirming ? 'true' : undefined}>
      {confirming ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
      {adultPrice(price)}
      <span className="sr-only">{confirming ? ` ${copy.confirmAgain}` : copy.locked}</span>
    </span>
  )
}

function InUse(): ReactNode {
  return (
    <span className="sz-cos-inuse">
      <Check aria-hidden="true" />
      {copy.inUse}
    </span>
  )
}

function Empty() {
  return <p className="sz-cos-muted">{copy.empty}</p>
}
