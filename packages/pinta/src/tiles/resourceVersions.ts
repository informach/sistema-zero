import { assetBytes } from '../core/assetMemory'
import { newId } from '../core/id'
import { isVersionablePintaAsset, withMapResourceVersions } from '../core/mapResourceVersions'
import {
  effectiveLayer,
  isCompatibleMapTileset,
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  type PintaAsset,
  pintaAssetReferenceIds,
  remapTilemapTilesetIds,
  type TilemapAsset,
  type TilemapObject,
  type TilemapResourceVersion,
  tilemapTilesetIds,
} from '../core/project'
import { PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import { updateMapObject } from './mapObjects'

export type ResourceVersionFailure =
  | 'unsupported'
  | 'missing'
  | 'locked'
  | 'version-limit'
  | 'memory-budget'
  | 'animation-missing'
  | 'layout-changed'
export type ResourceVersionEdit =
  | { ok: true; map: TilemapAsset }
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

export function captureMapResourceVersion(
  map: TilemapAsset,
  source: PintaAsset,
  now = Date.now(),
):
  | { ok: true; map: TilemapAsset; version: TilemapResourceVersion }
  | { ok: false; reason: ResourceVersionFailure } {
  if (!isVersionablePintaAsset(source)) return { ok: false, reason: 'unsupported' }
  if ((map.resources?.length ?? 0) >= PINTA_RESOURCE_LIMITS.maxVersions)
    return { ok: false, reason: 'version-limit' }
  const bytes =
    assetBytes(source) +
    (map.resources ?? []).reduce((sum, version) => sum + assetBytes(version.asset), 0)
  if (bytes > PINTA_RESOURCE_LIMITS.maxSnapshotBytes) return { ok: false, reason: 'memory-budget' }
  const asset = { ...structuredClone(source), id: newId() }
  if (asset.kind === 'tileset' || asset.kind === 'vector-tileset')
    for (const properties of Object.values(asset.tileProperties ?? {}))
      for (const [key, value] of Object.entries(properties))
        if (typeof value === 'object' && value.type === 'asset' && value.value === source.id)
          properties[key] = { ...value, value: asset.id }
  const version: TilemapResourceVersion = { sourceId: source.id, capturedAt: now, asset }
  return { ok: true, version, map: { ...map, resources: [...(map.resources ?? []), version] } }
}

/** Guardar/atualizar uma versão não modifica as outras instâncias nem a biblioteca. */
export function freezeObjectResource(
  map: TilemapAsset,
  layerId: string,
  objectId: string,
  find: (id: string) => PintaAsset | null,
  now = Date.now(),
): ResourceVersionEdit {
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
  return {
    ok: true,
    map: updateMapObject(captured.map, layerId, objectId, {
      art: {
        ...object.art,
        assetId: captured.version.asset.id,
        ...(animationId ? { animationId } : {}),
      },
    }),
  }
}

export function linkObjectResource(
  map: TilemapAsset,
  layerId: string,
  objectId: string,
  find: (id: string) => PintaAsset | null,
): ResourceVersionEdit {
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
  return {
    ok: true,
    map: updateMapObject(map, layerId, objectId, {
      art: { ...object.art, assetId: version.sourceId, ...(animationId ? { animationId } : {}) },
    }),
  }
}

/** Uma operação para todas as peças das camadas; a grade fica independente de mudanças futuras. */
export function freezeMapTilesets(
  map: TilemapAsset,
  find: (id: string) => PintaAsset | null,
  now = Date.now(),
): ResourceVersionEdit {
  if (map.layers.some((layer) => isTileLayer(layer) && effectiveLayer(map, layer).locked))
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

export function linkMapTilesets(
  map: TilemapAsset,
  find: (id: string) => PintaAsset | null,
): ResourceVersionEdit {
  if (map.layers.some((layer) => isTileLayer(layer) && effectiveLayer(map, layer).locked))
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
  map: TilemapAsset,
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
  map: TilemapAsset,
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

export function removeUnusedMapResourceVersions(map: TilemapAsset): TilemapAsset {
  if (!map.resources?.length) return map
  const resources = reachableResourceVersions(map, pintaAssetReferenceIds(map))
  if (resources.length === map.resources.length) return map
  const { resources: _old, ...rest } = map
  return resources.length ? { ...rest, resources } : rest
}
