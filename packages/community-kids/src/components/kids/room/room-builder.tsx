'use client'

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Frame,
  LayoutGrid,
  Lightbulb,
  Paintbrush,
  Palette,
  PawPrint,
  RefreshCw,
  RotateCw,
  Sofa,
  Sprout,
  Sun,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { ZappyCoin } from '../zappy-coin'
import { effectiveFootprint, type Rot, rectsOverlap, WALL_H_CELLS, wallLength } from './coords'
import { freeFloorSpot, freeWallSpot, isFreeAt } from './placement'
import { ChoiceGrid, PetTray, ShopGrid, TrophyTray, WallTray } from './room-builder-trays'
import { RoomCanvas } from './room-canvas'

const PLACEABLE: ReadonlySet<string> = new Set(['furniture', 'decor', 'plant', 'light'])

type TabId =
  | 'moveis'
  | 'enfeites'
  | 'trofeus'
  | 'plantas'
  | 'luzes'
  | 'piso'
  | 'parede'
  | 'clima'
  | 'bichinho'
  | 'tema'
type LoadState = 'loading' | 'ready' | 'error'

const TABS: { id: TabId; label: string; icon: typeof Sofa }[] = [
  { id: 'moveis', label: 'Móveis', icon: Sofa },
  { id: 'enfeites', label: 'Enfeites', icon: Frame },
  // 🏆 Troféus (07/2026): ganhos por conquista — a estante de troféus viva.
  { id: 'trofeus', label: 'Troféus', icon: Trophy },
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

/** Editor do quarto 3D: cena ao vivo + barra de categorias (móveis/piso/parede/clima/…). */
export function RoomBuilder({ avatarPhotoUrl }: { avatarPhotoUrl?: string | null }) {
  const [data, setData] = useState<RoomEditorView | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
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
  // Confirmação LEVE de compra (07/2026): 1º toque num item travado arma a confirmação
  // (chip vira "Comprar?" + barra com preço); o 2º toque compra. Nada de modal pesado.
  const [confirmBuyId, setConfirmBuyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabId>('moveis')
  const [brush, setBrush] = useState<string>(ROOM_WALL_PALETTE[0]?.hex ?? '#f3ede1')
  // Lista "Colocar em cima de…" aberta p/ a peça stackable selecionada (superfícies, 24/07).
  const [stackPicker, setStackPicker] = useState(false)
  const draftRef = useRef(draft)

  function updateDraft(updater: (current: RoomStateView) => RoomStateView) {
    const next = updater(draftRef.current)
    draftRef.current = next
    setDraft(next)
  }

  const loadRoom = useCallback(async (isCurrent?: () => boolean) => {
    setLoadState('loading')
    setSelected(null)
    try {
      const res = await fetch('/api/members/room')
      if (!res.ok) throw new Error('room load failed')
      const d = (await res.json()) as RoomEditorView | null
      if (!d) throw new Error('room missing')
      if (isCurrent && !isCurrent()) return
      setData(d)
      draftRef.current = d.state
      setDraft(d.state)
      setBalance(d.balance)
      setCoinsUnlimited(d.balanceUnlimited === true)
      setLoadState('ready')
    } catch {
      if (isCurrent && !isCurrent()) return
      setData(null)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    let alive = true
    void loadRoom(() => alive)
    return () => {
      alive = false
    }
  }, [loadRoom])

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
        setStackPicker(false)
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
  /** Seleciona/desseleciona uma peça — fecha o picker de superfície (contexto muda). */
  const selectPiece = useCallback((index: number | null) => {
    setSelected(index)
    setStackPicker(false)
  }, [])
  const appearance = resolveRoomAppearance(draft)
  const paintColor = tab === 'parede' ? brush : null

  function moveItem(index: number, x: number, y: number, wall?: 'left' | 'right') {
    updateDraft((d) => {
      const it = d.placedItems[index]
      if (!it || it.on) return d // filho em nicho não anda pela grade — "Descer" primeiro
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
        // Chão cheio mas o item cabe num NICHO (troféu com a estante vazia, ex.) →
        // entra direto na 1ª superfície com vaga em vez de recusar.
        if (info.stackable) {
          const opt = surfaceOptions()[0]
          if (opt) {
            const placed = placeOnSurfaceAsNew(item.id, opt.itemId)
            if (placed) {
              toast.success(`${info.labelPt} em cima! ✨`)
              return
            }
          }
        }
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
    updateDraft((d) => {
      const removed = d.placedItems[selected]
      let placedItems = d.placedItems.filter((_, i) => i !== selected)
      // Tirar uma SUPERFÍCIE derruba os filhos junto (voltam pro tray) quando não sobra
      // outra instância do mesmo móvel — senão o save descartaria os órfãos em silêncio.
      if (removed && !removed.on) {
        const stillPlaced = placedItems.some((p) => !p.on && p.itemId === removed.itemId)
        if (!stillPlaced && placedItems.some((p) => p.on === removed.itemId)) {
          placedItems = placedItems.filter((p) => p.on !== removed.itemId)
          toast('O que estava em cima voltou para a bandeja! 🧺')
        }
      }
      return { ...d, placedItems }
    })
    setSelected(null)
    setStackPicker(false)
  }

  // ── Superfícies (24/07): colocar a peça stackable selecionada num nicho / descer ────
  /** Superfícies POSICIONADAS com nicho livre (1ª instância de cada itemId). */
  function surfaceOptions(): { itemId: string; free: number }[] {
    const current = draftRef.current
    const seen = new Set<string>()
    const out: { itemId: string; free: number }[] = []
    for (const p of current.placedItems) {
      if (p.on) continue
      const info = ROOM_ITEM_INFO[p.itemId]
      if (!info?.surface || seen.has(p.itemId)) continue
      seen.add(p.itemId)
      const used = current.placedItems.filter((c) => c.on === p.itemId).length
      if (used < info.surface) out.push({ itemId: p.itemId, free: info.surface - used })
    }
    return out
  }

  /** 1º nicho livre do pai (por itemId — os nichos são da superfície, não da instância). */
  function firstFreeSlot(current: RoomStateView, parentId: string): number | null {
    const parentInfo = ROOM_ITEM_INFO[parentId]
    const taken = new Set(current.placedItems.filter((c) => c.on === parentId).map((c) => c.slot))
    for (let s = 0; s < (parentInfo?.surface ?? 0); s++) {
      if (!taken.has(s)) return s
    }
    return null
  }

  /** Coloca um item NOVO (vindo do tray) direto num nicho livre do pai. */
  function placeOnSurfaceAsNew(itemId: string, parentId: string): boolean {
    const slot = firstFreeSlot(draftRef.current, parentId)
    if (slot === null) return false
    updateDraft((d) => ({
      ...d,
      placedItems: [...d.placedItems, { itemId, x: 0, y: 0, on: parentId, slot }],
    }))
    return true
  }

  function placeOnSurface(parentId: string) {
    if (selected === null) return
    const current = draftRef.current
    const it = current.placedItems[selected]
    const info = it && ROOM_ITEM_INFO[it.itemId]
    if (!it || !info?.stackable) return
    const slot = firstFreeSlot(current, parentId)
    if (slot === null) {
      toast('Essa superfície está cheia! 🧺')
      return
    }
    updateDraft((d) => ({
      ...d,
      placedItems: d.placedItems.map((p, i) =>
        i === selected ? { itemId: p.itemId, x: 0, y: 0, on: parentId, slot: slot as number } : p,
      ),
    }))
    setStackPicker(false)
    toast.success(`${info.labelPt} em cima! ✨`)
  }

  /** Tira o filho do nicho e devolve ao 1º vão livre do chão. */
  function bringDown() {
    if (selected === null) return
    const current = draftRef.current
    const it = current.placedItems[selected]
    const info = it && ROOM_ITEM_INFO[it.itemId]
    if (!it?.on || !info) return
    const s = freeFloorSpot(current.placedItems, info.w, info.h)
    if (!s) {
      toast('Não cabe mais nada no chão! 🧹')
      return
    }
    updateDraft((d) => ({
      ...d,
      placedItems: d.placedItems.map((p, i) =>
        i === selected ? { itemId: p.itemId, x: s.x, y: s.y } : p,
      ),
    }))
  }

  // Movimento por TECLADO da peça selecionada (a11y: arrastar no plano 3D não é alcançável por
  // teclado). Respeita os mesmos limites e colisão do arraste; parede → x=horizontal, y=altura.
  function nudgeSelected(dx: number, dy: number) {
    if (selected === null) return
    const current = draftRef.current
    const it = current.placedItems[selected]
    if (!it || it.on) return // filho em nicho não anda — "Descer" primeiro
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
    if (!it || it.on) return // filho em nicho não gira
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
      // Filho em nicho (x/y=0 fantasmas) não ocupa chão — sem este guard, girar
      // perto do canto (0,0) travava com falso "sem espaço".
      if (!inf || inf.mount === 'wall' || p.on) return false
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

  /** Portão da compra: 1º toque arma a confirmação; 2º toque no MESMO item compra de fato. */
  function buy(id: string) {
    if (confirmBuyId === id) {
      void doBuy(id)
      return
    }
    setConfirmBuyId(id)
  }

  async function doBuy(id: string) {
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
      // Sucesso desarma a confirmação; na falha ela fica de pé (dá p/ desistir ou tentar de novo).
      setConfirmBuyId(null)
      toast.success('Desbloqueado! 🎉')
    } catch {
      toast.error('Não consegui comprar agora.')
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (saving || loadState !== 'ready') return
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

  const pendingBuy = resolvePendingBuy()

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        {data ? (
          <RoomCanvas
            state={draft}
            mode="edit"
            avatarPhotoUrl={avatarPhotoUrl}
            selectedIndex={selected}
            onSelect={selectPiece}
            onMove={moveItem}
            onPaintWall={paintWall}
            paintColor={paintColor}
          />
        ) : loadState === 'error' ? (
          <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted p-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <KidsMascot expression="thinking" className="size-20" />
              <p className="font-semibold">Não consegui carregar seu quarto.</p>
              <button
                type="button"
                onClick={() => void loadRoom()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
              >
                <RefreshCw className="size-4" /> Tentar de novo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted">
            <KidsMascot expression="thinking" className="size-20" />
          </div>
        )}
        {selected !== null ? (
          <div className="absolute top-2 right-2 flex gap-2">
            {(() => {
              const sel = draft.placedItems[selected]
              const selInfo = ROOM_ITEM_INFO[sel?.itemId ?? '']
              const isChild = Boolean(sel?.on)
              return (
                <>
                  {isChild ? (
                    <button
                      type="button"
                      onClick={bringDown}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
                    >
                      <ArrowDownToLine className="size-3.5" /> Descer
                    </button>
                  ) : (
                    <>
                      {selInfo?.stackable && surfaceOptions().length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setStackPicker((v) => !v)}
                          aria-expanded={stackPicker}
                          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
                        >
                          <ArrowUpToLine className="size-3.5" /> Em cima…
                        </button>
                      ) : null}
                      {selInfo?.mount !== 'wall' ? (
                        <button
                          type="button"
                          onClick={rotateSelected}
                          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
                        >
                          <RotateCw className="size-3.5" /> Girar
                        </button>
                      ) : null}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-2.5 font-bold text-(--sz-hot-fg) text-xs shadow"
                  >
                    <Trash2 className="size-3.5" /> Tirar
                  </button>
                </>
              )
            })()}
          </div>
        ) : null}
      </div>

      {/* Lista "Colocar em cima de…" — superfícies posicionadas com nicho livre (24/07). */}
      {selected !== null && stackPicker ? (
        <div
          role="group"
          aria-label="Colocar em cima de qual superfície?"
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5"
        >
          <p className="font-semibold text-sm">Colocar em cima de:</p>
          {surfaceOptions().map((opt) => {
            const info = ROOM_ITEM_INFO[opt.itemId]
            return (
              <button
                key={opt.itemId}
                type="button"
                onClick={() => placeOnSurface(opt.itemId)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-border bg-card px-3 font-semibold text-xs"
              >
                <span aria-hidden="true">{info?.emoji ?? '📦'}</span>
                {info?.labelPt ?? opt.itemId}
                <span className="text-muted-foreground">
                  ({opt.free} {opt.free === 1 ? 'vaga' : 'vagas'})
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setStackPicker(false)}
            className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-muted-foreground text-xs"
          >
            Cancelar
          </button>
        </div>
      ) : null}

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
            const parentInf = p.on ? ROOM_ITEM_INFO[p.on] : null
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens É a identidade.
                key={i}
                type="button"
                onClick={() => selectPiece(selected === i ? null : i)}
                aria-pressed={selected === i}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-3 py-1.5 font-semibold text-xs',
                  selected === i ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <span aria-hidden="true">{inf?.emoji ?? '📦'}</span>
                {inf?.labelPt ?? p.itemId}
                {parentInf ? (
                  <span className="text-muted-foreground">· na {parentInf.labelPt}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1 [font-family:var(--font-display)] font-bold text-sm">
          <ZappyCoin className="size-4" /> {coinsUnlimited ? '∞' : balance}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving || loadState !== 'ready'}
          className={cn(
            'sz-btn-gradient h-11 px-6 text-base',
            (saving || loadState !== 'ready') && 'opacity-60',
          )}
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
              onClick={() => {
                setTab(t.id)
                setConfirmBuyId(null)
              }}
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

      {/* Barra de confirmação da compra (1º toque armou; aqui confirma ou desiste). */}
      {pendingBuy ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5"
        >
          <p className="font-semibold text-sm">
            Gostou? <span className="text-muted-foreground">({pendingBuy.label})</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmBuyId(null)}
              disabled={!!busy}
              className="inline-flex h-11 items-center rounded-full border-2 border-border bg-card px-4 font-semibold text-muted-foreground text-sm"
            >
              Deixar para depois
            </button>
            <button
              type="button"
              onClick={() => buy(pendingBuy.id)}
              disabled={!!busy}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground text-sm"
            >
              <ZappyCoin className="size-4" /> Comprar por {pendingBuy.price}
            </button>
          </div>
        </div>
      ) : null}

      {/* Bandeja da categoria ativa */}
      <div>{data ? renderTray() : null}</div>
    </div>
  )

  /** Preço + rótulo do item aguardando confirmação (procura nos 4 catálogos da lojinha). */
  function resolvePendingBuy(): { id: string; price: number; label: string } | null {
    if (!confirmBuyId || !data) return null
    const item = data.items.find((i) => i.id === confirmBuyId)
    if (item)
      return { id: item.id, price: item.price, label: ROOM_ITEM_INFO[item.id]?.labelPt ?? item.id }
    const theme = (data.themes ?? []).find((t) => t.id === confirmBuyId)
    if (theme)
      return {
        id: theme.id,
        price: theme.price,
        label: ROOM_THEME_INFO[theme.id]?.labelPt ?? theme.id,
      }
    const floor = (data.floors ?? []).find((f) => f.id === confirmBuyId)
    if (floor) return { id: floor.id, price: floor.price, label: floorInfo(floor.id).labelPt }
    const lighting = (data.lightings ?? []).find((l) => l.id === confirmBuyId)
    if (lighting)
      return {
        id: lighting.id,
        price: lighting.price,
        label: lightingPreset(lighting.id).labelPt,
      }
    return null
  }

  function renderTray() {
    if (!data) return null
    const cat = CAT_BY_TAB[tab]
    if (cat) {
      // Troféus ficam FORA das bandejas de compra (têm bandeja própria 🏆).
      const items = data.items.filter(
        (i) => PLACEABLE.has(i.category) && i.category === cat && i.tier !== 'trophy',
      )
      return (
        <ShopGrid
          items={items}
          owned={isOwned}
          busy={busy}
          confirmingId={confirmBuyId}
          onPick={addItem}
          onBuy={buy}
        />
      )
    }
    if (tab === 'trofeus') {
      return (
        <TrophyTray
          trophies={data.items.filter((i) => i.tier === 'trophy')}
          owned={isOwned}
          onPick={addItem}
        />
      )
    }
    if (tab === 'piso') {
      return (
        <ChoiceGrid
          choices={data.floors}
          activeId={appearance.floorId}
          busy={busy}
          confirmingId={confirmBuyId}
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
          confirmingId={confirmBuyId}
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
          confirmingId={confirmBuyId}
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
        confirmingId={confirmBuyId}
        onPick={(id) => updateDraft((d) => ({ ...d, pet: id }))}
        onBuy={buy}
      />
    )
  }
}
