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
import { cn } from '@/lib/cn'
import {
  floorInfo,
  lightingPreset,
  ROOM_ITEM_INFO,
  ROOM_THEME_INFO,
  resolveRoomAppearance,
} from '@/lib/room-catalog'
import type { RoomEditorView, RoomItemView, RoomStateView } from '@/lib/types'
import { KidsMascot } from '../mascot'
import { ZappyCoin } from '../zappy-coin'
import { ChoiceGrid, PetTray, ShopGrid, TrophyTray, WallTray } from './room-builder-trays'
import { RoomCanvas } from './room-canvas'

const PLACEABLE: ReadonlySet<string> = new Set(['furniture', 'decor', 'plant', 'light'])

export type RoomBuilderTab =
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

export type RoomLoadState = 'loading' | 'ready' | 'error'

const TABS: { id: RoomBuilderTab; label: string; icon: typeof Sofa }[] = [
  { id: 'moveis', label: 'Móveis', icon: Sofa },
  { id: 'enfeites', label: 'Enfeites', icon: Frame },
  { id: 'trofeus', label: 'Troféus', icon: Trophy },
  { id: 'plantas', label: 'Plantas', icon: Sprout },
  { id: 'luzes', label: 'Luzes', icon: Lightbulb },
  { id: 'piso', label: 'Piso', icon: LayoutGrid },
  { id: 'parede', label: 'Parede', icon: Paintbrush },
  { id: 'clima', label: 'Clima', icon: Sun },
  { id: 'bichinho', label: 'Bichinho', icon: PawPrint },
  { id: 'tema', label: 'Tema', icon: Palette },
]

const CATEGORY_BY_TAB: Partial<Record<RoomBuilderTab, string>> = {
  moveis: 'furniture',
  enfeites: 'decor',
  plantas: 'plant',
  luzes: 'light',
}

type RoomBuilderScene = {
  avatarPhotoUrl?: string | null
  data: RoomEditorView | null
  loadState: RoomLoadState
  draft: RoomStateView
  onMoveItem: (index: number, x: number, y: number, wall?: 'left' | 'right') => void
  onPaintWall: (wall: 'left' | 'right', color: string) => void
  paintColor: string | null
  onRetry: () => void
}

type RoomBuilderSelection = {
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

type RoomBuilderWallet = {
  coinsUnlimited: boolean
  balance: number
  saving: boolean
  onSave: () => void
}

type RoomBuilderCatalog = {
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

type RoomBuilderViewProps = {
  scene: RoomBuilderScene
  selection: RoomBuilderSelection
  wallet: RoomBuilderWallet
  catalog: RoomBuilderCatalog
}

/** Superfície visual do editor; regras de colocação, compra e persistência ficam no orquestrador. */
export function RoomBuilderView(props: RoomBuilderViewProps) {
  const { scene, selection, wallet, catalog } = props
  const { avatarPhotoUrl, data, loadState, draft, paintColor } = scene
  const { selected, stackPicker, surfaces } = selection
  const { coinsUnlimited, balance, saving } = wallet
  const { tab, confirmBuyId, busy } = catalog
  const pendingBuy = resolvePendingBuy(data, confirmBuyId)

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        {data ? (
          <RoomCanvas
            state={draft}
            mode="edit"
            avatarPhotoUrl={avatarPhotoUrl}
            selectedIndex={selected}
            onSelect={selection.onSelectPiece}
            onMove={scene.onMoveItem}
            onPaintWall={scene.onPaintWall}
            paintColor={paintColor}
          />
        ) : loadState === 'error' ? (
          <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted p-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <KidsMascot expression="thinking" className="size-20" />
              <p className="font-semibold">Não consegui carregar seu quarto.</p>
              <button
                type="button"
                onClick={scene.onRetry}
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
          <SelectedItemActions
            item={draft.placedItems[selected]}
            surfacesAvailable={surfaces.length > 0}
            stackPicker={stackPicker}
            onBringDown={selection.onBringDown}
            onToggleStackPicker={selection.onToggleStackPicker}
            onRotate={selection.onRotateSelected}
            onRemove={selection.onRemoveSelected}
          />
        ) : null}
      </div>

      {selected !== null && stackPicker ? (
        <div
          role="group"
          aria-label="Colocar em cima de qual superfície?"
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5"
        >
          <p className="font-semibold text-sm">Colocar em cima de:</p>
          {surfaces.map((option) => {
            const info = ROOM_ITEM_INFO[option.itemId]
            return (
              <button
                key={option.itemId}
                type="button"
                onClick={() => selection.onPlaceOnSurface(option.itemId)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-border bg-card px-3 font-semibold text-xs"
              >
                <span aria-hidden="true">{info?.emoji ?? '📦'}</span>
                {info?.labelPt ?? option.itemId}
                <span className="text-muted-foreground">
                  ({option.free} {option.free === 1 ? 'vaga' : 'vagas'})
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={selection.onCloseStackPicker}
            className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-muted-foreground text-xs"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {draft.placedItems.length > 0 ? (
        <div
          role="group"
          aria-label="Peças no quarto. Escolha uma e mova com as setas do teclado (R gira, Delete tira)"
          className="flex flex-wrap gap-1.5"
        >
          {draft.placedItems.map((item, index) => {
            const info = ROOM_ITEM_INFO[item.itemId]
            const parentInfo = item.on ? ROOM_ITEM_INFO[item.on] : null
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens É a identidade.
                key={index}
                type="button"
                onClick={() => selection.onSelectPiece(selected === index ? null : index)}
                aria-pressed={selected === index}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-3 py-1.5 font-semibold text-xs',
                  selected === index ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <span aria-hidden="true">{info?.emoji ?? '📦'}</span>
                {info?.labelPt ?? item.itemId}
                {parentInfo ? (
                  <span className="text-muted-foreground">· na {parentInfo.labelPt}</span>
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
          onClick={wallet.onSave}
          disabled={saving || loadState !== 'ready'}
          className={cn(
            'sz-btn-gradient h-11 px-6 text-base',
            (saving || loadState !== 'ready') && 'opacity-60',
          )}
        >
          {saving ? 'Salvando…' : 'Salvar quarto'}
        </button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => catalog.onSelectTab(item.id)}
              aria-pressed={active}
              className={cn(
                'flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 font-semibold text-xs transition-colors',
                active ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          )
        })}
      </div>

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
              onClick={catalog.onCancelBuy}
              disabled={Boolean(busy)}
              className="inline-flex h-11 items-center rounded-full border-2 border-border bg-card px-4 font-semibold text-muted-foreground text-sm"
            >
              Deixar para depois
            </button>
            <button
              type="button"
              onClick={() => catalog.onBuy(pendingBuy.id)}
              disabled={Boolean(busy)}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground text-sm"
            >
              <ZappyCoin className="size-4" /> Comprar por {pendingBuy.price}
            </button>
          </div>
        </div>
      ) : null}

      {data ? <RoomBuilderTray data={data} draft={draft} catalog={catalog} /> : null}
    </div>
  )
}

function SelectedItemActions({
  item,
  surfacesAvailable,
  stackPicker,
  onBringDown,
  onToggleStackPicker,
  onRotate,
  onRemove,
}: {
  item: RoomStateView['placedItems'][number] | undefined
  surfacesAvailable: boolean
  stackPicker: boolean
  onBringDown: () => void
  onToggleStackPicker: () => void
  onRotate: () => void
  onRemove: () => void
}) {
  const info = ROOM_ITEM_INFO[item?.itemId ?? '']
  const isChild = Boolean(item?.on)
  return (
    <div className="absolute top-2 right-2 flex gap-2">
      {isChild ? (
        <button
          type="button"
          onClick={onBringDown}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
        >
          <ArrowDownToLine className="size-3.5" /> Descer
        </button>
      ) : (
        <>
          {info?.stackable && surfacesAvailable ? (
            <button
              type="button"
              onClick={onToggleStackPicker}
              aria-expanded={stackPicker}
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
            >
              <ArrowUpToLine className="size-3.5" /> Em cima…
            </button>
          ) : null}
          {info?.mount !== 'wall' ? (
            <button
              type="button"
              onClick={onRotate}
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
            >
              <RotateCw className="size-3.5" /> Girar
            </button>
          ) : null}
        </>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-2.5 font-bold text-(--sz-hot-fg) text-xs shadow"
      >
        <Trash2 className="size-3.5" /> Tirar
      </button>
    </div>
  )
}

function RoomBuilderTray({
  data,
  draft,
  catalog,
}: {
  data: RoomEditorView
  draft: RoomStateView
  catalog: RoomBuilderCatalog
}) {
  const { tab, busy, confirmBuyId, brush } = catalog
  const appearance = resolveRoomAppearance(draft)
  const category = CATEGORY_BY_TAB[tab]
  if (category) {
    const items = data.items.filter(
      (item) =>
        PLACEABLE.has(item.category) && item.category === category && item.tier !== 'trophy',
    )
    return (
      <ShopGrid
        items={items}
        owned={catalog.isOwned}
        busy={busy}
        confirmingId={confirmBuyId}
        onPick={catalog.onPickItem}
        onBuy={catalog.onBuy}
      />
    )
  }
  if (tab === 'trofeus') {
    return (
      <TrophyTray
        trophies={data.items.filter((item) => item.tier === 'trophy')}
        owned={catalog.isOwned}
        onPick={catalog.onPickItem}
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
        onApply={catalog.onApplyFloor}
        onBuy={catalog.onBuy}
        label={(id) => floorInfo(id).labelPt}
        preview={(id) => {
          const floor = floorInfo(id)
          return (
            <span
              className="block h-8 w-full rounded-lg border-2"
              style={{ background: floor.color, borderColor: floor.color2 }}
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
        onApply={catalog.onApplyLighting}
        onBuy={catalog.onBuy}
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
        onApply={catalog.onApplyTheme}
        onBuy={catalog.onBuy}
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
  if (tab === 'parede') return <WallTray brush={brush} onPick={catalog.onPickBrush} />

  return (
    <PetTray
      pets={data.items.filter((item) => item.category === 'pet')}
      current={draft.pet}
      busy={busy}
      confirmingId={confirmBuyId}
      onPick={catalog.onPickPet}
      onBuy={catalog.onBuy}
    />
  )
}

function resolvePendingBuy(
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
