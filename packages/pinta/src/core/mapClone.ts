/** Shared immutable map graph cloning. Cell buffers retain their representation. */
import { newId } from './id'
import {
  isObjectLayer,
  isTilesetKind,
  remapTilemapTilesetIds,
  type TilemapAsset,
  type TilemapCells,
  type TilemapObjectPropertyValue,
} from './project'

export function cloneMapIds<Map extends TilemapAsset<TilemapCells>>(
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
  const versions = new Map(
    (map.resources ?? [])
      .filter(
        (version) =>
          !selectedObjectIds ||
          (isTilesetKind(version.asset) &&
            Object.values(version.asset.tileProperties ?? {}).some((properties) =>
              Object.values(properties).some(
                (value) =>
                  typeof value === 'object' &&
                  value.type === 'object' &&
                  objectIds.has(String(value.value)),
              ),
            )),
      )
      .map((version) => [version.asset.id, newId()]),
  )
  const cloned: Map = {
    ...map,
    id: mapId,
    ...(map.resources?.length
      ? {
          resources: map.resources.map((version) => ({
            ...version,
            asset:
              isTilesetKind(version.asset) && version.asset.tileProperties
                ? {
                    ...version.asset,
                    tileProperties: Object.fromEntries(
                      Object.entries(version.asset.tileProperties).map(([tile, properties]) => [
                        tile,
                        mapPropertyRefs(properties, objectIds, 'object'),
                      ]),
                    ),
                  }
                : version.asset,
          })),
        }
      : {}),
    layers: map.layers.map((l) => ({
      ...l,
      id: layerIds.get(l.id) ?? l.id,
      ...(l.parentId ? { parentId: layerIds.get(l.parentId) ?? l.parentId } : {}),
      ...(l.properties ? { properties: mapPropertyRefs(l.properties, objectIds, 'object') } : {}),
      ...(isObjectLayer(l)
        ? {
            objects: l.objects.map((o) => {
              const own = selectedObjectIds?.has(o.id) ? structuredClone(o) : o
              return {
                ...own,
                id: objectIds.get(o.id) ?? o.id,
                properties: mapPropertyRefs(own.properties, objectIds, 'object'),
              }
            }),
          }
        : {}),
    })) as Map['layers'],
  }
  return versions.size ? remapMapAssets(cloned, versions) : cloned
}

export function remapMapAssets<Map extends TilemapAsset<TilemapCells>>(
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
          resources: result.resources.map((version) => ({
            ...version,
            sourceId: idMap.get(version.sourceId) ?? version.sourceId,
            asset: {
              ...version.asset,
              id: idMap.get(version.asset.id) ?? version.asset.id,
              ...(isTilesetKind(version.asset) && version.asset.tileProperties
                ? {
                    tileProperties: Object.fromEntries(
                      Object.entries(version.asset.tileProperties).map(([tile, properties]) => [
                        tile,
                        mapPropertyRefs(properties, idMap, 'asset'),
                      ]),
                    ),
                  }
                : {}),
            },
          })),
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
            objects: l.objects.map((o) => ({
              ...o,
              ...(o.art
                ? {
                    art: {
                      ...o.art,
                      assetId: idMap.get(o.art.assetId) ?? o.art.assetId,
                      ...(o.art.animationId
                        ? {
                            animationId:
                              animations.get(o.art.assetId)?.get(o.art.animationId) ??
                              o.art.animationId,
                          }
                        : {}),
                    },
                  }
                : {}),
              ...(o.setId ? { setId: idMap.get(o.setId) ?? o.setId } : {}),
              properties: Object.fromEntries(
                Object.entries(o.properties).map(([k, v]) => [
                  k,
                  typeof v === 'object' && v.type === 'asset'
                    ? { ...v, value: idMap.get(String(v.value)) ?? v.value }
                    : o.role === 'door' &&
                        (k === 'destino' || k === 'destination') &&
                        typeof v === 'string'
                      ? (names.get(v) ?? idMap.get(v) ?? v)
                      : v,
                ]),
              ),
            })),
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
