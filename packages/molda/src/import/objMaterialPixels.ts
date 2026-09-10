import { linearUnitToSrgb, srgbUnitToLinear } from '../core/colorTransfer'
import { reverseRgbaRowsInPlace } from '../core/rgbaRows'
import type { MtlRgbSpace, MtlTextureSample } from './mtlTexturePlanTypes'
import type { RasterPixels } from './rasterPng'

export interface ObjImageSource {
  index: number
  path: string
  raster: RasterPixels
}
export interface ObjColorImageSample {
  source: ObjImageSource
  rgbSpace: MtlRgbSpace
  range: [number, number]
}
export interface ObjScalarImageSample {
  source: ObjImageSource
  sample: Extract<MtlTextureSample, { kind: 'scalar' }>
  range: [number, number]
}
export type ObjImageRecipe =
  | { kind: 'normal'; source: ObjImageSource }
  | { kind: 'scalar'; scalar: ObjScalarImageSample }
  | {
      kind: 'color'
      color: ObjColorImageSample | null
      opacity: ObjScalarImageSample | null
      /** Linear RGB and straight alpha; not a background under the painted image. */
      factor: [number, number, number, number]
      colorAlpha: 'ignore' | 'multiply'
    }

const maximum = (raster: RasterPixels) => (raster.depth === 16 ? 65_535 : 255)
function linear(value: number, space: MtlRgbSpace) {
  return space === 'srgb' ? srgbUnitToLinear(value) : value
}
function scalarReader({ source, sample, range }: ObjScalarImageSample) {
  const { rgba } = source.raster,
    max = maximum(source.raster),
    channel =
      sample.channel === 'r' ? 0 : sample.channel === 'g' ? 1 : sample.channel === 'b' ? 2 : 3
  return (offset: number) => {
    const value =
        sample.channel === 'l'
          ? 0.2126 * linear(rgba[offset]! / max, sample.rgbSpace) +
            0.7152 * linear(rgba[offset + 1]! / max, sample.rgbSpace) +
            0.0722 * linear(rgba[offset + 2]! / max, sample.rgbSpace)
          : sample.channel === 'm'
            ? rgba[offset + 3]! / max
            : linear(rgba[offset + channel]! / max, sample.rgbSpace),
      mapped = range[0] + range[1] * value
    return sample.invert ? 1 - mapped : mapped
  }
}

/** Only called after the complete native image budget was planned. No source pixel mutation. */
export function materializeObjPixels(recipe: ObjImageRecipe, width: number, height: number) {
  const pixels = new Uint8Array(width * height * 4)
  if (recipe.kind === 'normal') {
    const { rgba, depth } = recipe.source.raster,
      divisor = depth === 16 ? 257 : 1
    for (let offset = 0; offset < pixels.length; offset += 4) {
      for (let c = 0; c < 3; c++) pixels[offset + c] = Math.round(rgba[offset + c]! / divisor)
      pixels[offset + 3] = 255
    }
    reverseRgbaRowsInPlace(pixels, width, height)
    return pixels
  }
  if (recipe.kind === 'scalar') {
    const read = scalarReader(recipe.scalar)
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const value = Math.round(read(offset) * 255)
      pixels[offset] = value
      pixels[offset + 1] = value
      pixels[offset + 2] = value
      pixels[offset + 3] = 255
    }
    reverseRgbaRowsInPlace(pixels, width, height)
    return pixels
  }
  const { color, opacity, factor } = recipe,
    colorRaster = color?.source.raster,
    colorMax = colorRaster ? maximum(colorRaster) : 1,
    readOpacity = opacity ? scalarReader(opacity) : null,
    opacityWidth = opacity?.source.raster.width ?? width,
    opacityHeight = opacity?.source.raster.height ?? height,
    solid = factor.slice(0, 3).map((value) => Math.round(linearUnitToSrgb(value) * 255))
  for (let y = 0; y < height; y++) {
    const opacityY = Math.floor(((y + 0.5) * opacityHeight) / height)
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      for (let c = 0; c < 3; c++)
        pixels[offset + c] =
          color && colorRaster
            ? Math.round(
                linearUnitToSrgb(
                  (color.range[0] +
                    color.range[1] *
                      linear(colorRaster.rgba[offset + c]! / colorMax, color.rgbSpace)) *
                    factor[c]!,
                ) * 255,
              )
            : solid[c]!
      const mask = readOpacity
          ? readOpacity(
              (opacityY * opacityWidth + Math.floor(((x + 0.5) * opacityWidth) / width)) * 4,
            )
          : 1,
        alpha =
          colorRaster && recipe.colorAlpha === 'multiply'
            ? colorRaster.rgba[offset + 3]! / colorMax
            : 1
      pixels[offset + 3] = Math.round(factor[3] * mask * alpha * 255)
    }
  }
  reverseRgbaRowsInPlace(pixels, width, height)
  return pixels
}
