/** Authorial read capability for the existing local authority and causal outbox. A cloud upload
 * has a separate capability check; storing a revision on this device never declares it uploaded. */
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import { pintaAssetSchema, sanitizePintaAsset, sanitizeRegionTilemapAsset } from '../core/project'
import { galleryBackupByteLength } from '../export/projectJson'
import type { RegionBackupSizeCache } from '../export/regionBackupSize'
import {
  attachWorkshopBook,
  isLegacyWorkshopAsset,
  isWorkshopNativeMap,
  isWorkshopProjectedMap,
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
  pintaWorkshopBody,
} from '../export/workshopDocument'
import { sanitizeWorkshopProjectedMap } from '../export/workshopProjection'
import { type AutomapBook, readAutomapBook } from '../tiles/automapping/book'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { automapDocumentEnvelope } from '../tiles/automapping/native'
import {
  createLocalRegionAssetAuthority,
  isLocalRegionAsset,
  sanitizeLocalRegionAsset,
  stampLocalRegionAsset,
} from './localRegionAssetAuthority'
import { openLocalRegionAuthorSession } from './localRegionAuthorSession'
import { readRegionCaptureSnapshot } from './localRegionCapture'
import {
  type LocalRegionCausalBinding,
  persistLocalRegionRevision,
  readLocalRegionGalleryIndex,
} from './localRegionEditing'
import {
  captureLocalPintaAssetForImage,
  createLocalPintaPersistence,
  getPintaStorageNamespace,
  type LocalPersistenceFormat,
  type PintaCaptureOptions,
  type PintaPersistence,
} from './persistence'
import { createWorkshopStorageCodec } from './workshopStorageCodec'

/** One native-9 classification: a rulebook map or a projected map, with or without its book. */
export function workshopNativeSchema(asset: PintaWorkshopAsset): number {
  if (isWorkshopNativeMap(asset)) return 9
  return isLocalRegionAsset(asset) ? 8 : pintaAssetSchema(asset)
}
/** The same native-9 policy as the documents: the projected body, else the rulebook map. */
export function sanitizeWorkshopAsset(raw: unknown): PintaWorkshopAsset | null {
  if (!raw || typeof raw !== 'object' || !('schema' in raw) || raw.schema !== 9)
    return sanitizeLocalRegionAsset(raw)
  if ('projection' in raw) return sanitizeWorkshopProjectedMap(raw)
  if (!('kind' in raw) || raw.kind !== 'tilemap' || !('automapping' in raw)) return null
  const { schema: _version, automapping, ...body } = raw
  const book = readAutomapBook(JSON.stringify(automapping))
  if (!book) return null
  const parsed =
    'origin' in body
      ? sanitizeRegionTilemapAsset({ ...body, schema: 8 })
      : sanitizePintaAsset({ ...body, schema: 7 })
  if (parsed?.kind !== 'tilemap') return null
  const { schema: _prior, ...read } = parsed
  if (!pintaValuesEqual(body, read)) return null
  return attachWorkshopBook(parsed, book)
}
function stamp(asset: PintaWorkshopAsset): PintaWorkshopAsset {
  if (!isWorkshopNativeMap(asset)) return stampLocalRegionAsset(asset)
  if (!sanitizeWorkshopAsset(asset))
    throw new PintaLocalStorageError(
      isWorkshopProjectedMap(asset)
        ? 'Não consegui conferir este mapa inteiro. Seus dados foram mantidos.'
        : 'As regras do mapa são incompatíveis. Seus dados foram mantidos.',
    )
  return asset
}
/** The gallery backup this policy writes: one envelope per native-9 map, in the same order. */
export function workshopBackupSize(
  sizing: RegionBackupSizeCache,
  assets: readonly PintaWorkshopAsset[],
) {
  const books = new Map<string, AutomapBook>()
  const bodies: PintaWorkshopAsset[] = []
  for (const asset of assets) {
    if (isWorkshopProjectedMap(asset)) {
      bodies.push(asset)
      continue
    }
    if (isPintaAuthoredMap(asset)) books.set(asset.id, asset.automapping)
    bodies.push(pintaWorkshopBody(asset))
  }
  if (books.size || bodies.some(isWorkshopProjectedMap))
    return sizing.byteLength(bodies, (items) => automapDocumentEnvelope(items, books))
  return assets.every(isLegacyWorkshopAsset)
    ? galleryBackupByteLength(assets)
    : sizing.byteLength(assets)
}
function workshopPolicy(): LocalPersistenceFormat<PintaWorkshopAsset> {
  return {
    authority: createLocalRegionAssetAuthority({
      sanitize: sanitizeWorkshopAsset,
      stamp,
      schema: workshopNativeSchema,
      size: workshopBackupSize,
    }),
    stamp,
    codec: createWorkshopStorageCodec(sanitizeWorkshopAsset),
    strictCapture: true,
    encodeCandidate(asset) {
      const json = pintaWorkshopAssetToJson(asset)
      if (!json) throw new PintaLocalStorageError('O documento não pode ser guardado por inteiro.')
      const schema = workshopNativeSchema(asset)
      return {
        json,
        formatVersion: schema === 9 ? 8 : schema === 8 ? 7 : pintaWriteFormatVersion(asset.kind),
      }
    },
    decodeCandidate: pintaWorkshopAssetFromJson,
  }
}
export function createWorkshopPintaPersistence(
  options: { namespace?: string; guardCausalWrites?: boolean } = {},
) {
  const namespace = options.namespace ?? getPintaStorageNamespace()
  const local = createLocalPintaPersistence({ ...options, namespace }, workshopPolicy())
  const persistRevision: NonNullable<
    PintaPersistence<PintaWorkshopAsset>['persistRevision']
  > = async (previous, asset, resources) => {
    if (
      !isWorkshopProjectedMap(previous) &&
      !isWorkshopProjectedMap(asset) &&
      isLocalRegionAsset(previous) &&
      isLocalRegionAsset(asset) &&
      previous.schema === 8 &&
      asset.schema === 8 &&
      (await persistLocalRegionRevision(namespace, previous, asset, resources))
    )
      return
    await local.persistAsset(asset, { resources })
  }
  return {
    ...local,
    workshopReader: true as const,
    observesReferences: true as const,
    persistRevision,
    openRegionSession: (id: string, signal?: AbortSignal, causal?: LocalRegionCausalBinding) =>
      openLocalRegionAuthorSession(namespace, id, signal, causal),
    listGalleryIndex: () => readLocalRegionGalleryIndex(namespace),
  }
}
export function captureWorkshopPintaAssetForImage(id: string, options: PintaCaptureOptions = {}) {
  return captureLocalPintaAssetForImage(
    id,
    { ...options, includeSceneMaps: options.includeSceneMaps ?? true },
    workshopPolicy(),
    readRegionCaptureSnapshot,
  )
}
