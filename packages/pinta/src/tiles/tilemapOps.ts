/**
 * Operações PURAS sobre o tilemap (grade de índices de tile por camada).
 * Mesmo contrato das ops de pixel: devolvem um asset novo (structural sharing)
 * ou o MESMO asset quando nada muda — o chamador commita por referência.
 */

import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isCompatibleMapTileset,
  isGroupLayer,
  isLayerShown,
  isObjectLayer,
  isTileLayer,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  type RegionTilemapAsset,
  type TilemapAsset,
  type TilemapCells,
  type TilemapLayer,
  type TilemapObjectLayer,
  type TilemapTileLayer,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../core/project'
import { cellTile, isValidCellForTiles } from './cell'
import { collectTileFloodFill } from './floodFill'
import {
  createTileCellReader,
  mapCellBounds,
  readDenseTileCell,
  type TileCellReader,
} from './mapCells'
import { flattenWholeRegionMap } from './mapFlatten'
import { REGION_EDIT_LIMIT, regionCellAt } from './regionCells'
import { editRegionMapCells, expandRegionMap, fillRegionMapCells } from './regionMap'

/** Filtro de camadas de PEÇAS (as de objetos nunca entram nas grades). */
export type TileLayerFilter<Cells extends TilemapCells = Int16Array> = (
  layer: TilemapTileLayer<Cells>,
) => boolean

/** A camada de PEÇAS com este id (`null` para objetos ou id desconhecido). */
export function tileLayerById<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
  layerId: string,
): TilemapTileLayer<Cells> | null {
  const layer = tilemap.layers.find((l) => l.id === layerId)
  return layer && isTileLayer(layer) ? layer : null
}

export function cellAt(
  tilemap: TilemapAsset | RegionTilemapAsset,
  layerId: string,
  col: number,
  row: number,
): number {
  const layer = tileLayerById<TilemapCells>(tilemap, layerId)
  if (!layer) return -1
  if (layer.cells instanceof Int16Array)
    return readDenseTileCell(layer.cells, tilemap.cols, tilemap.rows, col, row)
  if (!('origin' in tilemap)) throw new RangeError('Region map requires its logical origin')
  const { origin } = tilemap
  if (
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    col < origin.col ||
    row < origin.row ||
    col >= origin.col + tilemap.cols ||
    row >= origin.row + tilemap.rows
  )
    return -1
  return regionCellAt(layer.cells, col, row)
}

/** Keep one immutable layer reader for each gesture/frame. */
export function createMapLayerCellReader(
  tilemap: TilemapAsset | RegionTilemapAsset,
  layerId: string,
): TileCellReader | null {
  const layer = tileLayerById<TilemapCells>(tilemap, layerId)
  if (!layer) return null
  if (!(layer.cells instanceof Int16Array) && !('origin' in tilemap))
    throw new RangeError('Region map requires its logical origin')
  const origin = 'origin' in tilemap ? tilemap.origin : { col: 0, row: 0 }
  return createTileCellReader(layer.cells, { ...origin, cols: tilemap.cols, rows: tilemap.rows })
}

/** Troca UMA camada (qualquer tipo). Mesmo asset quando o `update` não muda nada. */
export function withMapLayer<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  layerId: string,
  update: (layer: Map['layers'][number]) => Map['layers'][number],
): Map {
  const index = tilemap.layers.findIndex((l) => l.id === layerId)
  const layer = tilemap.layers[index]
  if (!layer) return tilemap
  const next = update(layer)
  if (next === layer) return tilemap
  return { ...tilemap, layers: tilemap.layers.map((l, i) => (i === index ? next : l)) } as Map
}

/** Troca UMA camada de PEÇAS; numa camada de objetos não faz nada. */
export function withTileLayer(
  tilemap: TilemapAsset,
  layerId: string,
  update: (layer: TilemapTileLayer) => TilemapTileLayer,
): TilemapAsset {
  return withMapLayer(tilemap, layerId, (layer) =>
    isTileLayer(layer) && !effectiveLayer(tilemap, layer).locked ? update(layer) : layer,
  )
}

/** Carimba UM índice de tile (-1 = borracha) na célula. */
export function setCell(
  tilemap: RegionTilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): RegionTilemapAsset
export function setCell(
  tilemap: TilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): TilemapAsset
export function setCell(
  tilemap: TilemapAsset | RegionTilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): TilemapAsset | RegionTilemapAsset {
  if (
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    !isValidCellForTiles(tile, PINTA_MAP_FORMAT_LIMITS.maxTiles)
  )
    return tilemap
  if ('origin' in tilemap) {
    const result = editRegionMapCells(tilemap, layerId, [{ col, row, cell: tile }])
    return result.ok ? result.map : tilemap
  }
  if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) return tilemap
  return withTileLayer(tilemap, layerId, (layer) => {
    const at = row * tilemap.cols + col
    if ((layer.cells[at] ?? -1) === tile) return layer
    const cells = new Int16Array(layer.cells)
    cells[at] = tile
    return { ...layer, cells }
  })
}

/**
 * Carimba UM índice de tile em VÁRIAS células de uma vez (um único clone do
 * `Int16Array`) — o caminho de lote do lápis/borracha/linha/retângulo sem
 * carimbo. Fora da grade é ignorado. Mesmo asset quando nada muda.
 */
export function setCells(
  tilemap: RegionTilemapAsset,
  layerId: string,
  cells: ReadonlyArray<{ col: number; row: number }>,
  tile: number,
): RegionTilemapAsset
export function setCells(
  tilemap: TilemapAsset,
  layerId: string,
  cells: ReadonlyArray<{ col: number; row: number }>,
  tile: number,
): TilemapAsset
export function setCells(
  tilemap: TilemapAsset | RegionTilemapAsset,
  layerId: string,
  cells: ReadonlyArray<{ col: number; row: number }>,
  tile: number,
): TilemapAsset | RegionTilemapAsset {
  if (!isValidCellForTiles(tile, PINTA_MAP_FORMAT_LIMITS.maxTiles)) return tilemap
  if ('origin' in tilemap) {
    if (cells.length > REGION_EDIT_LIMIT) return tilemap
    const { origin, cols, rows } = tilemap
    const edits = cells
      .filter(
        ({ col, row }) =>
          Number.isInteger(col) &&
          Number.isInteger(row) &&
          col >= origin.col &&
          row >= origin.row &&
          col < origin.col + cols &&
          row < origin.row + rows,
      )
      .map(({ col, row }) => ({ col, row, cell: tile }))
    const result = editRegionMapCells(tilemap, layerId, edits)
    return result.ok ? result.map : tilemap
  }
  return withTileLayer(tilemap, layerId, (layer) => {
    let next: Int16Array | null = null
    for (const { col, row } of cells) {
      if (!Number.isInteger(col) || !Number.isInteger(row)) continue
      if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) continue
      const at = row * tilemap.cols + col
      if ((next ?? layer.cells)[at] === tile) continue
      if (!next) next = new Int16Array(layer.cells)
      next[at] = tile
    }
    return next ? { ...layer, cells: next } : layer
  })
}

/**
 * Cresce o mapa em UMA célula de um lado (auto-expandir ao pintar na borda),
 * copiando TODAS as camadas com o deslocamento certo. Respeita os tetos
 * `maxTilemapCols/Rows` — no teto devolve o MESMO asset. Crescer à esquerda ou
 * em cima empurra os OBJETOS uma peça junto (`tileSize`, em pixels do mapa;
 * sem ele os objetos ficam onde estão). Em regiões, amplia os limites globais
 * e conserva posições/buffers; o teto vem do contrato regional.
 */
export function growTilemap(
  tilemap: TilemapAsset,
  side: 'left' | 'right' | 'top' | 'bottom',
  tileSize?: number,
): TilemapAsset
export function growTilemap(
  tilemap: RegionTilemapAsset,
  side: 'left' | 'right' | 'top' | 'bottom',
  tileSize?: number,
): RegionTilemapAsset
export function growTilemap(
  tilemap: TilemapAsset | RegionTilemapAsset,
  side: 'left' | 'right' | 'top' | 'bottom',
  tileSize?: number,
): TilemapAsset | RegionTilemapAsset
export function growTilemap(
  tilemap: TilemapAsset | RegionTilemapAsset,
  side: 'left' | 'right' | 'top' | 'bottom',
  tileSize?: number,
): TilemapAsset | RegionTilemapAsset {
  if ('origin' in tilemap) {
    const result = expandRegionMap(tilemap, {
      col: tilemap.origin.col - (side === 'left' ? 1 : 0),
      row: tilemap.origin.row - (side === 'top' ? 1 : 0),
      cols: tilemap.cols + (side === 'left' || side === 'right' ? 1 : 0),
      rows: tilemap.rows + (side === 'top' || side === 'bottom' ? 1 : 0),
    })
    return result.ok ? result.map : tilemap
  }
  const horizontal = side === 'left' || side === 'right'
  if (horizontal && tilemap.cols >= PINTA_LIMITS.maxTilemapCols) return tilemap
  if (!horizontal && tilemap.rows >= PINTA_LIMITS.maxTilemapRows) return tilemap
  const cols = tilemap.cols + (horizontal ? 1 : 0)
  const rows = tilemap.rows + (horizontal ? 0 : 1)
  if (cols * rows * tilemap.layers.filter(isTileLayer).length > PINTA_MAP_FORMAT_LIMITS.maxCells)
    return tilemap
  const dCol = side === 'left' ? 1 : 0
  const dRow = side === 'top' ? 1 : 0
  const layers = tilemap.layers.map((layer): TilemapLayer => {
    if (isObjectLayer(layer)) {
      return tileSize ? shiftObjectLayer(layer, dCol * tileSize, dRow * tileSize) : layer
    }
    if (!isTileLayer(layer)) return layer
    const cells = new Int16Array(cols * rows).fill(-1)
    for (let r = 0; r < tilemap.rows; r += 1) {
      for (let c = 0; c < tilemap.cols; c += 1) {
        cells[(r + dRow) * cols + (c + dCol)] = layer.cells[r * tilemap.cols + c] ?? -1
      }
    }
    return { ...layer, cells }
  })
  return { ...tilemap, cols, rows, layers }
}

/**
 * Desloca todos os objetos da camada (pixels do mapa), sem passar de zero nem do
 * teto. Mesma camada quando o deslocamento é nulo.
 */
export function shiftObjectLayer(
  layer: TilemapObjectLayer,
  dx: number,
  dy: number,
): TilemapObjectLayer {
  if ((dx === 0 && dy === 0) || layer.objects.length === 0) return layer
  const max = PINTA_LIMITS.maxObjectCoord
  return {
    ...layer,
    objects: layer.objects.map((object) => ({
      ...object,
      x: Math.min(Math.max(object.x + dx, 0), max),
      y: Math.min(Math.max(object.y + dy, 0), max),
    })),
  }
}

/** Balde: preenche a região contígua (conectividade-4) do índice sob o clique. */
export function floodFillCells(
  tilemap: RegionTilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): RegionTilemapAsset
export function floodFillCells(
  tilemap: TilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): TilemapAsset
export function floodFillCells(
  tilemap: TilemapAsset | RegionTilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): TilemapAsset | RegionTilemapAsset {
  if (
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    !isValidCellForTiles(tile, PINTA_MAP_FORMAT_LIMITS.maxTiles)
  )
    return tilemap
  if ('origin' in tilemap) {
    const result = fillRegionMapCells(tilemap, layerId, col, row, tile)
    return result.ok ? result.map : tilemap
  }
  if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) return tilemap
  return withTileLayer(tilemap, layerId, (layer) => {
    const { cols, rows } = tilemap
    const bounds = { col: 0, row: 0, cols, rows }
    const result = collectTileFloodFill(
      createTileCellReader(layer.cells, bounds),
      bounds,
      col,
      row,
      tile,
    )
    if (!result.ok || !result.edits.length) return layer
    const cells = layer.cells.slice()
    for (const edit of result.edits) cells[edit.row * cols + edit.col] = edit.cell
    return { ...layer, cells }
  })
}

export function addLayer<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  name: string,
  /** Peças da camada nova; ausente ou igual ao padrão = as do mapa. */
  tilesetId?: string,
): Map {
  if (tilemap.layers.length >= PINTA_LIMITS.maxTilemapLayers) return tilemap
  if (
    !('origin' in tilemap) &&
    tilemap.cols * tilemap.rows * (tilemap.layers.filter(isTileLayer).length + 1) >
      PINTA_MAP_FORMAT_LIMITS.maxCells
  )
    return tilemap
  const layer: TilemapTileLayer<TilemapCells> = {
    id: newId(),
    name: name.trim().slice(0, 30) || `${COPY.tiles.layerNamePrefix} ${tilemap.layers.length + 1}`,
    visible: true,
    cells:
      'origin' in tilemap
        ? { kind: 'regions', version: 1, side: 32, chunks: [] }
        : new Int16Array(tilemap.cols * tilemap.rows).fill(-1),
    ...(tilesetId && ('origin' in tilemap || tilesetId !== tilemap.tilesetId) ? { tilesetId } : {}),
  }
  return { ...tilemap, layers: [...tilemap.layers, layer] }
}

/** Nova camada de OBJETOS (vazia) no topo. No teto de camadas devolve o mesmo asset. */
export function addObjectLayer<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  name: string,
): Map {
  if (tilemap.layers.length >= PINTA_LIMITS.maxTilemapLayers) return tilemap
  const layer: TilemapObjectLayer = {
    kind: 'objects',
    id: newId(),
    name: name.trim().slice(0, 30) || COPY.tiles.objectLayerNamePrefix,
    visible: true,
    objects: [],
  }
  return { ...tilemap, layers: [...tilemap.layers, layer] }
}

/**
 * Remove a camada — nunca deixa o mapa sem nenhuma camada de PEÇAS (um mapa só
 * de objetos não tem o que desenhar, e o sanitize o descartaria).
 */
export function removeLayer<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  layerId: string,
): Map {
  if (tilemap.layers.length <= 1) return tilemap
  const index = tilemap.layers.findIndex((layer) => layer.id === layerId)
  const layer = tilemap.layers[index]
  if (!layer) return tilemap
  if (effectiveLayer(tilemap, layer).locked) return tilemap
  if (
    isTileLayer<TilemapCells>(layer) &&
    tilemap.layers.filter(isTileLayer<TilemapCells>).length <= 1
  )
    return tilemap
  return {
    ...tilemap,
    layers: tilemap.layers
      .filter((_, itemIndex) => itemIndex !== index)
      .map((l) => {
        if (!isGroupLayer(layer) || l.parentId !== layerId) return l
        const { parentId: _old, ...rest } = l
        return { ...rest, ...(layer.parentId ? { parentId: layer.parentId } : {}) }
      }),
  }
}

export function toggleLayerVisible<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  layerId: string,
): Map {
  return withMapLayer(tilemap, layerId, (layer) => ({ ...layer, visible: !layer.visible }))
}

/** Marca/desmarca a camada como "da frente" (desenhada por cima do jogador). */
export function toggleLayerFront<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  layerId: string,
): Map {
  return withMapLayer(tilemap, layerId, (layer) =>
    isTileLayer<TilemapCells>(layer) && !effectiveLayer(tilemap, layer).locked
      ? { ...layer, front: !layer.front }
      : layer,
  )
}

/**
 * Troca as PEÇAS de uma camada. `base` são as peças padrão do mapa: tileset de
 * outro estilo ou de outro tamanho de peça é RECUSADO (mesmo asset), porque a
 * grade é uma só. Escolher o padrão de volta remove a chave (forma canônica).
 * As células ficam como estão: o índice passa a apontar para as peças novas.
 */
export function setLayerTileset<Map extends TilemapAsset | RegionTilemapAsset>(
  tilemap: Map,
  layerId: string,
  tileset: AnyTilesetAsset,
  base: AnyTilesetAsset,
): Map {
  if (!isCompatibleMapTileset(base, tileset)) return tilemap
  return withMapLayer(tilemap, layerId, (layer) => {
    if (!isTileLayer<TilemapCells>(layer) || effectiveLayer(tilemap, layer).locked) return layer
    if (tileLayerTilesetId(tilemap, layer) === tileset.id) return layer
    const next = { ...layer }
    delete next.tilesetId
    if (tileset.id !== tilemap.tilesetId || 'origin' in tilemap) next.tilesetId = tileset.id
    return next
  })
}

/** Filtro: só as camadas que usam as peças PADRÃO do mapa (o que a ponte leva). */
export function usesMapTileset<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
): TileLayerFilter<Cells> {
  return (layer) => tileLayerTilesetId(tilemap, layer) === tilemap.tilesetId
}

/**
 * A visão ACHATADA das camadas de peças visíveis (a de cima vence): é o que o
 * export de grade usa. -1 = vazio. `include` filtra quais camadas entram (ex.: só
 * as de fundo, só as "da frente", só as das peças padrão). ⚠️ O índice achatado
 * não diz DE QUAL tileset é a peça: para desenhar um mapa com várias peças use
 * `flattenWithTilesets`.
 */
export function flattenLayers<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
  include?: TileLayerFilter<Cells>,
): Int16Array {
  if ('origin' in tilemap) return flattenWholeRegionMap(tilemap, include).tiles
  const out = new Int16Array(tilemap.cols * tilemap.rows).fill(-1)
  for (const layer of tilemap.layers) {
    if (!isTileLayer(layer) || !isLayerShown(tilemap, layer)) continue
    if (include && !include(layer)) continue
    if (!(layer.cells instanceof Int16Array))
      throw new RangeError('Region map requires its logical origin')
    for (let i = 0; i < out.length; i += 1) {
      const value = cellTile(layer.cells[i] ?? -1)
      if (value >= 0) out[i] = value
    }
  }
  return out
}

/** O achatado que sabe de QUAL tileset veio cada peça (`tilesetIds[sources[i]]`). */
export interface TilemapCellsWithTilesets {
  /** `tilemapTilesetIds(tilemap)`: o padrão do mapa é o 0. */
  tilesetIds: string[]
  /** Peça vencedora por célula (-1 = vazio). */
  tiles: Int16Array
  /** Índice em `tilesetIds` da peça vencedora (vale onde `tiles[i] >= 0`). */
  sources: Uint8Array
}

/**
 * A peça dá para DESENHAR? O tileset da camada existe (achado e compatível) e tem aquela
 * peça. Sem o filtro, toda peça conta (a regra antiga, de quem não sabe das peças).
 */
export type DrawableTile = (tilesetId: string, tile: number) => boolean

/**
 * ⚠️ Com `drawable`, a peça que não dá para desenhar NÃO vence a célula: a camada cujo
 * tileset sumiu (ou é incompatível) não aparece e não tapa as de baixo — o mesmo que o atlas
 * `map` do pygame faz (a camada sai do JSON e a casa de peça inexistente vira -1). Sem o
 * filtro ela vencia antes de alguém saber se havia o que desenhar: a célula ficava vazia no
 * editor e nas miniaturas enquanto o jogo mostrava a camada de baixo.
 */
export function flattenWithTilesets<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
  include?: TileLayerFilter<Cells>,
  drawable?: DrawableTile,
): TilemapCellsWithTilesets {
  if ('origin' in tilemap) {
    const { tilesetIds, tiles, sources } = flattenWholeRegionMap(tilemap, include, drawable)
    return { tilesetIds, tiles, sources }
  }
  const tilesetIds = tilemapTilesetIds(tilemap)
  const tiles = new Int16Array(tilemap.cols * tilemap.rows).fill(-1)
  const sources = new Uint8Array(tiles.length)
  for (const layer of tilemap.layers) {
    if (!isTileLayer(layer) || !isLayerShown(tilemap, layer)) continue
    if (include && !include(layer)) continue
    if (!(layer.cells instanceof Int16Array))
      throw new RangeError('Region map requires its logical origin')
    const tilesetId = tileLayerTilesetId(tilemap, layer)
    const source = Math.max(0, tilesetIds.indexOf(tilesetId))
    for (let i = 0; i < tiles.length; i += 1) {
      const value = cellTile(layer.cells[i] ?? -1)
      if (value < 0) continue
      if (drawable && !drawable(tilesetId, value)) continue
      tiles[i] = value
      sources[i] = source
    }
  }
  return { tilesetIds, tiles, sources }
}

/**
 * O valor achatado de UMA célula (a camada visível mais de cima que tem peça ali; -1 =
 * vazio) — a mesma regra de `flattenLayers`, sem alocar e varrer o mapa inteiro. É o que
 * o repaint incremental do mapa usa por célula durante o gesto (antes, cada pointermove
 * achatava cols × rows × camadas).
 */
export function flattenCellAt<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
  col: number,
  row: number,
  include?: TileLayerFilter<Cells>,
  drawable?: DrawableTile,
): number {
  return topTileAt(tilemap, col, row, include, drawable)?.tile ?? -1
}

/**
 * A peça que aparece na célula e a camada dona dela (`null` = vazio). Com `drawable`, a
 * regra de `flattenWithTilesets`: a peça sem tileset que a desenhe não vence.
 */
export function topTileAt<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
  col: number,
  row: number,
  include?: TileLayerFilter<Cells>,
  drawable?: DrawableTile,
): { layer: TilemapTileLayer<Cells>; tile: number } | null {
  const regional = 'origin' in tilemap
  if (regional) {
    const source: TilemapAsset<Cells> = tilemap
    const bounds = mapCellBounds(source)
    if (
      !Number.isInteger(col) ||
      !Number.isInteger(row) ||
      col < bounds.col ||
      row < bounds.row ||
      col >= bounds.col + bounds.cols ||
      row >= bounds.row + bounds.rows
    )
      return null
  } else if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) return null
  const index = row * tilemap.cols + col
  let out: { layer: TilemapTileLayer<Cells>; tile: number } | null = null
  for (const layer of tilemap.layers) {
    if (!isTileLayer(layer) || !isLayerShown(tilemap, layer)) continue
    if (include && !include(layer)) continue
    if (!(layer.cells instanceof Int16Array) && !regional)
      throw new RangeError('Region map requires its logical origin')
    const value = cellTile(
      layer.cells instanceof Int16Array
        ? (layer.cells[index] ?? -1)
        : regionCellAt(layer.cells, col, row),
    )
    if (value < 0) continue
    if (drawable && !drawable(tileLayerTilesetId(tilemap, layer), value)) continue
    out = { layer, tile: value }
  }
  return out
}

/** Achatado das camadas de FUNDO (tudo menos as marcadas "da frente"). */
export function flattenBackground<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
): Int16Array {
  return flattenLayers(tilemap, (l) => l.front !== true)
}

/** Achatado só das camadas "da frente" (desenhadas por cima do jogador). */
export function flattenFront<Cells extends TilemapCells>(tilemap: TilemapAsset<Cells>): Int16Array {
  return flattenLayers(tilemap, (l) => l.front === true)
}

/**
 * Verdadeiro se o mapa tem ao menos uma camada da frente VISÍVEL e não-vazia
 * (entre as que `include` aceita, quando dado).
 */
export function hasFrontLayer<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
  include?: TileLayerFilter<Cells>,
): boolean {
  return tilemap.layers.some(
    (l) =>
      isTileLayer(l) &&
      l.front === true &&
      ('origin' in tilemap ? isLayerShown(tilemap, l) : l.visible) &&
      (!include || include(l)) &&
      (l.cells instanceof Int16Array
        ? l.cells.some((v) => v >= 0)
        : l.cells.chunks.some((chunk) => chunk.cells.some((v) => v >= 0))),
  )
}
