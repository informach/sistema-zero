import { PINTA_REGION_WORLD_BUDGET } from '@sistemazero/core/studio/pinta-region-image-limits'
import {
  type AdmittedPintaRegionalMaterial,
  admitPintaRegionalMaterial,
  type PintaRegionalMarker,
  readPintaRegionalMarker,
} from './pintaRegionalMaterial'
import { hasRegionalPintaReference, UNSUPPORTED_PINTA_REGION } from './pintaRegionalReference'
import { MAX_ASSETS_COUNT, MAX_ASSETS_TOTAL_CHARS } from './projectAssetBudget'
import { ProjectDocumentError } from './projectDocumentGuards'

type Asset = Record<string, unknown>
const ASSET_BINDING = [
  'id',
  'name',
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
type Primitive = string | number | boolean | null | undefined
type MaterialBinding = Readonly<Record<(typeof ASSET_BINDING)[number], Primitive>> & {
  readonly regional?: PintaRegionalMarker
}

declare const regionalProof: unique symbol
export type PintaRegionalProjectAdmissions = { readonly [regionalProof]: true }
const verified = new WeakMap<
  PintaRegionalProjectAdmissions,
  {
    materials: readonly (MaterialBinding | null)[] | null
    markers: ReadonlyMap<string, PintaRegionalMarker>
  }
>()

function primitive(value: unknown): Primitive {
  return value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? value
    : null
}

/** Snapshot only the fields that govern admission, never a caller's nested content graph. */
function bindMaterial(raw: unknown): MaterialBinding | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const asset = raw as Asset
  const binding = {
    id: primitive(asset.id),
    name: primitive(asset.name),
    dataUrl: primitive(asset.dataUrl),
    width: primitive(asset.width),
    height: primitive(asset.height),
    kind: primitive(asset.kind),
    source: primitive(asset.source),
    proPath: primitive(asset.proPath),
    libOrigin: primitive(asset.libOrigin),
    libId: primitive(asset.libId),
  }
  if (!hasRegionalPintaReference(asset)) return binding
  if (!asset.regional || LEGACY_FIELDS.some((field) => asset[field] !== undefined))
    throw new ProjectDocumentError('invalid-document', UNSUPPORTED_PINTA_REGION)
  return { ...binding, regional: readPintaRegionalMarker(asset.regional) }
}

export function assertRegionalProjectAssetProof(
  raw: unknown,
  proof: PintaRegionalProjectAdmissions,
): void {
  const admission = verified.get(proof)
  if (!admission) throw new ProjectDocumentError('invalid-document', UNSUPPORTED_PINTA_REGION)
  const { materials } = admission
  if (!Array.isArray(raw)) {
    if (materials !== null)
      throw new ProjectDocumentError('invalid-document', UNSUPPORTED_PINTA_REGION)
    return
  }
  if (!materials || materials.length !== raw.length)
    throw new ProjectDocumentError('invalid-document', UNSUPPORTED_PINTA_REGION)
  for (const [index, captured] of materials.entries()) {
    const current = bindMaterial(raw[index])
    if (captured === null && current === null) continue
    if (
      !captured ||
      !current ||
      ASSET_BINDING.some((field) => !Object.is(captured[field], current[field])) ||
      captured.regional?.dataVersion !== current.regional?.dataVersion ||
      captured.regional?.sourceId !== current.regional?.sourceId ||
      captured.regional?.sha256 !== current.regional?.sha256
    )
      throw new ProjectDocumentError('invalid-document', UNSUPPORTED_PINTA_REGION)
  }
}

export function admittedRegionalMarker(
  asset: Asset,
  proof?: PintaRegionalProjectAdmissions,
): PintaRegionalMarker | undefined {
  return proof && typeof asset.id === 'string'
    ? verified.get(proof)?.markers.get(asset.id)
    : undefined
}

/** Capture the entire binding synchronously before any PNG inspection yields. */
export async function admitRegionalProjectAssets(
  assets: unknown,
  signal?: AbortSignal,
  visitWorld?: (
    id: string,
    world: AdmittedPintaRegionalMaterial['world'],
    name: string,
  ) => void | Promise<void>,
): Promise<PintaRegionalProjectAdmissions> {
  signal?.throwIfAborted()
  if (Array.isArray(assets) && assets.length > MAX_ASSETS_COUNT)
    throw new Error('Os materiais excedem o espaço do projeto. Os originais foram preservados.')
  const materials = Array.isArray(assets)
    ? Array.from({ length: assets.length }, (_, index) => bindMaterial(assets[index]))
    : null
  const markers = new Map<string, PintaRegionalMarker>()
  const proof = Object.freeze({}) as PintaRegionalProjectAdmissions
  if (!materials) {
    verified.set(proof, { materials, markers })
    return proof
  }
  const paths = new Map<string, number>()
  const names = new Map<string, number>()
  const ids = new Set<string>()
  let chars = 0
  for (const binding of materials) {
    if (!binding) continue
    const { id, name, dataUrl, proPath } = binding
    if (typeof id === 'string') {
      if (ids.has(id)) throw new Error('Dois materiais usam o mesmo identificador.')
      ids.add(id)
    }
    if (typeof dataUrl === 'string') chars += dataUrl.length
    if (binding.kind === 'image' && typeof name === 'string')
      names.set(name, (names.get(name) ?? 0) + 1)
    if (typeof proPath === 'string') {
      const key = proPath.toLowerCase()
      paths.set(key, (paths.get(key) ?? 0) + 1)
    }
  }
  if (chars > MAX_ASSETS_TOTAL_CHARS)
    throw new Error('Os materiais excedem o espaço do projeto. Os originais foram preservados.')

  const remaining = { ...PINTA_REGION_WORLD_BUDGET }
  const worlds: Array<{
    id: string
    name: string
    world: AdmittedPintaRegionalMaterial['world']
  }> = []
  for (const binding of materials) {
    if (!binding?.regional) continue
    signal?.throwIfAborted()
    const { id, name, dataUrl, width, height, proPath, libId, libOrigin, kind, source, regional } =
      binding
    if (
      typeof id !== 'string' ||
      !id ||
      typeof name !== 'string' ||
      !name ||
      names.get(name) !== 1 ||
      typeof dataUrl !== 'string' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      kind !== 'image' ||
      (source !== 'upload' && source !== 'library') ||
      libOrigin === 'molda' ||
      (proPath !== undefined &&
        (typeof proPath !== 'string' ||
          !/\.png$/i.test(proPath) ||
          paths.get(proPath.toLowerCase()) !== 1)) ||
      (libId !== undefined && (libOrigin !== 'pinta' || libId !== `personal:${regional.sourceId}`))
    )
      throw new ProjectDocumentError('invalid-document', UNSUPPORTED_PINTA_REGION)
    const admitted = await admitPintaRegionalMaterial(
      { sourceId: regional.sourceId, regional, dataUrl, width, height },
      signal,
      remaining,
    )
    remaining.imagePixels -= admitted.world.imagePixels
    remaining.indexBytes -= admitted.world.indexBytes
    remaining.metadataBytes -= admitted.world.metadataBytes
    if (visitWorld) worlds.push({ id, name, world: admitted.world })
    markers.set(id, admitted.regional)
  }
  if (visitWorld)
    for (const { id, name, world } of worlds) {
      signal?.throwIfAborted()
      await visitWorld(id, world, name)
    }
  signal?.throwIfAborted()
  verified.set(proof, { materials, markers })
  return proof
}
