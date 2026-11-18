import type { PintaScene, PintaSceneLayer, PintaSceneObject } from './pinta-scene'
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
export function sceneObjects(scene: PintaScene): PintaSceneObject[] {
  const direct = scene.layers.flatMap((l) => {
    if (l.kind !== 'objects') return []
    const e = sceneLayerState(scene.layers, l)
    return e.visible ? l.objects.map((o) => ({ ...o, x: o.x + e.offsetX, y: o.y + e.offsetY })) : []
  })
  return direct.flatMap((o) => {
    const set = scene.sets?.find((s) => s.id === o.setId)
    if (!set) return [o]
    const sx = o.width / (set.cols * scene.tileSize),
      sy = o.height / (set.rows * scene.tileSize),
      a = ((o.rotation ?? 0) * Math.PI) / 180
    const nested = sceneObjects({
      ...scene,
      cols: set.cols,
      rows: set.rows,
      layers: set.layers,
      sets: [],
    })
    const ids = new Map(nested.map((n) => [n.id, `${o.id}/${n.id}`]))
    return [
      o,
      ...nested.map((n) => {
        const x = (o.flipX ? set.cols * scene.tileSize - n.x : n.x) * sx,
          y = (o.flipY ? set.rows * scene.tileSize - n.y : n.y) * sy
        return {
          ...n,
          id: ids.get(n.id)!,
          x: o.x + x * Math.cos(a) - y * Math.sin(a),
          y: o.y + x * Math.sin(a) + y * Math.cos(a),
          width: n.width * sx,
          height: n.height * sy,
          rotation:
            (o.rotation ?? 0) + (!!o.flipX !== !!o.flipY ? -(n.rotation ?? 0) : (n.rotation ?? 0)),
          flipX: !!n.flipX !== !!o.flipX ? (true as const) : undefined,
          flipY: !!n.flipY !== !!o.flipY ? (true as const) : undefined,
          properties: Object.fromEntries(
            Object.entries(n.properties).map(([k, v]) => [
              k,
              typeof v === 'object' && v.type === 'object'
                ? { ...v, value: ids.get(String(v.value)) ?? v.value }
                : v,
            ]),
          ),
        }
      }),
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
