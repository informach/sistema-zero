import { awaitWithSignal } from '@sistemazero/core/http'
import { readPngDataUrl, readPngDimensions } from '@sistemazero/core/studio/pinta-png-binary'
import {
  PINTA_REGION_IMAGE_PNG_LIMITS as limits,
  type PintaRegionWorldBudget,
} from '@sistemazero/core/studio/pinta-region-image-limits'
import type { readPintaRegionImageWorld } from '@sistemazero/core/studio/pinta-region-image-world'
// O esquema mora no core: este módulo entra por tabela no `projectAssets` (carregador 3D, player,
// lista inicial), e um `zod` importado daqui levava a segunda versão do zod para esses pacotes.
import {
  type PintaRegionalMarker,
  PintaRegionalMarkerSchema,
  PintaRegionalSourceIdSchema,
} from '@sistemazero/core/studio/pinta-regional-marker'
import { digestAssetBytes, encodeAssetBase64 } from './assetBinary'

export type { PintaRegionalMarker }

const PNG_URL_PREFIX = 'data:image/png;base64,'

/** Shape only. Do not use the marker alone to admit pixels or a scene. */
export function readPintaRegionalMarker(value: unknown): PintaRegionalMarker {
  return Object.freeze(PintaRegionalMarkerSchema.parse(value))
}

/** An asset may carry private provenance; callers still need to admit its PNG. */
export function pintaRegionalMarkerOf(asset: object): PintaRegionalMarker | undefined {
  return 'regional' in asset ? readPintaRegionalMarker(asset.regional) : undefined
}

interface RegionalBinding {
  sourceId: string
  width: number
  height: number
  regional?: unknown
  scene?: unknown
  tilemap?: unknown
  tilemapFront?: unknown
  sprite?: unknown
  tileset?: unknown
  pintaImage?: unknown
}

type RegionalMaterialInput = RegionalBinding &
  ({ dataUrl: string; png?: never } | { png: Uint8Array; dataUrl?: never })

export interface AdmittedPintaRegionalMaterial {
  /** The only persistent scene source. Same PNG bytes as the input. */
  readonly dataUrl: string
  readonly regional: PintaRegionalMarker
  /** Use in memory for this capture. No decoded indices belong in the asset document. */
  readonly world: ReturnType<typeof readPintaRegionImageWorld>
}

function invalid(): never {
  throw new Error(
    'Os dados do PNG diferem dos dados do cenário do Pinta. A versão original foi preservada.',
  )
}

function capturePng(input: RegionalMaterialInput): {
  bytes: Uint8Array<ArrayBuffer>
  dataUrl: string
  width: number
  height: number
} {
  const { dataUrl, png } = input
  if (typeof dataUrl === 'string' && png === undefined)
    return { dataUrl, ...readPngDataUrl(dataUrl, limits) }
  if (
    dataUrl !== undefined ||
    !(png instanceof Uint8Array) ||
    png.byteLength > limits.imageBytes ||
    PNG_URL_PREFIX.length + 4 * Math.ceil(png.byteLength / 3) > limits.dataUrlChars
  )
    invalid()
  // Buffer.slice() can alias its caller, unlike the owned bytes needed for SHA and admission.
  const bytes = new Uint8Array(png.byteLength)
  bytes.set(png)
  const size = readPngDimensions(bytes, limits)
  return { bytes, dataUrl: PNG_URL_PREFIX + encodeAssetBase64(bytes), ...size }
}

/** Private capture for a producer or verifier. Existing stored assets must supply their marker.
 * All input is captured before awaiting the digest or loading the bounded world reader.
 */
export async function admitPintaRegionalMaterial(
  input: RegionalMaterialInput,
  signal?: AbortSignal,
  remaining?: PintaRegionWorldBudget,
): Promise<AdmittedPintaRegionalMaterial> {
  signal?.throwIfAborted()
  const {
    sourceId,
    width,
    height,
    regional,
    scene,
    tilemap,
    tilemapFront,
    sprite,
    tileset,
    pintaImage,
  } = input
  if (
    !PintaRegionalSourceIdSchema.safeParse(sourceId).success ||
    scene !== undefined ||
    tilemap !== undefined ||
    tilemapFront !== undefined ||
    sprite !== undefined ||
    tileset !== undefined ||
    pintaImage !== undefined
  )
    invalid()
  const marker = regional === undefined ? undefined : readPintaRegionalMarker(regional)
  const budget = remaining ? { ...remaining } : undefined
  if (marker && marker.sourceId !== sourceId) invalid()
  const captured = capturePng(input)
  if (captured.width !== width || captured.height !== height) invalid()
  const digest = () => digestAssetBytes(captured.bytes)
  const sha256 = signal ? await awaitWithSignal(digest, signal) : await digest()
  signal?.throwIfAborted()
  if (marker && marker.sha256 !== sha256) invalid()

  const { readPintaRegionImageWorld } = await import(
    '@sistemazero/core/studio/pinta-region-image-world'
  )
  signal?.throwIfAborted()
  const world = readPintaRegionImageWorld(captured.bytes, budget)
  if (world.rootId !== sourceId) invalid()
  signal?.throwIfAborted()
  const material = {
    dataUrl: captured.dataUrl,
    regional: marker ?? Object.freeze({ dataVersion: 5 as const, sourceId, sha256 }),
    world,
  }
  // Copying or serializing the material preserves only its PNG and marker.
  Object.defineProperty(material, 'world', { enumerable: false })
  return Object.freeze(material)
}
