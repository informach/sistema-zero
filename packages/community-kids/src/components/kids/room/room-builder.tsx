'use client'

import {
  Coins,
  Frame,
  LayoutGrid,
  Lightbulb,
  Lock,
  Paintbrush,
  Palette,
  PawPrint,
  RotateCw,
  Sofa,
  Sprout,
  Sun,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import {
  floorInfo,
  lightingPreset,
  ROOM_GRID,
  ROOM_ITEM_INFO,
  ROOM_THEME_INFO,
  ROOM_WALL_PALETTE,
  resolveRoomAppearance,
} from '@/lib/room-catalog'
import type { RoomEditorView, RoomItemView, RoomStateView, RoomThemeView } from '@/lib/types'
import { KidsMascot } from '../mascot'
import { effectiveFootprint, type Rot } from './coords'
import { RoomCanvas } from './room-canvas'

const PLACEABLE: ReadonlySet<string> = new Set(['furniture', 'decor', 'plant', 'light'])

type TabId =
  | 'moveis'
  | 'enfeites'
  | 'plantas'
  | 'luzes'
  | 'piso'
  | 'parede'
  | 'clima'
  | 'bichinho'
  | 'tema'

const TABS: { id: TabId; label: string; icon: typeof Sofa }[] = [
  { id: 'moveis', label: 'Móveis', icon: Sofa },
  { id: 'enfeites', label: 'Enfeites', icon: Frame },
  { id: 'plantas', label: 'Plantas', icon: Sprout },
  { id: 'luzes', label: 'Luzes', icon: Lightbulb },
  { id: 'piso', label: 'Piso', icon: LayoutGrid },
  { id: 'parede', label: 'Parede', icon: Paintbrush },
  { id: 'clima', label: 'Clima', icon: Sun },
  { id: 'bichinho', label: 'Bichinho', icon: PawPrint },
  { id: 'tema', label: 'Tema', icon: Palette },
]

const CAT_BY_TAB: Partial<Record<TabId, string>> = {
  moveis: 'furniture',
  enfeites: 'decor',
  plantas: 'plant',
  luzes: 'light',
}

/** Posição inicial (escalonada) de um item novo, clampada à grade. */
function nextSlot(count: number, w: number): { x: number; y: number } {
  const maxX = Math.max(0, ROOM_GRID.cols - w)
  return { x: Math.min(maxX, (count * 2) % (maxX + 1)), y: 1 }
}

/** Editor do quarto 3D: cena ao vivo + barra de categorias (móveis/piso/parede/clima/…). */
export function RoomBuilder({ avatarPhotoUrl }: { avatarPhotoUrl?: string | null }) {
  const [data, setData] = useState<RoomEditorView | null>(null)
  const [draft, setDraft] = useState<RoomStateView>({
    theme: 'aconchego',
    placedItems: [],
    pet: null,
  })
  const [balance, setBalance] = useState(0)
  // Equipe (passe livre) = moedas ilimitadas: a lojinha mostra ∞ e nunca trava por saldo.
  const [coinsUnlimited, setCoinsUnlimited] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabId>('moveis')
  const [brush, setBrush] = useState<string>(ROOM_WALL_PALETTE[0]?.hex ?? '#f3ede1')

  useEffect(() => {
    let alive = true
    fetch('/api/members/room')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RoomEditorView | null) => {
        if (!alive || !d) return
        setData(d)
        setDraft(d.state)
        setBalance(d.balance)
        setCoinsUnlimited(d.balanceUnlimited === true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const ownedById = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i.owned])), [data])
  const isOwned = (id: string) => ownedById.get(id) ?? false
  const appearance = resolveRoomAppearance(draft)
  const paintColor = tab === 'parede' ? brush : null

  function moveItem(index: number, x: number, y: number) {
    setDraft((d) => {
      const it = d.placedItems[index]
      if (!it) return d
      const info = ROOM_ITEM_INFO[it.itemId]
      if (!info) return d
      const fp = effectiveFootprint(info.w, info.h, (it.rot ?? 0) as Rot)
      const nx = Math.max(0, Math.min(ROOM_GRID.cols - fp.w, x))
      const ny = Math.max(0, Math.min(ROOM_GRID.rows - fp.h, y))
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

  function rotateSelected() {
    if (selected === null) return
    setDraft((d) => {
      const it = d.placedItems[selected]
      if (!it) return d
      const info = ROOM_ITEM_INFO[it.itemId]
      if (!info) return d
      const rot = (((it.rot ?? 0) + 1) % 4) as Rot
      const fp = effectiveFootprint(info.w, info.h, rot)
      const x = Math.max(0, Math.min(ROOM_GRID.cols - fp.w, it.x))
      const y = Math.max(0, Math.min(ROOM_GRID.rows - fp.h, it.y))
      const placedItems = d.placedItems.map((p, i) => (i === selected ? { ...p, rot, x, y } : p))
      return { ...d, placedItems }
    })
  }

  function paintWall(wall: 'left' | 'right', color: string) {
    setDraft((d) => ({ ...d, wallColors: { ...d.wallColors, [wall]: color } }))
  }

  function applyTheme(id: string) {
    // Tema reseta os overrides → mostra a aparência bundle do preset (a criança ajusta depois).
    setDraft((d) => ({
      theme: id,
      placedItems: d.placedItems,
      pet: d.pet,
    }))
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
      const own = (list: RoomThemeView[] | undefined) =>
        (list ?? []).map((t) => (t.id === id ? { ...t, owned: true, locked: false } : t))
      setData((s) =>
        s
          ? {
              ...s,
              items: s.items.map((i) => (i.id === id ? { ...i, owned: true, locked: false } : i)),
              themes: own(s.themes),
              floors: own(s.floors),
              lightings: own(s.lightings),
            }
          : s,
      )
      if (typeof body?.balance === 'number') setBalance(body.balance)
      if (body?.unlimited === true) setCoinsUnlimited(true)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        {data ? (
          <RoomCanvas
            state={draft}
            mode="edit"
            avatarPhotoUrl={avatarPhotoUrl}
            selectedIndex={selected}
            onSelect={setSelected}
            onMove={moveItem}
            onPaintWall={paintWall}
            paintColor={paintColor}
          />
        ) : (
          <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted">
            <KidsMascot expression="thinking" className="size-20" />
          </div>
        )}
        {selected !== null ? (
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={rotateSelected}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-bold text-primary-foreground text-xs shadow"
            >
              <RotateCw className="size-3.5" /> Girar
            </button>
            <button
              type="button"
              onClick={removeSelected}
              className="inline-flex items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-1.5 font-bold text-white text-xs shadow"
            >
              <Trash2 className="size-3.5" /> Tirar
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1 [font-family:var(--font-display)] font-bold text-sm">
          <Coins className="size-4" /> {coinsUnlimited ? '∞' : balance}
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

      {/* Barra de categorias (estilo MyDreamRoom) */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={cn(
                'flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 font-semibold text-xs transition-colors',
                active ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <Icon className="size-5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Bandeja da categoria ativa */}
      <div>{data ? renderTray() : null}</div>
    </div>
  )

  function renderTray() {
    if (!data) return null
    const cat = CAT_BY_TAB[tab]
    if (cat) {
      const items = data.items.filter((i) => PLACEABLE.has(i.category) && i.category === cat)
      return <ShopGrid items={items} owned={isOwned} busy={busy} onPick={addItem} onBuy={buy} />
    }
    if (tab === 'piso') {
      return (
        <ChoiceGrid
          choices={data.floors}
          activeId={appearance.floorId}
          busy={busy}
          onApply={(id) => setDraft((d) => ({ ...d, floor: id }))}
          onBuy={buy}
          label={(id) => floorInfo(id).labelPt}
          preview={(id) => {
            const f = floorInfo(id)
            return (
              <span
                className="block h-8 w-full rounded-lg border-2"
                style={{ background: f.color, borderColor: f.color2 }}
                aria-hidden="true"
              />
            )
          }}
        />
      )
    }
    if (tab === 'clima') {
      return (
        <ChoiceGrid
          choices={data.lightings}
          activeId={appearance.lightingId}
          busy={busy}
          onApply={(id) => setDraft((d) => ({ ...d, lighting: id }))}
          onBuy={buy}
          label={(id) => lightingPreset(id).labelPt}
          preview={(id) => (
            <span
              className="block h-8 w-full rounded-lg"
              style={{ background: lightingPreset(id).background }}
              aria-hidden="true"
            />
          )}
        />
      )
    }
    if (tab === 'tema') {
      return (
        <ChoiceGrid
          choices={data.themes}
          activeId={draft.theme}
          busy={busy}
          onApply={applyTheme}
          onBuy={buy}
          label={(id) => ROOM_THEME_INFO[id]?.labelPt ?? id}
          preview={(id) => (
            <span
              className="block h-8 w-full rounded-lg"
              style={{ background: ROOM_THEME_INFO[id]?.bg ?? '#eee' }}
              aria-hidden="true"
            />
          )}
        />
      )
    }
    if (tab === 'parede') {
      return <WallTray brush={brush} onPick={setBrush} />
    }
    // bichinho
    const pets = data.items.filter((i) => i.category === 'pet')
    return (
      <PetTray
        pets={pets}
        current={draft.pet}
        busy={busy}
        onPick={(id) => setDraft((d) => ({ ...d, pet: id }))}
        onBuy={buy}
      />
    )
  }
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

function ChoiceGrid({
  choices,
  activeId,
  busy,
  onApply,
  onBuy,
  label,
  preview,
}: {
  choices: RoomThemeView[]
  activeId: string
  busy: string | null
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
          {c.locked ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
              <Lock className="size-3" /> {c.price}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function WallTray({ brush, onPick }: { brush: string; onPick: (hex: string) => void }) {
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

function PetTray({
  pets,
  current,
  busy,
  onPick,
  onBuy,
}: {
  pets: RoomItemView[]
  current: string | null
  busy: string | null
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
            {p.locked ? (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                <Lock className="size-3" /> {p.price}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function Empty() {
  return <p className="py-4 text-center text-muted-foreground text-sm">Nada por aqui ainda.</p>
}
