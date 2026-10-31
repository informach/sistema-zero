import type { SceneMeshGeometry } from './document'
import { SCENE_SKIN_LIMITS, type SceneSkinInfluence } from './skin'
import type { SceneSkinPaintMix } from './skinPaintWeights'

/** Forças menores que isto somem ao suavizar: a média espalha restos que nenhum desenho mostra. */
const NEGLIGIBLE = 1e-4

/** Vizinhos de cada ponto pelas arestas das faces e pelas linhas soltas. */
export function sceneMeshVertexNeighbors(mesh: SceneMeshGeometry): Map<string, string[]> {
  const sets = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (a === b) return
    const set = sets.get(a) ?? new Set<string>()
    sets.set(a, set)
    set.add(b)
  }
  for (const face of Object.values(mesh.faces))
    face.corners.forEach((corner, i) => {
      const next = face.corners[(i + 1) % face.corners.length]!
      link(corner.vertexId, next.vertexId)
      link(next.vertexId, corner.vertexId)
    })
  for (const [a, b] of mesh.looseEdges) {
    link(a, b)
    link(b, a)
  }
  return new Map([...sets].map(([id, set]) => [id, [...set].sort()]))
}

/**
 * Suavizar forças (o Smooth do weight paint do Blender, em todos os ossos do ponto): a mistura do
 * ponto anda `amount` na direção da média dos vizinhos. Ficam os quatro ossos mais fortes, as
 * sobras pequenas demais somem e o total volta a 100%. Ponto sem vizinhos não muda.
 */
export function smoothSceneSkinRow(
  own: readonly SceneSkinInfluence[],
  neighbors: ReadonlyArray<readonly SceneSkinInfluence[]>,
  amount: number,
): SceneSkinPaintMix {
  if (!neighbors.length || !(amount > 0)) return { status: 'unchanged' }
  const mix = new Map<string, number>()
  for (const row of own) mix.set(row.jointId, row.weight * (1 - amount))
  const share = amount / neighbors.length
  for (const neighbor of neighbors)
    for (const row of neighbor)
      mix.set(row.jointId, (mix.get(row.jointId) ?? 0) + row.weight * share)
  // Ordem estável: força maior primeiro e, no empate, o id (independente da ordem dos vizinhos).
  const kept = [...mix]
    .filter(([, weight]) => weight > NEGLIGIBLE)
    .sort(([a, wa], [b, wb]) => wb - wa || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, SCENE_SKIN_LIMITS.influences)
  const total = kept.reduce((sum, [, weight]) => sum + weight, 0)
  if (!(total > 0)) return { status: 'unchanged' }
  const influences = kept.map(([jointId, weight]) => ({ jointId, weight: weight / total }))
  if (influences.some((row) => !(Math.fround(row.weight) > 0)))
    return { status: 'blocked', reason: 'precision' }
  const previous = new Map(own.map((row) => [row.jointId, row.weight]))
  const same =
    previous.size === influences.length &&
    influences.every((row) => Math.abs((previous.get(row.jointId) ?? -1) - row.weight) <= 1e-12)
  return same ? { status: 'unchanged' } : { status: 'changed', influences }
}

/**
 * Passadas seguidas sobre os pontos escolhidos (cada passada lê o resultado da anterior). Os
 * pontos de fora servem de vizinhos e não mudam. Devolve só as linhas que mudaram.
 */
export function smoothSceneSkinRows(
  mesh: SceneMeshGeometry,
  weights: Readonly<Record<string, readonly SceneSkinInfluence[]>>,
  vertexIds: readonly string[],
  options: { iterations: number; amount: number },
) {
  const neighbors = sceneMeshVertexNeighbors(mesh)
  const current = new Map<string, readonly SceneSkinInfluence[]>()
  const read = (id: string) => current.get(id) ?? weights[id]
  let precision = 0
  for (let pass = 0; pass < options.iterations; pass++) {
    const next = new Map<string, readonly SceneSkinInfluence[]>()
    precision = 0
    for (const id of vertexIds) {
      const rows = (neighbors.get(id) ?? []).flatMap((n) => {
        const row = read(n)
        return row ? [row] : []
      })
      const result = smoothSceneSkinRow(read(id)!, rows, options.amount)
      if (result.status === 'changed') next.set(id, result.influences)
      else if (result.status === 'blocked') precision++
    }
    for (const [id, row] of next) current.set(id, row)
  }
  const patch: Record<string, SceneSkinInfluence[]> = {}
  for (const [id, row] of current) patch[id] = row.map((influence) => ({ ...influence }))
  return { patch, precision }
}
