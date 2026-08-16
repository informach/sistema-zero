'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ROOM_GRID, ROOM_ITEM_INFO, ROOM_WALL_PALETTE } from '@/lib/room-catalog'
import type { RoomEditorView, RoomItemView, RoomStateView, RoomThemeView } from '@/lib/types'
import { effectiveFootprint, type Rot, rectsOverlap, WALL_H_CELLS, wallLength } from './coords'
import { freeFloorSpot, freeWallSpot, isFreeAt } from './placement'
import { type RoomBuilderTab, RoomBuilderView, type RoomLoadState } from './room-builder-view'

/** Editor do quarto 3D: cena ao vivo + barra de categorias (móveis/piso/parede/clima/…). */
export function RoomBuilder({ avatarPhotoUrl }: { avatarPhotoUrl?: string | null }) {
  const [data, setData] = useState<RoomEditorView | null>(null)
  const [loadState, setLoadState] = useState<RoomLoadState>('loading')
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
  const [tab, setTab] = useState<RoomBuilderTab>('moveis')
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

  return (
    <RoomBuilderView
      scene={{
        avatarPhotoUrl,
        data,
        loadState,
        draft,
        onMoveItem: moveItem,
        onPaintWall: paintWall,
        paintColor,
        onRetry: () => void loadRoom(),
      }}
      selection={{
        selected,
        onSelectPiece: selectPiece,
        stackPicker,
        surfaces: surfaceOptions(),
        onBringDown: bringDown,
        onToggleStackPicker: () => setStackPicker((open) => !open),
        onRotateSelected: rotateSelected,
        onRemoveSelected: removeSelected,
        onPlaceOnSurface: placeOnSurface,
        onCloseStackPicker: () => setStackPicker(false),
      }}
      wallet={{
        coinsUnlimited,
        balance,
        saving,
        onSave: () => void save(),
      }}
      catalog={{
        tab,
        onSelectTab: (nextTab) => {
          setTab(nextTab)
          setConfirmBuyId(null)
        },
        confirmBuyId,
        busy,
        onCancelBuy: () => setConfirmBuyId(null),
        onBuy: buy,
        isOwned,
        onPickItem: addItem,
        onApplyFloor: (id) => updateDraft((current) => ({ ...current, floor: id })),
        onApplyLighting: (id) => updateDraft((current) => ({ ...current, lighting: id })),
        onApplyTheme: applyTheme,
        brush,
        onPickBrush: setBrush,
        onPickPet: (id) => updateDraft((current) => ({ ...current, pet: id })),
      }}
    />
  )
}
