/**
 * Operações PURAS sobre tilesets (e o efeito delas nos TILEMAPS que os usam).
 * O invariante central: o índice do tile NO ARRAY é o índice que o tilemap
 * guarda nas células E o índice row-major na folha empacotada — remover/mover
 * um tile exige REMAPEAR as células de todos os mapas do tileset
 * (`remapTilemapCells`), senão o mapa aponta pra peça errada.
 *
 * Genéricas sobre o ESTILO do tileset (`AnyTilesetAsset`): pixel cria bitmap
 * vazio e clona bytes, vetor cria lista vazia e clona shapes com ids novos.
 */

import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
  parsePintaRegionBounds,
} from '@sistemazero/core/creations'
import { newId } from '../core/id'
import type {
  AnyTilesetAsset,
  TilemapCells,
  TilemapLayer,
  TilemapObject,
  VectorFrame,
} from '../core/project'
import {
  createBitmap,
  isObjectLayer,
  isTileLayer,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_MAX_SCHEMA,
  type PintaBitmap,
  tileLayerTilesetId,
} from '../core/project'
import { cloneBitmap } from '../pixel/bitmap'
import { cellTile, EMPTY_CELL, isValidCellForTiles, withCellTile } from './cell'
import type { AuthorMap } from './mapCellEdits'
import { mapCellBounds } from './mapCells'

type TileOf<A extends AnyTilesetAsset> = A['tiles'][number]

/**
 * Os metadados por peça (animações, propriedades, terrenos) acompanham a peça quando ela muda de
 * índice. `at` é onde uma peça ENTROU (os índices de `at` em diante sobem 1) ou, com `remove`, a
 * que SAIU (ela some dos metadados e as de cima descem 1).
 *
 * Um mapa que fica vazio SOME (a chave sai do desenho): `animations: {}` faria o conjunto pedir
 * o formato mais novo sem usar nada dele. O terreno continua existindo mesmo sem peça marcada.
 */
export function remapTileMetadata<A extends AnyTilesetAsset>(
  asset: A,
  index: (previous: number) => number,
): A {
  const remap = <T>(values: Record<string, T>, convert: (v: T) => T | null): Record<string, T> =>
    Object.fromEntries(
      Object.entries(values).flatMap(([k, v]) => {
        const next = index(Number(k))
        const converted = next < 0 ? null : convert(v)
        return converted === null ? [] : [[String(next), converted]]
      }),
    )
  const { animations: oldAnimations, tileProperties: oldProperties, ...rest } = asset
  const animations = oldAnimations
    ? remap(oldAnimations, (frames) => {
        // Quadro que apontava para a peça removida sai; animação sem quadro nenhum sai inteira.
        const kept = frames.flatMap((f) =>
          index(f.tile) < 0 ? [] : [{ ...f, tile: index(f.tile) }],
        )
        return kept.length ? kept : null
      })
    : undefined
  const tileProperties = oldProperties ? remap(oldProperties, (v) => v) : undefined
  return {
    ...rest,
    ...(animations && Object.keys(animations).length ? { animations } : {}),
    ...(tileProperties && Object.keys(tileProperties).length ? { tileProperties } : {}),
    ...(asset.terrains
      ? { terrains: asset.terrains.map((t) => ({ ...t, tiles: remap(t.tiles, (v) => v) })) }
      : {}),
  } as A
}

function emptyTileFor<A extends AnyTilesetAsset>(asset: A): TileOf<A> {
  const tile: PintaBitmap | VectorFrame =
    asset.kind === 'tileset' ? createBitmap(asset.tileSize, asset.tileSize) : []
  return tile as TileOf<A>
}

function cloneTileOf<A extends AnyTilesetAsset>(asset: A, tile: TileOf<A>): TileOf<A> {
  const clone: PintaBitmap | VectorFrame =
    asset.kind === 'tileset'
      ? cloneBitmap(tile as PintaBitmap)
      : (tile as VectorFrame).map((shape) => ({ ...shape, id: newId(), motionId: newId() }))
  return clone as TileOf<A>
}

/**
 * A peça está EM BRANCO (nada desenhado nela)? Pintar o mapa com uma peça em
 * branco não mostra nada — a criança acha que o lápis quebrou. Quem chama usa
 * isto para avisar, não para bloquear (o mapa se preenche sozinho quando ela
 * desenhar a peça depois, porque a célula guarda o ÍNDICE).
 */
export function isTileBlank(asset: AnyTilesetAsset, index: number): boolean {
  const tile = asset.tiles[index]
  if (!tile) return true
  if (asset.kind === 'tileset') return (tile as PintaBitmap).data.every((value) => value === 0)
  return (tile as VectorFrame).length === 0
}

/** Novo tile VAZIO após `afterIndex`. No-op na quota. */
export function addTile<A extends AnyTilesetAsset>(asset: A, afterIndex: number): A {
  if (asset.tiles.length >= PINTA_LIMITS.maxTiles) return asset
  const tiles = [...(asset.tiles as TileOf<A>[])]
  const solid = [...asset.solid]
  const platform = [...asset.platform]
  tiles.splice(afterIndex + 1, 0, emptyTileFor(asset))
  solid.splice(afterIndex + 1, 0, false)
  platform.splice(afterIndex + 1, 0, false)
  return {
    ...remapTileMetadata(asset, (slot) => shiftedIndex(slot, { insertedAt: afterIndex + 1 })),
    tiles,
    solid,
    platform,
  }
}

export function duplicateTile<A extends AnyTilesetAsset>(asset: A, index: number): A {
  if (asset.tiles.length >= PINTA_LIMITS.maxTiles) return asset
  const source = asset.tiles[index] as TileOf<A> | undefined
  if (!source) return asset
  const tiles = [...(asset.tiles as TileOf<A>[])]
  const solid = [...asset.solid]
  const platform = [...asset.platform]
  tiles.splice(index + 1, 0, cloneTileOf(asset, source))
  solid.splice(index + 1, 0, asset.solid[index] === true)
  platform.splice(index + 1, 0, asset.platform[index] === true)
  const next = remapTileMetadata(asset, (slot) => shiftedIndex(slot, { insertedAt: index + 1 }))
  if (asset.animations?.[index])
    // A cópia ganha a animação da original, com quadros próprios (editar uma não mexe na outra).
    next.animations = {
      ...next.animations,
      [index + 1]: (next.animations?.[index] ?? []).map((frame) => ({ ...frame })),
    }
  if (asset.tileProperties?.[index])
    next.tileProperties = {
      ...next.tileProperties,
      [index + 1]: structuredClone(asset.tileProperties[index]),
    }
  if (next.terrains)
    next.terrains = next.terrains.map((t, i) => ({
      ...t,
      tiles: {
        ...t.tiles,
        ...(asset.terrains?.[i]?.tiles[index]
          ? { [index + 1]: structuredClone(asset.terrains[i]!.tiles[index]!) }
          : {}),
      },
    }))
  return { ...next, tiles, solid, platform }
}

/** Remove o tile — nunca deixa o tileset vazio (o último não sai). */
export function removeTile<A extends AnyTilesetAsset>(asset: A, index: number): A {
  if (asset.tiles.length <= 1 || !asset.tiles[index]) return asset
  return {
    ...remapTileMetadata(asset, (slot) => shiftedIndex(slot, { removedAt: index })),
    tiles: (asset.tiles as TileOf<A>[]).filter((_, i) => i !== index),
    solid: asset.solid.filter((_, i) => i !== index),
    platform: asset.platform.filter((_, i) => i !== index),
  }
}

/** Estado de colisão de uma peça (derivado dos arrays paralelos, exclusivos). */
export type TileCollision = 'none' | 'solid' | 'platform'

export function tileCollisionAt(asset: AnyTilesetAsset, index: number): TileCollision {
  if (asset.solid[index] === true) return 'solid'
  if (asset.platform[index] === true) return 'platform'
  return 'none'
}

/**
 * Cicla a colisão da peça: livre → sólido → plataforma → livre. Escreve os DOIS
 * arrays de forma EXCLUSIVA (sólido e plataforma nunca ligados juntos).
 */
export function cycleCollision<A extends AnyTilesetAsset>(asset: A, index: number): A {
  if (index < 0 || index >= asset.tiles.length) return asset
  const current = tileCollisionAt(asset, index)
  const next: TileCollision =
    current === 'none' ? 'solid' : current === 'solid' ? 'platform' : 'none'
  return {
    ...asset,
    solid: asset.solid.map((s, i) => (i === index ? next === 'solid' : s)),
    platform: asset.platform.map((p, i) => (i === index ? next === 'platform' : p)),
  }
}

/**
 * O remapeamento de células que acompanha um `addTile`/`removeTile`:
 * - `insertedAt` = o índice que o tile NOVO ocupa: células apontando p/ índices
 *   ≥ insertedAt sobem 1 (continuam na MESMA peça de antes);
 * - `removedAt`: célula com o índice removido vira VAZIA (-1); índices maiores
 *   descem 1.
 * Aplicar em TODOS os tilemaps que usam o tileset (`tilemapUsesTileset`). Com
 * `tilesetId`, só as camadas que usam ESSE tileset são renumeradas — num mapa
 * com várias peças, apagar uma peça de um tileset não pode mexer nas células das
 * camadas de outro. Sem ele, todas as camadas de peças (o comportamento antigo).
 */
export type TileIndexChange = { insertedAt: number } | { removedAt: number }

function shiftedIndex(tile: number, change: TileIndexChange): number {
  if ('insertedAt' in change) return tile >= change.insertedAt ? tile + 1 : tile
  if (tile === change.removedAt) return -1
  return tile > change.removedAt ? tile - 1 : tile
}

export type TilemapRemapFailure = 'invalid-change' | 'invalid-map' | 'tile-budget' | 'cell-budget'
export type TilemapRemapResult<Map extends AuthorMap> =
  | { ok: true; map: Map }
  | { ok: false; reason: TilemapRemapFailure }

/** Compatibility wrapper; compound library edits must inspect the detailed result. */
export function remapTilemapCells<Map extends AuthorMap>(
  tilemap: Map,
  change: TileIndexChange,
  tilesetId?: string,
): Map {
  const result = tryRemapTilemapCells(tilemap, change, tilesetId)
  return result.ok ? result.map : tilemap
}

/** Whole document or refusal. Renumbering visits allocated buffers, never the world extent. */
export function tryRemapTilemapCells<Map extends AuthorMap>(
  tilemap: Map,
  change: TileIndexChange,
  tilesetId?: string,
): TilemapRemapResult<Map> {
  const at = 'insertedAt' in change ? change.insertedAt : change.removedAt
  if (!Number.isSafeInteger(at) || at < 0 || at >= PINTA_MAP_FORMAT_LIMITS.maxTiles)
    return { ok: false, reason: 'invalid-change' }
  return tryRemapTileIndices(tilemap, (tile) => shiftedIndex(tile, change), tilesetId)
}

/** Applies a composed layout change using the same cell and art semantics as one edit. */
export function tryRemapTilemapIndices<Map extends AuthorMap>(
  tilemap: Map,
  oldToNew: readonly number[],
  tilesetId: string,
): TilemapRemapResult<Map> {
  const limit = PINTA_MAP_FORMAT_LIMITS.maxTiles
  const used = new Set<number>()
  if (oldToNew.length < 1 || oldToNew.length > limit) return { ok: false, reason: 'invalid-change' }
  for (const index of oldToNew) {
    if (!Number.isSafeInteger(index) || index < -1 || index >= limit || used.has(index))
      return { ok: false, reason: 'invalid-change' }
    if (index !== -1) used.add(index)
  }
  return tryRemapTileIndices(tilemap, (tile) => oldToNew[tile], tilesetId)
}

function tryRemapTileIndices<Map extends AuthorMap>(
  tilemap: Map,
  remap: (tile: number) => number | undefined,
  tilesetId?: string,
): TilemapRemapResult<Map> {
  const regional = 'origin' in tilemap
  if (
    !parsePintaRegionBounds(mapCellBounds(tilemap)) ||
    tilemap.layers.length > PINTA_MAP_FORMAT_LIMITS.maxLayers ||
    (regional
      ? tilemap.schema !== 8
      : tilemap.schema !== undefined &&
        (!Number.isSafeInteger(tilemap.schema) ||
          tilemap.schema < 0 ||
          tilemap.schema > PINTA_MAX_SCHEMA)) ||
    (!regional &&
      (tilemap.cols > PINTA_MAP_FORMAT_LIMITS.maxCols ||
        tilemap.rows > PINTA_MAP_FORMAT_LIMITS.maxRows))
  )
    return { ok: false, reason: 'invalid-map' }
  // Private snapshots shadow the gallery resource, even when both have the same ID.
  if (tilesetId !== undefined && tilemap.resources?.some(({ asset }) => asset.id === tilesetId))
    return { ok: true, map: tilemap }
  let allocated = 0,
    tileLayers = 0
  for (const layer of tilemap.layers) {
    if (!isTileLayer<TilemapCells>(layer)) continue
    tileLayers++
    const cells = layer.cells
    if (cells instanceof Int16Array) {
      if (regional || cells.length !== tilemap.cols * tilemap.rows)
        return { ok: false, reason: 'invalid-map' }
      allocated += cells.length
    } else {
      if (
        !regional ||
        cells.kind !== 'regions' ||
        cells.version !== 1 ||
        cells.side !== PINTA_REGION_SIDE ||
        !Array.isArray(cells.chunks)
      )
        return { ok: false, reason: 'invalid-map' }
      allocated += cells.chunks.length * PINTA_REGION_CELL_COUNT
    }
    if (
      allocated > PINTA_MAP_FORMAT_LIMITS.maxCells ||
      (regional && allocated > PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CELL_COUNT)
    )
      return { ok: false, reason: 'cell-budget' }
  }
  if (!tileLayers) return { ok: false, reason: 'invalid-map' }
  // Admit all layer headers together before inspecting any chunk payload.
  for (const layer of tilemap.layers) {
    if (!isTileLayer<TilemapCells>(layer) || layer.cells instanceof Int16Array) continue
    for (const chunk of layer.cells.chunks)
      if (!(chunk.cells instanceof Int16Array) || chunk.cells.length !== PINTA_REGION_CELL_COUNT)
        return { ok: false, reason: 'invalid-map' }
  }
  function remapBuffer(
    cells: Int16Array,
  ):
    | { ok: true; cells: Int16Array; occupied: boolean }
    | { ok: false; reason: TilemapRemapFailure } {
    let next = cells,
      occupied = false
    for (let i = 0; i < cells.length; i++) {
      const before = cells[i]!
      if (!isValidCellForTiles(before, PINTA_MAP_FORMAT_LIMITS.maxTiles))
        return { ok: false, reason: 'invalid-map' }
      const oldTile = cellTile(before)
      const tile = oldTile === EMPTY_CELL ? EMPTY_CELL : remap(oldTile)
      if (tile === undefined) return { ok: false, reason: 'invalid-map' }
      if (tile >= PINTA_MAP_FORMAT_LIMITS.maxTiles) return { ok: false, reason: 'tile-budget' }
      const value = withCellTile(before, tile)
      if (value !== before && next === cells) next = cells.slice()
      if (next !== cells) next[i] = value
      if (value !== EMPTY_CELL) occupied = true
    }
    return { ok: true, cells: next, occupied }
  }
  let touched = false
  const layers: TilemapLayer<TilemapCells>[] = []
  for (const layer of tilemap.layers) {
    if (isObjectLayer(layer) && tilesetId !== undefined) {
      let changed = false
      const objects: TilemapObject[] = []
      for (const o of layer.objects) {
        if (o.art?.assetId !== tilesetId) {
          objects.push(o)
          continue
        }
        // Sheet art without an explicit index draws slot zero.
        const tile = o.art.tile ?? 0
        if (!Number.isSafeInteger(tile) || tile < 0 || tile >= PINTA_MAP_FORMAT_LIMITS.maxTiles)
          return { ok: false, reason: 'invalid-map' }
        const next = remap(tile)
        if (next === undefined) return { ok: false, reason: 'invalid-map' }
        if (next >= PINTA_MAP_FORMAT_LIMITS.maxTiles) return { ok: false, reason: 'tile-budget' }
        if (next === tile) {
          objects.push(o)
          continue
        }
        changed = true
        if (next < 0) {
          const { art: _art, ...rest } = o
          objects.push({ ...rest, shape: 'rect' })
          continue
        }
        objects.push({ ...o, art: { ...o.art, tile: next } })
      }
      if (changed) {
        touched = true
        layers.push({ ...layer, objects })
      } else {
        layers.push(layer)
      }
      continue
    }
    if (
      !isTileLayer<TilemapCells>(layer) ||
      (tilesetId !== undefined && tileLayerTilesetId(tilemap, layer) !== tilesetId)
    ) {
      layers.push(layer)
      continue
    }
    if (layer.cells instanceof Int16Array) {
      const result = remapBuffer(layer.cells)
      if (!result.ok) return result
      if (result.cells === layer.cells) {
        layers.push(layer)
        continue
      }
      layers.push({ ...layer, cells: result.cells })
    } else {
      const chunks: typeof layer.cells.chunks = []
      let changed = false
      for (const chunk of layer.cells.chunks) {
        const result = remapBuffer(chunk.cells)
        if (!result.ok) return result
        if (result.cells === chunk.cells) {
          chunks.push(chunk)
          continue
        }
        changed = true
        if (result.occupied) chunks.push({ ...chunk, cells: result.cells })
      }
      if (!changed) {
        layers.push(layer)
        continue
      }
      layers.push({ ...layer, cells: { ...layer.cells, chunks } })
    }
    touched = true
  }
  return { ok: true, map: touched ? { ...tilemap, layers } : tilemap }
}
