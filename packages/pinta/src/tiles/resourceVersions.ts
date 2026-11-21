import { retainedAssetBytes } from '../core/assetMemory'
import { newId } from '../core/id'
import {
  isVersionablePintaAsset,
  type MapResourceSource,
  prepareMapResourceVersions,
  withMapResourceVersions,
} from '../core/mapResourceVersions'
import {
  effectiveLayer,
  isCompatibleMapTileset,
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  type PintaAsset,
  pintaAssetReferenceIds,
  remapTilemapTilesetIds,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapCells,
  type TilemapObject,
  type TilemapResourceVersion,
  tilemapTilesetIds,
} from '../core/project'
import { PINTA_MAX_SCHEMA, PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import type { AuthorMap } from './mapCellEdits'
import { updateMapObject } from './mapObjects'

export type ResourceVersionFailure =
  | 'unsupported'
  | 'missing'
  | 'locked'
  | 'version-limit'
  | 'memory-budget'
  | 'animation-missing'
  | 'layout-changed'
  | 'invalid-resource'
export type ResourceVersionEdit<Map extends AuthorMap = TilemapAsset> =
  | { ok: true; map: Map }
  | { ok: false; reason: ResourceVersionFailure }

/** IDs são preservados ao editar; na cópia importada, a animação mantém seu nome único. */
function animationInSource(
  id: string | undefined,
  previous: PintaAsset | null,
  source: PintaAsset,
): string | undefined | null {
  if (id === undefined) return undefined
  if (source.kind !== 'pixel-sprite' && source.kind !== 'vector-sprite') return null
  if (source.animations.some((animation) => animation.id === id)) return id
  const name =
    previous?.kind === 'pixel-sprite' || previous?.kind === 'vector-sprite'
      ? previous.animations.find((animation) => animation.id === id)?.name
      : undefined
  return name ? (source.animations.find((animation) => animation.name === name)?.id ?? null) : null
}

export function captureMapResourceVersion<Map extends AuthorMap>(
  map: Map,
  source: PintaAsset,
  now = Date.now(),
):
  | { ok: true; map: Map; version: TilemapResourceVersion }
  | { ok: false; reason: ResourceVersionFailure } {
  if (!isVersionablePintaAsset(source)) return { ok: false, reason: 'unsupported' }
  const schema = 'schema' in source ? source.schema : undefined
  if (
    !source.id.trim() ||
    source.id.length > 128 ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    (schema !== undefined &&
      (typeof schema !== 'number' ||
        !Number.isSafeInteger(schema) ||
        schema < 0 ||
        schema > PINTA_MAX_SCHEMA))
  )
    return { ok: false, reason: 'invalid-resource' }
  if ((map.resources?.length ?? 0) >= PINTA_RESOURCE_LIMITS.maxVersions)
    return { ok: false, reason: 'version-limit' }
  const bytes =
    retainedAssetBytes(source) +
    (map.resources ?? []).reduce((sum, version) => sum + retainedAssetBytes(version.asset), 0)
  if (bytes > PINTA_RESOURCE_LIMITS.maxSnapshotBytes) return { ok: false, reason: 'memory-budget' }
  const asset = { ...structuredClone(source), id: newId() }
  if (asset.kind === 'tileset' || asset.kind === 'vector-tileset')
    for (const properties of Object.values(asset.tileProperties ?? {}))
      for (const [key, value] of Object.entries(properties))
        if (typeof value === 'object' && value.type === 'asset' && value.value === source.id)
          properties[key] = { ...value, value: asset.id }
  let version: TilemapResourceVersion = { sourceId: source.id, capturedAt: now, asset }
  if ('origin' in map) {
    // Native 8 refuses normalization that would lose authorial data. Validate only
    // the new snapshot: map chunks and existing immutable versions stay shared.
    const canonical = prepareMapResourceVersions({ resources: [version] }, sanitizePintaAsset)?.[0]
    if (!canonical) return { ok: false, reason: 'invalid-resource' }
    version = canonical
  }
  return { ok: true, version, map: { ...map, resources: [...(map.resources ?? []), version] } }
}

/** Guardar/atualizar uma versão não modifica as outras instâncias nem a biblioteca. */
export function freezeObjectResource<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  objectId: string,
  find: (id: string) => PintaAsset | null,
  now = Date.now(),
): ResourceVersionEdit<Map> {
  const layer = map.layers.find((entry) => entry.id === layerId)
  if (!layer || !isObjectLayer(layer)) return { ok: false, reason: 'missing' }
  if (effectiveLayer(map, layer).locked) return { ok: false, reason: 'locked' }
  const object = layer.objects.find((entry) => entry.id === objectId)
  if (!object?.art) return { ok: false, reason: 'unsupported' }
  const pinned = map.resources?.find((version) => version.asset.id === object.art?.assetId)
  const source = find(pinned?.sourceId ?? object.art.assetId)
  if (!source) return { ok: false, reason: 'missing' }
  const animationId = animationInSource(object.art.animationId, pinned?.asset ?? source, source)
  if (animationId === null) return { ok: false, reason: 'animation-missing' }
  const captured = captureMapResourceVersion(map, source, now)
  if (!captured.ok) return captured
  const next = updateMapObject(captured.map, layerId, objectId, {
    art: {
      ...object.art,
      assetId: captured.version.asset.id,
      ...(animationId ? { animationId } : {}),
    },
  })
  return next === captured.map ? { ok: false, reason: 'invalid-resource' } : { ok: true, map: next }
}

export function linkObjectResource<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  objectId: string,
  find: (id: string) => PintaAsset | null,
): ResourceVersionEdit<Map> {
  const layer = map.layers.find((entry) => entry.id === layerId)
  if (!layer || !isObjectLayer(layer)) return { ok: false, reason: 'missing' }
  if (effectiveLayer(map, layer).locked) return { ok: false, reason: 'locked' }
  const object = layer.objects.find((entry) => entry.id === objectId)
  const version = map.resources?.find((entry) => entry.asset.id === object?.art?.assetId)
  if (!object?.art || !version) return { ok: false, reason: 'unsupported' }
  const source = find(version.sourceId)
  if (!source) return { ok: false, reason: 'missing' }
  const animationId = animationInSource(object.art.animationId, version.asset, source)
  if (animationId === null) return { ok: false, reason: 'animation-missing' }
  const next = updateMapObject(map, layerId, objectId, {
    art: { ...object.art, assetId: version.sourceId, ...(animationId ? { animationId } : {}) },
  })
  return next === map ? { ok: false, reason: 'invalid-resource' } : { ok: true, map: next }
}

/** Uma operação para todas as peças das camadas; a grade fica independente de mudanças futuras. */
export function freezeMapTilesets<Map extends AuthorMap>(
  map: Map,
  find: (id: string) => PintaAsset | null,
  now = Date.now(),
): ResourceVersionEdit<Map> {
  if (
    map.layers.some(
      (layer) => isTileLayer<TilemapCells>(layer) && effectiveLayer(map, layer).locked,
    )
  )
    return { ok: false, reason: 'locked' }
  const lookup = withMapResourceVersions(map, find),
    base = lookup(map.tilesetId)
  if (!base || !isTilesetKind(base)) return { ok: false, reason: 'missing' }
  let next = map
  const ids = new Map<string, string>()
  for (const id of tilemapTilesetIds(map)) {
    const version = map.resources?.find((entry) => entry.asset.id === id)
    const source = find(version?.sourceId ?? id)
    if (!source || !isTilesetKind(source)) return { ok: false, reason: 'missing' }
    if (!isCompatibleMapTileset(base, source)) return { ok: false, reason: 'layout-changed' }
    const captured = captureMapResourceVersion(next, source, now)
    if (!captured.ok) return captured
    next = captured.map
    ids.set(id, captured.version.asset.id)
  }
  return { ok: true, map: remapTilemapTilesetIds(next, (id) => ids.get(id) ?? id) }
}

export function linkMapTilesets<Map extends AuthorMap>(
  map: Map,
  find: (id: string) => PintaAsset | null,
): ResourceVersionEdit<Map> {
  if (
    map.layers.some(
      (layer) => isTileLayer<TilemapCells>(layer) && effectiveLayer(map, layer).locked,
    )
  )
    return { ok: false, reason: 'locked' }
  const base = withMapResourceVersions(map, find)(map.tilesetId)
  if (!base || !isTilesetKind(base)) return { ok: false, reason: 'missing' }
  const ids = new Map<string, string>()
  for (const id of tilemapTilesetIds(map)) {
    const version = map.resources?.find((entry) => entry.asset.id === id)
    if (!version) continue
    const source = find(version.sourceId)
    if (!source || !isTilesetKind(source)) return { ok: false, reason: 'missing' }
    if (!isCompatibleMapTileset(base, source)) return { ok: false, reason: 'layout-changed' }
    ids.set(id, source.id)
  }
  return { ok: true, map: remapTilemapTilesetIds(map, (id) => ids.get(id) ?? id) }
}

/** Só uma ação explícita remove versões sem uso; também percorre propriedades entre versões. */
function reachableResourceVersions(
  map: MapResourceSource,
  roots: readonly string[],
): TilemapResourceVersion[] {
  const find = withMapResourceVersions(map, () => null),
    used = new Set<string>(),
    pending = [...roots]
  while (pending.length) {
    const id = pending.pop()
    if (!id || used.has(id)) continue
    used.add(id)
    const asset = find(id)
    if (asset) pending.push(...pintaAssetReferenceIds(asset))
  }
  return (map.resources ?? []).filter((version) => used.has(version.asset.id))
}

export function mapResourceVersionsForObjects(
  map: MapResourceSource,
  objects: readonly TilemapObject[],
): TilemapResourceVersion[] {
  const roots = objects.flatMap((object) => [
    ...(object.art ? [object.art.assetId] : []),
    ...Object.values(object.properties).flatMap((v) =>
      typeof v === 'object' && v.type === 'asset' && typeof v.value === 'string' ? [v.value] : [],
    ),
  ])
  return reachableResourceVersions(map, roots)
}

export function removeUnusedMapResourceVersions<Map extends AuthorMap>(map: Map): Map {
  if (!map.resources?.length) return map
  const resources = reachableResourceVersions(map, pintaAssetReferenceIds(map))
  if (resources.length === map.resources.length) return map
  const next = { ...map }
  if (resources.length) next.resources = resources
  else delete next.resources
  return next
}
