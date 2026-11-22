/** Private PNG-5 metadata reader. Public recipes/runtime feature declarations stay unchanged. */
import { z } from 'zod'
import { PINTA_IMAGE_WORLD_LIMITS, PintaImageWorldSchema } from './pinta-image'
import { type PintaRegionScene, preparePintaRegionScene } from './pinta-region-scene'

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

export interface PintaRegionImagePlan {
  readonly id: string
  readonly name: string
  readonly scale: number
  readonly indexBytes: number
  readonly world?: {
    readonly rootId: string
    readonly maps: readonly Readonly<{ id: string; name: string; png: string }>[]
  }
  /** One attempt after all linked headers have been admitted. */
  decode(): PintaRegionImageData | null
}

/** JSON after bounded PNG decompression; linked PNG payloads belong to the world's loader. */
export function readPintaRegionImageData(
  text: string,
  maxIndexBytes = PINTA_REGION_IMAGE_MAX_INDEX_BYTES,
): PintaRegionImageData | null {
  return preparePintaRegionImageData(text, maxIndexBytes)?.decode() ?? null
}

/** Private immutable header snapshot; no cell payload is decoded here. */
export function preparePintaRegionImageData(
  text: string,
  maxIndexBytes = PINTA_REGION_IMAGE_MAX_INDEX_BYTES,
): PintaRegionImagePlan | null {
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
    const scene = preparePintaRegionScene(JSON.stringify(raw), maxIndexBytes)
    if (!scene) return null
    return Object.freeze({
      id: scene.id,
      name: data.name,
      scale: data.scale,
      indexBytes: scene.indexBytes,
      ...(data.world
        ? {
            world: Object.freeze({
              rootId: data.world.rootId,
              maps: Object.freeze(data.world.maps.map((map) => Object.freeze({ ...map }))),
            }),
          }
        : {}),
      decode(): PintaRegionImageData | null {
        const decoded = scene.decode()
        return decoded ? { ...data, scene: decoded } : null
      },
    })
  } catch {
    return null
  }
}

/** All PNGs must first be extracted by a bounded, CRC-validating PNG reader.
 * The resolver receives the captured descriptor and remaining decompression budget.
 * This boundary admits metadata/indices only, not PNG pixel or image allocations.
 * No map is returned until every header and every decoded scene has passed.
 */
export function readPintaRegionImageWorldMetadata(
  rootText: string,
  resolveLinked: (
    map: Readonly<{ id: string; name: string; png: string }>,
    remainingMetadataBytes: number,
  ) => string | null,
): ReadonlyMap<string, PintaRegionImageData> | null {
  try {
    let metadataBytes = 0
    const admitText = (text: string): boolean => {
      const remaining = PINTA_REGION_IMAGE_MAX_JSON_BYTES - metadataBytes
      if (typeof text !== 'string' || text.length > remaining) return false
      metadataBytes += new TextEncoder().encode(text).byteLength
      return metadataBytes <= PINTA_REGION_IMAGE_MAX_JSON_BYTES
    }
    if (!admitText(rootText)) return null
    const root = preparePintaRegionImageData(rootText)
    if (!root) return null
    const plans = [root]
    let indexBytes = root.indexBytes
    for (const descriptor of root.world?.maps ?? []) {
      const text = resolveLinked(descriptor, PINTA_REGION_IMAGE_MAX_JSON_BYTES - metadataBytes)
      if (text === null || !admitText(text)) return null
      const plan = preparePintaRegionImageData(
        text,
        PINTA_REGION_IMAGE_MAX_INDEX_BYTES - indexBytes,
      )
      if (
        !plan ||
        plan.world ||
        plan.id !== descriptor.id ||
        plan.name !== descriptor.name ||
        plan.scale !== root.scale
      )
        return null
      indexBytes += plan.indexBytes
      plans.push(plan)
    }
    const result = new Map<string, PintaRegionImageData>()
    for (const plan of plans) {
      const data = plan.decode()
      if (!data) return null
      result.set(plan.id, data)
    }
    return result
  } catch {
    return null
  }
}
