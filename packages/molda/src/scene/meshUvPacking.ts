import type { SceneMeshGeometry, Vec2 } from './document'
import { mapMeshUv, meshUvBounds, meshUvFaces } from './meshUv'
import * as v from './validation'

/** Deterministic shelf packing of explicit disjoint charts; uniform scale preserves relative density. */
export function packMeshUvGroups(
  mesh: SceneMeshGeometry,
  groups: readonly (readonly string[])[],
  padding: number,
): SceneMeshGeometry {
  v.number(padding, 'uv.padding', 0, 0.25)
  const selected = meshUvFaces(mesh, groups.flat())
  v.requireScene(
    groups.every((group) => group.length > 0) &&
      selected.length === groups.reduce((count, group) => count + group.length, 0),
    'uv',
    'Cada face precisa pertencer a uma única ilha.',
  )
  if (!selected.length) return mesh
  const { min, max } = meshUvBounds(mesh, selected)
  const magnitude = Math.max(...min.map(Math.abs), ...max.map(Math.abs)) || 1
  const boxes = groups
    .map((ids) => {
      const bounds = meshUvBounds(mesh, ids)
      const low: Vec2 = [bounds.min[0] / magnitude, bounds.min[1] / magnitude]
      const width = bounds.max[0] / magnitude - low[0]
      const height = bounds.max[1] / magnitude - low[1]
      v.requireScene(
        width > 0 && height > 0,
        'uv',
        'Uma ilha não tem área na textura. Projete suas faces antes de organizar.',
      )
      return { ids, low, width, height }
    })
    .sort((a, b) => b.height - a.height || b.width - a.width || (a.ids[0]! < b.ids[0]! ? -1 : 1))
  const arrange = (scale: number) => {
    let x = padding
    let y = padding
    let row = 0
    const positions: Vec2[] = []
    for (const box of boxes) {
      const w = box.width * scale
      const h = box.height * scale
      if (x + w + padding > 1) {
        x = padding
        y += row + padding
        row = 0
      }
      if (x + w + padding > 1 || y + h + padding > 1) return null
      positions.push([x, y])
      x += w + padding
      row = Math.max(row, h)
    }
    return positions
  }
  v.requireScene(
    arrange(0),
    'uv',
    'Essa margem não deixa espaço para todas as ilhas. Use uma margem menor.',
  )
  let low = 0
  let high = Infinity
  for (const box of boxes)
    high = Math.min(high, (1 - padding * 2) / Math.max(box.width, box.height))
  v.requireScene(
    Number.isFinite(high),
    'uv',
    'As ilhas têm escalas muito diferentes para organizar juntas.',
  )
  for (let i = 0; i < 48; i++) {
    const middle = low + (high - low) / 2
    if (arrange(middle)) low = middle
    else high = middle
  }
  const positions = arrange(low)
  v.requireScene(
    low > 0 && positions,
    'uv',
    'Use uma margem menor para deixar espaço para a pintura.',
  )
  const transforms = new Map<string, { low: Vec2; position: Vec2 }>()
  boxes.forEach((box, i) => {
    for (const id of box.ids) transforms.set(id, { low: box.low, position: positions[i]! })
  })
  return mapMeshUv(mesh, selected, (uv, id) => {
    const t = transforms.get(id)!
    return [
      (uv[0] / magnitude - t.low[0]) * low + t.position[0],
      (uv[1] / magnitude - t.low[1]) * low + t.position[1],
    ]
  })
}
