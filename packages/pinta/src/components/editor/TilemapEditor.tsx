/**
 * Editor de MAPA: a caixa de ferramentas, o palco, a coluna de peças e camadas e a faixa de
 * baixo. Este arquivo só MONTA a tela. Quem faz o trabalho:
 *
 * - `mapTools/useMapModel`: o mapa aberto e as peças dele;
 * - `mapTools/useTilemapController`: o estado da tela, as gravações e qual gesto cada
 *   ferramenta usa (`tileGestures`, `selectionController`, `mapBrush`);
 * - `mapTools/useMapKeyboard` (atalhos), `useMapAnimation` (peças animadas), `mapCanvas`
 *   (a pintura) e `MapStage` (o palco).
 */
import type { JSX, ReactNode } from 'react'
import { COPY } from '../../core/copy'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { MapLibraryPanel } from './MapLibraryPanel'
import { MapMinimapPanel } from './MapMinimapPanel'
import { MapObjectPanel } from './MapObjectPanel'
import { MapObjectScatterPanel } from './MapObjectScatterPanel'
import { MapObjectSelectionPanel } from './MapObjectSelectionPanel'
import { MapPlaytestDialog } from './MapPlaytestDialog'
import { MapStage } from './MapStage'
import { MapStatusBar } from './MapStatusBar'
import { MapTerrainPanel } from './MapTerrainPanel'
import { isMapLevel, MAP_LEVELS, type MapLevel } from './mapTools/mapLevels'
import { useMapModel } from './mapTools/useMapModel'
import { type ReadyMapModel, useTilemapController } from './mapTools/useTilemapController'
import { RegionMapWorkspace, type RegionMapWorkspaceProps } from './RegionMapWorkspace'
import { TilemapSidebar, TilemapToolbar } from './TilemapPanels'
import { useMediaQuery } from './useMediaQuery'
import { ZoomControls } from './ZoomControls'

const LEVEL_LABEL: Record<MapLevel, string> = {
  start: COPY.scene.comecar,
  create: COPY.scene.criarMais,
  advanced: COPY.scene.avancado,
}

export function TilemapEditor({
  setEditor = false,
  regional,
}: {
  setEditor?: boolean
  regional?: RegionMapWorkspaceProps
} = {}): JSX.Element | null {
  if (regional) return <RegionMapWorkspace {...regional} />
  return <DenseTilemapEditor setEditor={setEditor} />
}

function DenseTilemapEditor({ setEditor }: { setEditor: boolean }): JSX.Element | null {
  const model = useMapModel()
  if (!model.tilemap || model.tilemap.layers.length === 0) return null
  if (!model.baseTileset) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-base text-pin-muted">
        {COPY.tiles.missingTileset}
      </div>
    )
  }
  return <TilemapWorkspace model={model as ReadyMapModel} setEditor={setEditor} />
}

function TilemapWorkspace({
  model,
  setEditor,
}: {
  model: ReadyMapModel
  setEditor: boolean
}): JSX.Element {
  const { tilemap, mapTilesets, galleryAssets, layerTilesetChoices } = model
  const wide = useMediaQuery('(min-width: 768px)')
  const c = useTilemapController(model)
  const { features, tileset, activeObjectLayer } = c

  const levelPanel = (
    <Panel title={COPY.scene.criarDoMeuJeito}>
      <select
        aria-label={COPY.scene.nivelDasFerramentas}
        className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm"
        value={c.level}
        onChange={(e) => {
          if (isMapLevel(e.target.value)) c.setLevel(e.target.value)
        }}
      >
        {MAP_LEVELS.map((level) => (
          <option key={level} value={level}>
            {LEVEL_LABEL[level]}
          </option>
        ))}
      </select>
      {c.level === 'advanced' || tilemap.physics === 'precise' || c.physicsRequiredByObjects ? (
        <label
          className="mt-2 flex min-h-11 items-center gap-2 text-sm text-pin-text"
          title={
            c.physicsRequiredByObjects
              ? COPY.tiles.precisePhysicsRequired
              : COPY.tiles.precisePhysicsHelp
          }
        >
          <input
            type="checkbox"
            className="size-5 accent-pin-accent"
            checked={tilemap.physics === 'precise' || c.physicsRequiredByObjects}
            disabled={c.physicsRequiredByObjects}
            onChange={(event) => c.setPrecisePhysics(event.target.checked)}
          />
          {COPY.tiles.precisePhysics}
        </label>
      ) : null}
      {features.playtest ? (
        <Button variant="barOutline" className="mt-2 w-full" onClick={() => c.setPlaytest(true)}>
          {COPY.scene.testarComPersonagem}
        </Button>
      ) : null}
    </Panel>
  )

  const objectPanel = activeObjectLayer ? (
    <>
      {c.tool === 'object-scatter' ? (
        <MapObjectScatterPanel
          source={c.objectScatterSource}
          settings={c.objectScatterSettings}
          onChange={c.setObjectScatterSettings}
          message={c.objectScatter.message}
        />
      ) : null}
      <MapObjectPanel
        layer={activeObjectLayer}
        selectedObjectId={c.selectedObjectId}
        onAddMarker={c.canAddMarker ? c.addMarker : undefined}
        detailed={features.objectDetails}
        onSelectObject={c.chooseObject}
        onUpdateObject={c.objects.update}
        onRemoveObject={c.objects.remove}
        onSetProperty={c.objects.setProperty}
        onRemoveProperty={c.objects.removeProperty}
        onAddProperty={c.objects.addProperty}
      />
      {features.objectArrange ? (
        <MapObjectSelectionPanel
          layerId={activeObjectLayer.id}
          ids={c.selectedObjectIds}
          onSelect={c.chooseObjects}
          position={c.placementPoint}
          snapObjects={c.snapObjects}
        />
      ) : null}
      {features.library ? (
        <MapLibraryPanel
          layerId={activeObjectLayer.id}
          selectedId={c.selectedObjectId}
          allowSets={!setEditor && features.sets}
          placement={c.libraryPlacement}
        />
      ) : null}
    </>
  ) : tileset ? (
    features.terrain || features.scatter || features.animation ? (
      <MapTerrainPanel
        tileset={tileset}
        tile={c.selectedTile}
        settings={c.mapBrush}
        onChange={c.setMapBrush}
        show={{
          animation: features.animation,
          terrain: features.terrain,
          scatter: features.scatter,
        }}
      />
    ) : null
  ) : c.activeTileLayer ? (
    // Camada de peças cujas peças sumiram da galeria: diz, em vez de um vazio.
    <p className="p-3 text-sm text-pin-muted">{COPY.tiles.missingTileset}</p>
  ) : null

  return (
    // A área da tela-modelo (11/09/2026): a coluna branca das ferramentas, o palco claro, a
    // coluna branca das peças e camadas, e a faixa azul com as medidas do mapa e o zoom.
    <div className="pin-work flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-stretch md:flex-row">
        <TilemapToolbar
          orientation={wide ? 'vertical' : 'horizontal'}
          tool={c.tool}
          level={c.level}
          mode={c.toolMode}
          autoExpand={c.autoExpand}
          showCollision={c.showCollision}
          snapObjects={c.snapObjects}
          onSelectTool={c.selectTool}
          onToggleAutoExpand={c.toggleAutoExpand}
          onToggleCollision={c.toggleCollision}
          onToggleSnapObjects={c.toggleSnapObjects}
        />
        <MapStage tilemap={tilemap} controller={c} />
        <MapPanels wide={wide}>
          <TilemapSidebar
            compact={!wide}
            tilemap={tilemap}
            features={features}
            extras={
              <>
                {levelPanel}
                {features.minimap ? (
                  <MapMinimapPanel
                    map={tilemap}
                    tilesets={mapTilesets}
                    onJump={c.jumpTo}
                    stageRef={c.stageRef}
                    cellPx={c.cellPx}
                    pad={c.pad}
                  />
                ) : null}
              </>
            }
            tileset={tileset}
            layerTilesetChoices={layerTilesetChoices}
            selectedTile={c.selectedTile}
            stamp={c.stamp}
            activeLayerId={c.layerId}
            objectPanel={objectPanel}
            onSelectTile={c.selectTile}
            onSetStamp={c.selectStamp}
            onSelectLayer={c.setActiveLayerId}
            onToggleFront={c.layers.toggleFront}
            onToggleVisible={c.layers.toggleVisible}
            onRemoveLayer={c.layers.remove}
            onAddLayer={c.layers.add}
            onAddObjectLayer={c.layers.addObjects}
            onSetLayerTileset={c.layers.setTileset}
          />
        </MapPanels>
      </div>
      {c.playtest ? (
        <MapPlaytestDialog
          map={tilemap}
          assets={galleryAssets}
          onClose={() => c.setPlaytest(false)}
        />
      ) : null}
      <div className="pin-band flex shrink-0 items-center justify-between gap-2 px-4 py-2">
        <MapStatusBar cols={tilemap.cols} rows={tilemap.rows} register={c.registerHover} />
        <ZoomControls />
      </div>
    </div>
  )
}

/** No desktop a coluna precisa ser filha direta do flex, sem a caixa nativa de details. */
function MapPanels({ wide, children }: { wide: boolean; children: ReactNode }): JSX.Element {
  if (wide) return <>{children}</>
  return (
    <details className="shrink-0 border-t border-pin-border bg-pin-surface">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 py-2 text-sm font-bold">
        {COPY.scene.mapPanels}
      </summary>
      {children}
    </details>
  )
}
