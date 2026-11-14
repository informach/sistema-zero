import type { MoradaCollider, MoradaVector } from '../../packages/core/src/morada/types'

/** Metadados de ocupação, sem incorporar os vértices do pack ao catálogo público de código. */
export function meshNavigationColliders(
  triangles: readonly MoradaVector[][],
  cell = 0.25,
): MoradaCollider[] {
  const occupied = new Set<string>()
  const dot = (a: MoradaVector, b: MoradaVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const sub = (a: MoradaVector, b: MoradaVector): MoradaVector => [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
  ]
  const cross = (a: MoradaVector, b: MoradaVector): MoradaVector => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
  for (const triangle of triangles) {
    if (triangle.length !== 3) throw new Error('A navegação exige triângulos de colisão.')
    const min = [0, 1, 2].map((i) => Math.floor(Math.min(...triangle.map((p) => p[i]!)) / cell))
    const max = [0, 1, 2].map((i) => Math.floor(Math.max(...triangle.map((p) => p[i]!)) / cell))
    const edges = [
      sub(triangle[1]!, triangle[0]!),
      sub(triangle[2]!, triangle[1]!),
      sub(triangle[0]!, triangle[2]!),
    ]
    const basis: MoradaVector[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    const axes = [
      ...basis,
      cross(edges[0]!, edges[1]!),
      ...edges.flatMap((e) => basis.map((a) => cross(e, a))),
    ]
    for (let y = min[1]!; y <= max[1]!; y++)
      for (let z = min[2]!; z <= max[2]!; z++)
        for (let x = min[0]!; x <= max[0]!; x++) {
          const key = `${x},${y},${z}`
          if (occupied.has(key)) continue
          const center: MoradaVector = [(x + 0.5) * cell, (y + 0.5) * cell, (z + 0.5) * cell]
          const points = triangle.map((p) => sub(p, center))
          if (
            axes.every((axis) => {
              const radius =
                cell * 0.5 * (Math.abs(axis[0]) + Math.abs(axis[1]) + Math.abs(axis[2]))
              const projections = points.map((p) => dot(p, axis))
              return (
                Math.min(...projections) <= radius + 1e-7 &&
                Math.max(...projections) >= -radius - 1e-7
              )
            })
          )
            occupied.add(key)
        }
  }
  // Junta células na horizontal para limitar o catálogo a caixas de navegação.
  const rows = new Map<string, number[]>()
  for (const key of occupied) {
    const [x, y, z] = key.split(',').map(Number)
    const k = `${y},${z}`
    const row = rows.get(k) ?? []
    row.push(x!)
    rows.set(k, row)
  }
  const boxes: MoradaCollider[] = []
  for (const [key, row] of rows) {
    const [y, z] = key.split(',').map(Number)
    row.sort((a, b) => a - b)
    for (let i = 0; i < row.length; ) {
      let end = i
      while (end + 1 < row.length && row[end + 1] === row[end]! + 1) end++
      const start = row[i]!,
        last = row[end]!
      boxes.push({
        center: [((start + last + 1) * cell) / 2, (y! + 0.5) * cell, (z! + 0.5) * cell],
        size: [(last - start + 1) * cell, cell, cell],
      })
      i = end + 1
    }
  }
  return boxes
}

export interface WallOpening {
  cx: number
  larg: number
  peitoril: number
  alt: number
  tipo: string
}

/** Colisão paramétrica das paredes antigas: usa os vãos autorais, nunca a caixa do desenho. */
export function wallColliders(
  length: number,
  height: number,
  thickness: number,
  openings: WallOpening[],
): MoradaCollider[] {
  const boxes: MoradaCollider[] = []
  const add = (x: number, width: number, bottom: number, top: number) => {
    if (width > 0.0001 && top > bottom + 0.0001)
      boxes.push({
        center: [x + width / 2, (bottom + top) / 2, 0],
        size: [width, top - bottom, thickness],
      })
  }
  let cursor = 0
  for (const o of [...openings].sort((a, b) => a.cx - b.cx)) {
    const left = o.cx - o.larg / 2
    add(cursor, left - cursor, 0, height)
    add(left, o.larg, 0, o.peitoril)
    if (o.tipo.startsWith('arco')) {
      const radius = o.larg / 2
      const spring = o.peitoril + o.alt - radius
      // Faixas conservadoras do arco, sem fechar o vão nem usar uma caixa externa.
      for (let j = 0; j < 16; j++) {
        const x0 = left + (j * o.larg) / 16,
          x1 = left + ((j + 1) * o.larg) / 16
        const x = Math.max(Math.abs(x0 - o.cx), Math.abs(x1 - o.cx))
        add(x0, x1 - x0, spring + Math.sqrt(Math.max(0, radius * radius - x * x)), height)
      }
    } else add(left, o.larg, o.peitoril + o.alt, height)
    cursor = left + o.larg
  }
  add(cursor, length - cursor, 0, height)
  return boxes
}
