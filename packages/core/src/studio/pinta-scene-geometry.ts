import type { PintaMapProjection } from '../creations/pinta-map-projection'
import type { createPintaProjectionGeometry } from '../creations/pinta-projection-geometry'
import type { createRegionCellReader } from '../creations/pinta-region-reader'
import type { PintaHexRegionCells, PintaRegionCells } from '../creations/pinta-regions'
import type { PintaProjectedScene } from './pinta-projected-scene'
import type { PintaSceneObject } from './pinta-scene'
import type { PintaSceneQuery } from './pinta-scene-query'
import { sceneLayerState, transformSceneSetObject } from './pinta-scene-runtime'

export interface SceneBox {
  x: number
  y: number
  width: number
  height: number
}

export type PintaProjectedCollisionView = PintaProjectedScene & {
  worldBounds: SceneBox
  projectionGeometry(
    projection: PintaMapProjection,
  ): ReturnType<typeof createPintaProjectionGeometry>
  regionCells(
    grid: PintaRegionCells | PintaHexRegionCells,
  ): ReturnType<typeof createRegionCellReader>
  tileIndex(cell: number, grid: PintaRegionCells | PintaHexRegionCells): number
}

type CollisionScene = PintaSceneQuery | PintaProjectedCollisionView

/**
 * Exact authored shape versus an axis-aligned body. Art flips do not reflect its
 * outline. A set's affine transform must first be applied by transformSceneSetObject.
 * Ellipses are analytic; polygons may be concave; polylines remain open.
 * Touching without penetration is free. Points/lines block only the body's interior.
 * Self-contained so portable JavaScript players can embed this same function.
 */
export function sceneObjectIntersectsBox(object: PintaSceneObject, box: SceneBox): boolean {
  if (
    ![
      box.x,
      box.y,
      box.width,
      box.height,
      object.x,
      object.y,
      object.width,
      object.height,
      object.rotation ?? 0,
    ].every(Number.isFinite) ||
    box.width <= 0 ||
    box.height <= 0
  )
    return false
  const angle = (-(object.rotation ?? 0) * Math.PI) / 180
  const cosine = Math.cos(angle),
    sine = Math.sin(angle)
  // An inward numerical margin makes exact edge contact free after inverse rotation.
  const inset = Math.min(box.width, box.height, 1) * 1e-9
  const local = (x: number, y: number) => ({
    x: (x - object.x) * cosine - (y - object.y) * sine,
    y: (x - object.x) * sine + (y - object.y) * cosine,
  })
  const query = [
    local(box.x + inset, box.y + inset),
    local(box.x + box.width - inset, box.y + inset),
    local(box.x + box.width - inset, box.y + box.height - inset),
    local(box.x + inset, box.y + box.height - inset),
  ]
  type Point = { x: number; y: number }
  const cross = (a: Point, b: Point, p: Point) =>
    (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
  const inside = (p: Point, points: Point[]): boolean => {
    let result = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i]!,
        b = points[j]!
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
        result = !result
    }
    return result
  }
  const segmentCrosses = (a: Point, b: Point, c: Point, d: Point): boolean => {
    const x = cross(a, b, c),
      y = cross(a, b, d),
      u = cross(c, d, a),
      v = cross(c, d, b)
    if (((x > 0 && y < 0) || (x < 0 && y > 0)) && ((u > 0 && v < 0) || (u < 0 && v > 0)))
      return true
    const on = (p: Point, q: Point, r: Point) =>
      cross(p, q, r) === 0 &&
      r.x >= Math.min(p.x, q.x) &&
      r.x <= Math.max(p.x, q.x) &&
      r.y >= Math.min(p.y, q.y) &&
      r.y <= Math.max(p.y, q.y)
    return on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)
  }
  const shape = object.shape ?? (object.width === 0 && object.height === 0 ? 'point' : 'rect')
  if (shape === 'point') return inside({ x: 0, y: 0 }, query)
  if (shape === 'ellipse') {
    if (object.width <= 0 || object.height <= 0) return false
    // Inverse ellipse maps its boundary to the unit circle and the box to a
    // convex quadrilateral. Vertex, edge-distance and containment cover all cases.
    const circleQuery = query.map((p) => ({
      x: (p.x - object.width / 2) / (object.width / 2),
      y: (p.y - object.height / 2) / (object.height / 2),
    }))
    if (inside({ x: 0, y: 0 }, circleQuery)) return true
    for (let i = 0; i < circleQuery.length; i++) {
      const a = circleQuery[i]!,
        b = circleQuery[(i + 1) % circleQuery.length]!
      const dx = b.x - a.x,
        dy = b.y - a.y
      const t = Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / (dx * dx + dy * dy || 1)))
      if ((a.x + t * dx) ** 2 + (a.y + t * dy) ** 2 < 1) return true
    }
    return false
  }
  const points: Point[] =
    shape === 'polygon' || shape === 'polyline'
      ? (object.points ?? [])
      : [
          { x: 0, y: 0 },
          { x: object.width, y: 0 },
          { x: object.width, y: object.height },
          { x: 0, y: object.height },
        ]
  if (!points.length || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return false
  const open = shape === 'polyline'
  const second = points.find((p) => p.x !== points[0]!.x || p.y !== points[0]!.y)
  if (
    !open &&
    (points.length < 3 || !second || !points.some((p) => cross(points[0]!, second, p) !== 0))
  )
    return false
  if (points.some((p) => inside(p, query))) return true
  if (!open && query.some((p) => inside(p, points))) return true
  for (let i = 0; i < points.length - (open ? 1 : 0); i++) {
    const a = points[i]!,
      b = points[(i + 1) % points.length]!
    for (let j = 0; j < query.length; j++)
      if (segmentCrosses(a, b, query[j]!, query[(j + 1) % query.length]!)) return true
  }
  return false
}

/** Shared broad phase for solids and one-way floors. The visitor receives the
 * actual authored geometry, including affine sets and inherited layer offsets.
 * Returning true stops the traversal. No collider copy of the map is retained.
 */
export function sceneVisitColliders(
  scene: CollisionScene,
  box: SceneBox,
  kind: 'solid' | 'platform',
  visit: (object: PintaSceneObject) => boolean,
): boolean {
  if (
    ![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
    box.width <= 0 ||
    box.height <= 0
  )
    return false
  const tileSize = scene.tileSize
  const queryLayers = (
    layers: CollisionScene['layers'],
    cols: number,
    rows: number,
    origin: { col: number; row: number },
    parent?: PintaSceneObject,
    projection?: PintaMapProjection,
  ): boolean => {
    const geometry = scene.version === 5 && projection ? scene.projectionGeometry(projection) : null
    const bounds = { ...origin, cols, rows }
    const frame = geometry?.worldBounds(bounds)
    const offsetX = frame?.x ?? origin.col * tileSize
    const offsetY = frame?.y ?? origin.row * tileSize
    const spanX = frame?.width ?? cols * tileSize
    const spanY = frame?.height ?? rows * tileSize
    const local = (x: number, y: number) => {
      if (!parent) return { x, y }
      const angle = (-(parent.rotation ?? 0) * Math.PI) / 180
      const dx = x - parent.x,
        dy = y - parent.y
      let px = dx * Math.cos(angle) - dy * Math.sin(angle),
        py = dx * Math.sin(angle) + dy * Math.cos(angle)
      if (parent.flipX) px = parent.width - px
      if (parent.flipY) py = parent.height - py
      return {
        x: frame
          ? (px / parent.width) * spanX + offsetX
          : (px / parent.width) * cols * tileSize + offsetX,
        y: frame
          ? (py / parent.height) * spanY + offsetY
          : (py / parent.height) * rows * tileSize + offsetY,
      }
    }
    const corners = [
      local(box.x, box.y),
      local(box.x + box.width, box.y),
      local(box.x + box.width, box.y + box.height),
      local(box.x, box.y + box.height),
    ]
    const left = Math.min(...corners.map((p) => p.x)),
      right = Math.max(...corners.map((p) => p.x))
    const top = Math.min(...corners.map((p) => p.y)),
      bottom = Math.max(...corners.map((p) => p.y))
    for (const layer of layers) {
      const state = sceneLayerState(layers, layer)
      if (!state.visible) continue
      if (layer.kind === 'objects' && kind === 'solid') {
        for (const object of layer.objects) {
          if (!object.collision) continue
          const placed = {
            ...object,
            x: object.x + state.offsetX - (parent ? offsetX : 0),
            y: object.y + state.offsetY - (parent ? offsetY : 0),
          }
          if (visit(parent ? transformSceneSetObject(parent, placed, spanX, spanY, []) : placed))
            return true
        }
      }
      if (layer.kind !== 'tiles') continue
      const tileset = scene.tilesets.find((t) => t.id === layer.tilesetId)
      if (
        !tileset ||
        (kind === 'solid'
          ? !layer.collision && !tileset.solid.length
          : layer.collision || !tileset.platform.length)
      )
        continue
      // Include touching cells; the narrow phase decides penetration versus support.
      const x0 = Math.max(origin.col, Math.floor((left - state.offsetX - 1e-7) / tileSize)),
        x1 = Math.min(origin.col + cols, Math.ceil((right - state.offsetX + 1e-7) / tileSize))
      const y0 = Math.max(origin.row, Math.floor((top - state.offsetY - 1e-7) / tileSize)),
        y1 = Math.min(origin.row + rows, Math.ceil((bottom - state.offsetY + 1e-7) / tileSize))
      const cellCollider = (cell: number, col: number, row: number): boolean => {
        if (cell < 0) return false
        const index =
          scene.version === 5 && !Array.isArray(layer.cells)
            ? scene.tileIndex(cell, layer.cells)
            : cell & 4095
        const solid = !!layer.collision || tileset.solid.includes(index)
        if (kind === 'solid' ? !solid : solid || !tileset.platform.includes(index)) return false
        const cellCenter = geometry?.center(col, row)
        const x = cellCenter?.x ?? col * tileSize
        const y = cellCenter?.y ?? row * tileSize
        const tile: PintaSceneObject = {
          id: '',
          name: '',
          type: '',
          x: x + state.offsetX - (parent ? offsetX : 0),
          y: y + state.offsetY - (parent ? offsetY : 0),
          width: geometry?.cellWidth ?? tileSize,
          height: geometry?.cellHeight ?? tileSize,
          properties: {},
          shape: geometry ? 'polygon' : 'rect',
          ...(geometry
            ? {
                points: geometry
                  .polygon(col, row)
                  .map((point) => ({ x: point.x - x, y: point.y - y })),
              }
            : {}),
        }
        return visit(parent ? transformSceneSetObject(parent, tile, spanX, spanY, []) : tile)
      }
      if (Array.isArray(layer.cells)) {
        for (let row = y0; row < y1; row++)
          for (let col = x0; col < x1; col++)
            if (cellCollider(layer.cells[row * cols + col] ?? -1, col, row)) return true
      } else if (scene.version === 5 && geometry) {
        const visible = geometry.visibleCells(bounds, {
          x: left - state.offsetX - 1e-7,
          y: top - state.offsetY - 1e-7,
          width: right - left + 2e-7,
          height: bottom - top + 2e-7,
        })
        if (!visible) continue
        let hit = false
        scene.regionCells(layer.cells).visitOccupied(
          visible,
          (cell, col, row) => {
            if (!hit) hit = cellCollider(cell, col, row)
          },
          'row-major',
        )
        if (hit) return true
      } else if (scene.version === 4 && layer.cells.kind === 'regions') {
        let hit = false
        scene.regionCells(layer.cells).visitOccupied(
          { col: x0, row: y0, cols: x1 - x0, rows: y1 - y0 },
          (cell, col, row) => {
            if (!hit) hit = cellCollider(cell, col, row)
          },
          'row-major',
        )
        if (hit) return true
      }
    }
    return false
  }
  if (
    queryLayers(
      scene.layers,
      scene.cols,
      scene.rows,
      scene.version === 4 || scene.version === 5 ? scene.origin : { col: 0, row: 0 },
      undefined,
      scene.version === 5 ? scene.projection : undefined,
    )
  )
    return true
  for (const layer of scene.layers) {
    if (layer.kind !== 'objects') continue
    const state = sceneLayerState(scene.layers, layer)
    if (!state.visible) continue
    for (const object of layer.objects) {
      if (!object.setId || object.width <= 0 || object.height <= 0) continue
      const set = scene.sets?.find((s) => s.id === object.setId)
      if (!set) continue
      const parent = {
        ...object,
        x: object.x + state.offsetX,
        y: object.y + state.offsetY,
        shape: 'rect' as const,
        points: undefined,
      }
      // Child layers may extend beyond the nominal set through offsets. The cell
      // ranges below supply the broad phase without clipping those authored tiles.
      if (
        queryLayers(
          set.layers,
          set.cols,
          set.rows,
          'origin' in set ? set.origin : { col: 0, row: 0 },
          parent,
          'projection' in set ? set.projection : undefined,
        )
      )
        return true
    }
  }
  return false
}

/** Continuous full-body solid query. Existing scene 1/2 game players retain their
 * previous interpretation; the editor and scene 3 use this authored geometry. */
export function sceneIntersectsBox(scene: CollisionScene, box: SceneBox): boolean {
  if (
    ![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
    box.width <= 0 ||
    box.height <= 0
  )
    return false
  const origin = scene.version === 4 ? scene.origin : { col: 0, row: 0 }
  const area = scene.version === 5 ? scene.worldBounds : null
  if (
    box.x < (area?.x ?? origin.col * scene.tileSize) ||
    box.y < (area?.y ?? origin.row * scene.tileSize) ||
    box.x + box.width > (area ? area.x + area.width : (origin.col + scene.cols) * scene.tileSize) ||
    box.y + box.height > (area ? area.y + area.height : (origin.row + scene.rows) * scene.tileSize)
  )
    return true
  return sceneVisitColliders(scene, box, 'solid', (object) => sceneObjectIntersectsBox(object, box))
}

/** One-way support in the direction of the game's gravity. Returns a resolved
 * body on contact, or null when passing through/free. The actual upper/lower
 * envelope of the tile over the body's width is used, including rotated sets.
 * Call after solid motion, and omit it while the game requests dropping through.
 * Gravity zero is a top-down game, with no one-way support.
 */
export function scenePlatformLanding(
  scene: CollisionScene,
  previous: SceneBox,
  desired: SceneBox,
  gravity = 1,
): SceneBox | null {
  if (
    ![
      previous.x,
      previous.y,
      previous.width,
      previous.height,
      desired.x,
      desired.y,
      desired.width,
      desired.height,
      gravity,
    ].every(Number.isFinite) ||
    previous.width <= 0 ||
    previous.height <= 0 ||
    desired.width <= 0 ||
    desired.height <= 0 ||
    !gravity
  )
    return null
  const direction = Math.sign(gravity),
    epsilon = 1e-6
  if ((desired.y - previous.y) * direction < -epsilon) return null
  const query = {
    x: Math.min(previous.x, desired.x),
    y: Math.min(previous.y, desired.y),
    width:
      Math.max(previous.x + previous.width, desired.x + desired.width) -
      Math.min(previous.x, desired.x),
    height:
      Math.max(previous.y + previous.height, desired.y + desired.height) -
      Math.min(previous.y, desired.y),
  }
  if (![query.x, query.y, query.width, query.height].every(Number.isFinite)) return null
  query.x -= epsilon
  query.y -= epsilon
  query.width += epsilon * 2
  query.height += epsilon * 2
  const choice: { box: SceneBox | null; wasSupported: boolean } = { box: null, wasSupported: false }
  sceneVisitColliders(scene, query, 'platform', (tile) => {
    const angle = ((tile.rotation ?? 0) * Math.PI) / 180,
      cosine = Math.cos(angle),
      sine = Math.sin(angle)
    const local =
      tile.shape === 'polygon'
        ? (tile.points ?? [])
        : [
            { x: 0, y: 0 },
            { x: tile.width, y: 0 },
            { x: tile.width, y: tile.height },
            { x: 0, y: tile.height },
          ]
    const points = local.map((p) => ({
      x: tile.x + p.x * cosine - p.y * sine,
      y: tile.y + p.x * sine + p.y * cosine,
    }))
    if (points.length < 3) return false
    const surface = (body: SceneBox): number | null => {
      const left = Math.max(body.x, Math.min(...points.map((p) => p.x))),
        right = Math.min(body.x + body.width, Math.max(...points.map((p) => p.x)))
      if (right - left <= 1e-9) return null
      const heights: number[] = []
      for (let i = 0; i < points.length; i++) {
        const a = points[i]!,
          b = points[(i + 1) % points.length]!
        if (a.x >= left && a.x <= right) heights.push(a.y)
        if (a.x === b.x) continue
        for (const x of [left, right])
          if (x >= Math.min(a.x, b.x) && x <= Math.max(a.x, b.x))
            heights.push(a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x))
      }
      return heights.length ? (direction > 0 ? Math.min(...heights) : Math.max(...heights)) : null
    }
    const floor = surface(desired)
    if (floor === null) return false
    const oldFloor = surface(previous) ?? floor
    const oldFeet = previous.y + (direction > 0 ? previous.height : 0),
      feet = desired.y + (direction > 0 ? desired.height : 0)
    if ((oldFeet - oldFloor) * direction > epsilon || (feet - floor) * direction < -epsilon)
      return false
    const candidate = { ...desired, y: floor - (direction > 0 ? desired.height : 0) }
    if (!choice.box || (candidate.y - choice.box.y) * direction < 0) {
      choice.box = candidate
      choice.wasSupported = Math.abs(oldFeet - oldFloor) <= epsilon
    }
    return false
  })
  if (choice.box && sceneIntersectsBox(scene, choice.box)) {
    // Check solids once after selecting the first surface, not once per tile.
    // An ascending slope under a low ceiling must not lift a supported body
    // into the ceiling or let it fall through its current floor.
    return choice.wasSupported && !sceneIntersectsBox(scene, previous) ? { ...previous } : null
  }
  return choice.box
}

/** Axis-separated continuous motion. The swept rectangle contains the entire
 * translation, so even a zero-width authored line cannot be skipped. Each axis
 * needs at most 40 queries, independently of velocity or the thinnest obstacle.
 * A body initially overlapping may leave the obstacle; authoring never teleports it.
 */
export function sceneMoveBox(
  scene: CollisionScene,
  box: SceneBox,
  dx: number,
  dy: number,
): SceneBox {
  const result = { ...box }
  if (
    ![box.x, box.y, box.width, box.height, dx, dy].every(Number.isFinite) ||
    box.width <= 0 ||
    box.height <= 0
  )
    return result
  for (const axis of ['x', 'y'] as const) {
    const extent = axis === 'x' ? 'width' : 'height'
    // No valid body can travel farther than the world on one axis. Clamping the
    // request also keeps binary-search precision independent of untrusted speed.
    const limit =
      scene.version === 5
        ? scene.worldBounds[extent]
        : (axis === 'x' ? scene.cols : scene.rows) * scene.tileSize
    const delta = Math.max(-limit, Math.min(limit, axis === 'x' ? dx : dy))
    if (!delta) continue
    const swept = (fraction: number): SceneBox => ({
      ...result,
      [axis]: result[axis] + Math.min(0, delta * fraction),
      [extent]: result[extent] + Math.abs(delta * fraction),
    })
    if (sceneIntersectsBox(scene, result)) {
      const end = { ...result, [axis]: result[axis] + delta }
      if (!sceneIntersectsBox(scene, end)) result[axis] = end[axis]
      continue
    }
    if (!sceneIntersectsBox(scene, swept(1))) {
      result[axis] += delta
      continue
    }
    let low = 0,
      high = 1
    for (let iteration = 0; iteration < 38; iteration++) {
      const middle = (low + high) / 2
      if (sceneIntersectsBox(scene, swept(middle))) high = middle
      else low = middle
    }
    result[axis] += delta * low
  }
  return result
}
