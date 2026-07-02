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
import { newId } from '../core/id'
import type { AnyTilesetAsset, TilemapAsset, VectorFrame } from '../core/project'
import { createBitmap, PINTA_LIMITS, type PintaBitmap } from '../core/project'
import { cloneBitmap } from '../pixel/bitmap'

type TileOf<A extends AnyTilesetAsset> = A['tiles'][number]

function emptyTileFor<A extends AnyTilesetAsset>(asset: A): TileOf<A> {
  const tile: PintaBitmap | VectorFrame =
    asset.kind === 'tileset' ? createBitmap(asset.tileSize, asset.tileSize) : []
  return tile as TileOf<A>
}

function cloneTileOf<A extends AnyTilesetAsset>(asset: A, tile: TileOf<A>): TileOf<A> {
  const clone: PintaBitmap | VectorFrame =
    asset.kind === 'tileset'
      ? cloneBitmap(tile as PintaBitmap)
      : (tile as VectorFrame).map((shape) => ({ ...shape, id: newId() }))
  return clone as TileOf<A>
}

/** Novo tile VAZIO após `afterIndex`. No-op na quota. */
export function addTile<A extends AnyTilesetAsset>(asset: A, afterIndex: number): A {
  if (asset.tiles.length >= PINTA_LIMITS.maxTiles) return asset
  const tiles = [...(asset.tiles as TileOf<A>[])]
  const solid = [...asset.solid]
  tiles.splice(afterIndex + 1, 0, emptyTileFor(asset))
  solid.splice(afterIndex + 1, 0, false)
  return { ...asset, tiles, solid }
}

export function duplicateTile<A extends AnyTilesetAsset>(asset: A, index: number): A {
  if (asset.tiles.length >= PINTA_LIMITS.maxTiles) return asset
  const source = asset.tiles[index] as TileOf<A> | undefined
  if (!source) return asset
  const tiles = [...(asset.tiles as TileOf<A>[])]
  const solid = [...asset.solid]
  tiles.splice(index + 1, 0, cloneTileOf(asset, source))
  solid.splice(index + 1, 0, asset.solid[index] === true)
  return { ...asset, tiles, solid }
}

/** Remove o tile — nunca deixa o tileset vazio (o último não sai). */
export function removeTile<A extends AnyTilesetAsset>(asset: A, index: number): A {
  if (asset.tiles.length <= 1 || !asset.tiles[index]) return asset
  return {
    ...asset,
    tiles: (asset.tiles as TileOf<A>[]).filter((_, i) => i !== index),
    solid: asset.solid.filter((_, i) => i !== index),
  }
}

export function toggleSolid<A extends AnyTilesetAsset>(asset: A, index: number): A {
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
