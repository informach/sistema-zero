import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import type { PintaRegionalMarker } from './pintaRegionalMaterial'
import { hasRegionalPintaReference, UNSUPPORTED_PINTA_REGION } from './pintaRegionalReference'

type Asset = Record<string, unknown>
const ASSET_BINDING = [
  'id',
  'dataUrl',
  'width',
  'height',
  'kind',
  'source',
  'proPath',
  'libOrigin',
  'libId',
] as const
const LEGACY_FIELDS = [
  'scene',
  'tilemap',
  'tilemapFront',
  'sprite',
  'tileset',
  'pintaImage',
] as const
type Admission = Pick<Asset, (typeof ASSET_BINDING)[number]> & {
  readonly regional: PintaRegionalMarker
}

declare const regionalProof: unique symbol
export type PintaRegionalProjectAdmissions = { readonly [regionalProof]: true }
const verified = new WeakMap<
  PintaRegionalProjectAdmissions,
  ReadonlyMap<string, Readonly<Admission>>
>()

export function admittedRegionalMarker(
  asset: Asset,
  admissions?: PintaRegionalProjectAdmissions,
): PintaRegionalMarker | undefined {
  if (!admissions || typeof asset.id !== 'string') return undefined
  const entry = verified.get(admissions)?.get(asset.id)
  const input = asset.regional as PintaRegionalMarker | undefined
  if (
    !entry ||
    !input ||
    ASSET_BINDING.some((field) => entry[field] !== asset[field]) ||
    LEGACY_FIELDS.some((field) => asset[field] !== undefined) ||
    input.sourceId !== entry.regional.sourceId ||
    input.sha256 !== entry.regional.sha256 ||
    input.dataVersion !== entry.regional.dataVersion
  )
    return undefined
  return entry.regional
}

/** Capture a complete PNG world once per asset. The durable projection carries no decoded data. */
export async function admitRegionalProjectAssets(
  assets: unknown,
  signal?: AbortSignal,
): Promise<PintaRegionalProjectAdmissions> {
  const admitted = new Map<string, Readonly<Admission>>()
  const proof = Object.freeze({}) as PintaRegionalProjectAdmissions
  verified.set(proof, admitted)
  if (!Array.isArray(assets)) return proof
  const records: readonly unknown[] = assets
  const { PROJECT_ASSET_LIMITS } = await import('./projectAssets')
  const paths = new Map<string, number>()
  let chars = 0
  if (
    records.length > PROJECT_ASSET_LIMITS.maxAssetsCount ||
    records.some((asset) => {
      if (asset && typeof asset === 'object') {
        const { dataUrl, proPath } = asset as Asset
        if (typeof dataUrl === 'string') chars += dataUrl.length
        if (typeof proPath === 'string') paths.set(proPath, (paths.get(proPath) ?? 0) + 1)
      }
      return chars > PROJECT_ASSET_LIMITS.maxAssetsTotalChars
    })
  )
    throw new Error('Os materiais excedem o espaço do projeto. Os originais foram preservados.')
  const ids = new Set<string>()
  let imagePixels = 0
  for (const raw of records) {
    if (!raw || typeof raw !== 'object') continue
    const rawId = (raw as Asset).id
    if (typeof rawId === 'string') {
      if (ids.has(rawId)) throw new Error('Dois materiais usam o mesmo identificador.')
      ids.add(rawId)
    }
    if (!hasRegionalPintaReference(raw)) continue
    signal?.throwIfAborted()
    const asset = raw as Asset
    const { id, dataUrl, width, height, proPath, libId, libOrigin, kind, source } = asset
    if (
      typeof id !== 'string' ||
      !id ||
      admitted.has(id) ||
      typeof dataUrl !== 'string' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      kind !== 'image' ||
      !asset.regional ||
      (source !== 'upload' && source !== 'library') ||
      libOrigin === 'molda' ||
      LEGACY_FIELDS.some((field) => asset[field] !== undefined) ||
      (proPath !== undefined &&
        (typeof proPath !== 'string' || !/\.png$/i.test(proPath) || paths.get(proPath) !== 1))
    )
      throw new Error(UNSUPPORTED_PINTA_REGION)
    const marker = asset.regional as { sourceId?: unknown }
    if (
      typeof marker.sourceId !== 'string' ||
      (libId !== undefined && (libOrigin !== 'pinta' || libId !== `personal:${marker.sourceId}`))
    )
      throw new Error(UNSUPPORTED_PINTA_REGION)
    const { admitPintaRegionalMaterial } = await import('./pintaRegionalMaterial')
    const { regional, world } = await admitPintaRegionalMaterial(
      {
        sourceId: marker.sourceId,
        regional: asset.regional,
        dataUrl,
        width,
        height,
      },
      signal,
    )
    imagePixels += world.imagePixels
    if (imagePixels > PINTA_IMAGE_WORLD_LIMITS.totalImagePixels) {
      throw new Error(
        'Os cenários excedem o limite de imagens do projeto. Os originais foram preservados.',
      )
    }
    admitted.set(
      id,
      Object.freeze({
        id,
        dataUrl,
        width,
        height,
        kind,
        source,
        proPath,
        libId,
        libOrigin,
        regional,
      }),
    )
  }
  return proof
}
