/** Shared immutable map graph cloning. Cell buffers retain their representation. */
import { newId } from './id'
import {
  isObjectLayer,
  isTilesetKind,
  type MapGraph,
  pintaAssetReferenceIds,
  remapTilemapTilesetIds,
  type TilemapObject,
  type TilemapObjectPropertyValue,
  type TilemapResourceVersion,
} from './project'

export function cloneMapIds<Map extends MapGraph>(
  map: Map,
  mapId = newId(),
  selectedObjectIds?: ReadonlySet<string>,
): Map {
  const layerIds = new Map<string, string>(),
    objectIds = new Map<string, string>()
  for (const l of map.layers) {
    layerIds.set(l.id, newId())
    if (isObjectLayer(l))
      for (const o of l.objects) {
        if (!selectedObjectIds || selectedObjectIds.has(o.id)) objectIds.set(o.id, newId())
      }
  }
  const versions = resourceIdsForCopy(map.resources ?? [], objectIds, !selectedObjectIds)
  const cloned: Map = {
    ...map,
    id: mapId,
    ...(map.resources?.length
      ? {
          resources: cloneResourceObjectRefs(map.resources, objectIds),
        }
      : {}),
    layers: map.layers.map((l) => ({
      ...l,
      id: layerIds.get(l.id) ?? l.id,
      ...(l.parentId ? { parentId: layerIds.get(l.parentId) ?? l.parentId } : {}),
      ...(l.properties ? { properties: mapPropertyRefs(l.properties, objectIds, 'object') } : {}),
      ...(isObjectLayer(l)
        ? {
            objects: l.objects.map((o) =>
              cloneObjectIds(o, objectIds, selectedObjectIds?.has(o.id) ?? false),
            ),
          }
        : {}),
    })) as Map['layers'],
  }
  return versions.size ? remapMapAssets(cloned, versions) : cloned
}

export function remapMapAssets<Map extends MapGraph>(
  map: Map,
  idMap: ReadonlyMap<string, string>,
  names: ReadonlyMap<string, string> = new Map(),
  animations: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(),
): Map {
  const result = remapTilemapTilesetIds(map, (id) => idMap.get(id) ?? id)
  return {
    ...result,
    ...(result.resources
      ? {
          resources: remapResourceAssets(result.resources, idMap),
        }
      : {}),
    layers: result.layers.map((l) =>
      !isObjectLayer(l)
        ? {
            ...l,
            ...(l.properties ? { properties: mapPropertyRefs(l.properties, idMap, 'asset') } : {}),
          }
        : {
            ...l,
            ...(l.properties ? { properties: mapPropertyRefs(l.properties, idMap, 'asset') } : {}),
            objects: l.objects.map((o) => remapObjectAssets(o, idMap, names, animations)),
          },
    ),
  }
}

export function mapPropertyRefs(
  properties: Record<string, TilemapObjectPropertyValue>,
  ids: ReadonlyMap<string, string>,
  type: 'object' | 'asset',
): Record<string, TilemapObjectPropertyValue> {
  return Object.fromEntries(
    Object.entries(properties).map(([k, v]) => [
      k,
      typeof v === 'object' && v.type === type
        ? { ...v, value: ids.get(String(v.value)) ?? v.value }
        : v,
    ]),
  )
}

/** An object selection is a graph, not a partial map document. */
export function cloneObjectsWithResources(
  objects: readonly TilemapObject[],
  resources: readonly TilemapResourceVersion[] = [],
  idFor: (sourceId: string, index: number) => string = newId,
  resourceIdFor: (sourceId: string, index: number) => string = newId,
): { objects: TilemapObject[]; resources: TilemapResourceVersion[] } {
  const ids = new Map(objects.map((object, index) => [object.id, idFor(object.id, index)]))
  const versions = resourceIdsForCopy(resources, ids, false, resourceIdFor)
  return {
    objects: objects.map((object) =>
      remapObjectAssets(cloneObjectIds(object, ids, true), versions),
    ),
    resources: remapResourceAssets(cloneResourceObjectRefs(resources, ids), versions),
  }
}

function cloneObjectIds(
  object: TilemapObject,
  ids: ReadonlyMap<string, string>,
  deep: boolean,
): TilemapObject {
  const own = deep ? structuredClone(object) : object
  return {
    ...own,
    id: ids.get(object.id) ?? object.id,
    properties: mapPropertyRefs(own.properties, ids, 'object'),
  }
}

function resourceIdsForCopy(
  resources: readonly TilemapResourceVersion[],
  objectIds: ReadonlyMap<string, string>,
  all: boolean,
  idFor: (sourceId: string, index: number) => string = newId,
): Map<string, string> {
  const versions = new Map<string, string>(),
    dependents = new Map<string, string[]>()
  for (const version of resources) {
    for (const id of [version.sourceId, ...pintaAssetReferenceIds(version.asset)]) {
      const bucket = dependents.get(id)
      if (bucket) bucket.push(version.asset.id)
      else dependents.set(id, [version.asset.id])
    }
    if (
      all ||
      (isTilesetKind(version.asset) &&
        Object.values(version.asset.tileProperties ?? {}).some((properties) =>
          Object.values(properties).some(
            (value) =>
              typeof value === 'object' &&
              value.type === 'object' &&
              objectIds.has(String(value.value)),
          ),
        ))
    )
      versions.set(version.asset.id, idFor(version.asset.id, versions.size))
  }
  // An indirect reference change also changes the immutable dependent version.
  const pending = [...versions.keys()]
  for (let i = 0; i < pending.length; i++)
    for (const id of dependents.get(pending[i]!) ?? []) {
      if (versions.has(id)) continue
      versions.set(id, idFor(id, versions.size))
      pending.push(id)
    }
  return versions
}

function cloneResourceObjectRefs(
  resources: readonly TilemapResourceVersion[],
  ids: ReadonlyMap<string, string>,
): TilemapResourceVersion[] {
  return resources.map((version) => ({
    ...version,
    asset:
      isTilesetKind(version.asset) && version.asset.tileProperties
        ? {
            ...version.asset,
            tileProperties: Object.fromEntries(
              Object.entries(version.asset.tileProperties).map(([tile, properties]) => [
                tile,
                mapPropertyRefs(properties, ids, 'object'),
              ]),
            ),
          }
        : version.asset,
  }))
}

function remapResourceAssets(
  resources: readonly TilemapResourceVersion[],
  ids: ReadonlyMap<string, string>,
): TilemapResourceVersion[] {
  return resources.map((version) => ({
    ...version,
    sourceId: ids.get(version.sourceId) ?? version.sourceId,
    asset: {
      ...version.asset,
      id: ids.get(version.asset.id) ?? version.asset.id,
      ...(isTilesetKind(version.asset) && version.asset.tileProperties
        ? {
            tileProperties: Object.fromEntries(
              Object.entries(version.asset.tileProperties).map(([tile, properties]) => [
                tile,
                mapPropertyRefs(properties, ids, 'asset'),
              ]),
            ),
          }
        : {}),
    },
  }))
}

function remapObjectAssets(
  object: TilemapObject,
  ids: ReadonlyMap<string, string>,
  names: ReadonlyMap<string, string> = new Map(),
  animations: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(),
): TilemapObject {
  return {
    ...object,
    ...(object.art
      ? {
          art: {
            ...object.art,
            assetId: ids.get(object.art.assetId) ?? object.art.assetId,
            ...(object.art.animationId
              ? {
                  animationId:
                    animations.get(object.art.assetId)?.get(object.art.animationId) ??
                    object.art.animationId,
                }
              : {}),
          },
        }
      : {}),
    ...(object.setId ? { setId: ids.get(object.setId) ?? object.setId } : {}),
    properties: Object.fromEntries(
      Object.entries(object.properties).map(([key, value]) => [
        key,
        typeof value === 'object' && value.type === 'asset'
          ? { ...value, value: ids.get(String(value.value)) ?? value.value }
          : object.role === 'door' &&
              (key === 'destino' || key === 'destination') &&
              typeof value === 'string'
            ? (names.get(value) ?? ids.get(value) ?? value)
            : value,
      ]),
    ),
  }
}
