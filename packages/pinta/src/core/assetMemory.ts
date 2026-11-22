import type { VectorShape } from '../vector/model'
import { bitmapBytes, type SharedPart } from './history'
import type { PintaAsset, PintaBitmap, RegionMapSetAsset, RegionTilemapAsset } from './project'

/** Internal regional documents are measured without advertising public editing support. */
export type PintaMemoryAsset = PintaAsset | RegionTilemapAsset | RegionMapSetAsset

function shapeBytes(shape: VectorShape): number {
  let bytes = 128
  if (shape.type === 'path') bytes += shape.d.length * 2
  else if (shape.type === 'text') bytes += shape.text.length * 2
  else if (shape.type === 'polygon') bytes += shape.points.length * 16
  else if (shape.type === 'image') bytes += shape.src.length * 2
  return bytes
}
function shapesBytes(shapes: VectorShape[]): number {
  return shapes.reduce((sum, shape) => sum + shapeBytes(shape), 0)
}

/** Legacy payload metric remains stable for reading existing resource catalogs. */
export function assetBytes(asset: PintaMemoryAsset, countSharedData = true): number {
  const bitmaps: PintaBitmap[] = []
  switch (asset.kind) {
    case 'map-set':
      return assetBytes(asset.map, countSharedData)
    case 'pixel-sprite':
      for (const animation of asset.animations)
        for (const cels of animation.frames) bitmaps.push(...cels)
      break
    case 'pixel-background':
      bitmaps.push(...asset.cels)
      break
    case 'tileset':
      bitmaps.push(...asset.tiles)
      break
    case 'tilemap': {
      let total = 128
      for (const layer of asset.layers) {
        total += 64
        if (layer.kind === undefined || layer.kind === 'tiles') {
          const cells = layer.cells
          if (cells instanceof Int16Array) total += countSharedData ? cells.byteLength : 0
          else
            for (const chunk of cells.chunks)
              total += 64 + (countSharedData ? chunk.cells.byteLength : 0)
        } else if (layer.kind === 'objects')
          for (const object of layer.objects)
            total +=
              96 + JSON.stringify(object.properties).length * 2 + (object.points?.length ?? 0) * 16
      }
      for (const resource of asset.resources ?? [])
        total += 128 + (countSharedData ? assetBytes(resource.asset) : 0)
      return total
    }
    case 'vector-background':
      return 256 + shapesBytes(asset.shapes)
    case 'vector-sprite':
      return (
        256 +
        asset.animations.reduce(
          (sum, animation) =>
            sum + animation.frames.reduce((s, frame) => s + shapesBytes(frame), 64),
          0,
        )
      )
    case 'vector-tileset':
      return 256 + asset.tiles.reduce((sum, tile) => sum + shapesBytes(tile), 64)
  }
  return bitmaps.reduce((sum, bitmap) => sum + bitmapBytes(bitmap), 128)
}

/** Retained authoring estimate includes tile rules/properties, without serializing pixel buffers. */
const rulebookSizes = new WeakMap<object, number>()
function authoredRulebook(asset: PintaMemoryAsset): SharedPart | undefined {
  if (
    asset.kind !== 'tilemap' ||
    asset.schema !== 9 ||
    !('automapping' in asset) ||
    !asset.automapping ||
    typeof asset.automapping !== 'object'
  )
    return
  return rulebookSharedPart(asset.automapping)
}
export function rulebookSharedPart(book: object): SharedPart {
  let bytes = rulebookSizes.get(book)
  if (bytes === undefined) {
    bytes = JSON.stringify(book).length * 2
    rulebookSizes.set(book, bytes)
  }
  return { key: book, bytes }
}
export function retainedAssetBytes(asset: PintaMemoryAsset, countSharedData = true): number {
  if (asset.kind === 'map-set') return retainedAssetBytes(asset.map, countSharedData)
  let bytes =
    assetBytes(asset, countSharedData) +
    (countSharedData ? (authoredRulebook(asset)?.bytes ?? 0) : 0)
  if (asset.kind === 'tileset' || asset.kind === 'vector-tileset') {
    if (asset.animations || asset.terrains || asset.tileProperties)
      bytes +=
        JSON.stringify({
          animations: asset.animations,
          terrains: asset.terrains,
          tileProperties: asset.tileProperties,
        }).length * 2
  } else if (asset.kind === 'tilemap') {
    for (const layer of asset.layers)
      if (layer.properties) bytes += JSON.stringify(layer.properties).length * 2
    if (countSharedData)
      for (const resource of asset.resources ?? [])
        bytes += retainedAssetBytes(resource.asset) - assetBytes(resource.asset)
  }
  return bytes
}

/** Every immutable chunk buffer is an independent shared part of history. */
export function* sharedAssetParts(asset: PintaMemoryAsset): Iterable<SharedPart> {
  if (asset.kind !== 'tilemap' && asset.kind !== 'map-set') return
  const book = authoredRulebook(asset)
  if (book) yield book
  const map = asset.kind === 'map-set' ? asset.map : asset
  for (const resource of map.resources ?? [])
    yield { key: resource.asset, bytes: retainedAssetBytes(resource.asset) }
  for (const layer of map.layers) {
    if (layer.kind !== undefined && layer.kind !== 'tiles') continue
    const cells = layer.cells
    if (cells instanceof Int16Array) yield { key: cells, bytes: cells.byteLength }
    else for (const chunk of cells.chunks) yield { key: chunk.cells, bytes: chunk.cells.byteLength }
  }
}
