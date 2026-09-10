import type { MoldaTextureAsset } from '../core/model'
import { type PixelShape, shapeTexels } from '../paint/shapeTexels'
import type { BrushSize, Texel } from '../paint/skinPaint'
import { lineTexelsWrap, paintTexture } from './ops'

export type TextureShape = PixelShape

/** Recomputed from the gesture's original bitmap, never accumulated from previous previews. */
export function paintTextureShape(
  asset: MoldaTextureAsset,
  input: {
    shape: TextureShape
    from: Texel
    to: Texel
    color: number
    brush: BrushSize
    filled: boolean
    offset?: readonly [number, number]
  },
): MoldaTextureAsset {
  const size = asset.bitmap.width
  if (
    ![...input.from, ...input.to].every(
      (coordinate) => Number.isInteger(coordinate) && coordinate >= 0 && coordinate < size,
    )
  )
    return asset
  const path = lineTexelsWrap(
    size,
    input.from[0],
    input.from[1],
    input.to[0],
    input.to[1],
    asset.seamless,
  )
  if (input.shape === 'line')
    return paintTexture(asset, path, input.color, input.brush, asset.seamless, input.offset)
  const end = path.at(-1)!
  return paintTexture(
    asset,
    shapeTexels(input.shape, input.from, end, input.filled),
    input.color,
    input.filled ? 1 : input.brush,
    asset.seamless,
    input.offset,
  )
}
