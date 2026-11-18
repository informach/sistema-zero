import type { VectorShape } from '../vector/model'
import { bitmapBytes } from './history'
import type { PintaAsset, PintaBitmap } from './project'

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

/** Estimativa compartilhada pelos orçamentos do histórico e das versões embutidas. */
export function assetBytes(asset: PintaAsset, countSharedData = true): number {
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
        if (layer.kind === undefined || layer.kind === 'tiles')
          total += countSharedData ? layer.cells.byteLength : 0
        else if (layer.kind === 'objects')
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
