import type { PintaMemoryAsset } from '../core/assetMemory'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import { pintaAssetSchema } from '../core/project'
import { pintaWorkshopBody } from '../export/workshopDocument'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { LOCAL_ASSET_PREFIX } from './localAssetAuthority'
import type { LocalStorageCodec } from './localChunkStorage'
import { localRegionStorageCodec } from './localRegionChunkStorage'

const STORAGE = 'pinta-authored-map-v1'
function record(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null
}
function invalid(): never {
  throw new PintaLocalStorageError(
    'Não consegui conferir o mapa e as regras guardadas. Seus dados foram mantidos.',
  )
}
function header(key: string, raw: unknown) {
  const value = record(raw)
  if (!key.startsWith(LOCAL_ASSET_PREFIX) || value?.version !== 4 || value.storage !== STORAGE)
    return null
  const body = record(value.body)
  if (
    value.capability !== 9 ||
    typeof value.id !== 'string' ||
    key !== LOCAL_ASSET_PREFIX + value.id ||
    typeof value.revision !== 'string' ||
    !value.revision ||
    !body ||
    body.revision !== value.revision ||
    ![1, 2, 3].includes(Number(body.version)) ||
    record(body.asset)?.id !== value.id ||
    Reflect.ownKeys(value).length !== 7 ||
    !Object.hasOwn(value, 'book')
  )
    invalid()
  return { value, body }
}

/** Native 9 retains its book beside the original physical body. Only that body owns cell buffers. */
export function createWorkshopStorageCodec(
  sanitize: (raw: unknown) => PintaMemoryAsset | null,
): LocalStorageCodec {
  return {
    keys(key, raw) {
      const stored = header(key, raw)
      return localRegionStorageCodec.keys(key, stored?.body ?? raw)
    },
    decode(key, raw, records) {
      const stored = header(key, raw)
      if (!stored) return localRegionStorageCodec.decode(key, raw, records)
      const decoded = record(localRegionStorageCodec.decode(key, stored.body, records))
      const map = record(decoded?.asset)
      if (decoded?.version !== 1 || map?.kind !== 'tilemap' || map.id !== stored.value.id) invalid()
      const asset = sanitize({ ...map, schema: 9, automapping: stored.value.book })
      if (!asset || !isPintaAuthoredMap(asset)) invalid()
      const body = pintaWorkshopBody(asset)
      if (decoded.capability !== ('origin' in body ? 8 : Math.max(5, pintaAssetSchema(body))))
        invalid()
      return { ...decoded, capability: 9, asset }
    },
    encode(key, raw, records) {
      const doc = record(raw)
      if (
        !key.startsWith(LOCAL_ASSET_PREFIX) ||
        doc?.version !== 1 ||
        record(doc.asset)?.schema !== 9
      )
        return localRegionStorageCodec.encode(key, raw, records)
      const asset = sanitize(doc.asset)
      if (
        !asset ||
        !isPintaAuthoredMap(asset) ||
        doc.capability !== 9 ||
        key !== LOCAL_ASSET_PREFIX + asset.id ||
        typeof doc.revision !== 'string' ||
        !doc.revision
      )
        invalid()
      const body = pintaWorkshopBody(asset)
      const encoded = localRegionStorageCodec.encode(
        key,
        {
          ...doc,
          capability: 'origin' in body ? 8 : Math.max(5, pintaAssetSchema(body)),
          asset: body,
        },
        records,
      )
      return {
        document: {
          version: 4,
          storage: STORAGE,
          capability: 9,
          id: asset.id,
          revision: doc.revision,
          body: encoded.document,
          book: asset.automapping,
        },
        chunks: encoded.chunks,
      }
    },
  }
}
