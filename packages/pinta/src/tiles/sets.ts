import { PINTA_REGION_LIMITS, type PintaRegionCells } from '@sistemazero/core/creations'
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import { cloneMapIds } from '../core/mapClone'
import { mergeMapResourceVersions, stampMapResourceVersions } from '../core/mapResourceVersions'
import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type MapSetAsset,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_SCENE_SCHEMA,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  sanitizeRegionMapSetAsset,
  sanitizeRegionTilemapAsset,
  type TilemapAsset,
  type TilemapCells,
  type TilemapLayer,
} from '../core/project'
import type { CellRect } from './cellGeometry'
import type { AuthorMap } from './mapCellEdits'
import { isBoundedCellRect } from './mapCellEdits'
import { createTileCellReader } from './mapCells'
import { addMapObject, createMapObject, createRegionMapObject } from './mapObjects'
import {
  denseToRegionCells,
  editRegionCells,
  REGION_EDIT_LIMIT,
  type RegionCellEdit,
} from './regionCells'
import { transformCell } from './transform'

const boundsOf = (map: AuthorMap) => ({
  ...('origin' in map ? map.origin : { col: 0, row: 0 }),
  cols: map.cols,
  rows: map.rows,
})

export class MapSetCaptureError extends Error {
  constructor(
    readonly reason: 'crop-budget' | 'alignment' | 'nested-set' | 'metadata',
    message: string,
  ) {
    super(message)
    this.name = 'MapSetCaptureError'
  }
}

/** Recorta todas as camadas e objetos. Referências de arte e propriedades continuam vivas. */
export function createMapSet(
  map: RegionTilemapAsset,
  rect: CellRect,
  tileSize: number,
  name: string,
): RegionMapSetAsset
export function createMapSet(
  map: TilemapAsset,
  rect: CellRect,
  tileSize: number,
  name: string,
): MapSetAsset
export function createMapSet(
  map: AuthorMap,
  rect: CellRect,
  tileSize: number,
  name: string,
): MapSetAsset | RegionMapSetAsset {
  if (
    !isBoundedCellRect(rect) ||
    rect.cols > PINTA_MAP_FORMAT_LIMITS.maxCols ||
    rect.rows > PINTA_MAP_FORMAT_LIMITS.maxRows ||
    map.layers.length > PINTA_MAP_FORMAT_LIMITS.maxLayers ||
    rect.cols * rect.rows * map.layers.filter(isTileLayer<TilemapCells>).length >
      PINTA_MAP_FORMAT_LIMITS.maxCells ||
    !Number.isFinite(tileSize) ||
    tileSize <= 0
  )
    throw new MapSetCaptureError(
      'crop-budget',
      COPY.scene.setCropBudget(PINTA_MAP_FORMAT_LIMITS.maxCols, PINTA_MAP_FORMAT_LIMITS.maxRows),
    )
  const now = Date.now()
  if ('origin' in map && map.resources) {
    const resources = stampMapResourceVersions(map)
    if (!resources) throw new MapSetCaptureError('metadata', COPY.scene.setCaptureRefused)
    map = { ...map, resources }
  }
  // Não há meia célula no documento nativo: recusar antes de cortar uma peça em silêncio.
  if (
    map.layers.some((layer) => {
      if (!isTileLayer<TilemapCells>(layer)) return false
      const e = effectiveLayer(map, layer)
      if (Number.isInteger(e.offsetX / tileSize) && Number.isInteger(e.offsetY / tileSize))
        return false
      let overlap = false
      const col = Math.floor(rect.col - e.offsetX / tileSize),
        row = Math.floor(rect.row - e.offsetY / tileSize)
      createTileCellReader(layer.cells, boundsOf(map)).visitOccupied(
        {
          col,
          row,
          cols: Math.ceil(rect.col + rect.cols - e.offsetX / tileSize) - col,
          rows: Math.ceil(rect.row + rect.rows - e.offsetY / tileSize) - row,
        },
        (_cell, col, row) => {
          const x = col * tileSize + e.offsetX,
            y = row * tileSize + e.offsetY
          overlap ||=
            x < (rect.col + rect.cols) * tileSize &&
            x + tileSize > rect.col * tileSize &&
            y < (rect.row + rect.rows) * tileSize &&
            y + tileSize > rect.row * tileSize
        },
      )
      return overlap
    })
  )
    throw new MapSetCaptureError('alignment', COPY.scene.setCropAlignment)
  if (
    map.layers.some((l) => {
      const e = effectiveLayer(map, l)
      return (
        isObjectLayer(l) &&
        l.objects.some(
          (o) =>
            (o.setId || o.shape === 'set') &&
            o.x + e.offsetX >= rect.col * tileSize &&
            o.y + e.offsetY >= rect.row * tileSize &&
            o.x + e.offsetX < (rect.col + rect.cols) * tileSize &&
            o.y + e.offsetY < (rect.row + rect.rows) * tileSize,
        )
      )
    })
  )
    throw new MapSetCaptureError('nested-set', COPY.scene.nestedSet)
  const selectObjects = () =>
    map.layers.flatMap((l) => {
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
  // Clone object IDs and their embedded resource references as one graph. References
  // outside this fragment retain their original scope; unchanged versions can be reused.
  map = cloneMapIds(map, undefined, new Set(selectObjects().map((o) => o.id)))
  const selectedObjectIds = new Set(selectObjects().map((o) => o.id))
  const layers = map.layers.map((layer): TilemapLayer<TilemapCells> => {
    const { parentId: _parent, ...common } = layer
    const base = {
      ...common,
      ...(layer.parentId ? { parentId: layer.parentId } : {}),
    }
    if (isTileLayer<TilemapCells>(layer)) {
      const cells = new Int16Array(rect.cols * rect.rows).fill(-1)
      const e = effectiveLayer(map, layer)
      const reader = createTileCellReader(layer.cells, boundsOf(map))
      for (let r = 0; r < rect.rows; r++)
        for (let c = 0; c < rect.cols; c++) {
          const x = c + rect.col - e.offsetX / tileSize,
            y = r + rect.row - e.offsetY / tileSize
          cells[r * rect.cols + c] = reader.at(x, y)
        }
      // As células recortadas já estão no espaço visual; neutraliza só o offset desta folha,
      // conservando a árvore e as posições das camadas de objetos do mesmo grupo.
      const { offsetX: _x, offsetY: _y, ...rest } = base
      const offsetX = (layer.offsetX ?? 0) - e.offsetX,
        offsetY = (layer.offsetY ?? 0) - e.offsetY
      return {
        ...rest,
        cells:
          'origin' in map
            ? denseToRegionCells(cells, { col: 0, row: 0, cols: rect.cols, rows: rect.rows })!
            : cells,
        ...(offsetX !== 0 ? { offsetX } : {}),
        ...(offsetY !== 0 ? { offsetY } : {}),
      } as TilemapLayer<TilemapCells>
    }
    if (isObjectLayer(layer)) {
      const included = layer.objects.filter((o) => selectedObjectIds.has(o.id)),
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
          ...o,
          x: o.x - rect.col * tileSize - shiftX,
          y: o.y - rect.row * tileSize - shiftY,
        })),
      } as TilemapLayer<TilemapCells>
    }
    return { ...base, kind: 'group' } as TilemapLayer<TilemapCells>
  })
  const firstTile = map.layers.find(isTileLayer<TilemapCells>)?.id
  const keep = new Set(
    layers
      .filter((l) =>
        isTileLayer<TilemapCells>(l)
          ? l.id === firstTile ||
            (l.cells instanceof Int16Array
              ? l.cells.some((v) => v >= 0)
              : l.cells.chunks.length > 0)
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
  const result = {
    id: newId(),
    kind: 'map-set',
    schema: 'origin' in map ? 8 : PINTA_SCENE_SCHEMA,
    name,
    createdAt: now,
    updatedAt: now,
    map: {
      ...map,
      id: newId(),
      name,
      cols: rect.cols,
      rows: rect.rows,
      ...('origin' in map ? { origin: { col: 0, row: 0 } } : {}),
      layers: layers.filter((l) => keep.has(l.id)),
    },
  } as MapSetAsset | RegionMapSetAsset
  if ('origin' in result.map && !sanitizeRegionMapSetAsset(result))
    throw new MapSetCaptureError('metadata', COPY.scene.setCaptureRefused)
  return result
}

export function placeMapSet<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  set: MapSetAsset | RegionMapSetAsset,
  x: number,
  y: number,
  tileSize: number,
): Map {
  if (!Number.isFinite(tileSize) || tileSize <= 0 || (!('origin' in map) && 'origin' in set.map))
    return map
  const input = {
    shape: 'set' as const,
    setId: set.id,
    name: set.name,
    x,
    y,
    width: set.map.cols * tileSize,
    height: set.map.rows * tileSize,
  }
  const object = 'origin' in map ? createRegionMapObject(input) : createMapObject(input)
  return object ? addMapObject(map, layerId, object) : map
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
export function detachMapSet<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  objectId: string,
  set: MapSetAsset | RegionMapSetAsset,
  tileSize: number,
): Map {
  if (!Number.isFinite(tileSize) || tileSize <= 0) return map
  // A legacy target cannot silently normalize new signed metadata back to format 7.
  if (!('origin' in map) && 'origin' in set.map) return map
  const owner = map.layers.find((l) => l.id === layerId)
  if (!owner || !isObjectLayer(owner) || effectiveLayer(map, owner).locked) return map
  const instance = owner.objects.find((o) => o.id === objectId && o.setId === set.id)
  if (
    !instance ||
    (instance.rotation ?? 0) % 90 !== 0 ||
    instance.width !== set.map.cols * tileSize ||
    instance.height !== set.map.rows * tileSize ||
    map.layers.length + set.map.layers.filter((l) => 'origin' in map || l.kind !== 'group').length >
      PINTA_LIMITS.maxTilemapLayers
  )
    return map
  if (
    !('origin' in map) &&
    map.cols *
      map.rows *
      (map.layers.filter(isTileLayer<TilemapCells>).length +
        set.map.layers.filter(isTileLayer<TilemapCells>).length) >
      PINTA_MAP_FORMAT_LIMITS.maxCells
  )
    return map
  const turns = ((((instance.rotation ?? 0) / 90) % 4) + 4) % 4,
    angle = ((instance.rotation ?? 0) * Math.PI) / 180
  // De lado (90 ou 270 graus) o conjunto troca colunas por linhas.
  const placedCols = turns % 2 === 1 ? set.map.rows : set.map.cols,
    placedRows = turns % 2 === 1 ? set.map.cols : set.map.rows
  if (placedCols > map.cols || placedRows > map.rows) return map
  const sourceVersions =
    'origin' in map ? stampMapResourceVersions(set.map) : (set.map.resources ?? [])
  const targetVersions = 'origin' in map ? stampMapResourceVersions(map) : (map.resources ?? [])
  if (!sourceVersions || !targetVersions) return map
  const copy = cloneMapIds(
    set.map.resources ? { ...set.map, resources: sourceVersions } : set.map,
    undefined,
    new Set(set.map.layers.filter(isObjectLayer).flatMap((l) => l.objects.map((o) => o.id))),
  )
  const resources = mergeMapResourceVersions(targetVersions, copy.resources ?? [])
  if (!resources) return map
  const transform = (x: number, y: number) => {
    const px = instance.flipX ? instance.width - x : x,
      py = instance.flipY ? instance.height - y : y
    if ('origin' in map) {
      if (turns === 0) return { x: px, y: py }
      if (turns === 1) return { x: -py, y: px }
      if (turns === 2) return { x: -px, y: -py }
      return { x: py, y: -px }
    }
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
  const targetBounds = boundsOf(map),
    sourceBounds = boundsOf(copy)
  let remainingChunks =
      PINTA_REGION_LIMITS.maxChunks -
      map.layers.reduce(
        (sum, l) =>
          sum +
          (isTileLayer<TilemapCells>(l) && !(l.cells instanceof Int16Array)
            ? l.cells.chunks.length
            : 0),
        0,
      ),
    work = 0,
    refused = false
  const transformed = new Map<number, number>()
  const transformValue = (value: number) => {
    const existing = transformed.get(value)
    if (existing !== undefined) return existing
    let next = value
    if (instance.flipX) next = transformCell(next, 'horizontal')
    if (instance.flipY) next = transformCell(next, 'vertical')
    for (let n = 0; n < turns; n++) next = transformCell(next, 'rotate')
    transformed.set(value, next)
    return next
  }
  const layers = copy.layers
    .filter((l) => 'origin' in map || l.kind !== 'group')
    .map((layer): TilemapLayer<TilemapCells> => {
      if (refused) return layer
      const e = effectiveLayer(copy, layer),
        off = transform(e.offsetX, e.offsetY),
        zero = transform(0, 0)
      const {
        parentId: _parent,
        opacity: _opacity,
        offsetX: _offsetX,
        offsetY: _offsetY,
        locked: _locked,
        ...original
      } = layer
      const opacity = e.opacity * (owner.opacity ?? 1)
      const placed = (offsetX: number, offsetY: number) => {
        if ('origin' in map) {
          const root = !layer.parentId
          const own = transform(layer.offsetX ?? 0, layer.offsetY ?? 0)
          const x =
            own.x -
            zero.x +
            (root ? (owner.offsetX ?? 0) + instance.x + minX - targetBounds.col * tileSize : 0)
          const y =
            own.y -
            zero.y +
            (root ? (owner.offsetY ?? 0) + instance.y + minY - targetBounds.row * tileSize : 0)
          const alpha = (layer.opacity ?? 1) * (root ? (owner.opacity ?? 1) : 1)
          const px = (layer.parallaxX ?? 1) * (root ? (owner.parallaxX ?? 1) : 1)
          const py = (layer.parallaxY ?? 1) * (root ? (owner.parallaxY ?? 1) : 1)
          const {
            parentId: _p,
            offsetX: _x,
            offsetY: _y,
            opacity: _a,
            parallaxX: _px,
            parallaxY: _py,
            ...rest
          } = layer
          return {
            ...rest,
            ...(layer.parentId || owner.parentId
              ? { parentId: layer.parentId ?? owner.parentId }
              : {}),
            visible: layer.visible && (!root || owner.visible),
            ...(x !== 0 || layer.offsetX !== undefined ? { offsetX: x } : {}),
            ...(y !== 0 || layer.offsetY !== undefined ? { offsetY: y } : {}),
            ...(alpha !== 1 || layer.opacity !== undefined ? { opacity: alpha } : {}),
            ...(px !== 1 || layer.parallaxX !== undefined ? { parallaxX: px } : {}),
            ...(py !== 1 || layer.parallaxY !== undefined ? { parallaxY: py } : {}),
          }
        }
        const { parallaxX: _px, parallaxY: _py, ...rest } = original
        const px = e.parallaxX * (owner.parallaxX ?? 1),
          py = e.parallaxY * (owner.parallaxY ?? 1)
        if (
          !Number.isFinite(px) ||
          !Number.isFinite(py) ||
          px < 0 ||
          py < 0 ||
          px > PINTA_MAP_FORMAT_LIMITS.maxLayerParallax ||
          py > PINTA_MAP_FORMAT_LIMITS.maxLayerParallax
        )
          refused = true
        return {
          ...rest,
          id: layer.id,
          visible: e.visible && owner.visible,
          ...(e.locked ? { locked: true } : {}),
          ...(opacity !== 1 ? { opacity } : {}),
          ...(px !== 1 ? { parallaxX: px } : {}),
          ...(py !== 1 ? { parallaxY: py } : {}),
          ...(offsetX !== 0 ? { offsetX } : {}),
          ...(offsetY !== 0 ? { offsetY } : {}),
          ...(owner.parentId ? { parentId: owner.parentId } : {}),
        }
      }
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
              x:
                transform(
                  o.x + ('origin' in map ? 0 : e.offsetX) - sourceBounds.col * tileSize,
                  o.y + ('origin' in map ? 0 : e.offsetY) - sourceBounds.row * tileSize,
                ).x + ('origin' in map ? targetBounds.col * tileSize - minX : instance.x),
              y:
                transform(
                  o.x + ('origin' in map ? 0 : e.offsetX) - sourceBounds.col * tileSize,
                  o.y + ('origin' in map ? 0 : e.offsetY) - sourceBounds.row * tileSize,
                ).y + ('origin' in map ? targetBounds.row * tileSize - minY : instance.y),
              ...(rotation !== 0 ? { rotation } : {}),
              ...(!!o.flipX !== !!instance.flipX ? { flipX: true as const } : {}),
              ...(!!o.flipY !== !!instance.flipY ? { flipY: true as const } : {}),
              properties: o.properties,
            }
          }),
        } as TilemapLayer<TilemapCells>
      if (!isTileLayer<TilemapCells>(layer)) return common as TilemapLayer<TilemapCells>
      const edits: RegionCellEdit[] = []
      const dense = 'origin' in map ? null : new Int16Array(map.cols * map.rows).fill(-1)
      createTileCellReader(layer.cells, sourceBounds).visitOccupied(
        sourceBounds,
        (cell, col, row) => {
          if (refused) return
          if ('origin' in map && ++work > REGION_EDIT_LIMIT) {
            refused = true
            return
          }
          let x = col - sourceBounds.col,
            y = row - sourceBounds.row,
            cols = set.map.cols,
            rows = set.map.rows
          if (instance.flipX) x = cols - 1 - x
          if (instance.flipY) y = rows - 1 - y
          for (let n = 0; n < turns; n++) {
            const previousX = x
            x = rows - 1 - y
            y = previousX
            const previousCols = cols
            cols = rows
            rows = previousCols
          }
          const value = transformValue(cell)
          if (dense) dense[y * map.cols + x] = value
          else edits.push({ col: targetBounds.col + x, row: targetBounds.row + y, cell: value })
        },
      )
      if (refused) return layer
      let cells: TilemapCells
      if (dense) cells = dense
      else {
        const empty: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks: [] }
        const result = editRegionCells(empty, targetBounds, edits, remainingChunks)
        if (!result.ok) {
          refused = true
          return layer
        }
        cells = result.cells
        remainingChunks -= result.cells.chunks.length
      }
      return {
        ...placed(
          (owner.offsetX ?? 0) + instance.x + minX + off.x - zero.x - targetBounds.col * tileSize,
          (owner.offsetY ?? 0) + instance.y + minY + off.y - zero.y - targetBounds.row * tileSize,
        ),
        cells,
        ...(layer.tilesetId || copy.tilesetId !== map.tilesetId
          ? { tilesetId: layer.tilesetId ?? copy.tilesetId }
          : {}),
      } as TilemapLayer<TilemapCells>
    })
  if (refused) return map
  const at = map.layers.indexOf(owner)
  const updated = { ...owner, objects: owner.objects.filter((o) => o.id !== instance.id) }
  const result = {
    ...map,
    ...(resources.length ? { resources } : {}),
    layers: [...map.layers.slice(0, at), ...layers, updated, ...map.layers.slice(at + 1)],
  } as Map
  // New geometry must survive the strict reader before it becomes a history value.
  return 'origin' in result && !sanitizeRegionTilemapAsset(result) ? map : result
}
