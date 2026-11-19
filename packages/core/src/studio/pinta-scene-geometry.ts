import type { PintaScene, PintaSceneObject } from './pinta-scene'
import { sceneLayerState, transformSceneSetObject } from './pinta-scene-runtime'

export interface SceneBox {
  x: number
  y: number
  width: number
  height: number
}

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

/**
 * Continuous solid-tile query, including the actual transformed tiles of sets.
 * Traverses only cells covered by the inverse-transformed body, not a flattened
 * world grid or the corners of the body. No retained collider copy of the document.
 * Existing scene 1/2 game players retain their previous collision interpretation.
 */
export function sceneIntersectsBox(scene: PintaScene, box: SceneBox): boolean {
  if (
    ![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
    box.width <= 0 ||
    box.height <= 0
  )
    return false
  if (
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > scene.cols * scene.tileSize ||
    box.y + box.height > scene.rows * scene.tileSize
  )
    return true
  const tileSize = scene.tileSize
  const queryTiles = (
    layers: PintaScene['layers'],
    cols: number,
    rows: number,
    parent?: PintaSceneObject,
  ): boolean => {
    const local = (x: number, y: number) => {
      if (!parent) return { x, y }
      const angle = (-(parent.rotation ?? 0) * Math.PI) / 180
      const dx = x - parent.x,
        dy = y - parent.y
      let px = dx * Math.cos(angle) - dy * Math.sin(angle),
        py = dx * Math.sin(angle) + dy * Math.cos(angle)
      if (parent.flipX) px = parent.width - px
      if (parent.flipY) py = parent.height - py
      return { x: (px / parent.width) * cols * tileSize, y: (py / parent.height) * rows * tileSize }
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
      if (layer.kind !== 'tiles') continue
      const state = sceneLayerState(layers, layer)
      if (!state.visible) continue
      const tileset = scene.tilesets.find((t) => t.id === layer.tilesetId)
      if (!tileset || (!layer.collision && !tileset.solid.length)) continue
      const x0 = Math.max(0, Math.floor((left - state.offsetX) / tileSize)),
        x1 = Math.min(cols, Math.ceil((right - state.offsetX) / tileSize))
      const y0 = Math.max(0, Math.floor((top - state.offsetY) / tileSize)),
        y1 = Math.min(rows, Math.ceil((bottom - state.offsetY) / tileSize))
      for (let row = y0; row < y1; row++)
        for (let col = x0; col < x1; col++) {
          const cell = layer.cells[row * cols + col] ?? -1
          if (cell < 0 || (!layer.collision && !tileset.solid.includes(cell & 4095))) continue
          const tile: PintaSceneObject = {
            id: '',
            name: '',
            type: '',
            x: col * tileSize + state.offsetX,
            y: row * tileSize + state.offsetY,
            width: tileSize,
            height: tileSize,
            properties: {},
            shape: 'rect',
          }
          if (
            sceneObjectIntersectsBox(
              parent
                ? transformSceneSetObject(parent, tile, cols * tileSize, rows * tileSize, [])
                : tile,
              box,
            )
          )
            return true
        }
    }
    return false
  }
  const queryObjects = (
    layers: PintaScene['layers'],
    cols: number,
    rows: number,
    parent?: PintaSceneObject,
  ): boolean => {
    for (const layer of layers) {
      if (layer.kind !== 'objects') continue
      const state = sceneLayerState(layers, layer)
      if (!state.visible) continue
      for (const object of layer.objects) {
        if (!object.collision) continue
        const placed = { ...object, x: object.x + state.offsetX, y: object.y + state.offsetY }
        if (
          sceneObjectIntersectsBox(
            parent
              ? transformSceneSetObject(parent, placed, cols * tileSize, rows * tileSize, [])
              : placed,
            box,
          )
        )
          return true
      }
    }
    return false
  }
  if (
    queryTiles(scene.layers, scene.cols, scene.rows) ||
    queryObjects(scene.layers, scene.cols, scene.rows)
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
      if (queryTiles(set.layers, set.cols, set.rows, parent)) return true
      if (queryObjects(set.layers, set.cols, set.rows, parent)) return true
    }
  }
  return false
}

/** Axis-separated continuous motion. The swept rectangle contains the entire
 * translation, so even a zero-width authored line cannot be skipped. Each axis
 * needs at most 40 queries, independently of velocity or the thinnest obstacle.
 * A body initially overlapping may leave the obstacle; authoring never teleports it.
 */
export function sceneMoveBox(scene: PintaScene, box: SceneBox, dx: number, dy: number): SceneBox {
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
    const limit = (axis === 'x' ? scene.cols : scene.rows) * scene.tileSize
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
