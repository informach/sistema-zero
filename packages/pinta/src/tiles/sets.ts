import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type MapSetAsset,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_SCENE_SCHEMA,
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
  // Não há meia célula no documento nativo: recusar antes de cortar uma peça em silêncio.
  if (
    map.layers.some((layer) => {
      if (!isTileLayer(layer)) return false
      const e = effectiveLayer(map, layer)
      if (Number.isInteger(e.offsetX / tileSize) && Number.isInteger(e.offsetY / tileSize))
        return false
      return layer.cells.some((cell, index) => {
        if (cell < 0) return false
        const x = (index % map.cols) * tileSize + e.offsetX,
          y = Math.floor(index / map.cols) * tileSize + e.offsetY
        return (
          x < (rect.col + rect.cols) * tileSize &&
          x + tileSize > rect.col * tileSize &&
          y < (rect.row + rect.rows) * tileSize &&
          y + tileSize > rect.row * tileSize
        )
      })
    })
  )
    throw new Error(COPY.scene.setCropAlignment)
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
      const e = effectiveLayer(map, layer)
      for (let r = 0; r < rect.rows; r++)
        for (let c = 0; c < rect.cols; c++) {
          const x = c + rect.col - e.offsetX / tileSize,
            y = r + rect.row - e.offsetY / tileSize
          if (x >= 0 && y >= 0 && x < map.cols && y < map.rows)
            cells[r * rect.cols + c] = layer.cells[y * map.cols + x] ?? -1
        }
      // As células recortadas já estão no espaço visual; neutraliza só o offset desta folha,
      // conservando a árvore e as posições das camadas de objetos do mesmo grupo.
      const { offsetX: _x, offsetY: _y, ...rest } = base
      const offsetX = (layer.offsetX ?? 0) - e.offsetX,
        offsetY = (layer.offsetY ?? 0) - e.offsetY
      return {
        ...rest,
        cells,
        ...(offsetX !== 0 ? { offsetX } : {}),
        ...(offsetY !== 0 ? { offsetY } : {}),
      } as TilemapLayer
    }
    if (isObjectLayer(layer)) {
      const included = layer.objects.filter((o) => objectCopies.has(o.id)),
        shiftX = Math.min(0, ...included.map((o) => o.x - rect.col * tileSize)),
        shiftY = Math.min(0, ...included.map((o) => o.y - rect.row * tileSize))
      // O deslocamento só entra quando difere de zero (chave no padrão não é forma canônica).
      const { offsetX: _offsetX, offsetY: _offsetY, ...semDeslocamento } = base
      const offsetX = (layer.offsetX ?? 0) + shiftX,
        offsetY = (layer.offsetY ?? 0) + shiftY
      return {
        ...semDeslocamento,
        kind: 'objects',
        ...(offsetX !== 0 ? { offsetX } : {}),
        ...(offsetY !== 0 ? { offsetY } : {}),
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
    schema: PINTA_SCENE_SCHEMA,
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

/**
 * Soltar troca a instância por cópias independentes das camadas do conjunto, na ordem delas.
 *
 * Recusa ANTES de mudar qualquer coisa (devolve o mesmo mapa) quando: a camada está trancada, a
 * instância foi girada fora de 90 em 90 graus ou esticada, as camadas não cabem no teto de
 * criação do editor, ou o conjunto (já girado) é maior que o mapa em colunas ou linhas. Nada é
 * cortado calado.
 *
 * As camadas soltas só levam o que difere do padrão (opacidade 1, deslocamento 0, sem giro, sem
 * espelho ficam de fora): chave no valor padrão faria o mapa pedir um formato mais novo sem
 * precisar.
 */
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
    map.layers.length + set.map.layers.filter((l) => l.kind !== 'group').length >
      PINTA_LIMITS.maxTilemapLayers
  )
    return map
  if (
    map.cols *
      map.rows *
      (map.layers.filter(isTileLayer).length + set.map.layers.filter(isTileLayer).length) >
    PINTA_MAP_FORMAT_LIMITS.maxCells
  )
    return map
  const turns = ((((instance.rotation ?? 0) / 90) % 4) + 4) % 4,
    angle = ((instance.rotation ?? 0) * Math.PI) / 180
  // De lado (90 ou 270 graus) o conjunto troca colunas por linhas.
  const placedCols = turns % 2 === 1 ? set.map.rows : set.map.cols,
    placedRows = turns % 2 === 1 ? set.map.cols : set.map.rows
  if (placedCols > map.cols || placedRows > map.rows) return map
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
      const {
        parentId: _parent,
        opacity: _opacity,
        offsetX: _offsetX,
        offsetY: _offsetY,
        ...original
      } = layer
      const opacity = e.opacity * (owner.opacity ?? 1)
      const placed = (offsetX: number, offsetY: number) => ({
        ...original,
        id: newId(),
        visible: e.visible && owner.visible,
        ...(opacity !== 1 ? { opacity } : {}),
        ...(offsetX !== 0 ? { offsetX } : {}),
        ...(offsetY !== 0 ? { offsetY } : {}),
        ...(owner.parentId ? { parentId: owner.parentId } : {}),
      })
      const common = placed(owner.offsetX ?? 0, owner.offsetY ?? 0)
      if (isObjectLayer(layer))
        return {
          ...common,
          kind: 'objects',
          objects: layer.objects.map((o) => {
            const { rotation: _rotation, flipX: _flipX, flipY: _flipY, ...rest } = o
            const rotation =
              ((instance.rotation ?? 0) +
                (!!instance.flipX !== !!instance.flipY ? -(o.rotation ?? 0) : (o.rotation ?? 0)) +
                720) %
              360
            return {
              ...rest,
              id: idMap.get(o.id)!,
              x: transform(o.x + e.offsetX, o.y + e.offsetY).x + instance.x,
              y: transform(o.x + e.offsetX, o.y + e.offsetY).y + instance.y,
              ...(rotation !== 0 ? { rotation } : {}),
              ...(!!o.flipX !== !!instance.flipX ? { flipX: true as const } : {}),
              ...(!!o.flipY !== !!instance.flipY ? { flipY: true as const } : {}),
              properties: Object.fromEntries(
                Object.entries(o.properties).map(([k, v]) => [
                  k,
                  typeof v === 'object' && v.type === 'object'
                    ? { ...v, value: idMap.get(String(v.value)) ?? v.value }
                    : v,
                ]),
              ),
            }
          }),
        } as TilemapLayer
      if (!isTileLayer(layer)) return common as TilemapLayer
      let stamp = { cols: set.map.cols, rows: set.map.rows, tiles: layer.cells }
      if (instance.flipX) stamp = transformStamp(stamp, 'horizontal')
      if (instance.flipY) stamp = transformStamp(stamp, 'vertical')
      for (let n = 0; n < turns; n++) stamp = transformStamp(stamp, 'rotate')
      const cells = new Int16Array(map.cols * map.rows).fill(-1)
      // Cabe inteiro: o tamanho já foi conferido antes de qualquer mudança.
      for (let r = 0; r < stamp.rows; r++)
        for (let c = 0; c < stamp.cols; c++) {
          cells[r * map.cols + c] = stamp.tiles[r * stamp.cols + c] ?? -1
        }
      return {
        ...placed(
          (owner.offsetX ?? 0) + instance.x + minX + off.x - zero.x,
          (owner.offsetY ?? 0) + instance.y + minY + off.y - zero.y,
        ),
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
