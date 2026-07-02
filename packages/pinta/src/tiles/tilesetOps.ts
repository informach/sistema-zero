/**
 * Operações PURAS sobre tilesets (e o efeito delas nos TILEMAPS que os usam).
 * O invariante central: o índice do tile NO ARRAY é o índice que o tilemap
 * guarda nas células E o índice row-major na folha empacotada — remover/mover
 * um tile exige REMAPEAR as células de todos os mapas do tileset
 * (`remapTilemapCells`), senão o mapa aponta pra peça errada.
 */
import { createBitmap, PINTA_LIMITS, type TilemapAsset, type TilesetAsset } from '../core/project'
import { cloneBitmap } from '../pixel/bitmap'

/** Novo tile VAZIO após `afterIndex`. No-op na quota. */
export function addTile(asset: TilesetAsset, afterIndex: number): TilesetAsset {
  if (asset.tiles.length >= PINTA_LIMITS.maxTiles) return asset
  const tiles = [...asset.tiles]
  const solid = [...asset.solid]
  tiles.splice(afterIndex + 1, 0, createBitmap(asset.tileSize, asset.tileSize))
  solid.splice(afterIndex + 1, 0, false)
  return { ...asset, tiles, solid }
}

export function duplicateTile(asset: TilesetAsset, index: number): TilesetAsset {
  if (asset.tiles.length >= PINTA_LIMITS.maxTiles) return asset
  const source = asset.tiles[index]
  if (!source) return asset
  const tiles = [...asset.tiles]
  const solid = [...asset.solid]
  tiles.splice(index + 1, 0, cloneBitmap(source))
  solid.splice(index + 1, 0, asset.solid[index] === true)
  return { ...asset, tiles, solid }
}

/** Remove o tile — nunca deixa o tileset vazio (o último não sai). */
export function removeTile(asset: TilesetAsset, index: number): TilesetAsset {
  if (asset.tiles.length <= 1 || !asset.tiles[index]) return asset
  return {
    ...asset,
    tiles: asset.tiles.filter((_, i) => i !== index),
    solid: asset.solid.filter((_, i) => i !== index),
  }
}

export function toggleSolid(asset: TilesetAsset, index: number): TilesetAsset {
  if (index < 0 || index >= asset.solid.length) return asset
  return { ...asset, solid: asset.solid.map((s, i) => (i === index ? !s : s)) }
}

/**
 * O remapeamento de células que acompanha um `addTile`/`removeTile`:
 * - `insertedAt` = o índice que o tile NOVO ocupa: células apontando p/ índices
 *   ≥ insertedAt sobem 1 (continuam na MESMA peça de antes);
 * - `removedAt`: célula com o índice removido vira VAZIA (-1); índices maiores
 *   descem 1.
 * Aplicar em TODOS os tilemaps do tileset (o chamador filtra por `tilesetId`).
 */
export function remapTilemapCells(
  tilemap: TilemapAsset,
  change: { insertedAt: number } | { removedAt: number },
): TilemapAsset {
  const remapOne = (value: number): number => {
    if (value < 0) return -1
    if ('insertedAt' in change) return value >= change.insertedAt ? value + 1 : value
    if (value === change.removedAt) return -1
    return value > change.removedAt ? value - 1 : value
  }
  let touched = false
  const layers = tilemap.layers.map((layer) => {
    const cells = new Int16Array(layer.cells.length)
    let layerTouched = false
    for (let i = 0; i < layer.cells.length; i += 1) {
      const next = remapOne(layer.cells[i] ?? -1)
      cells[i] = next
      if (next !== (layer.cells[i] ?? -1)) layerTouched = true
    }
    if (!layerTouched) return layer
    touched = true
    return { ...layer, cells }
  })
  return touched ? { ...tilemap, layers } : tilemap
}
