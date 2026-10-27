import type { ReactNode } from 'react'
import {
  floorInfo,
  lightingPreset,
  ROOM_ITEM_INFO,
  ROOM_THEME_INFO,
} from '../../../lib/room-catalog'
import type { RoomEditorView, RoomItemView, RoomStateView } from '../../../lib/types'

/**
 * O contrato da TELA do construtor, dividido pelas duas peles (Kids em `room-builder-view.tsx`,
 * adulta em `room-builder-view-adult.tsx`). As regras de colocação, compra e persistência ficam no
 * orquestrador (`room-builder.tsx`).
 */

/** As abas da bandeja, na ordem em que aparecem. */
export const ROOM_BUILDER_TABS = [
  'moveis',
  'enfeites',
  'trofeus',
  'plantas',
  'luzes',
  'piso',
  'parede',
  'clima',
  'bichinho',
  'tema',
] as const

export type RoomBuilderTab = (typeof ROOM_BUILDER_TABS)[number]

export type RoomLoadState = 'loading' | 'ready' | 'error'

export const PLACEABLE: ReadonlySet<string> = new Set(['furniture', 'decor', 'plant', 'light'])

export const CATEGORY_BY_TAB: Partial<Record<RoomBuilderTab, string>> = {
  moveis: 'furniture',
  enfeites: 'decor',
  plantas: 'plant',
  luzes: 'light',
}

export type RoomBuilderScene = {
  avatarPhotoUrl?: string | null
  data: RoomEditorView | null
  loadState: RoomLoadState
  draft: RoomStateView
  onMoveItem: (index: number, x: number, y: number, wall?: 'left' | 'right') => void
  onPaintWall: (wall: 'left' | 'right', color: string) => void
  paintColor: string | null
  onRetry: () => void
}

export type RoomBuilderSelection = {
  selected: number | null
  onSelectPiece: (index: number | null) => void
  stackPicker: boolean
  surfaces: { itemId: string; free: number }[]
  onBringDown: () => void
  onToggleStackPicker: () => void
  onRotateSelected: () => void
  onRemoveSelected: () => void
  onPlaceOnSurface: (itemId: string) => void
  onCloseStackPicker: () => void
}

export type RoomBuilderWallet = {
  coinsUnlimited: boolean
  balance: number
  saving: boolean
  onSave: () => void
}

export type RoomBuilderCatalog = {
  tab: RoomBuilderTab
  onSelectTab: (tab: RoomBuilderTab) => void
  confirmBuyId: string | null
  busy: string | null
  onCancelBuy: () => void
  onBuy: (id: string) => void
  isOwned: (id: string) => boolean
  onPickItem: (item: RoomItemView) => void
  onApplyFloor: (id: string) => void
  onApplyLighting: (id: string) => void
  onApplyTheme: (id: string) => void
  brush: string
  onPickBrush: (color: string) => void
  onPickPet: (id: string | null) => void
}

export type RoomBuilderViewProps = {
  scene: RoomBuilderScene
  selection: RoomBuilderSelection
  wallet: RoomBuilderWallet
  catalog: RoomBuilderCatalog
  /** O começo da barra de cima (a seta de voltar e o título), desenhado pela página. Só o Kids usa. */
  header?: ReactNode
}

/** Os itens de chão/parede da aba (troféus têm aba própria). */
export function shopItemsForTab(data: RoomEditorView, tab: RoomBuilderTab): RoomItemView[] | null {
  const category = CATEGORY_BY_TAB[tab]
  if (!category) return null
  return data.items.filter(
    (item) => PLACEABLE.has(item.category) && item.category === category && item.tier !== 'trophy',
  )
}

/** O item travado com a confirmação de compra armada (item, tema, piso ou clima). */
export function resolvePendingBuy(
  data: RoomEditorView | null,
  id: string | null,
): { id: string; price: number; label: string } | null {
  if (!id || !data) return null
  const item = data.items.find((candidate) => candidate.id === id)
  if (item)
    return { id: item.id, price: item.price, label: ROOM_ITEM_INFO[item.id]?.labelPt ?? item.id }
  const theme = (data.themes ?? []).find((candidate) => candidate.id === id)
  if (theme)
    return {
      id: theme.id,
      price: theme.price,
      label: ROOM_THEME_INFO[theme.id]?.labelPt ?? theme.id,
    }
  const floor = (data.floors ?? []).find((candidate) => candidate.id === id)
  if (floor) return { id: floor.id, price: floor.price, label: floorInfo(floor.id).labelPt }
  const lighting = (data.lightings ?? []).find((candidate) => candidate.id === id)
  return lighting
    ? { id: lighting.id, price: lighting.price, label: lightingPreset(lighting.id).labelPt }
    : null
}
