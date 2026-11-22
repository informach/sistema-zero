import { pintaValuesEqual } from './assetEquality'
import { assetBytes, type PintaMemoryAsset, retainedAssetBytes } from './assetMemory'
import type {
  AnyTilesetAsset,
  PintaAsset,
  TilemapAsset,
  TilemapResourceVersion,
  VersionablePintaAsset,
} from './project'
import { withPintaSchemaStamp } from './project'
import { PINTA_MAX_SCHEMA, PINTA_RESOURCE_LIMITS } from './projectConfig'

export function isVersionablePintaAsset(asset: PintaAsset): asset is VersionablePintaAsset {
  return asset.kind !== 'tilemap' && asset.kind !== 'map-set'
}

export function embeddedTilesetOf(
  map: MapResourceSource & Pick<TilemapAsset, 'tilesetId'>,
  id = map.tilesetId,
): AnyTilesetAsset | null {
  const asset = map.resources?.find((version) => version.asset.id === id)?.asset
  return asset && (asset.kind === 'tileset' || asset.kind === 'vector-tileset') ? asset : null
}

/** Leitura atômica: jamais retirar uma versão e deixar suas referências órfãs. */
export function sanitizeMapResourceVersions(
  raw: unknown,
  sanitize: (value: unknown) => PintaAsset | null,
  measure: (asset: PintaAsset) => number = assetBytes,
): TilemapResourceVersion[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw) || raw.length > PINTA_RESOURCE_LIMITS.maxVersions) return null
  const out: TilemapResourceVersion[] = [],
    ids = new Set<string>()
  let bytes = 0
  for (const entry of raw) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.sourceId !== 'string' ||
      !entry.sourceId.trim() ||
      entry.sourceId.length > 128 ||
      !Number.isSafeInteger(entry.capturedAt) ||
      entry.capturedAt < 0 ||
      !entry.asset ||
      typeof entry.asset !== 'object' ||
      (entry.asset.schema !== undefined &&
        (!Number.isSafeInteger(entry.asset.schema) ||
          entry.asset.schema < 0 ||
          entry.asset.schema > PINTA_MAX_SCHEMA)) ||
      entry.asset.kind === 'tilemap' ||
      entry.asset.kind === 'map-set'
    )
      return null
    const asset = sanitize(entry.asset)
    if (
      !asset ||
      !isVersionablePintaAsset(asset) ||
      asset.id === entry.sourceId ||
      ids.has(asset.id)
    )
      return null
    bytes += measure(asset)
    if (bytes > PINTA_RESOURCE_LIMITS.maxSnapshotBytes) return null
    ids.add(asset.id)
    out.push({ sourceId: entry.sourceId, capturedAt: entry.capturedAt, asset })
  }
  return out
}

/** Ao soltar um conjunto, não perde versões nem resolve colisões de IDs por ordem de chegada. */
export function mergeMapResourceVersions(
  a: readonly TilemapResourceVersion[],
  b: readonly TilemapResourceVersion[],
): TilemapResourceVersion[] | null {
  const byId = new Map(a.map((version) => [version.asset.id, version]))
  let bytes = a.reduce((sum, version) => sum + assetBytes(version.asset), 0)
  if (
    byId.size !== a.length ||
    byId.size > PINTA_RESOURCE_LIMITS.maxVersions ||
    bytes > PINTA_RESOURCE_LIMITS.maxSnapshotBytes
  )
    return null
  for (const version of b) {
    const previous = byId.get(version.asset.id)
    if (previous) {
      if (!pintaValuesEqual(previous, version)) return null
      continue
    }
    bytes += assetBytes(version.asset)
    if (
      byId.size >= PINTA_RESOURCE_LIMITS.maxVersions ||
      bytes > PINTA_RESOURCE_LIMITS.maxSnapshotBytes
    )
      return null
    byId.set(version.asset.id, version)
  }
  return [...byId.values()]
}

/** O ID da cópia imutável é sua versão; as referências continuam resolvidas por ID. */
export interface MapResourceSource {
  readonly resources?: readonly TilemapResourceVersion[]
}

/** Canonical snapshot labels for strict native-8 authoring; future labels are never downgraded. */
export function stampMapResourceVersions(
  source: MapResourceSource,
): TilemapResourceVersion[] | null {
  if (source.resources === undefined) return []
  if (
    !Array.isArray(source.resources) ||
    source.resources.length > PINTA_RESOURCE_LIMITS.maxVersions
  )
    return null
  const result: TilemapResourceVersion[] = []
  for (const version of source.resources) {
    if (!version?.asset || !isVersionablePintaAsset(version.asset)) return null
    const schema = version.asset.schema
    if (
      schema !== undefined &&
      (!Number.isSafeInteger(schema) || schema < 0 || schema > PINTA_MAX_SCHEMA)
    )
      return null
    result.push({ ...version, asset: withPintaSchemaStamp(version.asset) })
  }
  return result
}

/** Strict authoring admits canonical labels, never a lossy repair of a snapshot. */
export function prepareMapResourceVersions(
  source: MapResourceSource,
  sanitize: (value: unknown) => PintaAsset | null,
): TilemapResourceVersion[] | null {
  const stamped = stampMapResourceVersions(source)
  if (!stamped) return null
  const read = sanitizeMapResourceVersions(stamped, sanitize, retainedAssetBytes)
  return read && pintaValuesEqual(stamped, read) ? stamped : null
}

export function withMapResourceVersions(
  map: MapResourceSource,
  find: (id: string) => PintaAsset | null,
): (id: string) => PintaAsset | null
export function withMapResourceVersions(
  map: MapResourceSource,
  find: (id: string) => PintaMemoryAsset | null,
): (id: string) => PintaMemoryAsset | null
export function withMapResourceVersions(
  map: MapResourceSource,
  find: (id: string) => PintaMemoryAsset | null,
): (id: string) => PintaMemoryAsset | null {
  const versions = new Map(
    (map.resources ?? []).map((version) => [version.asset.id, version.asset]),
  )
  return (id) => versions.get(id) ?? find(id)
}
