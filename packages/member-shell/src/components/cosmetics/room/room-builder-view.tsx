'use client'

import { aparenciaDoItem } from '@sistemazero/arquipelago-contracts'
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
import { cn } from '../../../lib/cn'
import {
  floorInfo,
  lightingPreset,
  ROOM_ITEM_INFO,
  ROOM_THEME_INFO,
  resolveRoomAppearance,
} from '../../../lib/room-catalog'
import type { RoomEditorView, RoomStateView } from '../../../lib/types'
import { KidsMascot, ZappyCoin } from '../presentation'
import {
  CATEGORY_BY_TAB,
  PLACEABLE,
  type RoomBuilderCatalog,
  type RoomBuilderTab,
  type RoomBuilderViewProps,
  resolvePendingBuy,
} from './room-builder-model'
import { ChoiceGrid, PetTray, ShopGrid, TrophyTray, WallTray } from './room-builder-trays'
import { RoomCanvas } from './room-canvas'

export type { RoomBuilderTab, RoomLoadState } from './room-builder-model'

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

/** Ao lado do painel, a moldura do quarto (e os seus substitutos) enche a altura em vez do 3:2. */
const QUARTO_ENCHE = '@min-[45rem]/quarto:aspect-auto @min-[45rem]/quarto:h-full'

/**
 * Superfície visual do editor (a do Kids); regras de colocação, compra e persistência ficam no
 * orquestrador. A tela adulta é `room-builder-view-adult.tsx` e chega pelo `room-builder-adult.tsx`.
 */
export function RoomBuilderView(props: RoomBuilderViewProps) {
  const { scene, selection, wallet, catalog, header } = props
  const { avatarPhotoUrl, data, loadState, draft, paintColor } = scene
  const { selected, stackPicker, surfaces } = selection
  const { coinsUnlimited, balance, saving } = wallet
  const { tab, confirmBuyId, busy } = catalog
  const pendingBuy = resolvePendingBuy(data, confirmBuyId)

  return (
    // Proposta "painel ao lado" (26/10/2026): com a área do editor a partir de 45rem (720px), o
    // quarto e as peças ficam à esquerda e as abas com os itens à direita, com a mesma altura:
    // escolher um item e ver o quarto mudar acontecem na mesma tela, e só os itens rolam. Abaixo
    // disso, tudo empilha como antes. A régua mede o CONTÊINER (o menu do Kids pode ser recolhido).
    <div className="@container/quarto">
      {/* Ao lado, como o AVATAR (27/10/2026, pedido dela): o editor ocupa a largura toda e a altura
          da janela (os 2rem são o respiro da `QUARTO_FAIXA` da página, em cima e embaixo), o quarto
          enche o espaço que sobra à esquerda e só o painel dos itens tem largura fixa. Encolhe
          quando o menu da esquerda abre. A altura vale só a partir do `md`, onde não há a barra do
          topo nem a de abas; o piso de 30rem faz a página rolar numa janela baixa demais, em vez
          de espremer o quarto. */}
      <div className="flex flex-col gap-4 md:@min-[45rem]/quarto:h-[max(30rem,calc(100dvh-2rem))]">
        {/* A barra de cima é UMA linha, como a do avatar (27/10/2026, pedido dela): a seta e o
            título que a página manda (`header`), as moedas e o Salvar. Antes o cabeçalho da página
            tinha faixa própria (seta, selo, título grande e subtítulo, 291px) e o quarto ficava
            com o que sobrava, com rolagem. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {header}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
              <ZappyCoin className="size-4" /> {coinsUnlimited ? '∞' : balance}
            </span>
          </div>
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

        <div className="flex flex-col gap-4 @min-[45rem]/quarto:grid @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:grid-cols-[minmax(0,1fr)_21.25rem] @min-[45rem]/quarto:grid-rows-[minmax(0,1fr)] @min-[62.5rem]/quarto:grid-cols-[minmax(0,1fr)_26.25rem]">
          {/* Empilhado (celular), esta coluna some da árvore de caixas (`contents`): o quarto vira
            filho do bloco inteiro e pode grudar no alto enquanto a criança desce até os itens. */}
          <div className="contents @min-[45rem]/quarto:flex @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:min-w-0 @min-[45rem]/quarto:flex-col @min-[45rem]/quarto:gap-4">
            {/* O quarto: no celular gruda abaixo da barra do topo (h-14; a partir do `md` não há
              barra), para a criança ver onde o item foi parar sem subir a tela. Ao lado do painel,
              ele cresce até o que sobra da coluna (`flex-1`), com piso de 16rem, e a moldura troca
              o 3:2 pela altura dele (`QUARTO_ENCHE`): a câmera encaixa o quarto em qualquer
              formato. */}
            <div className="sticky top-16 z-20 w-full rounded-2xl shadow-md md:top-3 @min-[45rem]/quarto:relative @min-[45rem]/quarto:top-auto @min-[45rem]/quarto:min-h-[16rem] @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:shadow-none">
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
                  className={QUARTO_ENCHE}
                />
              ) : loadState === 'error' ? (
                <div
                  className={cn(
                    'grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted p-6 text-center',
                    QUARTO_ENCHE,
                  )}
                >
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
                <div
                  className={cn(
                    'grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted',
                    QUARTO_ENCHE,
                  )}
                >
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
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5 @min-[45rem]/quarto:shrink-0"
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
                // Ao lado do painel, duas linhas no máximo e o resto rola: com muitas peças a tira
                // tomaria a altura do quarto.
                className="flex flex-wrap gap-1.5 @min-[45rem]/quarto:max-h-[6.5rem] @min-[45rem]/quarto:shrink-0 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-0.5"
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
          </div>

          {/* Painel dos itens: embaixo no celular; ao lado, a altura da coluna do quarto (com um
            piso), e só a bandeja rola. */}
          <div className="relative @min-[45rem]/quarto:min-h-[24rem]">
            <section
              aria-label="Itens do quarto"
              className="flex flex-col gap-3 @min-[45rem]/quarto:absolute @min-[45rem]/quarto:inset-0 @min-[45rem]/quarto:rounded-3xl @min-[45rem]/quarto:border-2 @min-[45rem]/quarto:border-border @min-[45rem]/quarto:bg-card @min-[45rem]/quarto:p-4"
            >
              <div className="grid grid-cols-5 gap-1.5">
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
                        'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 font-semibold text-xs transition-colors',
                        active ? 'border-primary bg-primary/10' : 'border-border',
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="max-w-full truncate">{item.label}</span>
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
                    Esta peça pode ser sua.{' '}
                    <span className="text-muted-foreground">({pendingBuy.label})</span>
                    {aparenciaDoItem(pendingBuy.id) ? (
                      <small className="block font-normal">
                        A posse também vale no Arquipélago, quando você construir esse objeto.
                      </small>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={catalog.onCancelBuy}
                      disabled={Boolean(busy)}
                      className="sz-btn-gradient sz-btn-contorno h-11 px-4 text-sm"
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

              {data ? (
                <div className="@container/bandeja @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-1 scrollbar-subtle">
                  <RoomBuilderTray data={data} draft={draft} catalog={catalog} />
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
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
