import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { newId } from '../../core/id'
import type { AnyTilesetAsset, TileTerrain } from '../../core/project'
import { setTilesetTerrain } from '../../tiles/terrain'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useEditorStores } from './editorContext'
import { TileAnimationPanel } from './TileAnimationPanel'
export interface MapBrushSettings {
  terrainId: string
  color: number
  seed: number
  scatter: boolean
  density: number
  tiles: number[]
}
export const DEFAULT_MAP_BRUSH: MapBrushSettings = {
  terrainId: '',
  color: 1,
  seed: 1,
  scatter: false,
  density: 0.3,
  tiles: [],
}
const FIELD = 'min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm'
export function MapTerrainPanel({
  tileset,
  tile,
  settings,
  onChange,
}: {
  tileset: AnyTilesetAsset
  tile: number
  settings: MapBrushSettings
  onChange: (value: MapBrushSettings) => void
}): JSX.Element {
  const { editor } = useEditorStores(),
    terrain = tileset.terrains?.find((t) => t.id === settings.terrainId)
  const update = (patch: Partial<MapBrushSettings>): void => onChange({ ...settings, ...patch })
  function save(t: TileTerrain): void {
    const state = editor.getState()
    const next = setTilesetTerrain(tileset, t)
    if (state.asset.id === tileset.id) state.commit(next)
    else state.commitLinked(state.asset, { before: [tileset], after: [next] })
  }
  return (
    <>
      <TileAnimationPanel tileset={tileset} tile={tile} />
      <Panel title={COPY.scene.terrenoInteligente}>
        <select
          aria-label={COPY.scene.terreno}
          className={FIELD}
          value={settings.terrainId}
          onChange={(e) => update({ terrainId: e.target.value, scatter: false })}
        >
          <option value="">{COPY.scene.pintarPecaPorPeca}</option>
          {tileset.terrains?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Button
          variant="barOutline"
          className="mt-2 w-full"
          onClick={() => {
            const t: TileTerrain = {
              id: newId(),
              name: COPY.scene.dynamicTerreno((tileset.terrains?.length ?? 0) + 1),
              mode: 'corner',
              colors: ['#62b447'],
              tiles: {},
            }
            save(t)
            update({ terrainId: t.id, scatter: false })
          }}
        >
          {COPY.scene.novoTerreno}
        </Button>
        {terrain ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-bold">
              {COPY.scene.prepararAsPecasDoTerreno}
            </summary>
            <label className="text-xs">
              {COPY.scene.nome}
              <input
                className={FIELD}
                value={terrain.name}
                onChange={(e) => save({ ...terrain, name: e.target.value })}
              />
            </label>
            <label className="text-xs">
              {COPY.scene.encaixe}
              <select
                className={FIELD}
                value={terrain.mode}
                onChange={(e) => {
                  const mode = e.target.value
                  if (mode === 'corner' || mode === 'edge' || mode === 'mixed')
                    save({ ...terrain, mode })
                }}
              >
                <option value="corner">{COPY.scene.pelosCantos}</option>
                <option value="edge">{COPY.scene.pelasBordas}</option>
                <option value="mixed">{COPY.scene.cantosEBordas}</option>
              </select>
            </label>
            <p className="my-2 text-xs text-pin-muted">
              {COPY.scene.marqueOndeOTerrenoTocaAPeca}
              {tile}
              {COPY.scene.prepareTambemAsPecasDeBordaE}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {[7, 0, 1, 6, -1, 2, 5, 4, 3].map((slot) =>
                slot < 0 ? (
                  <span key="center" className="flex items-center justify-center text-xs">
                    {tile}
                  </span>
                ) : (
                  <label
                    key={slot}
                    className="flex min-h-11 items-center justify-center rounded-lg bg-pin-bg"
                  >
                    <input
                      type="checkbox"
                      aria-label={COPY.scene.dynamicTerrenoNaPosicaoDaPeca(slot + 1, tile)}
                      checked={(terrain.tiles[String(tile)]?.[slot] ?? 0) > 0}
                      onChange={(e) => {
                        const pattern = [...(terrain.tiles[String(tile)] ?? Array(8).fill(0))]
                        pattern[slot] = e.target.checked ? settings.color : 0
                        save({ ...terrain, tiles: { ...terrain.tiles, [String(tile)]: pattern } })
                      }}
                    />
                  </label>
                ),
              )}
            </div>
            <label className="text-xs">
              {COPY.scene.corDoTerreno}
              <input
                type="color"
                className="min-h-11 w-full"
                value={terrain.colors[settings.color - 1] ?? '#62b447'}
                onChange={(e) =>
                  save({
                    ...terrain,
                    colors: terrain.colors.map((c, i) =>
                      i === settings.color - 1 ? e.target.value : c,
                    ),
                  })
                }
              />
            </label>
            <Button
              variant="barOutline"
              className="w-full"
              disabled={terrain.colors.length >= 15}
              onClick={() => {
                save({ ...terrain, colors: [...terrain.colors, '#aa8844'] })
                update({ color: terrain.colors.length + 1 })
              }}
            >
              {COPY.scene.maisUmTerrenoNesteEncaixe}
            </Button>
            <select
              aria-label={COPY.scene.corParaPintarOTerreno}
              className={FIELD}
              value={settings.color}
              onChange={(e) => update({ color: Number(e.target.value) })}
            >
              {Object.entries(terrain.colors).map(([index, c]) => (
                <option key={index} value={Number(index) + 1}>
                  {COPY.scene.dynamicTerreno2(Number(index) + 1, c)}
                </option>
              ))}
            </select>
          </details>
        ) : null}
      </Panel>
      <Panel title={COPY.scene.espalharPecas}>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.scatter}
            onChange={(e) => update({ scatter: e.target.checked, terrainId: '' })}
          />
          {COPY.scene.espalharComOPincel}
        </label>
        {settings.scatter ? (
          <>
            <label className="text-xs">
              {COPY.scene.densidade}
              {Math.round(settings.density * 100)}%)
              <input
                className="w-full"
                type="range"
                min="1"
                max="100"
                value={settings.density * 100}
                onChange={(e) => update({ density: Number(e.target.value) / 100 })}
              />
            </label>
            <label className="text-xs">
              {COPY.scene.pecasSeparePorVirgula}
              <input
                className={FIELD}
                value={settings.tiles.join(',')}
                placeholder={String(tile)}
                onChange={(e) =>
                  update({
                    tiles: e.target.value
                      .split(',')
                      .filter((v) => v.trim() !== '')
                      .map(Number)
                      .filter((n) => Number.isInteger(n) && n >= 0 && n < tileset.tiles.length),
                  })
                }
              />
            </label>
          </>
        ) : null}
        {terrain || settings.scatter ? (
          <label className="text-xs">
            {COPY.scene.variacao}
            <input
              className={FIELD}
              type="number"
              value={settings.seed}
              onChange={(e) => update({ seed: Number(e.target.value) || 1 })}
            />
          </label>
        ) : null}
      </Panel>
    </>
  )
}
