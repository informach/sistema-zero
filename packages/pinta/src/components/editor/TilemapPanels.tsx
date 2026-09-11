import type { JSX } from 'react'
import { Fragment, useEffect } from 'react'
import { COPY } from '../../core/copy'
import type { AnyTilesetAsset, TilemapAsset } from '../../core/project'
import { filterTools, toolFallback } from '../../core/toolCuration'
import type { TileStamp } from '../../tiles/stamp'
import { Button, IconButton, ToolButton } from '../ui/Button'
import {
  BrickWall,
  BringToFront,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  type LucideIcon,
  Maximize,
  PaintBucket,
  Pencil,
  Pipette,
  Plus,
  Slash,
  Square,
  SquareDashed,
  Trash2,
} from '../ui/icons'
import { Panel, PanelLook } from '../ui/Panel'
import { useToolCuration } from './editorContext'
import { TilePicker } from './TilePicker'

export type MapTool = 'pencil' | 'fill' | 'eraser' | 'line' | 'rect' | 'select' | 'picker' | 'pan'

export const MAP_TOOLS: Array<{
  id: MapTool
  icon: LucideIcon
  label: string
  shortcut: string
}> = [
  { id: 'pencil', icon: Pencil, label: COPY.tools.pencil, shortcut: 'P' },
  { id: 'line', icon: Slash, label: COPY.tools.line, shortcut: 'L' },
  { id: 'rect', icon: Square, label: COPY.tools.rect, shortcut: 'U' },
  { id: 'fill', icon: PaintBucket, label: COPY.tools.fill, shortcut: 'G' },
  { id: 'eraser', icon: Eraser, label: COPY.tools.eraser, shortcut: 'E' },
  { id: 'select', icon: SquareDashed, label: COPY.tools.select, shortcut: 'M' },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker, shortcut: 'I' },
  { id: 'pan', icon: Hand, label: COPY.vector.pan, shortcut: 'H' },
]

interface TilemapToolbarProps {
  tool: MapTool
  autoExpand: boolean
  showCollision: boolean
  onSelectTool: (tool: MapTool) => void
  onToggleAutoExpand: () => void
  onToggleCollision: () => void
}

export function TilemapToolbar({
  tool,
  autoExpand,
  showCollision,
  onSelectTool,
  onToggleAutoExpand,
  onToggleCollision,
}: TilemapToolbarProps): JSX.Element {
  const allowTools = useToolCuration()

  // A ativa cortada viraria estado impossível: selecionada e fora da tela. Mesma régua do pixel.
  useEffect(() => {
    const next = toolFallback(tool, MAP_TOOLS, allowTools)
    if (next) onSelectTool(next as MapTool)
  }, [tool, allowTools, onSelectTool])

  const drawNodes = filterTools(MAP_TOOLS, allowTools).map((entry) => (
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

  // Nenhum dos dois está nos presets: crescer o mapa muda o tamanho da entrega, e ver as colisões
  // é assunto de quem monta jogo, não de quem está desenhando a aula.
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
        className="flex min-h-0 shrink-0 flex-col items-center gap-2 overflow-y-auto p-2"
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
  tileset: AnyTilesetAsset
  selectedTile: number
  stamp: TileStamp | null
  activeLayerId: string
  onSelectTile: (index: number) => void
  onSetStamp: (stamp: TileStamp | null) => void
  onSelectLayer: (id: string) => void
  onToggleFront: (id: string) => void
  onToggleVisible: (id: string) => void
  onRemoveLayer: (id: string) => void
  onAddLayer: () => void
}

export function TilemapSidebar({
  tilemap,
  tileset,
  selectedTile,
  stamp,
  activeLayerId,
  onSelectTile,
  onSetStamp,
  onSelectLayer,
  onToggleFront,
  onToggleVisible,
  onRemoveLayer,
  onAddLayer,
}: TilemapSidebarProps): JSX.Element {
  return (
    // A coluna branca dos painéis (seções sem moldura), como a do pixel e a do vetor.
    <div className="pin-col pin-col--end pin-scroll-y flex min-h-0 w-56 shrink-0 flex-col overflow-y-auto">
      <PanelLook value="flat">
        <TilePicker
          tileset={tileset}
          selectedTile={selectedTile}
          stamp={stamp}
          onSelectTile={onSelectTile}
          onSetStamp={onSetStamp}
        />

        <Panel title={COPY.tiles.layers}>
          <div className="flex flex-col gap-1">
            {tilemap.layers.map((layer) => {
              const active = layer.id === activeLayerId
              return (
                <div key={layer.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectLayer(layer.id)}
                    // A linha de camada da tela-modelo: a escolhida com a borda azul, as outras lisas.
                    className={`min-h-11 flex-1 truncate rounded-xl border-2 px-3 text-left text-sm font-bold transition ${
                      active ? 'border-pin-accent' : 'border-transparent hover:bg-pin-bg'
                    }`}
                  >
                    {layer.name}
                    {layer.front ? (
                      <span className="ml-1 rounded bg-pin-accent/20 px-1 text-[10px] font-bold text-pin-accent">
                        {COPY.tiles.frontBadge}
                      </span>
                    ) : null}
                  </button>
                  <IconButton
                    aria-label={`${COPY.tiles.frontLayer}: ${layer.name}`}
                    aria-pressed={layer.front === true}
                    active={layer.front === true}
                    title={COPY.tiles.frontLayer}
                    onClick={() => onToggleFront(layer.id)}
                  >
                    <BringToFront aria-hidden="true" className="size-5" />
                  </IconButton>
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
                  {tilemap.layers.length > 1 ? (
                    <IconButton
                      aria-label={`${COPY.tiles.removeLayer}: ${layer.name}`}
                      title={COPY.tiles.removeLayer}
                      onClick={() => onRemoveLayer(layer.id)}
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </IconButton>
                  ) : null}
                </div>
              )
            })}
          </div>
          <Button variant="barOutline" className="mt-2 w-full" onClick={onAddLayer}>
            <Plus aria-hidden="true" />
            {COPY.tiles.addLayer}
          </Button>
        </Panel>
      </PanelLook>
    </div>
  )
}
