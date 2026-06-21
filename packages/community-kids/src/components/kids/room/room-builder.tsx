'use client'

import { Coins, Lock, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { AvatarConfig } from '@/lib/avatar-catalog'
import { cn } from '@/lib/cn'
import { ROOM_GRID, ROOM_ITEM_INFO, ROOM_THEME_INFO } from '@/lib/room-catalog'
import type { RoomEditorView, RoomItemView, RoomStateView } from '@/lib/types'
import { KidsMascot } from '../mascot'
import { RoomCanvas } from './room-canvas'

const PLACEABLE: ReadonlySet<string> = new Set(['furniture', 'decor', 'plant', 'light'])

/** Posição inicial (escalonada) de um item novo, clampada à grade. */
function nextSlot(count: number, w: number): { x: number; y: number } {
  const maxX = Math.max(0, ROOM_GRID.cols - w)
  return { x: Math.min(maxX, (count * 2) % (maxX + 1)), y: 1 }
}

/** Editor do quarto: tela ao vivo + lojinha (móveis/temas/bichinho). Salva via PUT. */
export function RoomBuilder({ avatarConfig }: { avatarConfig?: AvatarConfig | null }) {
  const [data, setData] = useState<RoomEditorView | null>(null)
  const [draft, setDraft] = useState<RoomStateView>({
    theme: 'aconchego',
    placedItems: [],
    pet: null,
  })
  const [balance, setBalance] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/members/room')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RoomEditorView | null) => {
        if (!alive || !d) return
        setData(d)
        setDraft(d.state)
        setBalance(d.balance)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const ownedById = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i.owned])), [data])
  const isOwned = (id: string) => ownedById.get(id) ?? false

  function moveItem(index: number, x: number, y: number) {
    setDraft((d) => {
      const it = d.placedItems[index]
      if (!it) return d
      const info = ROOM_ITEM_INFO[it.itemId]
      if (!info) return d
      const nx = Math.max(0, Math.min(ROOM_GRID.cols - info.w, x))
      const ny = Math.max(0, Math.min(ROOM_GRID.rows - info.h, y))
      const placedItems = d.placedItems.map((p, i) => (i === index ? { ...p, x: nx, y: ny } : p))
      return { ...d, placedItems }
    })
  }

  function addItem(item: RoomItemView) {
    if (!item.owned) return
    const info = ROOM_ITEM_INFO[item.id]
    if (!info) return
    setDraft((d) => {
      if (d.placedItems.length >= 40) return d
      const slot = nextSlot(d.placedItems.length, info.w)
      return { ...d, placedItems: [...d.placedItems, { itemId: item.id, x: slot.x, y: slot.y }] }
    })
    toast.success(`${info.labelPt} no quarto! ✨`)
  }

  function removeSelected() {
    if (selected === null) return
    setDraft((d) => ({ ...d, placedItems: d.placedItems.filter((_, i) => i !== selected) }))
    setSelected(null)
  }

  async function buy(id: string) {
    if (busy) return
    setBusy(id)
    try {
      const res = await fetch(`/api/members/room/items/${encodeURIComponent(id)}/buy`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(
          res.status === 402 ? 'Você ainda não tem moedas suficientes!' : 'Não consegui comprar.',
        )
        return
      }
      setData((s) =>
        s
          ? {
              ...s,
              items: s.items.map((i) => (i.id === id ? { ...i, owned: true, locked: false } : i)),
              themes: s.themes.map((t) => (t.id === id ? { ...t, owned: true, locked: false } : t)),
            }
          : s,
      )
      if (typeof body?.balance === 'number') setBalance(body.balance)
      toast.success('Desbloqueado! 🎉')
    } catch {
      toast.error('Não consegui comprar agora.')
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/members/room', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success('Quarto salvo! 🏠')
    } catch {
      toast.error('Não consegui salvar agora. Tente de novo!')
    } finally {
      setSaving(false)
    }
  }

  const decor = (data?.items ?? []).filter((i) => PLACEABLE.has(i.category))
  const pets = (data?.items ?? []).filter((i) => i.category === 'pet')

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        {data ? (
          <RoomCanvas
            state={draft}
            mode="edit"
            avatarConfig={avatarConfig}
            selectedIndex={selected}
            onSelect={setSelected}
            onMove={moveItem}
          />
        ) : (
          <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted">
            <KidsMascot expression="thinking" className="size-20" />
          </div>
        )}
        {selected !== null ? (
          <button
            type="button"
            onClick={removeSelected}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-1.5 font-bold text-white text-xs shadow"
          >
            <Trash2 className="size-3.5" /> Tirar
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1 [font-family:var(--font-display)] font-bold text-sm">
          <Coins className="size-4" /> {balance}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn('sz-btn-gradient h-11 px-6 text-base', saving && 'opacity-60')}
        >
          {saving ? 'Salvando…' : 'Salvar quarto'}
        </button>
      </div>

      <Section title="Móveis e enfeites">
        <ShopGrid items={decor} owned={isOwned} busy={busy} onPick={addItem} onBuy={buy} />
      </Section>

      <Section title="Temas">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(data?.themes ?? []).map((t) => {
            const info = ROOM_THEME_INFO[t.id]
            if (!info) return null
            return (
              <button
                key={t.id}
                type="button"
                disabled={!!busy && t.locked}
                onClick={() => (t.owned ? setDraft((d) => ({ ...d, theme: t.id })) : buy(t.id))}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs transition-colors',
                  draft.theme === t.id ? 'border-primary' : 'border-border',
                )}
              >
                <span
                  className="h-8 w-full rounded-lg"
                  style={{ background: info.bg }}
                  aria-hidden="true"
                />
                <span className="font-semibold">{info.labelPt}</span>
                {t.locked ? (
                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                    <Lock className="size-3" /> {t.price}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Bichinho">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, pet: null }))}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs',
              draft.pet === null ? 'border-primary' : 'border-border',
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
                onClick={() => (p.owned ? setDraft((d) => ({ ...d, pet: p.id })) : buy(p.id))}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs',
                  draft.pet === p.id ? 'border-primary' : 'border-border',
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {info.emoji}
                </span>
                <span className="font-semibold">{info.labelPt}</span>
                {p.locked ? (
                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                    <Lock className="size-3" /> {p.price}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="sz-display mb-2 text-base">{title}</h2>
      {children}
    </section>
  )
}

function ShopGrid({
  items,
  owned,
  busy,
  onPick,
  onBuy,
}: {
  items: RoomItemView[]
  owned: (id: string) => boolean
  busy: string | null
  onPick: (item: RoomItemView) => void
  onBuy: (id: string) => void
}) {
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
            // Durante uma compra, desabilita os OUTROS itens travados (evita
            // dead-click sem feedback); item já possuído segue selecionável.
            disabled={!!busy && locked}
            onClick={() => (locked ? onBuy(it.id) : onPick(it))}
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border p-2 text-xs transition-colors hover:border-primary disabled:opacity-60"
          >
            <span className="text-2xl" aria-hidden="true">
              {info.emoji}
            </span>
            <span className="truncate font-semibold">{info.labelPt}</span>
            {locked ? (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                <Lock className="size-3" /> {it.price}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
