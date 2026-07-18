/**
 * Operações PURAS sobre o tilemap (grade de índices de tile por camada).
 * Mesmo contrato das ops de pixel: devolvem um asset novo (structural sharing)
 * ou o MESMO asset quando nada muda — o chamador commita por referência.
 */
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import { PINTA_LIMITS, type TilemapAsset, type TilemapLayer } from '../core/project'

export function cellAt(tilemap: TilemapAsset, layerId: string, col: number, row: number): number {
  const layer = tilemap.layers.find((l) => l.id === layerId)
  if (!layer || col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) return -1
  return layer.cells[row * tilemap.cols + col] ?? -1
}

function withLayer(
  tilemap: TilemapAsset,
  layerId: string,
  update: (layer: TilemapLayer) => TilemapLayer,
): TilemapAsset {
  const index = tilemap.layers.findIndex((l) => l.id === layerId)
  const layer = tilemap.layers[index]
  if (!layer) return tilemap
  const next = update(layer)
  if (next === layer) return tilemap
  return { ...tilemap, layers: tilemap.layers.map((l, i) => (i === index ? next : l)) }
}

/** Carimba UM índice de tile (-1 = borracha) na célula. */
export function setCell(
  tilemap: TilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): TilemapAsset {
  if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) return tilemap
  return withLayer(tilemap, layerId, (layer) => {
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
  tilemap: TilemapAsset,
  layerId: string,
  cells: ReadonlyArray<{ col: number; row: number }>,
  tile: number,
): TilemapAsset {
  return withLayer(tilemap, layerId, (layer) => {
    let next: Int16Array | null = null
    for (const { col, row } of cells) {
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
 * `maxTilemapCols/Rows` — no teto devolve o MESMO asset.
 */
export function growTilemap(
  tilemap: TilemapAsset,
  side: 'left' | 'right' | 'top' | 'bottom',
): TilemapAsset {
  const horizontal = side === 'left' || side === 'right'
  if (horizontal && tilemap.cols >= PINTA_LIMITS.maxTilemapCols) return tilemap
  if (!horizontal && tilemap.rows >= PINTA_LIMITS.maxTilemapRows) return tilemap
  const cols = tilemap.cols + (horizontal ? 1 : 0)
  const rows = tilemap.rows + (horizontal ? 0 : 1)
  const dCol = side === 'left' ? 1 : 0
  const dRow = side === 'top' ? 1 : 0
  const layers = tilemap.layers.map((layer) => {
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

/** Balde: preenche a região contígua (conectividade-4) do índice sob o clique. */
export function floodFillCells(
  tilemap: TilemapAsset,
  layerId: string,
  col: number,
  row: number,
  tile: number,
): TilemapAsset {
  if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) return tilemap
  return withLayer(tilemap, layerId, (layer) => {
    const { cols, rows } = tilemap
    const target = layer.cells[row * cols + col] ?? -1
    if (target === tile) return layer
    const cells = new Int16Array(layer.cells)
    const stack: Array<[number, number]> = [[col, row]]
    while (stack.length > 0) {
      const item = stack.pop()
      if (!item) break
      const [cx, cy] = item
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue
      const at = cy * cols + cx
      if ((cells[at] ?? -1) !== target) continue
      cells[at] = tile
      stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1])
    }
    return { ...layer, cells }
  })
}

export function addLayer(tilemap: TilemapAsset, name: string): TilemapAsset {
  if (tilemap.layers.length >= PINTA_LIMITS.maxTilemapLayers) return tilemap
  const layer: TilemapLayer = {
    id: newId(),
    name: name.trim().slice(0, 30) || `${COPY.tiles.layerNamePrefix} ${tilemap.layers.length + 1}`,
    visible: true,
    cells: new Int16Array(tilemap.cols * tilemap.rows).fill(-1),
  }
  return { ...tilemap, layers: [...tilemap.layers, layer] }
}

/** Remove a camada — nunca deixa o mapa sem nenhuma. */
export function removeLayer(tilemap: TilemapAsset, layerId: string): TilemapAsset {
  if (tilemap.layers.length <= 1) return tilemap
  if (!tilemap.layers.some((l) => l.id === layerId)) return tilemap
  return { ...tilemap, layers: tilemap.layers.filter((l) => l.id !== layerId) }
}

export function toggleLayerVisible(tilemap: TilemapAsset, layerId: string): TilemapAsset {
  return withLayer(tilemap, layerId, (layer) => ({ ...layer, visible: !layer.visible }))
}

/** Marca/desmarca a camada como "da frente" (desenhada por cima do jogador). */
export function toggleLayerFront(tilemap: TilemapAsset, layerId: string): TilemapAsset {
  return withLayer(tilemap, layerId, (layer) => ({ ...layer, front: !layer.front }))
}

/**
 * A visão ACHATADA das camadas visíveis (a de cima vence): é o que o render, o
 * export de grade e o PNG achatado usam. -1 = vazio. `include` filtra quais
 * camadas entram (ex.: só as de fundo, ou só as "da frente").
 */
export function flattenLayers(
  tilemap: TilemapAsset,
  include?: (layer: TilemapLayer) => boolean,
): Int16Array {
  const out = new Int16Array(tilemap.cols * tilemap.rows).fill(-1)
  for (const layer of tilemap.layers) {
    if (!layer.visible) continue
    if (include && !include(layer)) continue
    for (let i = 0; i < out.length; i += 1) {
      const value = layer.cells[i] ?? -1
      if (value >= 0) out[i] = value
    }
  }
  return out
}

/** Achatado das camadas de FUNDO (tudo menos as marcadas "da frente"). */
export function flattenBackground(tilemap: TilemapAsset): Int16Array {
  return flattenLayers(tilemap, (l) => l.front !== true)
}

/** Achatado só das camadas "da frente" (desenhadas por cima do jogador). */
export function flattenFront(tilemap: TilemapAsset): Int16Array {
  return flattenLayers(tilemap, (l) => l.front === true)
}

/** Verdadeiro se o mapa tem ao menos uma camada da frente VISÍVEL e não-vazia. */
export function hasFrontLayer(tilemap: TilemapAsset): boolean {
  return tilemap.layers.some((l) => l.front === true && l.visible && l.cells.some((v) => v >= 0))
}
