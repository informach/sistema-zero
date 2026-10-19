'use client'

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  Loader2,
  RefreshCw,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { useId } from 'react'
import {
  floorInfo,
  lightingPreset,
  ROOM_ITEM_INFO,
  ROOM_THEME_INFO,
  resolveRoomAppearance,
} from '../../../lib/room-catalog'
import type { RoomEditorView, RoomStateView } from '../../../lib/types'
import { AdultCoins } from '../adult-ui'
import { adultUnlock, ADULT_ROOM_COPY as copy } from '../skin'
import {
  ROOM_BUILDER_TABS,
  type RoomBuilderCatalog,
  type RoomBuilderSelection,
  type RoomBuilderViewProps,
  resolvePendingBuy,
  shopItemsForTab,
} from './room-builder-model'
import {
  AdultChoiceGrid,
  AdultPetTray,
  AdultShopGrid,
  AdultTrophyTray,
  AdultWallTray,
} from './room-builder-trays-adult'
import { RoomCanvas } from './room-canvas'
import { RoomItemIcon } from './room-item-icon'

/**
 * A pele ADULTA do construtor (prancha "Meu espaço 3D", 18/10/2026). O mesmo orquestrador, as
 * mesmas abas e regras (até 40 peças, girar, pôr em cima, tirar, salvar); muda a tela: o espaço e
 * as peças à esquerda, os itens à direita (empilha no celular), atalhos do teclado escritos e
 * frases sem emoji. O desenho mora em `community/src/app/cosmetics-adult.css`.
 */
export function AdultRoomBuilderView({
  scene,
  selection,
  wallet,
  catalog,
  trophyHints,
}: RoomBuilderViewProps & { trophyHints?: Readonly<Record<string, string>> }) {
  const { data, loadState, draft } = scene
  const { selected, stackPicker, surfaces } = selection
  const keysId = useId()
  const pendingBuy = resolvePendingBuy(data, catalog.confirmBuyId)
  const selectedItem = selected !== null ? draft.placedItems[selected] : undefined

  return (
    <div className="sz-cos-room">
      <section className="sz-cos-room-main" aria-label={copy.stageRegion}>
        <div className="sz-cos-room-stage">
          {data ? (
            <RoomCanvas
              state={draft}
              mode="edit"
              // Sem foto do avatar ainda, nada no canto (o adulto não tem boneco padrão).
              avatarPhotoUrl={scene.avatarPhotoUrl ?? undefined}
              selectedIndex={selected}
              onSelect={selection.onSelectPiece}
              onMove={scene.onMoveItem}
              onPaintWall={scene.onPaintWall}
              paintColor={scene.paintColor}
              emptyHint={copy.emptyHint}
            />
          ) : loadState === 'error' ? (
            <div className="sz-cos-room-placeholder">
              <p>{copy.loadError}</p>
              <button type="button" onClick={scene.onRetry} className="sz-cos-btn">
                <RefreshCw aria-hidden="true" />
                {copy.retry}
              </button>
            </div>
          ) : (
            <div className="sz-cos-room-placeholder" role="status">
              <Loader2 aria-hidden="true" className="sz-cos-spin" />
              <span>{copy.loading}</span>
            </div>
          )}
          {selectedItem ? (
            <SelectedActions
              item={selectedItem}
              selection={selection}
              surfacesAvailable={surfaces.length > 0}
            />
          ) : null}
        </div>

        {selectedItem && stackPicker ? (
          <div role="group" aria-label={copy.stackGroup} className="sz-cos-room-stack">
            <p className="sz-cos-label">{copy.stackTitle}</p>
            <div className="sz-cos-chips">
              {surfaces.map((option) => (
                <button
                  key={option.itemId}
                  type="button"
                  onClick={() => selection.onPlaceOnSurface(option.itemId)}
                  className="sz-cos-chip"
                >
                  <RoomItemIcon id={option.itemId} />
                  {ROOM_ITEM_INFO[option.itemId]?.labelPt ?? option.itemId}
                  <span className="sz-cos-chip-note">{copy.freeSlots(option.free)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={selection.onCloseStackPicker}
                className="sz-cos-btn-quiet"
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        ) : null}

        <p id={keysId} className="sz-cos-room-keys">
          {copy.keyboardHint}
        </p>

        {draft.placedItems.length > 0 ? (
          <div
            role="group"
            aria-label={copy.pieces}
            aria-describedby={keysId}
            className="sz-cos-chips"
          >
            {draft.placedItems.map((item, index) => {
              const parent = item.on ? ROOM_ITEM_INFO[item.on] : null
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens É a identidade.
                  key={index}
                  type="button"
                  onClick={() => selection.onSelectPiece(selected === index ? null : index)}
                  aria-pressed={selected === index}
                  className="sz-cos-chip"
                >
                  {ROOM_ITEM_INFO[item.itemId]?.labelPt ?? item.itemId}
                  {parent ? (
                    <span className="sz-cos-chip-note">{copy.pieceOn(parent.labelPt)}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="sz-cos-room-savebar">
          {data ? <AdultCoins balance={wallet.balance} unlimited={wallet.coinsUnlimited} /> : null}
          <button
            type="button"
            onClick={wallet.onSave}
            disabled={wallet.saving || loadState !== 'ready'}
            className="sz-cos-btn"
          >
            {wallet.saving ? (
              <Loader2 aria-hidden="true" className="sz-cos-spin" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {wallet.saving ? copy.saving : copy.save}
          </button>
        </div>
      </section>

      <section className="sz-cos-room-shop" aria-label={copy.shopRegion}>
        <div role="group" aria-label={copy.tabsGroup} className="sz-cos-room-tabs">
          {ROOM_BUILDER_TABS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={catalog.tab === id}
              onClick={() => catalog.onSelectTab(id)}
            >
              {copy.tabs[id]}
            </button>
          ))}
        </div>

        {data ? (
          <Tray data={data} draft={draft} catalog={catalog} trophyHints={trophyHints} />
        ) : null}

        {pendingBuy ? (
          <div role="status" className="sz-cos-buybar">
            <p>
              <strong>{copy.pending(pendingBuy.label, pendingBuy.price).strong}</strong>
              {copy.pending(pendingBuy.label, pendingBuy.price).text}
            </p>
            <div className="sz-cos-buybar-actions">
              <button
                type="button"
                onClick={catalog.onCancelBuy}
                disabled={Boolean(catalog.busy)}
                className="sz-cos-buybar-quiet"
              >
                {copy.notNow}
              </button>
              <button
                type="button"
                onClick={() => catalog.onBuy(pendingBuy.id)}
                disabled={Boolean(catalog.busy)}
                className="sz-cos-buybar-main"
              >
                {adultUnlock(pendingBuy.price)}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

/** As ações da peça escolhida, por cima do espaço, com o nome da peça no grupo. */
function SelectedActions({
  item,
  selection,
  surfacesAvailable,
}: {
  item: RoomStateView['placedItems'][number]
  selection: RoomBuilderSelection
  surfacesAvailable: boolean
}) {
  const info = ROOM_ITEM_INFO[item.itemId]
  return (
    <div
      role="group"
      aria-label={copy.toolbar(info?.labelPt ?? item.itemId)}
      className="sz-cos-room-tools"
    >
      {item.on ? (
        <button type="button" onClick={selection.onBringDown} className="sz-cos-tool">
          <ArrowDownToLine aria-hidden="true" />
          {copy.bringDown}
        </button>
      ) : (
        <>
          {info?.stackable && surfacesAvailable ? (
            <button
              type="button"
              onClick={selection.onToggleStackPicker}
              aria-expanded={selection.stackPicker}
              className="sz-cos-tool"
            >
              <ArrowUpToLine aria-hidden="true" />
              {copy.stackOn}
            </button>
          ) : null}
          {info?.mount !== 'wall' ? (
            <button type="button" onClick={selection.onRotateSelected} className="sz-cos-tool">
              <RotateCw aria-hidden="true" />
              {copy.rotate}
            </button>
          ) : null}
        </>
      )}
      <button
        type="button"
        onClick={selection.onRemoveSelected}
        className="sz-cos-tool"
        data-tone="danger"
      >
        <Trash2 aria-hidden="true" />
        {copy.remove}
      </button>
    </div>
  )
}

function Tray({
  data,
  draft,
  catalog,
  trophyHints,
}: {
  data: RoomEditorView
  draft: RoomStateView
  catalog: RoomBuilderCatalog
  trophyHints?: Readonly<Record<string, string>>
}) {
  const { tab, busy, confirmBuyId } = catalog
  const appearance = resolveRoomAppearance(draft)
  const shopItems = shopItemsForTab(data, tab)
  if (shopItems) {
    return (
      <AdultShopGrid
        items={shopItems}
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
      <AdultTrophyTray
        trophies={data.items.filter((item) => item.tier === 'trophy')}
        owned={catalog.isOwned}
        onPick={catalog.onPickItem}
        hints={trophyHints}
      />
    )
  }
  if (tab === 'piso') {
    return (
      <AdultChoiceGrid
        choices={data.floors}
        activeId={appearance.floorId}
        busy={busy}
        confirmingId={confirmBuyId}
        onApply={catalog.onApplyFloor}
        onBuy={catalog.onBuy}
        label={(id) => floorInfo(id).labelPt}
        swatch={(id) => ({ background: floorInfo(id).color, borderColor: floorInfo(id).color2 })}
      />
    )
  }
  if (tab === 'clima') {
    return (
      <AdultChoiceGrid
        choices={data.lightings}
        activeId={appearance.lightingId}
        busy={busy}
        confirmingId={confirmBuyId}
        onApply={catalog.onApplyLighting}
        onBuy={catalog.onBuy}
        label={(id) => lightingPreset(id).labelPt}
        swatch={(id) => ({ background: lightingPreset(id).background })}
      />
    )
  }
  if (tab === 'tema') {
    return (
      <AdultChoiceGrid
        choices={data.themes}
        activeId={draft.theme}
        busy={busy}
        confirmingId={confirmBuyId}
        onApply={catalog.onApplyTheme}
        onBuy={catalog.onBuy}
        label={(id) => ROOM_THEME_INFO[id]?.labelPt ?? id}
        swatch={(id) => ({ background: ROOM_THEME_INFO[id]?.bg ?? '#eeeeee' })}
      />
    )
  }
  if (tab === 'parede') return <AdultWallTray brush={catalog.brush} onPick={catalog.onPickBrush} />
  return (
    <AdultPetTray
      pets={data.items.filter((item) => item.category === 'pet')}
      current={draft.pet}
      busy={busy}
      confirmingId={confirmBuyId}
      onPick={catalog.onPickPet}
      onBuy={catalog.onBuy}
    />
  )
}
