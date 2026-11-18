import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type MapSetAsset,
  PINTA_MAP_FORMAT_LIMITS,
  type TilemapAsset,
  type TilemapLayer,
} from '../core/project'
import type { CellRect } from './cellGeometry'
import { addMapObject, createMapObject } from './mapObjects'
import { cloneObjects } from './objectSelection'
import { transformStamp } from './transform'

/** Recorta todas as camadas e objetos. Referências de arte e propriedades continuam vivas. */
export function createMapSet(
  map: TilemapAsset,
  rect: CellRect,
  tileSize: number,
  name: string,
): MapSetAsset {
  const now = Date.now()
  if (
    map.layers.some((l) => {
      const e = effectiveLayer(map, l)
      return (
        isObjectLayer(l) &&
        l.objects.some(
          (o) =>
            o.setId &&
            o.x + e.offsetX >= rect.col * tileSize &&
            o.y + e.offsetY >= rect.row * tileSize &&
            o.x + e.offsetX < (rect.col + rect.cols) * tileSize &&
            o.y + e.offsetY < (rect.row + rect.rows) * tileSize,
        )
      )
    })
  )
    throw new Error(COPY.scene.nestedSet)
  const selectedObjects = map.layers.flatMap((l) => {
    const e = effectiveLayer(map, l)
    return isObjectLayer(l)
      ? l.objects.filter(
          (o) =>
            !o.setId &&
            o.x + e.offsetX >= rect.col * tileSize &&
            o.y + e.offsetY >= rect.row * tileSize &&
            o.x + e.offsetX < (rect.col + rect.cols) * tileSize &&
            o.y + e.offsetY < (rect.row + rect.rows) * tileSize,
        )
      : []
  })
  const copies = cloneObjects(selectedObjects, -rect.col * tileSize, -rect.row * tileSize)
  const objectCopies = new Map(selectedObjects.map((o, i) => [o.id, copies[i]!]))
  const layerIds = new Map(map.layers.map((l) => [l.id, newId()]))
  const layers = map.layers.map((layer): TilemapLayer => {
    const { parentId: _parent, ...common } = layer
    const base = {
      ...common,
      id: layerIds.get(layer.id)!,
      ...(layer.parentId ? { parentId: layerIds.get(layer.parentId) } : {}),
      ...(layer.properties
        ? {
            properties: Object.fromEntries(
              Object.entries(layer.properties).map(([k, v]) => [
                k,
                typeof v === 'object' && v.type === 'object'
                  ? { ...v, value: objectCopies.get(String(v.value))?.id ?? v.value }
                  : v,
              ]),
            ),
          }
        : {}),
    }
    if (isTileLayer(layer)) {
      const cells = new Int16Array(rect.cols * rect.rows).fill(-1)
      for (let r = 0; r < rect.rows; r++)
        for (let c = 0; c < rect.cols; c++) {
          const x = c + rect.col,
            y = r + rect.row
          if (x >= 0 && y >= 0 && x < map.cols && y < map.rows)
            cells[r * rect.cols + c] = layer.cells[y * map.cols + x] ?? -1
        }
      return { ...base, cells } as TilemapLayer
    }
    if (isObjectLayer(layer)) {
      const included = layer.objects.filter((o) => objectCopies.has(o.id)),
        shiftX = Math.min(0, ...included.map((o) => o.x - rect.col * tileSize)),
        shiftY = Math.min(0, ...included.map((o) => o.y - rect.row * tileSize))
      return {
        ...base,
        kind: 'objects',
        offsetX: (layer.offsetX ?? 0) + shiftX,
        offsetY: (layer.offsetY ?? 0) + shiftY,
        objects: included.map((o) => ({
          ...objectCopies.get(o.id)!,
          x: o.x - rect.col * tileSize - shiftX,
          y: o.y - rect.row * tileSize - shiftY,
        })),
      } as TilemapLayer
    }
    return { ...base, kind: 'group' } as TilemapLayer
  })
  const firstTile = layerIds.get(map.layers.find(isTileLayer)?.id ?? '')
  const keep = new Set(
    layers
      .filter((l) =>
        isTileLayer(l)
          ? l.id === firstTile || l.cells.some((v) => v >= 0)
          : isObjectLayer(l) && l.objects.length > 0,
      )
      .map((l) => l.id),
  )
  for (const id of keep) {
    let parent = layers.find((l) => l.id === id)?.parentId
    while (parent) {
      keep.add(parent)
      parent = layers.find((l) => l.id === parent)?.parentId
    }
  }
  return {
    id: newId(),
    kind: 'map-set',
    schema: 3,
    name,
    createdAt: now,
    updatedAt: now,
    map: {
      ...map,
      id: newId(),
      name,
      cols: rect.cols,
      rows: rect.rows,
      layers: layers.filter((l) => keep.has(l.id)),
    },
  }
}

export function placeMapSet(
  map: TilemapAsset,
  layerId: string,
  set: MapSetAsset,
  x: number,
  y: number,
  tileSize: number,
): TilemapAsset {
  return addMapObject(
    map,
    layerId,
    createMapObject({
      shape: 'set',
      setId: set.id,
      name: set.name,
      x,
      y,
      width: set.map.cols * tileSize,
      height: set.map.rows * tileSize,
    }),
  )
}

/** Soltar conserva a ordem das camadas e os dados; recusa antes de mudar se não couber. */
export function detachMapSet(
  map: TilemapAsset,
  layerId: string,
  objectId: string,
  set: MapSetAsset,
  tileSize: number,
): TilemapAsset {
  const owner = map.layers.find((l) => l.id === layerId)
  if (!owner || !isObjectLayer(owner) || effectiveLayer(map, owner).locked) return map
  const instance = owner.objects.find((o) => o.id === objectId && o.setId === set.id)
  if (
    !instance ||
    (instance.rotation ?? 0) % 90 !== 0 ||
    instance.width !== set.map.cols * tileSize ||
    instance.height !== set.map.rows * tileSize ||
    map.layers.length + set.map.layers.length > PINTA_MAP_FORMAT_LIMITS.maxLayers
  )
    return map
  const turns = ((((instance.rotation ?? 0) / 90) % 4) + 4) % 4,
    angle = ((instance.rotation ?? 0) * Math.PI) / 180
  const transform = (x: number, y: number) => {
    const px = instance.flipX ? instance.width - x : x,
      py = instance.flipY ? instance.height - y : y
    return {
      x: Math.round(px * Math.cos(angle) - py * Math.sin(angle)),
      y: Math.round(px * Math.sin(angle) + py * Math.cos(angle)),
    }
  }
  const corners = [
    transform(0, 0),
    transform(instance.width, 0),
    transform(0, instance.height),
    transform(instance.width, instance.height),
  ]
  const minX = Math.min(...corners.map((p) => p.x)),
    minY = Math.min(...corners.map((p) => p.y))
  const idMap = new Map(
    set.map.layers.flatMap((l) =>
      isObjectLayer(l) ? l.objects.map((o) => [o.id, newId()] as const) : [],
    ),
  )
  const layers = set.map.layers
    .filter((l) => l.kind !== 'group')
    .map((layer): TilemapLayer => {
      const e = effectiveLayer(set.map, layer),
        off = transform(e.offsetX, e.offsetY),
        zero = transform(0, 0)
      const { parentId: _parent, ...original } = layer
      const common = {
        ...original,
        id: newId(),
        visible: e.visible && owner.visible,
        opacity: e.opacity * (owner.opacity ?? 1),
        offsetX: owner.offsetX ?? 0,
        offsetY: owner.offsetY ?? 0,
        ...(owner.parentId ? { parentId: owner.parentId } : {}),
      }
      if (isObjectLayer(layer))
        return {
          ...common,
          kind: 'objects',
          objects: layer.objects.map((o) => ({
            ...o,
            id: idMap.get(o.id)!,
            x: transform(o.x + e.offsetX, o.y + e.offsetY).x + instance.x,
            y: transform(o.x + e.offsetX, o.y + e.offsetY).y + instance.y,
            rotation:
              ((instance.rotation ?? 0) +
                (instance.flipX !== instance.flipY ? -(o.rotation ?? 0) : (o.rotation ?? 0)) +
                360) %
              360,
            flipX: !!o.flipX !== !!instance.flipX ? true : undefined,
            flipY: !!o.flipY !== !!instance.flipY ? true : undefined,
            properties: Object.fromEntries(
              Object.entries(o.properties).map(([k, v]) => [
                k,
                typeof v === 'object' && v.type === 'object'
                  ? { ...v, value: idMap.get(String(v.value)) ?? v.value }
                  : v,
              ]),
            ),
          })),
        } as TilemapLayer
      if (!isTileLayer(layer)) return common
      let stamp = { cols: set.map.cols, rows: set.map.rows, tiles: layer.cells }
      if (instance.flipX) stamp = transformStamp(stamp, 'horizontal')
      if (instance.flipY) stamp = transformStamp(stamp, 'vertical')
      for (let n = 0; n < turns; n++) stamp = transformStamp(stamp, 'rotate')
      const cells = new Int16Array(map.cols * map.rows).fill(-1)
      for (let r = 0; r < Math.min(stamp.rows, map.rows); r++)
        for (let c = 0; c < Math.min(stamp.cols, map.cols); c++) {
          cells[r * map.cols + c] = stamp.tiles[r * stamp.cols + c] ?? -1
        }
      return {
        ...common,
        offsetX: (owner.offsetX ?? 0) + instance.x + minX + off.x - zero.x,
        offsetY: (owner.offsetY ?? 0) + instance.y + minY + off.y - zero.y,
        cells,
        ...(layer.tilesetId || set.map.tilesetId !== map.tilesetId
          ? { tilesetId: layer.tilesetId ?? set.map.tilesetId }
          : {}),
      } as TilemapLayer
    })
  const at = map.layers.indexOf(owner)
  const updated = { ...owner, objects: owner.objects.filter((o) => o.id !== instance.id) }
  return {
    ...map,
    layers: [...map.layers.slice(0, at), ...layers, updated, ...map.layers.slice(at + 1)],
  }
}
