/**
 * Operações PURAS sobre o tilemap (grade de índices de tile por camada).
 * Mesmo contrato das ops de pixel: devolvem um asset novo (structural sharing)
 * ou o MESMO asset quando nada muda — o chamador commita por referência.
 */
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
    name: name.trim().slice(0, 30) || `Camada ${tilemap.layers.length + 1}`,
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

/**
 * A visão ACHATADA das camadas visíveis (a de cima vence): é o que o render, o
 * export de grade e o PNG achatado usam. -1 = vazio.
 */
export function flattenLayers(tilemap: TilemapAsset): Int16Array {
  const out = new Int16Array(tilemap.cols * tilemap.rows).fill(-1)
  for (const layer of tilemap.layers) {
    if (!layer.visible) continue
    for (let i = 0; i < out.length; i += 1) {
      const value = layer.cells[i] ?? -1
      if (value >= 0) out[i] = value
    }
  }
  return out
}
