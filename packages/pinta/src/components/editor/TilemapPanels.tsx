import type { JSX, ReactNode } from 'react'
import { Fragment, useEffect, useMemo } from 'react'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  isObjectLayer,
  isTileLayer,
  type TilemapAsset,
  tileLayerTilesetId,
} from '../../core/project'
import { filterTools, toolFallback } from '../../core/toolCuration'
import type { MapObjectToolId } from '../../state/sessionStore'
import type { TileStamp } from '../../tiles/stamp'
import { Button, IconButton, ToolButton } from '../ui/Button'
import {
  BoxSelect,
  BrickWall,
  BringToFront,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  type LucideIcon,
  Magnet,
  MapPin,
  Maximize,
  MousePointer2,
  PaintBucket,
  Pencil,
  Pipette,
  Plus,
  Shapes,
  Slash,
  Square,
  SquareDashed,
  Trash2,
} from '../ui/icons'
import { Panel, PanelLook } from '../ui/Panel'
import { useToolCuration } from './editorContext'
import { TilePicker } from './TilePicker'

export type MapTool =
  | 'pencil'
  | 'fill'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'select'
  | 'picker'
  | 'pan'
  | MapObjectToolId

/** Que tipo de camada está ativa: a caixa mostra as ferramentas DELA. */
export type MapToolMode = 'tiles' | 'objects'

export const MAP_TOOLS: Array<{
  id: MapTool
  icon: LucideIcon
  label: string
  shortcut: string
  /** Em que tipo de camada a ferramenta aparece. */
  modes: readonly MapToolMode[]
}> = [
  { id: 'pencil', icon: Pencil, label: COPY.tools.pencil, shortcut: 'P', modes: ['tiles'] },
  { id: 'line', icon: Slash, label: COPY.tools.line, shortcut: 'L', modes: ['tiles'] },
  { id: 'rect', icon: Square, label: COPY.tools.rect, shortcut: 'U', modes: ['tiles'] },
  { id: 'fill', icon: PaintBucket, label: COPY.tools.fill, shortcut: 'G', modes: ['tiles'] },
  { id: 'eraser', icon: Eraser, label: COPY.tools.eraser, shortcut: 'E', modes: ['tiles'] },
  { id: 'select', icon: SquareDashed, label: COPY.tools.select, shortcut: 'M', modes: ['tiles'] },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker, shortcut: 'I', modes: ['tiles'] },
  {
    id: 'object-select',
    icon: MousePointer2,
    label: COPY.tiles.objectSelect,
    shortcut: 'V',
    modes: ['objects'],
  },
  {
    id: 'object-point',
    icon: MapPin,
    label: COPY.tiles.objectPoint,
    shortcut: 'O',
    modes: ['objects'],
  },
  {
    id: 'object-rect',
    icon: BoxSelect,
    label: COPY.tiles.objectRect,
    shortcut: 'R',
    modes: ['objects'],
  },
  { id: 'pan', icon: Hand, label: COPY.vector.pan, shortcut: 'H', modes: ['tiles', 'objects'] },
]

/** As ferramentas de um tipo de camada (na ordem da caixa). */
export function mapToolsFor(mode: MapToolMode): typeof MAP_TOOLS {
  return MAP_TOOLS.filter((entry) => entry.modes.includes(mode))
}

interface TilemapToolbarProps {
  tool: MapTool
  mode: MapToolMode
  autoExpand: boolean
  showCollision: boolean
  snapObjects: boolean
  onSelectTool: (tool: MapTool) => void
  onToggleAutoExpand: () => void
  onToggleCollision: () => void
  onToggleSnapObjects: () => void
}

export function TilemapToolbar({
  tool,
  mode,
  autoExpand,
  showCollision,
  snapObjects,
  onSelectTool,
  onToggleAutoExpand,
  onToggleCollision,
  onToggleSnapObjects,
}: TilemapToolbarProps): JSX.Element {
  const allowTools = useToolCuration()
  const modeTools = useMemo(() => mapToolsFor(mode), [mode])

  // A ativa cortada viraria estado impossível: selecionada e fora da tela. Mesma régua do pixel.
  // E trocar o TIPO da camada ativa troca a caixa: a ferramenta de antes, que não existe na
  // caixa nova, cede o lugar à primeira dela (camada de objetos → "Mexer nos objetos").
  useEffect(() => {
    const curated = toolFallback(tool, modeTools, allowTools)
    if (curated) {
      onSelectTool(curated as MapTool)
      return
    }
    if (!modeTools.some((entry) => entry.id === tool)) {
      const [first] = filterTools(modeTools, allowTools)
      if (first) onSelectTool(first.id)
    }
  }, [tool, modeTools, allowTools, onSelectTool])

  const drawNodes = filterTools(modeTools, allowTools).map((entry) => (
    <ToolButton
      key={entry.id}
      tone="quiet"
      icon={entry.icon}
      label={entry.label}
      shortcut={entry.shortcut}
      active={tool === entry.id}
      onClick={() => onSelectTool(entry.id)}
    />
  ))

  // Nenhum dos três está nos presets: crescer o mapa muda o tamanho da entrega, e ver as
  // colisões e encaixar objetos é assunto de quem monta jogo, não de quem está desenhando a aula.
  const extraNodes = filterTools(
    [
      {
        id: 'autoExpand',
        node: (
          <ToolButton
            tone="quiet"
            icon={Maximize}
            label={COPY.tiles.autoExpand}
            active={autoExpand}
            onClick={onToggleAutoExpand}
          />
        ),
      },
      {
        id: 'showCollision',
        node: (
          <ToolButton
            tone="quiet"
            icon={BrickWall}
            label={COPY.tiles.showCollision}
            active={showCollision}
            onClick={onToggleCollision}
          />
        ),
      },
      ...(mode === 'objects'
        ? [
            {
              id: 'snapObjects',
              node: (
                <ToolButton
                  tone="quiet"
                  icon={Magnet}
                  label={COPY.tiles.objectSnap}
                  active={snapObjects}
                  onClick={onToggleSnapObjects}
                />
              ),
            },
          ]
        : []),
    ],
    allowTools,
  ).map((entry) => <Fragment key={entry.id}>{entry.node}</Fragment>)

  // A coluna branca da tela-modelo (11/09/2026): quadrados claros de 40px (44 no toque), o ativo
  // azul chapado e um fio entre os dois grupos.
  return (
    <div className="pin-col pin-col--start flex min-h-0 shrink-0 flex-col">
      <div
        role="toolbar"
        aria-label={COPY.a11y.tools}
        aria-orientation="vertical"
        // `flex-1` e não `shrink-0`: dentro da coluna, o `shrink-0` travava a altura no conteúdo
        // e o `overflow-y-auto` nunca rolava (as últimas ferramentas ficavam atrás da barra).
        className="pin-scroll-y flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto p-2"
      >
        {drawNodes}
        {/* Divisor só existe entre dois grupos que existem. */}
        {drawNodes.length > 0 && extraNodes.length > 0 ? (
          <hr className="pin-tool-divider pin-tool-divider--short" />
        ) : null}
        {extraNodes}
      </div>
    </div>
  )
}

interface TilemapSidebarProps {
  tilemap: TilemapAsset
  /** As peças da camada de peças ATIVA (`null` com a camada de objetos ativa). */
  tileset: AnyTilesetAsset | null
  /** Tilesets que uma camada pode usar (mesmo estilo e tamanho de peça das do mapa). */
  layerTilesetChoices: readonly AnyTilesetAsset[]
  selectedTile: number
  stamp: TileStamp | null
  activeLayerId: string
  /** O painel dos objetos da camada ativa (só com camada de objetos ativa). */
  objectPanel: ReactNode
  onSelectTile: (index: number) => void
  onSetStamp: (stamp: TileStamp | null) => void
  onSelectLayer: (id: string) => void
  onToggleFront: (id: string) => void
  onToggleVisible: (id: string) => void
  onRemoveLayer: (id: string) => void
  onAddLayer: () => void
  onAddObjectLayer: () => void
  onSetLayerTileset: (layerId: string, tilesetId: string) => void
}

export function TilemapSidebar({
  tilemap,
  tileset,
  layerTilesetChoices,
  selectedTile,
  stamp,
  activeLayerId,
  objectPanel,
  onSelectTile,
  onSetStamp,
  onSelectLayer,
  onToggleFront,
  onToggleVisible,
  onRemoveLayer,
  onAddLayer,
  onAddObjectLayer,
  onSetLayerTileset,
}: TilemapSidebarProps): JSX.Element {
  const tileLayerCount = tilemap.layers.filter(isTileLayer).length
  return (
    // A coluna branca dos painéis (seções sem moldura), como a do pixel e a do vetor.
    <div className="pin-col pin-col--end pin-scroll-y flex min-h-0 w-56 shrink-0 flex-col overflow-y-auto">
      <PanelLook value="flat">
        {tileset ? (
          <TilePicker
            tileset={tileset}
            selectedTile={selectedTile}
            stamp={stamp}
            onSelectTile={onSelectTile}
            onSetStamp={onSetStamp}
          />
        ) : null}
        {objectPanel}

        <Panel title={COPY.tiles.layers}>
          <div className="flex flex-col gap-1">
            {tilemap.layers.map((layer) => {
              const active = layer.id === activeLayerId
              const objects = isObjectLayer(layer)
              // A última camada de PEÇAS não sai: o mapa precisa de onde pintar.
              const removable = tilemap.layers.length > 1 && (objects || tileLayerCount > 1)
              const layerTilesetId = isTileLayer(layer) ? tileLayerTilesetId(tilemap, layer) : null
              const showTilesetChoice =
                active &&
                layerTilesetId !== null &&
                (layerTilesetChoices.length > 1 ||
                  !layerTilesetChoices.some((t) => t.id === layerTilesetId))
              return (
                <div key={layer.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectLayer(layer.id)}
                      // A linha de camada da tela-modelo: a escolhida com a borda azul, as outras lisas.
                      // `flex-wrap`: no painel estreito o selo (frente, objetos) desce para a linha de
                      // baixo em vez de espremer o nome ("Decoração" virava "I", 26/10/2026).
                      className={`flex min-h-11 min-w-0 flex-1 flex-wrap content-center items-center gap-x-1 overflow-hidden rounded-xl border-2 px-3 py-1 text-left text-sm font-bold transition ${
                        active ? 'border-pin-accent' : 'border-transparent hover:bg-pin-bg'
                      }`}
                    >
                      {objects ? <Shapes aria-hidden="true" className="size-4 shrink-0" /> : null}
                      <span className="max-w-full truncate">{layer.name}</span>
                      {layer.front ? (
                        <span className="rounded bg-pin-accent/20 px-1 text-[10px] font-bold text-pin-accent">
                          {COPY.tiles.frontBadge}
                        </span>
                      ) : null}
                      {objects ? (
                        <span className="rounded bg-pin-accent/20 px-1 text-[10px] font-bold text-pin-accent">
                          {COPY.tiles.objectLayerBadge}
                        </span>
                      ) : null}
                    </button>
                    {objects ? null : (
                      <IconButton
                        aria-label={`${COPY.tiles.frontLayer}: ${layer.name}`}
                        aria-pressed={layer.front === true}
                        active={layer.front === true}
                        title={COPY.tiles.frontLayer}
                        onClick={() => onToggleFront(layer.id)}
                      >
                        <BringToFront aria-hidden="true" className="size-5" />
                      </IconButton>
                    )}
                    <IconButton
                      aria-label={`${COPY.tiles.show} ou ${COPY.tiles.hide.toLowerCase()}: ${layer.name}`}
                      aria-pressed={layer.visible}
                      title={layer.visible ? COPY.tiles.hide : COPY.tiles.show}
                      onClick={() => onToggleVisible(layer.id)}
                    >
                      {layer.visible ? (
                        <Eye aria-hidden="true" className="size-5" />
                      ) : (
                        <EyeOff aria-hidden="true" className="size-5" />
                      )}
                    </IconButton>
                    {removable ? (
                      <IconButton
                        aria-label={`${COPY.tiles.removeLayer}: ${layer.name}`}
                        title={COPY.tiles.removeLayer}
                        onClick={() => onRemoveLayer(layer.id)}
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </IconButton>
                    ) : null}
                  </div>
                  {showTilesetChoice && layerTilesetId ? (
                    <label className="flex flex-col gap-1 px-1 text-xs font-bold text-pin-muted">
                      {COPY.tiles.layerTileset}
                      <select
                        aria-label={`${COPY.tiles.layerTileset}: ${layer.name}`}
                        className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm text-pin-text"
                        value={layerTilesetId}
                        onChange={(event) => onSetLayerTileset(layer.id, event.target.value)}
                      >
                        {layerTilesetChoices.some((t) => t.id === layerTilesetId) ? null : (
                          <option value={layerTilesetId} disabled>
                            {COPY.tiles.layerTilesetMissing}
                          </option>
                        )}
                        {layerTilesetChoices.map((choice) => (
                          <option key={choice.id} value={choice.id}>
                            {choice.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              )
            })}
          </div>
          <Button variant="barOutline" className="mt-2 w-full" onClick={onAddLayer}>
            <Plus aria-hidden="true" />
            {COPY.tiles.addLayer}
          </Button>
          <Button variant="barOutline" className="mt-2 w-full" onClick={onAddObjectLayer}>
            <Shapes aria-hidden="true" />
            {COPY.tiles.addObjectLayer}
          </Button>
        </Panel>
      </PanelLook>
    </div>
  )
}
