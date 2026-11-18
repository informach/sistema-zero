import { type JSX, useId, useRef } from 'react'
import { COPY } from '../../core/copy'
import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  layerAncestors,
  type TilemapAsset,
  type TilemapLayer,
  tileLayerTilesetId,
} from '../../core/project'
import {
  addMapGroup,
  moveMapLayer,
  setMapLayerParent,
  toggleMapLayerCollision,
  updateMapLayer,
} from '../../tiles/layerTree'
import { Button, IconButton } from '../ui/Button'
import {
  BringToFront,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Group,
  Lock,
  LockOpen,
  Plus,
  Shapes,
  Trash2,
} from '../ui/icons'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { useEditorStores } from './editorContext'
import { CommitInput } from './MapObjectPanel'
import { MapProperties } from './MapProperties'
import { commitIfChanged } from './mapTools/commitGuard'
import { ALL_MAP_FEATURES, type MapFeatures } from './mapTools/mapLevels'
import type { TilemapSidebarProps } from './TilemapPanels'

export function MapLayerPanel({
  features = ALL_MAP_FEATURES,
  tilemap,
  layerTilesetChoices,
  activeLayerId,
  onSelectLayer,
  onToggleFront,
  onToggleVisible,
  onRemoveLayer,
  onAddLayer,
  onAddObjectLayer,
  onSetLayerTileset,
}: Pick<
  TilemapSidebarProps,
  | 'tilemap'
  | 'layerTilesetChoices'
  | 'activeLayerId'
  | 'onSelectLayer'
  | 'onToggleFront'
  | 'onToggleVisible'
  | 'onRemoveLayer'
  | 'onAddLayer'
  | 'onAddObjectLayer'
  | 'onSetLayerTileset'
> & { features?: MapFeatures }): JSX.Element {
  const { editor } = useEditorStores()
  const tileLayerCount = tilemap.layers.filter(isTileLayer).length
  const commit = (edit: (map: TilemapAsset) => TilemapAsset): void => {
    const state = editor.getState()
    if (state.asset.kind === 'tilemap') commitIfChanged(state, edit(state.asset))
  }
  return (
    <Panel title={COPY.tiles.layers}>
      <div className="flex flex-col gap-1">
        {tilemap.layers.map((layer) => {
          const active = layer.id === activeLayerId
          const objects = isObjectLayer(layer)
          // A última camada de PEÇAS não sai: o mapa precisa de onde pintar.
          const removable =
            !effectiveLayer(tilemap, layer).locked &&
            tilemap.layers.length > 1 &&
            (!isTileLayer(layer) || tileLayerCount > 1)
          const layerTilesetId = isTileLayer(layer) ? tileLayerTilesetId(tilemap, layer) : null
          const showTilesetChoice =
            features.layerOrder &&
            active &&
            layerTilesetId !== null &&
            (layerTilesetChoices.length > 1 ||
              !layerTilesetChoices.some((t) => t.id === layerTilesetId))
          return (
            <div
              key={layer.id}
              className="flex flex-col gap-1"
              style={{ marginInlineStart: layerAncestors(tilemap, layer).length * 8 }}
            >
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
                  {layer.kind === 'group' ? (
                    <Group aria-hidden="true" className="size-4 shrink-0" />
                  ) : null}
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
                {!isTileLayer(layer) ? null : (
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
                  aria-label={COPY.tiles.showOrHide(layer.name)}
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
              {active ? (
                <MapLayerDetails tilemap={tilemap} layer={layer} features={features} />
              ) : null}
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
      {features.layerAdvanced ? (
        <Button
          variant="barOutline"
          className="mt-2 w-full"
          onClick={() => commit((map) => addMapGroup(map, COPY.tiles.group))}
        >
          <Group aria-hidden="true" />
          {COPY.tiles.addGroup}
        </Button>
      ) : null}
    </Panel>
  )
}
const FIELD =
  'min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm text-pin-text'
function MapLayerDetails({
  tilemap,
  layer,
  features,
}: {
  tilemap: TilemapAsset
  layer: TilemapLayer
  features: MapFeatures
}): JSX.Element {
  const fieldId = useId()
  const { editor } = useEditorStores()
  const { showToast } = useToast()
  const opacityBase = useRef<TilemapAsset | null>(null)
  const beginOpacity = (): void => {
    const a = editor.getState().asset
    if (a.kind === 'tilemap' && !opacityBase.current) opacityBase.current = a
  }
  const endOpacity = (): void => {
    if (opacityBase.current) {
      editor.getState().commitGesture(opacityBase.current)
      opacityBase.current = null
    }
  }
  const commit = (edit: (map: TilemapAsset) => TilemapAsset): boolean => {
    const state = editor.getState()
    return state.asset.kind === 'tilemap' && commitIfChanged(state, edit(state.asset))
  }
  const update = (patch: Parameters<typeof updateMapLayer>[2]): void => {
    commit((m) => updateMapLayer(m, layer.id, patch))
  }
  return (
    <div className="flex flex-col gap-2 px-1 pb-2">
      <label htmlFor={`${fieldId}-name`} className="text-xs font-bold text-pin-muted">
        {COPY.tiles.layerName}
        <CommitInput
          id={`${fieldId}-name`}
          value={layer.name}
          aria-label={`${COPY.tiles.layerName}: ${layer.name}`}
          onCommit={(name) => update({ name })}
        />
      </label>
      {features.layerOrder ? (
        <div className="flex gap-1">
          <IconButton
            aria-label={`${layer.locked ? COPY.tiles.layerUnlock : COPY.tiles.layerLock}: ${layer.name}`}
            aria-pressed={layer.locked === true}
            onClick={() => update({ locked: layer.locked ? undefined : true })}
          >
            {layer.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          </IconButton>
          <IconButton
            aria-label={`${COPY.tiles.layerUp}: ${layer.name}`}
            onClick={() => commit((m) => moveMapLayer(m, layer.id, -1))}
          >
            <ChevronUp aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label={`${COPY.tiles.layerDown}: ${layer.name}`}
            onClick={() => commit((m) => moveMapLayer(m, layer.id, 1))}
          >
            <ChevronDown aria-hidden="true" />
          </IconButton>
        </div>
      ) : null}
      {features.layerCollision && isTileLayer(layer) ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={layer.collision === true}
            onChange={() => {
              if (!commit((m) => toggleMapLayerCollision(m, layer.id)))
                showToast(COPY.layers.lockedWarning)
            }}
          />
          {COPY.tiles.layerCollision}
        </label>
      ) : null}
      {features.layerAdvanced ? (
        <>
          <label className="flex flex-col text-xs font-bold text-pin-muted">
            {COPY.tiles.layerOpacity} ({Math.round((layer.opacity ?? 1) * 100)}%)
            <input
              type="range"
              className="pin-range"
              min="0"
              max="100"
              value={(layer.opacity ?? 1) * 100}
              onPointerDown={beginOpacity}
              onPointerUp={endOpacity}
              onPointerCancel={endOpacity}
              onKeyDown={beginOpacity}
              onKeyUp={endOpacity}
              onBlur={endOpacity}
              onChange={(e) => {
                const s = editor.getState()
                if (s.asset.kind === 'tilemap') {
                  const next = updateMapLayer(s.asset, layer.id, {
                    opacity: Number(e.target.value) / 100,
                  })
                  if (next === s.asset) return
                  if (opacityBase.current) s.replace(next)
                  else s.commit(next)
                }
              }}
            />
          </label>
          <label className="text-xs font-bold text-pin-muted">
            {COPY.tiles.layerParent}
            <select
              className={FIELD}
              value={layer.parentId ?? ''}
              onChange={(e) =>
                commit((m) => setMapLayerParent(m, layer.id, e.target.value || undefined))
              }
            >
              <option value="">{COPY.tiles.layerRoot}</option>
              {tilemap.layers
                .filter(
                  (l) =>
                    l.kind === 'group' &&
                    l.id !== layer.id &&
                    !layerAncestors(tilemap, l).some((g) => g.id === layer.id),
                )
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </label>
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-pin-muted">
              {COPY.scene.deslocamentoEDistancia}
            </summary>
            <div className="grid grid-cols-2 gap-1">
              {(['offsetX', 'offsetY', 'parallaxX', 'parallaxY'] as const).map((key, i) => (
                <label key={key} htmlFor={`${fieldId}-${key}`} className="text-xs text-pin-muted">
                  {
                    [
                      COPY.scene.deslocarX,
                      COPY.scene.deslocarY,
                      COPY.scene.distanciaX,
                      COPY.scene.distanciaY,
                    ][i]
                  }
                  <CommitInput
                    id={`${fieldId}-${key}`}
                    numeric
                    value={String(layer[key] ?? (key.startsWith('parallax') ? 1 : 0))}
                    onCommit={(v) => update({ [key]: Number(v) })}
                  />
                </label>
              ))}
            </div>
          </details>
          <MapProperties
            value={layer.properties}
            onChange={(properties) => update({ properties })}
          />
        </>
      ) : null}
    </div>
  )
}
