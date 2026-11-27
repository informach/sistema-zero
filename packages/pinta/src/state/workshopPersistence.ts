/** Authorial read capability for the existing local authority and causal outbox. A cloud upload
 * has a separate capability check; storing a revision on this device never declares it uploaded. */
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import { COPY } from '../core/copy'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import { pintaAssetSchema, sanitizePintaAsset, sanitizeRegionTilemapAsset } from '../core/project'
import { workshopBackupSize } from '../export/workshopBackupSize'
import {
  attachWorkshopBook,
  isWorkshopNativeMap,
  isWorkshopProjectedMap,
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
} from '../export/workshopDocument'
import { sanitizeWorkshopProjectedMap } from '../export/workshopProjection'
import { readAutomapBook } from '../tiles/automapping/book'
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
/**
 * The highest native document this workshop may write. Regions (native 8, cloud 7) and rulebooks
 * or projections (native 9, cloud 8) are separate gates: an account writer that only announces
 * cloud 7 must not stage a native-9 revision that its own queue would refuse forever.
 */
export type WorkshopNativeCeiling = 8 | 9

export const WORKSHOP_NATIVE_CEILING_MESSAGE = COPY.editor.nativeWriterUnavailable

function stampFor(ceiling: WorkshopNativeCeiling) {
  return (asset: PintaWorkshopAsset): PintaWorkshopAsset => {
    if (!isWorkshopNativeMap(asset)) return stampLocalRegionAsset(asset)
    if (ceiling < 9) throw new PintaLocalStorageError(WORKSHOP_NATIVE_CEILING_MESSAGE)
    if (!sanitizeWorkshopAsset(asset))
      throw new PintaLocalStorageError(
        isWorkshopProjectedMap(asset)
          ? 'Não consegui conferir este mapa inteiro. Seus dados foram mantidos.'
          : 'As regras do mapa são incompatíveis. Seus dados foram mantidos.',
      )
    return asset
  }
}

export { workshopBackupSize } from '../export/workshopBackupSize'

function workshopPolicy(
  ceiling: WorkshopNativeCeiling = 9,
): LocalPersistenceFormat<PintaWorkshopAsset> {
  const stamp = stampFor(ceiling)
  const readAuthority = createLocalRegionAssetAuthority({
    sanitize: sanitizeWorkshopAsset,
    stamp: stampFor(9),
    schema: workshopNativeSchema,
    size: workshopBackupSize,
  })
  return {
    authority: createLocalRegionAssetAuthority({
      sanitize: sanitizeWorkshopAsset,
      stamp,
      schema: workshopNativeSchema,
      size: workshopBackupSize,
    }),
    applyReadTransitions: readAuthority.applyAssetTransitions,
    stamp,
    codec: createWorkshopStorageCodec(sanitizeWorkshopAsset),
    strictCapture: true,
    encodeCandidate(asset) {
      const json = pintaWorkshopAssetToJson(asset)
      if (!json) throw new PintaLocalStorageError('O documento não pode ser guardado por inteiro.')
      const schema = workshopNativeSchema(asset)
      if (schema > ceiling) throw new PintaLocalStorageError(WORKSHOP_NATIVE_CEILING_MESSAGE)
      return {
        json,
        formatVersion: schema === 9 ? 8 : schema === 8 ? 7 : pintaWriteFormatVersion(asset.kind),
      }
    },
    decodeCandidate: pintaWorkshopAssetFromJson,
  }
}
export function createWorkshopPintaPersistence(
  options: {
    namespace?: string
    guardCausalWrites?: boolean
    /** Default 9 (local qualification). The account host of the regions gate passes 8. */
    nativeCeiling?: WorkshopNativeCeiling
  } = {},
) {
  const { nativeCeiling, ...storage } = options
  const namespace = storage.namespace ?? getPintaStorageNamespace()
  const local = createLocalPintaPersistence(
    { ...storage, namespace },
    workshopPolicy(nativeCeiling),
  )
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
    nativeWriterVersion: nativeCeiling ?? 9,
    observesReferences: true as const,
    persistRevision,
    openRegionSession: (id: string, signal?: AbortSignal, causal?: LocalRegionCausalBinding) =>
      openLocalRegionAuthorSession(namespace, id, signal, causal),
    /** `causal`: the account writer reads the index beside its V4 queue (see the account mirror). */
    listGalleryIndex: (options?: { causal?: true }) =>
      readLocalRegionGalleryIndex(namespace, options?.causal === true),
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
