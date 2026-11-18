import { pintaValuesEqual } from './assetEquality'
import { assetBytes } from './assetMemory'
import type {
  AnyTilesetAsset,
  PintaAsset,
  TilemapAsset,
  TilemapResourceVersion,
  VersionablePintaAsset,
} from './project'
import { PINTA_MAX_SCHEMA, PINTA_RESOURCE_LIMITS } from './projectConfig'

export function isVersionablePintaAsset(asset: PintaAsset): asset is VersionablePintaAsset {
  return asset.kind !== 'tilemap' && asset.kind !== 'map-set'
}

export function embeddedTilesetOf(map: TilemapAsset, id = map.tilesetId): AnyTilesetAsset | null {
  const asset = map.resources?.find((version) => version.asset.id === id)?.asset
  return asset && (asset.kind === 'tileset' || asset.kind === 'vector-tileset') ? asset : null
}

/** Leitura atômica: jamais retirar uma versão e deixar suas referências órfãs. */
export function sanitizeMapResourceVersions(
  raw: unknown,
  sanitize: (value: unknown) => PintaAsset | null,
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
    bytes += assetBytes(asset)
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
export function withMapResourceVersions(
  map: TilemapAsset,
  find: (id: string) => PintaAsset | null,
): (id: string) => PintaAsset | null {
  const versions = new Map(
    (map.resources ?? []).map((version) => [version.asset.id, version.asset]),
  )
  return (id) => versions.get(id) ?? find(id)
}
