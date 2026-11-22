/** Private PNG-5 boundary. The host and public recipe/runtime capabilities do not select it. */
import {
  PINTA_IMAGE_WORLD_LIMITS,
  type PintaImageWorld,
} from '@sistemazero/core/studio/pinta-image'
import { PINTA_STUDIO_LEGACY_LIMITS } from '@sistemazero/core/studio/pinta-limits'
import {
  PINTA_REGION_IMAGE_MAX_JSON_BYTES,
  readPintaRegionImageData,
} from '@sistemazero/core/studio/pinta-region-image'
import { PINTA_REGION_SCENE_MAX_JSON_BYTES } from '@sistemazero/core/studio/pinta-region-scene'
import { JsonByteSizeCache, utf8ByteLength } from '../core/jsonBytes'
import { pngWithPintaJson } from './pngText'
import { readPngDimensions } from './portableImageRender'

const limits = {
  dimension: PINTA_IMAGE_WORLD_LIMITS.dimension,
  imagePixels: PINTA_IMAGE_WORLD_LIMITS.imagePixels,
  totalImagePixels: PINTA_IMAGE_WORLD_LIMITS.totalImagePixels,
  imageBytes: 16 * 1024 * 1024,
  dataUrlChars: PINTA_STUDIO_LEGACY_LIMITS.imageChars,
}

function invalid(): never {
  throw new Error('Não consegui conferir os dados deste cenário. O desenho foi mantido.')
}

/** One map envelope. World's descriptors are validated here; its loader owns nested PNGs. */
export function preparePintaRegionImageData(
  sceneJson: string,
  options: { scale?: number; world?: PintaImageWorld } = {},
) {
  if (
    sceneJson.length > PINTA_REGION_SCENE_MAX_JSON_BYTES ||
    utf8ByteLength(sceneJson) > PINTA_REGION_SCENE_MAX_JSON_BYTES
  )
    invalid()
  let raw: unknown
  try {
    raw = JSON.parse(sceneJson)
  } catch {
    invalid()
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('name' in raw)) invalid()
  const wire = {
    format: 'pinta',
    version: 5,
    kind: 'map',
    name: raw.name,
    scale: options.scale ?? 1,
    scene: raw,
    ...(options.world ? { world: options.world } : {}),
  }
  const bytes = new JsonByteSizeCache(64).byteLength(wire, PINTA_REGION_IMAGE_MAX_JSON_BYTES)
  if (bytes > PINTA_REGION_IMAGE_MAX_JSON_BYTES) invalid()
  const json = JSON.stringify(wire, null, 2),
    data = readPintaRegionImageData(json)
  if (!data) invalid()
  return { json, bytes, data }
}

/** Fresh, bounded PNG cover + the complete structured scene, never flattened authorial data. */
export async function embedPintaRegionImage(
  cover: Uint8Array,
  sceneJson: string,
  options: { scale?: number; world?: PintaImageWorld } = {},
) {
  const metadata = preparePintaRegionImageData(sceneJson, options)
  const size = readPngDimensions(cover, limits)
  const view = new DataView(cover.buffer, cover.byteOffset, cover.byteLength)
  for (let at = 8; at + 12 <= cover.length; ) {
    const length = view.getUint32(at)
    if (
      view.getUint32(at + 4) === 0x69545874 &&
      length >= 6 &&
      cover[at + 8] === 112 &&
      cover[at + 9] === 105 &&
      cover[at + 10] === 110 &&
      cover[at + 11] === 116 &&
      cover[at + 12] === 97 &&
      cover[at + 13] === 0
    )
      throw new Error('Esta imagem já tem dados do Pinta. Prepare uma nova imagem do cenário.')
    at += 12 + length
  }
  const png = await pngWithPintaJson(cover, metadata.json)
  readPngDimensions(png, limits)
  return { png, ...size, metadata }
}
