import { encodePng } from '../export/png'
import { type ModelThumbProjection, projectModelThumb } from '../model/isoThumb'
import type { SkyParams } from '../sky/params'
import { hexToRgb } from './color'
import type { MoldaAsset } from './model'
import { resolvePaletteColors } from './sanitize'
import { bytesToBase64 } from './skinCodec'

export type GalleryPreview =
  | { kind: 'model'; projection: ModelThumbProjection | null; parts: number }
  | { kind: 'texture'; dataUrl: string }
  | { kind: 'sky'; params: SkyParams }

/** Derived, bounded previews. No result retains a document, mesh or source pixel buffer. */
export function prepareGalleryPreview(asset: MoldaAsset): GalleryPreview {
  if (asset.kind === 'model') {
    return { kind: 'model', projection: projectModelThumb(asset), parts: asset.parts.length }
  }
  if (asset.kind === 'sky') return { kind: 'sky', params: structuredClone(asset.params) }
  const width = Math.min(32, asset.bitmap.width)
  const height = Math.min(32, asset.bitmap.height)
  const rgba = new Uint8Array(width * height * 4)
  const colors = resolvePaletteColors(asset).map((color) => (color ? hexToRgb(color) : [0, 0, 0]))
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor((x * asset.bitmap.width) / width)
      const sourceY = Math.floor((y * asset.bitmap.height) / height)
      const index = asset.bitmap.data[sourceY * asset.bitmap.width + sourceX] ?? 0
      if (!index) continue
      const [r = 0, g = 0, b = 0] = colors[index] ?? []
      const offset = (y * width + x) * 4
      rgba.set([r, g, b, 255], offset)
    }
  }
  return {
    kind: 'texture',
    dataUrl: `data:image/png;base64,${bytesToBase64(encodePng(rgba, width, height))}`,
  }
}

export function galleryPreviewBytes(preview: GalleryPreview): number {
  if (preview.kind === 'texture') return 128 + preview.dataUrl.length * 2
  if (preview.kind === 'sky') return 1024
  return (
    128 +
    (preview.projection?.polygons.reduce(
      (bytes, polygon) => bytes + 64 + 2 * (polygon.points.length + polygon.fill.length),
      0,
    ) ?? 0)
  )
}
