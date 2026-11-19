import type { JSX, ReactNode } from 'react'
import { Fragment, useEffect, useMemo } from 'react'
import { COPY } from '../../core/copy'
import type { AnyTilesetAsset, TilemapAsset } from '../../core/project'
import { filterTools, toolFallback } from '../../core/toolCuration'
import type { MapObjectToolId } from '../../state/sessionStore'
import type { TileStamp } from '../../tiles/stamp'
import { ToolButton } from '../ui/Button'
import {
  BoxSelect,
  BrickWall,
  Brush,
  Circle,
  Eraser,
  Hand,
  type LucideIcon,
  Magnet,
  MapPin,
  Maximize,
  MousePointer2,
  PaintBucket,
  Pencil,
  Pipette,
  Shapes,
  Slash,
  Square,
  SquareDashed,
} from '../ui/icons'
import { PanelLook } from '../ui/Panel'
import { useToolCuration } from './editorContext'
import { MapLayerPanel } from './MapLayerPanel'
import {
  ALL_MAP_FEATURES,
  isToolInLevel,
  type MapFeatures,
  type MapLevel,
} from './mapTools/mapLevels'
import { TilePicker } from './TilePicker'
import { TileTransformPanel } from './TileTransformPanel'

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
  {
    id: 'object-ellipse',
    icon: Circle,
    label: COPY.tiles.objectShapes.ellipse,
    shortcut: 'C',
    modes: ['objects'],
  },
  {
    id: 'object-polygon',
    icon: Shapes,
    label: COPY.tiles.objectShapes.polygon,
    shortcut: 'N',
    modes: ['objects'],
  },
  {
    id: 'object-polyline',
    icon: Slash,
    label: COPY.tiles.objectShapes.polyline,
    shortcut: 'J',
    modes: ['objects'],
  },
  { id: 'pan', icon: Hand, label: COPY.vector.pan, shortcut: 'H', modes: ['tiles', 'objects'] },
  {
    id: 'object-scatter',
    icon: Brush,
    label: COPY.scene.scatterObjects,
    shortcut: 'S',
    modes: ['objects'],
  },
]

/** As ferramentas de um tipo de camada (na ordem da caixa). */
export function mapToolsFor(mode: MapToolMode): typeof MAP_TOOLS {
  return MAP_TOOLS.filter((entry) => entry.modes.includes(mode))
}

interface TilemapToolbarProps {
  orientation?: 'horizontal' | 'vertical'
  /** O nível das ferramentas (soma com a curadoria da aula, nunca a alarga). */
  level?: MapLevel
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
  orientation = 'vertical',
  level = 'advanced',
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
  const modeTools = useMemo(
    () => mapToolsFor(mode).filter((t) => isToolInLevel(level, t.id)),
    [mode, level],
  )

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
    ].filter((entry) => isToolInLevel(level, entry.id)),
    allowTools,
  ).map((entry) => <Fragment key={entry.id}>{entry.node}</Fragment>)

  // A coluna branca da tela-modelo (11/09/2026): quadrados claros de 40px (44 no toque), o ativo
  // azul chapado e um fio entre os dois grupos.
  return (
    <div
      className={`pin-col pin-col--start flex min-h-0 shrink-0 ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}`}
    >
      <div
        role="toolbar"
        aria-label={COPY.a11y.tools}
        aria-orientation={orientation}
        // `flex-1` e não `shrink-0`: dentro da coluna, o `shrink-0` travava a altura no conteúdo
        // e o `overflow-y-auto` nunca rolava (as últimas ferramentas ficavam atrás da barra).
        className={`flex min-h-0 min-w-0 flex-1 items-center gap-2 p-2 ${orientation === 'horizontal' ? 'flex-row overflow-x-auto' : 'pin-scroll-y flex-col overflow-y-auto'}`}
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

export interface TilemapSidebarProps {
  compact?: boolean
  /** O que o nível das ferramentas deixa aparecer (sem isto, tudo). */
  features?: MapFeatures
  extras?: ReactNode
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
  compact = false,
  features = ALL_MAP_FEATURES,
  extras,
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
  return (
    // A coluna branca dos painéis (seções sem moldura), como a do pixel e a do vetor.
    <div
      className={`pin-col pin-col--end pin-scroll-y flex min-h-0 shrink-0 flex-col overflow-y-auto ${compact ? 'max-h-[35dvh] w-full' : 'w-56'}`}
    >
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
        {tileset && features.transform ? (
          <TileTransformPanel stamp={stamp} tile={selectedTile} onChange={onSetStamp} />
        ) : null}

        <MapLayerPanel
          features={features}
          tilemap={tilemap}
          layerTilesetChoices={layerTilesetChoices}
          activeLayerId={activeLayerId}
          onSelectLayer={onSelectLayer}
          onToggleFront={onToggleFront}
          onToggleVisible={onToggleVisible}
          onRemoveLayer={onRemoveLayer}
          onAddLayer={onAddLayer}
          onAddObjectLayer={onAddObjectLayer}
          onSetLayerTileset={onSetLayerTileset}
        />
        {extras}
      </PanelLook>
    </div>
  )
}
