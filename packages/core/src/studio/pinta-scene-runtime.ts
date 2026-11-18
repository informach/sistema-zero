import type { PintaScene, PintaSceneLayer, PintaSceneObject } from './pinta-scene'

export { sceneObjectTransformSource } from './pinta-scene-transform.generated'
/** Source crop shared by the editor and JavaScript players. Self-contained for portable builds. */
export function sceneArtFrame(
  art: NonNullable<PintaScene['art']>[number],
  animationId: string | undefined,
  elapsedMs: number,
): { x: number; y: number; width: number; height: number } {
  const sprite = art.sprite
  if (!sprite) return { x: 0, y: 0, width: art.width, height: art.height }
  const animation = sprite.animations.find((a) => a.id === animationId)
  let tile = sprite.animations[0]!.frames[0]!.tile
  if (animation) {
    const total = animation.frames.reduce((sum, f) => sum + f.duration, 0)
    let at = animation.loop
      ? Math.max(0, elapsedMs) % total
      : Math.min(Math.max(0, elapsedMs), total)
    tile = animation.frames.at(-1)!.tile
    for (const frame of animation.frames) {
      at -= frame.duration
      if (at < 0) {
        tile = frame.tile
        break
      }
    }
  }
  return {
    x: (tile % sprite.columns) * sprite.frameWidth,
    y: Math.floor(tile / sprite.columns) * sprite.frameHeight,
    width: sprite.frameWidth,
    height: sprite.frameHeight,
  }
}
export function sceneLayerState(
  layers: PintaSceneLayer[],
  layer: PintaSceneLayer,
): {
  visible: boolean
  opacity: number
  offsetX: number
  offsetY: number
  parallaxX: number
  parallaxY: number
} {
  const result = {
    visible: layer.visible,
    opacity: layer.opacity ?? 1,
    offsetX: layer.offsetX ?? 0,
    offsetY: layer.offsetY ?? 0,
    parallaxX: layer.parallaxX ?? 1,
    parallaxY: layer.parallaxY ?? 1,
  }
  let parent = layer.parentId
  for (let n = 0; parent && n < 32; n++) {
    const p = layers.find((l) => l.id === parent)
    if (!p) break
    result.visible &&= p.visible
    result.opacity *= p.opacity ?? 1
    result.offsetX += p.offsetX ?? 0
    result.offsetY += p.offsetY ?? 0
    result.parallaxX *= p.parallaxX ?? 1
    result.parallaxY *= p.parallaxY ?? 1
    parent = p.parentId
  }
  return result
}
/** Expands one child in a set. Geometry never uses the child's internal art flips.
 * A reflected basis becomes a proper rotation plus an origin shift and an art flip.
 * This derived view may use polygon points for an affine footprint. The authored
 * object is untouched. Keep this function self-contained: players embed its source.
 */
export function transformSceneSetObject(
  parent: PintaSceneObject,
  child: PintaSceneObject,
  setWidth: number,
  setHeight: number,
  localIds: readonly string[],
): PintaSceneObject {
  const sx = parent.width / setWidth,
    sy = parent.height / setHeight
  const a = ((parent.rotation ?? 0) * Math.PI) / 180,
    b = ((child.rotation ?? 0) * Math.PI) / 180,
    mx = parent.flipX ? -sx : sx,
    my = parent.flipY ? -sy : sy
  const vector = (x: number, y: number) => ({
    x: x * mx * Math.cos(a) - y * my * Math.sin(a),
    y: x * mx * Math.sin(a) + y * my * Math.cos(a),
  })
  const u = vector(Math.cos(b), Math.sin(b)),
    v = vector(-Math.sin(b), Math.cos(b)),
    ux = Math.hypot(u.x, u.y),
    vy = Math.hypot(v.x, v.y)
  const shear = Math.abs(u.x * v.x + u.y * v.y) > 1e-8 * ux * vy
  const reflected = u.x * v.y - u.y * v.x < 0,
    p = vector(child.x, child.y),
    origin = vector(parent.flipX ? -setWidth : 0, parent.flipY ? -setHeight : 0)
  const result: PintaSceneObject = {
    ...child,
    id: localIds.includes(child.id) ? [parent.id, child.id].join('/') : child.id,
    x: parent.x + p.x + origin.x + (reflected ? v.x * child.height : 0),
    y: parent.y + p.y + origin.y + (reflected ? v.y * child.height : 0),
    width: child.width * ux,
    height: child.height * vy,
    rotation: (Math.atan2(u.y, u.x) * 180) / Math.PI,
    flipX: child.flipX,
    flipY: !!child.flipY !== reflected ? true : undefined,
    ...(child.points
      ? {
          points: child.points.map((p) => ({
            x: p.x * ux,
            y: (reflected ? child.height - p.y : p.y) * vy,
          })),
        }
      : {}),
    properties: Object.fromEntries(
      Object.entries(child.properties).map(([key, value]) => [
        key,
        typeof value === 'object' && value.type === 'object'
          ? {
              ...value,
              value: localIds.includes(String(value.value))
                ? [parent.id, value.value].join('/')
                : value.value,
            }
          : value,
      ]),
    ),
  }
  if (!shear) return result
  const world = (x: number, y: number) => ({
    x: parent.x + p.x + origin.x + u.x * x + v.x * y,
    y: parent.y + p.y + origin.y + u.y * x + v.y * y,
  })
  if (child.shape === 'ellipse') {
    const bx = (u.x * child.width) / 2,
      by = (u.y * child.width) / 2,
      cx = (v.x * child.height) / 2,
      cy = (v.y * child.height) / 2,
      xx = bx * bx + cx * cx,
      yy = by * by + cy * cy,
      xy = bx * by + cx * cy,
      delta = Math.hypot(xx - yy, 2 * xy),
      rx = Math.sqrt(Math.max(0, (xx + yy + delta) / 2)),
      ry = Math.sqrt(Math.max(0, (xx + yy - delta) / 2)),
      theta = Math.atan2(2 * xy, xx - yy) / 2,
      center = world(child.width / 2, child.height / 2)
    return {
      ...result,
      x: center.x - rx * Math.cos(theta) + ry * Math.sin(theta),
      y: center.y - rx * Math.sin(theta) - ry * Math.cos(theta),
      width: rx * 2,
      height: ry * 2,
      rotation: (theta * 180) / Math.PI,
      flipX: undefined,
      flipY: undefined,
    }
  }
  const at = world(0, 0),
    points = (
      child.points ?? [
        { x: 0, y: 0 },
        { x: child.width, y: 0 },
        { x: child.width, y: child.height },
        { x: 0, y: child.height },
      ]
    ).map((p) => ({ x: u.x * p.x + v.x * p.y, y: u.y * p.x + v.y * p.y }))
  return {
    ...result,
    x: at.x,
    y: at.y,
    rotation: 0,
    points,
    shape: child.shape === 'polyline' || child.shape === 'point' ? child.shape : 'polygon',
    flipX: child.flipX,
    flipY: child.flipY,
  }
}
export function sceneObjects(scene: PintaScene): PintaSceneObject[] {
  const direct = scene.layers.flatMap((l) => {
    if (l.kind !== 'objects') return []
    const e = sceneLayerState(scene.layers, l)
    return e.visible ? l.objects.map((o) => ({ ...o, x: o.x + e.offsetX, y: o.y + e.offsetY })) : []
  })
  return direct.flatMap((o) => {
    const set = scene.sets?.find((s) => s.id === o.setId)
    if (!set) return [o]
    const nested = sceneObjects({
      ...scene,
      cols: set.cols,
      rows: set.rows,
      layers: set.layers,
      sets: [],
    })
    const ids = set.layers.flatMap((l) => (l.kind === 'objects' ? l.objects.map((o) => o.id) : []))
    return [
      o,
      ...nested.map((n) =>
        transformSceneSetObject(o, n, set.cols * scene.tileSize, set.rows * scene.tileSize, ids),
      ),
    ]
  })
}
export function sceneSpawn(scene: PintaScene): { x: number; y: number } {
  const start = sceneObjects(scene).find((o) => o.role === 'start' || o.type === 'inicio')
  return start ? { x: start.x, y: start.y } : { x: scene.tileSize / 2, y: scene.tileSize / 2 }
}
export function sceneSolidAt(scene: PintaScene, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= scene.cols * scene.tileSize || y >= scene.rows * scene.tileSize)
    return true
  return scene.layers.some((l) => {
    if (l.kind === 'objects') {
      const e = sceneLayerState(scene.layers, l)
      return (
        e.visible &&
        l.objects.some((o) => {
          const set = scene.sets?.find((s) => s.id === o.setId)
          if (!set || !o.width || !o.height) return false
          const a = (-(o.rotation ?? 0) * Math.PI) / 180,
            dx = x - o.x - e.offsetX,
            dy = y - o.y - e.offsetY
          let px = dx * Math.cos(a) - dy * Math.sin(a),
            py = dx * Math.sin(a) + dy * Math.cos(a)
          if (o.flipX) px = o.width - px
          if (o.flipY) py = o.height - py
          if (px < 0 || py < 0 || px >= o.width || py >= o.height) return false
          return sceneSolidAt(
            { ...scene, cols: set.cols, rows: set.rows, layers: set.layers, sets: [] },
            (px / o.width) * set.cols * scene.tileSize,
            (py / o.height) * set.rows * scene.tileSize,
          )
        })
      )
    }
    if (l.kind !== 'tiles') return false
    const e = sceneLayerState(scene.layers, l)
    if (!e.visible) return false
    const col = Math.floor((x - e.offsetX) / scene.tileSize),
      row = Math.floor((y - e.offsetY) / scene.tileSize)
    if (col < 0 || row < 0 || col >= scene.cols || row >= scene.rows) return false
    const cell = l.cells[row * scene.cols + col] ?? -1
    return (
      cell >= 0 &&
      (l.collision === true ||
        scene.tilesets.find((t) => t.id === l.tilesetId)?.solid.includes(cell & 4095) === true)
    )
  })
}
export function moveSceneCharacter(
  scene: PintaScene,
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius = scene.tileSize * 0.25,
): { x: number; y: number } {
  let { x, y } = position
  const free = (cx: number, cy: number): boolean =>
    [-radius, radius].every((ox) =>
      [-radius, radius].every((oy) => !sceneSolidAt(scene, cx + ox, cy + oy)),
    )
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, radius)))
  for (let i = 0; i < steps; i++) {
    if (free(x + dx / steps, y)) x += dx / steps
    if (free(x, y + dy / steps)) y += dy / steps
  }
  return { x, y }
}
