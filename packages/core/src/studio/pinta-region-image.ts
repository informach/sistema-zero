/** Private PNG-5 metadata reader. Public recipes/runtime feature declarations stay unchanged. */
import { z } from 'zod'
import { PINTA_IMAGE_WORLD_LIMITS, PintaImageWorldSchema } from './pinta-image'
import { type PintaRegionScene, readPintaRegionScene } from './pinta-region-scene'

export const PINTA_REGION_IMAGE_DATA_VERSION = 5
export const PINTA_REGION_IMAGE_MAX_JSON_BYTES = PINTA_IMAGE_WORLD_LIMITS.metadataBytes
export const PINTA_REGION_IMAGE_MAX_INDEX_BYTES =
  PINTA_IMAGE_WORLD_LIMITS.cells * Int16Array.BYTES_PER_ELEMENT

const header = z.strictObject({
  format: z.literal('pinta'),
  version: z.literal(PINTA_REGION_IMAGE_DATA_VERSION),
  kind: z.literal('map'),
  name: z.string().max(48),
  scale: z.number().positive().max(PINTA_IMAGE_WORLD_LIMITS.dimension),
  // Wire scene only. Memory cells must never be passed through JSON.stringify as the transport.
  scene: z.unknown(),
  world: PintaImageWorldSchema.optional(),
})

export type PintaRegionImageData = Omit<z.infer<typeof header>, 'scene'> & {
  scene: PintaRegionScene
}

/** JSON after bounded PNG decompression; linked PNG payloads belong to the world's loader. */
export function readPintaRegionImageData(
  text: string,
  maxIndexBytes = PINTA_REGION_IMAGE_MAX_INDEX_BYTES,
): PintaRegionImageData | null {
  try {
    if (
      !Number.isSafeInteger(maxIndexBytes) ||
      maxIndexBytes < 0 ||
      maxIndexBytes > PINTA_REGION_IMAGE_MAX_INDEX_BYTES ||
      typeof text !== 'string' ||
      text.length > PINTA_REGION_IMAGE_MAX_JSON_BYTES ||
      new TextEncoder().encode(text).byteLength > PINTA_REGION_IMAGE_MAX_JSON_BYTES
    )
      return null
    const parsed = header.safeParse(JSON.parse(text))
    if (!parsed.success) return null
    const data = parsed.data,
      raw = data.scene
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      !('name' in raw) ||
      raw.name !== data.name ||
      !('id' in raw) ||
      (data.world && data.world.rootId !== raw.id) ||
      !('physics' in raw) ||
      (raw.physics !== 'legacy' && raw.physics !== 'precise') ||
      !('tileSize' in raw) ||
      typeof raw.tileSize !== 'number'
    )
      return null
    const size = raw.tileSize * data.scale
    if (
      size < 1 ||
      size > PINTA_IMAGE_WORLD_LIMITS.dimension ||
      Math.abs(size - Math.round(size)) > 1e-9
    )
      return null
    const scene = readPintaRegionScene(JSON.stringify(raw), maxIndexBytes)
    return scene ? { ...data, scene } : null
  } catch {
    return null
  }
}
