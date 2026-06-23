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
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { effectiveFootprint, type Rot, rectsOverlap, WALL_H_CELLS, wallLength } from './coords'
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

type Placed = RoomStateView['placedItems']

/** Células do CHÃO ocupadas (itens de parede não contam). */
function floorOccupied(items: Placed): Set<string> {
  const set = new Set<string>()
  for (const it of items) {
    const inf = ROOM_ITEM_INFO[it.itemId]
    if (!inf || inf.mount === 'wall') continue
    const fp = effectiveFootprint(inf.w, inf.h, (it.rot ?? 0) as Rot)
    for (let dx = 0; dx < fp.w; dx++) {
      for (let dy = 0; dy < fp.h; dy++) set.add(`${it.x + dx},${it.y + dy}`)
    }
  }
  return set
}
/** Primeira célula LIVRE para um footprint w×h no chão (varre linha a linha); `null` = sem vão. */
function freeFloorSpot(items: Placed, w: number, h: number): { x: number; y: number } | null {
  const occ = floorOccupied(items)
  for (let y = 0; y <= ROOM_GRID.rows - h; y++) {
    for (let x = 0; x <= ROOM_GRID.cols - w; x++) {
      let free = true
      for (let dx = 0; dx < w && free; dx++) {
        for (let dy = 0; dy < h; dy++) {
          if (occ.has(`${x + dx},${y + dy}`)) {
            free = false
            break
          }
        }
      }
      if (free) return { x, y }
    }
  }
  return null // sala cheia — não inventa um spot sobreposto (o toast avisa em vez de mentir)
}

/** O footprint cabe SEM sobrepor outra peça? (chão↔chão, parede↔mesma parede). Usado no teclado. */
function isFreeAt(
  items: Placed,
  index: number,
  isWall: boolean,
  wall: 'left' | 'right' | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  for (let i = 0; i < items.length; i++) {
    if (i === index) continue
    const it = items[i]
    const inf = it && ROOM_ITEM_INFO[it.itemId]
    if (!it || !inf) continue
    const otherWall = inf.mount === 'wall'
    if (isWall) {
      if (!otherWall || (it.wall ?? 'right') !== wall) continue
      if (rectsOverlap(x, y, w, h, it.x, it.y, inf.w, inf.h)) return false
    } else {
      if (otherWall) continue
      const ofp = effectiveFootprint(inf.w, inf.h, (it.rot ?? 0) as Rot)
      if (rectsOverlap(x, y, w, h, it.x, it.y, ofp.w, ofp.h)) return false
    }
  }
  return true
}
/** Células ocupadas numa parede específica. */
function wallOccupied(items: Placed, wall: 'left' | 'right'): Set<string> {
  const set = new Set<string>()
  for (const it of items) {
    const inf = ROOM_ITEM_INFO[it.itemId]
    if (!inf) continue
    if (inf.mount !== 'wall' || (it.wall ?? 'right') !== wall) continue
    for (let du = 0; du < inf.w; du++) {
      for (let dv = 0; dv < inf.h; dv++) set.add(`${it.x + du},${it.y + dv}`)
    }
  }
  return set
}
/** Primeiro vão LIVRE numa parede (prefere a direita + mais ALTO — janela/quadro sobem). */
function freeWallSpot(
  items: Placed,
  w: number,
  h: number,
): { wall: 'left' | 'right'; u: number; v: number } | null {
  for (const wall of ['right', 'left'] as const) {
    const occ = wallOccupied(items, wall)
    const len = wallLength(wall)
    for (let v = WALL_H_CELLS - h; v >= 0; v--) {
      for (let u = 0; u <= len - w; u++) {
        let free = true
        for (let du = 0; du < w && free; du++) {
          for (let dv = 0; dv < h; dv++) {
            if (occ.has(`${u + du},${v + dv}`)) {
              free = false
              break
            }
          }
        }
        if (free) return { wall, u, v }
      }
    }
  }
  return null // paredes cheias
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
  const draftRef = useRef(draft)

  function updateDraft(updater: (current: RoomStateView) => RoomStateView) {
    const next = updater(draftRef.current)
    draftRef.current = next
    setDraft(next)
  }

  useEffect(() => {
    let alive = true
    fetch('/api/members/room')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RoomEditorView | null) => {
        if (!alive || !d) return
        setData(d)
        draftRef.current = d.state
        setDraft(d.state)
        setBalance(d.balance)
        setCoinsUnlimited(d.balanceUnlimited === true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Teclado: setas movem a peça selecionada, R gira, Delete tira, Esc deseleciona. O handler
  // vive num ref atualizado a cada render (sempre lê o estado fresco) → 1 listener estável, sem
  // re-assinar a cada movimento (mesmo motivo do ref no canvas 3D).
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (selected === null) return
    const el = document.activeElement as HTMLElement | null
    if (
      el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable)
    )
      return
    const it = draftRef.current.placedItems[selected]
    const isWall = it ? ROOM_ITEM_INFO[it.itemId]?.mount === 'wall' : false
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        nudgeSelected(0, isWall ? 1 : -1)
        break
      case 'ArrowDown':
        e.preventDefault()
        nudgeSelected(0, isWall ? -1 : 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        nudgeSelected(-1, 0)
        break
      case 'ArrowRight':
        e.preventDefault()
        nudgeSelected(1, 0)
        break
      case 'r':
      case 'R':
        e.preventDefault()
        rotateSelected()
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        removeSelected()
        break
      case 'Escape':
        setSelected(null)
        break
    }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ownedById = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i.owned])), [data])
  const isOwned = (id: string) => ownedById.get(id) ?? false
  const appearance = resolveRoomAppearance(draft)
  const paintColor = tab === 'parede' ? brush : null

  function moveItem(index: number, x: number, y: number, wall?: 'left' | 'right') {
    updateDraft((d) => {
      const it = d.placedItems[index]
      if (!it) return d
      const info = ROOM_ITEM_INFO[it.itemId]
      if (!info) return d
      if (info.mount === 'wall') {
        const side = wall ?? it.wall ?? 'right'
        const nx = Math.max(0, Math.min(wallLength(side) - info.w, x))
        const ny = Math.max(0, Math.min(WALL_H_CELLS - info.h, y))
        const placedItems = d.placedItems.map((p, i) =>
          i === index ? { ...p, x: nx, y: ny, wall: side } : p,
        )
        return { ...d, placedItems }
      }
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
    // Decide a colocação ANTES de mexer no estado: assim o toast só fala "adicionado" quando
    // a peça REALMENTE entrou (antes mentia mesmo com o quarto cheio / sem vão livre).
    const current = draftRef.current
    if (current.placedItems.length >= 40) {
      toast('Seu quarto está cheio! Tire algo antes de adicionar mais. 🧹')
      return
    }
    if (info.mount === 'wall') {
      const s = freeWallSpot(current.placedItems, info.w, info.h)
      if (!s) {
        toast('Não cabe mais nada nessa parede! 🧱')
        return
      }
      updateDraft((d) => ({
        ...d,
        placedItems: [...d.placedItems, { itemId: item.id, x: s.u, y: s.v, wall: s.wall }],
      }))
    } else {
      const s = freeFloorSpot(current.placedItems, info.w, info.h)
      if (!s) {
        toast('Não cabe mais nada no chão! 🧹')
        return
      }
      updateDraft((d) => ({
        ...d,
        placedItems: [...d.placedItems, { itemId: item.id, x: s.x, y: s.y }],
      }))
    }
    toast.success(`${info.labelPt} no quarto! ✨`)
  }

  function removeSelected() {
    if (selected === null) return
    updateDraft((d) => ({ ...d, placedItems: d.placedItems.filter((_, i) => i !== selected) }))
    setSelected(null)
  }

  // Movimento por TECLADO da peça selecionada (a11y: arrastar no plano 3D não é alcançável por
  // teclado). Respeita os mesmos limites e colisão do arraste; parede → x=horizontal, y=altura.
  function nudgeSelected(dx: number, dy: number) {
    if (selected === null) return
    const current = draftRef.current
    const it = current.placedItems[selected]
    if (!it) return
    const info = ROOM_ITEM_INFO[it.itemId]
    if (!info) return
    if (info.mount === 'wall') {
      const side = it.wall ?? 'right'
      const nx = Math.max(0, Math.min(wallLength(side) - info.w, it.x + dx))
      const ny = Math.max(0, Math.min(WALL_H_CELLS - info.h, it.y + dy))
      if (
        (nx !== it.x || ny !== it.y) &&
        isFreeAt(current.placedItems, selected, true, side, nx, ny, info.w, info.h)
      )
        moveItem(selected, nx, ny, side)
      return
    }
    const fp = effectiveFootprint(info.w, info.h, (it.rot ?? 0) as Rot)
    const nx = Math.max(0, Math.min(ROOM_GRID.cols - fp.w, it.x + dx))
    const ny = Math.max(0, Math.min(ROOM_GRID.rows - fp.h, it.y + dy))
    if (
      (nx !== it.x || ny !== it.y) &&
      isFreeAt(current.placedItems, selected, false, undefined, nx, ny, fp.w, fp.h)
    )
      moveItem(selected, nx, ny)
  }

  function rotateSelected() {
    if (selected === null) return
    const current = draftRef.current
    const it = current.placedItems[selected]
    if (!it) return
    const info = ROOM_ITEM_INFO[it.itemId]
    if (!info || info.mount === 'wall') return // item de parede não gira
    const rot = (((it.rot ?? 0) + 1) % 4) as Rot
    const fp = effectiveFootprint(info.w, info.h, rot)
    const x = Math.max(0, Math.min(ROOM_GRID.cols - fp.w, it.x))
    const y = Math.max(0, Math.min(ROOM_GRID.rows - fp.h, it.y))
    // Não gira para uma orientação que sobreponha outro móvel de chão: sem este guard
    // o `canonicalizeRoomState` do members descartaria a peça em SILÊNCIO ao salvar.
    const collides = current.placedItems.some((p, i) => {
      if (i === selected) return false
      const inf = ROOM_ITEM_INFO[p.itemId]
      if (!inf || inf.mount === 'wall') return false
      const ofp = effectiveFootprint(inf.w, inf.h, (p.rot ?? 0) as Rot)
      return rectsOverlap(x, y, fp.w, fp.h, p.x, p.y, ofp.w, ofp.h)
    })
    if (collides) {
      toast('Sem espaço para girar aqui! 🔄')
      return
    }
    updateDraft((d) => ({
      ...d,
      placedItems: d.placedItems.map((p, i) => (i === selected ? { ...p, rot, x, y } : p)),
    }))
  }

  function paintWall(wall: 'left' | 'right', color: string) {
    updateDraft((d) => ({ ...d, wallColors: { ...d.wallColors, [wall]: color } }))
  }

  function applyTheme(id: string) {
    // Tema reseta os overrides → mostra a aparência bundle do preset (a criança ajusta depois).
    updateDraft((d) => ({
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
        body: JSON.stringify(draftRef.current),
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
            {ROOM_ITEM_INFO[draft.placedItems[selected]?.itemId ?? '']?.mount !== 'wall' ? (
              <button
                type="button"
                onClick={rotateSelected}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
              >
                <RotateCw className="size-3.5" /> Girar
              </button>
            ) : null}
            <button
              type="button"
              onClick={removeSelected}
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-2.5 font-bold text-(--sz-hot-fg) text-xs shadow"
            >
              <Trash2 className="size-3.5" /> Tirar
            </button>
          </div>
        ) : null}
      </div>

      {/* Lista das peças no quarto — caminho de TECLADO p/ posicionar (arrastar no 3D não é
          alcançável por teclado): escolha uma e mova com as setas (R gira, Delete tira). */}
      {draft.placedItems.length > 0 ? (
        <div
          role="group"
          aria-label="Peças no quarto — escolha uma e mova com as setas do teclado (R gira, Delete tira)"
          className="flex flex-wrap gap-1.5"
        >
          {draft.placedItems.map((p, i) => {
            const inf = ROOM_ITEM_INFO[p.itemId]
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens É a identidade.
                key={i}
                type="button"
                onClick={() => setSelected(selected === i ? null : i)}
                aria-pressed={selected === i}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-3 py-1.5 font-semibold text-xs',
                  selected === i ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <span aria-hidden="true">{inf?.emoji ?? '📦'}</span>
                {inf?.labelPt ?? p.itemId}
              </button>
            )
          })}
        </div>
      ) : null}

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
          onApply={(id) => updateDraft((d) => ({ ...d, floor: id }))}
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
          onApply={(id) => updateDraft((d) => ({ ...d, lighting: id }))}
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
        onPick={(id) => updateDraft((d) => ({ ...d, pet: id }))}
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
