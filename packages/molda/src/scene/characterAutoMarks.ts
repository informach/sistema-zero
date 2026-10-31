import type { Vec3 } from '../core/model'
import { characterRigTarget } from './characterRig'
import type { MoldaSceneDocument } from './document'
import { requireScene } from './validation'

/** Linhas da silhueta: a altura do personagem dividida em quadradinhos deste tamanho. */
const ROWS = 160
const FAIL = 'Não deu para achar o corpo sozinho. Marque os 5 pontos.'

/**
 * Os 5 pontos que a pessoa marcaria (queixo, virilha, cotovelo, pulso e joelho do lado esquerdo),
 * achados na silhueta de frente, como o auto-rig do Mixamo. Supõe o personagem em pé, olhando
 * para +Z, com os braços abertos (pose T ou A). Quando a silhueta não parece um corpo, recusa e a
 * pessoa marca à mão; `layoutCharacterSkeleton` ainda confere os pontos.
 */
export function guessCharacterMarks(source: MoldaSceneDocument, ids: readonly string[]): Vec3[] {
  const target = characterRigTarget(source, ids)
  const [minX, floor, minZ] = target.min
  const [maxX, top, maxZ] = target.max
  const height = top - floor
  requireScene(height > 0 && maxX > minX, 'points', FAIL)
  const cell = height / ROWS
  // Um corpo em pé não é muitas vezes mais largo que alto: placa, chão ou estrada não viram grade.
  requireScene((maxX - minX) / height <= 4, 'points', FAIL)
  const cols = Math.ceil((maxX - minX) / cell) + 1
  const grid = new Uint8Array(ROWS * cols)
  const colOf = (x: number) => Math.min(cols - 1, Math.max(0, Math.floor((x - minX) / cell)))
  const rowOf = (y: number) => Math.min(ROWS - 1, Math.max(0, Math.floor((y - floor) / cell)))
  const xOf = (col: number) => minX + (col + 0.5) * cell
  const yOf = (row: number) => floor + (row + 0.5) * cell
  const center = (minX + maxX) / 2
  const mid = colOf(center)
  const depth = (minZ + maxZ) / 2
  for (const triangle of target.triangles) {
    const [a, b, c] = triangle
    // Os cantos sempre contam: peças finas demais para cobrir o centro de um quadradinho.
    for (const point of triangle) grid[rowOf(point[1]) * cols + colOf(point[0])] = 1
    const d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
    if (Math.abs(d) < 1e-12) continue
    const low = [colOf(Math.min(a[0], b[0], c[0])), rowOf(Math.min(a[1], b[1], c[1]))]
    const high = [colOf(Math.max(a[0], b[0], c[0])), rowOf(Math.max(a[1], b[1], c[1]))]
    for (let row = low[1]!; row <= high[1]!; row++)
      for (let col = low[0]!; col <= high[0]!; col++) {
        const x = xOf(col)
        const y = yOf(row)
        const u = ((x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1])) / d
        const v = ((b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1])) / d
        if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) grid[row * cols + col] = 1
      }
  }
  const filled = (row: number, col: number) =>
    row >= 0 && row < ROWS && col >= 0 && col < cols && grid[row * cols + col] === 1
  /** O trecho cheio da linha que passa pela coluna: [primeira, última] coluna. */
  const run = (row: number, col: number): [number, number] | null => {
    if (!filled(row, col)) return null
    let lo = col
    let hi = col
    while (filled(row, lo - 1)) lo--
    while (filled(row, hi + 1)) hi++
    return [lo, hi]
  }
  const width = (row: number) => {
    const found = run(row, mid)
    return found ? found[1] - found[0] + 1 : 0
  }

  // Virilha: subindo pelo meio, o primeiro cheio depois do vão entre as pernas.
  let groinRow = 0
  while (groinRow < ROWS && !filled(groinRow, mid)) groinRow++
  // Pernas juntas (sem vão): vale a proporção de um corpo.
  if (groinRow < 0.12 * ROWS || groinRow > 0.65 * ROWS) groinRow = Math.round(0.48 * ROWS)
  const groinY = floor + groinRow * cell

  // Queixo: descendo pela cabeça, onde ela afina (queixo, pescoço ou vão) ou, sem isso, onde os
  // ombros alargam. Vai até a metade da altura: cabeça grande de boneco fofo também conta.
  let topRow = ROWS - 1
  while (topRow > groinRow && !filled(topRow, mid)) topRow--
  const rows = (fraction: number) => Math.round(fraction * ROWS)
  let chinRow = topRow - rows(0.13)
  let widest = 0
  for (let row = topRow; row > Math.max(groinRow, topRow - rows(0.55)); row--) {
    const size = width(row)
    if (widest > 0 && size < 0.85 * widest) {
      chinRow = row + 1
      break
    }
    if (row < topRow - rows(0.08) && size > 1.35 * widest) {
      chinRow = row + 1
      break
    }
    widest = Math.max(widest, size)
  }
  const chinY = floor + chinRow * cell
  requireScene(chinY - groinY > 0.15 * height, 'points', FAIL)

  // Joelho: pouco acima do meio da perna, no meio da perna esquerda (+X).
  const kneeY = floor + 0.53 * (groinY - floor)
  const kneeRow = rowOf(kneeY)
  const legRun = (row: number) => {
    let start = mid
    while (start < cols && !filled(row, start)) start++
    return run(row, start)
  }
  const leg = legRun(kneeRow)
  requireScene(!!leg, 'points', FAIL)
  const kneeX = xOf((Math.max(leg![0], mid) + leg![1]) / 2)

  // Beira do tronco: a do peito; se o peito já encosta nos braços, a do quadril.
  const chest = run(groinRow + Math.round(0.6 * (chinRow - groinRow)), mid)
  requireScene(!!chest, 'points', FAIL)
  const hip = legRun(Math.max(0, groinRow - 2))
  const edge = !hip || chest![1] - hip[1] < 0.06 * ROWS ? chest![1] : Math.max(hip[1], mid)
  // Braço esquerdo: o maior pedaço para fora do tronco, caído ou aberto. Pedacinhos soltos (uma
  // dobra da manga) e uma perna larga (bermuda, saia) fora do tronco ficam de fora.
  const first = edge + 2
  const seen = new Set<number>()
  let arm = new Set<number>()
  for (let row = kneeRow; row <= chinRow; row++)
    for (let col = first; col < cols; col++) {
      const start = row * cols + col
      if (!filled(row, col) || seen.has(start)) continue
      const piece = new Set([start])
      const stack = [start]
      seen.add(start)
      while (stack.length) {
        const at = stack.pop()!
        const r0 = Math.floor(at / cols)
        const c0 = at % cols
        for (const [r, c] of [
          [r0 + 1, c0],
          [r0 - 1, c0],
          [r0, c0 + 1],
          [r0, c0 - 1],
        ] as const)
          if (
            r >= kneeRow &&
            r <= chinRow &&
            c >= first &&
            filled(r, c) &&
            !seen.has(r * cols + c)
          ) {
            seen.add(r * cols + c)
            piece.add(r * cols + c)
            stack.push(r * cols + c)
          }
      }
      if (piece.size > arm.size) arm = piece
    }
  requireScene(arm.size > 0, 'points', FAIL)
  const inArm = (row: number, col: number) => arm.has(row * cols + col)
  let inner = cols
  for (const at of arm) inner = Math.min(inner, at % cols)
  // Ombro: o alto do braço junto do tronco (no meio da espessura, aberto ou caído).
  let high = chinRow
  while (high > kneeRow && !inArm(high, inner)) high--
  let low = high
  while (low > kneeRow && inArm(low - 1, inner)) low--
  let outer = inner
  while (inArm(high, outer + 1)) outer++
  const shoulderRow = high - Math.min((high - low) / 2, (outer - inner) / 2)
  const shoulder: Vec3 = [xOf(inner), yOf(shoulderRow), depth]
  // Ponta: o pedaço do braço mais longe do ombro.
  let tip = shoulder
  let reach = 0
  for (const at of arm) {
    const x = xOf(at % cols)
    const y = yOf(Math.floor(at / cols))
    const distance = Math.hypot(x - shoulder[0], y - shoulder[1])
    if (distance > reach) {
      reach = distance
      tip = [x, y, depth]
    }
  }
  // Braço curto demais ou colado no corpo não dá para separar do tronco pela silhueta.
  requireScene(reach > 0.12 * height, 'points', FAIL)
  const along = (t: number): Vec3 => [
    shoulder[0] + t * (tip[0] - shoulder[0]),
    shoulder[1] + t * (tip[1] - shoulder[1]),
    depth,
  ]

  return [
    [center, chinY, depth],
    [center, groinY, depth],
    along(0.45),
    along(0.8),
    [kneeX, kneeY, depth],
  ]
}
