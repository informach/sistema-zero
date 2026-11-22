/** Private encoded-world admission. Pixel decoding and engine-specific surfaces belong to adapters. */
import { assertPintaImageDimensions } from './pinta-image'
import { pngBytes, readPngDimensions } from './pinta-png-binary'
import { type PintaRegionImageData, readPintaRegionImageWorldMetadata } from './pinta-region-image'
import {
  PINTA_REGION_IMAGE_PNG_LIMITS as limits,
  WORLD_BUDGET_MESSAGE,
} from './pinta-region-image-limits'
import { readPintaPngText } from './pinta-region-png-text'

export interface PintaRegionWorldMap {
  data: PintaRegionImageData
  png: Uint8Array<ArrayBuffer>
  width: number
  height: number
}
export interface PintaRegionWorldImage {
  png: Uint8Array<ArrayBuffer>
  width: number
  height: number
  scaledWidth: number
  scaledHeight: number
}

function invalid(): never {
  throw new Error('Não consegui conferir todas as imagens deste cenário. O desenho foi mantido.')
}

/** Captures every linked PNG from the root's own descriptors, without network or filenames.
 * Complete metadata/index admission and encoded-image pixel budgets precede any engine allocation.
 * Source + scaled geometry must fit; the total counts each retained URL once, as runtime caches do.
 */
export function readPintaRegionImageWorld(source: Uint8Array): {
  rootId: string
  maps: ReadonlyMap<string, PintaRegionWorldMap>
  images: ReadonlyMap<string, PintaRegionWorldImage>
  imagePixels: number
} {
  const root = readPintaPngText(source)
  const covers = new Map<string, ReturnType<typeof readPintaPngText>>()
  let imagePixels = root.width * root.height
  const countPixels = (pixels: number) => {
    imagePixels += pixels
    if (imagePixels > limits.totalImagePixels) throw new Error(WORLD_BUDGET_MESSAGE)
  }
  let sourceFailure: unknown
  const data = readPintaRegionImageWorldMetadata(root.text, (descriptor, remaining) => {
    try {
      const captured = readPintaPngText(pngBytes(descriptor.png, limits), remaining)
      countPixels(captured.width * captured.height)
      covers.set(descriptor.id, captured)
      return captured.text
    } catch (error) {
      sourceFailure = error
      return null
    }
  })
  if (!data) {
    if (sourceFailure !== undefined) throw sourceFailure
    invalid()
  }
  const rootId = data.keys().next().value
  if (typeof rootId !== 'string') invalid()
  covers.set(rootId, root)
  const maps = new Map<string, PintaRegionWorldMap>()
  const images = new Map<string, PintaRegionWorldImage>()
  for (const [id, metadata] of data) {
    const cover = covers.get(id)
    if (!cover) invalid()
    maps.set(id, { data: metadata, png: cover.png, width: cover.width, height: cover.height })
    const capture = (url: string) => {
      let image = images.get(url)
      if (image) return image
      const png = pngBytes(url, limits),
        size = readPngDimensions(png, limits)
      const scaledWidth = Math.round(size.width * metadata.scale),
        scaledHeight = Math.round(size.height * metadata.scale)
      assertPintaImageDimensions(scaledWidth, scaledHeight, limits)
      countPixels(Math.max(size.width * size.height, scaledWidth * scaledHeight))
      image = { png, ...size, scaledWidth, scaledHeight }
      images.set(url, image)
      return image
    }
    for (const sheet of metadata.scene.tilesets) {
      const image = capture(sheet.image)
      if (
        Math.min(sheet.columns, sheet.count) * metadata.scene.tileSize > image.width ||
        Math.ceil(sheet.count / sheet.columns) * metadata.scene.tileSize > image.height
      )
        invalid()
    }
    for (const art of metadata.scene.art ?? []) {
      const image = capture(art.image)
      if (image.width !== art.width || image.height !== art.height) invalid()
    }
  }
  return { rootId, maps, images, imagePixels }
}
