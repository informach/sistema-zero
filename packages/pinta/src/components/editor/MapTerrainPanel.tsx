import { type JSX, useEffect, useId, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { newId } from '../../core/id'
import type { AnyTilesetAsset, TileTerrain } from '../../core/project'
import { setTilesetTerrain } from '../../tiles/terrain'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useEditorStores } from './editorContext'
import { CommitInput } from './MapObjectPanel'
import { MAP_EDITOR_LIMITS } from './mapTools/mapEditorLimits'
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
const ALL_PARTS = { animation: true, terrain: true, scatter: true }
const DEFAULT_TERRAIN_COLOR = '#62b447'
const FIELD = 'min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm'
export function MapTerrainPanel({
  tileset,
  tile,
  settings,
  onChange,
  show = ALL_PARTS,
}: {
  tileset: AnyTilesetAsset
  tile: number
  settings: MapBrushSettings
  onChange: (value: MapBrushSettings) => void
  /** Quais partes aparecem (o nível das ferramentas esconde as mais difíceis). */
  show?: { animation: boolean; terrain: boolean; scatter: boolean }
}): JSX.Element {
  const fieldId = useId()
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
      {show.animation ? <TileAnimationPanel tileset={tileset} tile={tile} /> : null}
      {show.terrain ? (
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
                colors: [DEFAULT_TERRAIN_COLOR],
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
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
                {COPY.scene.prepararAsPecasDoTerreno}
              </summary>
              <label htmlFor={`${fieldId}-name`} className="text-xs">
                {COPY.scene.nome}
                <CommitInput
                  id={`${fieldId}-name`}
                  value={terrain.name}
                  maxLength={30}
                  onCommit={(text) => {
                    const name = text.trim()
                    if (name && name !== terrain.name) save({ ...terrain, name })
                  }}
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
              <label htmlFor={`${fieldId}-color`} className="text-xs">
                {COPY.scene.corDoTerreno}
                <TerrainColorInput
                  id={`${fieldId}-color`}
                  value={terrain.colors[settings.color - 1] ?? DEFAULT_TERRAIN_COLOR}
                  onCommit={(color) =>
                    save({
                      ...terrain,
                      colors: terrain.colors.map((c, i) => (i === settings.color - 1 ? color : c)),
                    })
                  }
                />
              </label>
              <Button
                variant="barOutline"
                className="w-full"
                disabled={terrain.colors.length >= MAP_EDITOR_LIMITS.maxTerrainColors}
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
      ) : null}
      {show.scatter || settings.scatter ? (
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
                {COPY.scene.densidadeDe(Math.round(settings.density * 100))}
                <input
                  className="pin-range"
                  type="range"
                  min="1"
                  max="100"
                  value={settings.density * 100}
                  onChange={(e) => update({ density: Number(e.target.value) / 100 })}
                />
              </label>
              <label htmlFor={`${fieldId}-tiles`} className="text-xs">
                {COPY.scene.pecasSeparePorVirgula}
                {/* Rascunho de texto: a vírgula digitada fica no campo até sair dele ou dar Enter. */}
                <CommitInput
                  id={`${fieldId}-tiles`}
                  value={settings.tiles.join(',')}
                  placeholder={String(tile)}
                  aria-label={COPY.scene.pecasSeparePorVirgula}
                  onCommit={(text) =>
                    update({
                      tiles: text
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
      ) : null}
    </>
  )
}

/**
 * A cor do terreno: o seletor avisa a cada movimento do dedo, então a cor fica num rascunho e
 * só é gravada quando o seletor fecha ou perde o foco (um desfazer por escolha).
 */
function TerrainColorInput({
  id,
  value,
  onCommit,
}: {
  id: string
  value: string
  onCommit: (color: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const latest = useRef({ draft: value, value, onCommit })
  latest.current = { draft, value, onCommit }
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    const input = ref.current
    if (!input) return
    const commit = (): void => {
      const now = latest.current
      if (now.draft !== now.value) now.onCommit(now.draft)
    }
    // O `change` de verdade do navegador só chega quando o seletor fecha.
    input.addEventListener('change', commit)
    input.addEventListener('blur', commit)
    return () => {
      input.removeEventListener('change', commit)
      input.removeEventListener('blur', commit)
    }
  }, [])
  return (
    <input
      ref={ref}
      id={id}
      type="color"
      aria-label={COPY.scene.corDoTerreno}
      className="min-h-11 w-full"
      value={draft}
      onInput={(e) => {
        latest.current.draft = e.currentTarget.value
        setDraft(e.currentTarget.value)
      }}
      onChange={() => {}}
    />
  )
}
