import type { Ponto } from './documento'

const cruz = (a: Ponto, b: Ponto, c: Ponto) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
export function segmentosSeCruzam(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
  const ab = [cruz(a, b, c), cruz(a, b, d)],
    cd = [cruz(c, d, a), cruz(c, d, b)]
  if (ab[0]! * ab[1]! < 0 && cd[0]! * cd[1]! < 0) return true
  const sobre = (p: Ponto, q: Ponto, r: Ponto) =>
    Math.abs(cruz(p, q, r)) < 1e-8 &&
    r.x >= Math.min(p.x, q.x) &&
    r.x <= Math.max(p.x, q.x) &&
    r.z >= Math.min(p.z, q.z) &&
    r.z <= Math.max(p.z, q.z)
  return sobre(a, b, c) || sobre(a, b, d) || sobre(c, d, a) || sobre(c, d, b)
}
/** Inclui a borda. A mesma convenção é usada pelo domínio de solo e pela água. */
export function pontoNoPoligono(p: Ponto, vertices: readonly Ponto[]): boolean {
  let dentro = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j]!,
      b = vertices[i]!,
      dx = b.x - a.x,
      dz = b.z - a.z
    if (
      Math.abs((p.x - a.x) * dz - (p.z - a.z) * dx) < 1e-9 &&
      p.x >= Math.min(a.x, b.x) - 1e-9 &&
      p.x <= Math.max(a.x, b.x) + 1e-9 &&
      p.z >= Math.min(a.z, b.z) - 1e-9 &&
      p.z <= Math.max(a.z, b.z) + 1e-9
    )
      return true
    if (a.z > p.z !== b.z > p.z && p.x < a.x + ((p.z - a.z) * dx) / dz) dentro = !dentro
  }
  return dentro
}
export function aneisSeCruzam(a: readonly Ponto[], b: readonly Ponto[]): boolean {
  const caixa = (p: readonly Ponto[]) =>
    p.reduce(
      (r, v) => ({
        x0: Math.min(r.x0, v.x),
        z0: Math.min(r.z0, v.z),
        x1: Math.max(r.x1, v.x),
        z1: Math.max(r.z1, v.z),
      }),
      { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity },
    )
  const ca = caixa(a),
    cb = caixa(b)
  if (ca.x1 < cb.x0 || cb.x1 < ca.x0 || ca.z1 < cb.z0 || cb.z1 < ca.z0) return false
  if (a.length * b.length > 4096) {
    const lados = (p: readonly Ponto[]) => p.map((v, i) => [v, p[(i + 1) % p.length]!] as const)
    // Só pares de anéis diferentes contam.
    return algumParSeCruza([...lados(a), ...lados(b)], (i, j) => i < a.length === j < a.length)
  }
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      if (segmentosSeCruzam(a[i]!, a[(i + 1) % a.length]!, b[j]!, b[(j + 1) % b.length]!))
        return true
  return false
}

/**
 * Algum par de segmentos (não vizinhos) se cruza? Os segmentos entram numa grade do tamanho do
 * conjunto e só os que dividem uma célula são comparados: um contorno de 16 mil pontos deixa de
 * custar centenas de milhões de testes (era o caminho de um pedido travar o servidor).
 * `vizinhos(i, j)` diz quais pares não contam (lados que dividem um vértice).
 */
export function algumParSeCruza(
  segmentos: readonly (readonly [Ponto, Ponto])[],
  vizinhos: (i: number, j: number) => boolean,
): boolean {
  const n = segmentos.length
  if (n < 2) return false
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity
  for (const [a, b] of segmentos) {
    x0 = Math.min(x0, a.x, b.x)
    z0 = Math.min(z0, a.z, b.z)
    x1 = Math.max(x1, a.x, b.x)
    z1 = Math.max(z1, a.z, b.z)
  }
  const lado = Math.max(1, Math.ceil(Math.sqrt(n))),
    largura = Math.max(x1 - x0, 1e-9) / lado,
    altura = Math.max(z1 - z0, 1e-9) / lado,
    celula = (v: number, origem: number, tamanho: number) =>
      Math.min(lado - 1, Math.max(0, Math.floor((v - origem) / tamanho))),
    grade = new Map<number, number[]>(),
    vistos = new Set<number>()
  for (let i = 0; i < n; i++) {
    const [a, b] = segmentos[i]!,
      cx0 = celula(Math.min(a.x, b.x), x0, largura),
      cx1 = celula(Math.max(a.x, b.x), x0, largura),
      cz0 = celula(Math.min(a.z, b.z), z0, altura),
      cz1 = celula(Math.max(a.z, b.z), z0, altura)
    vistos.clear()
    for (let cx = cx0; cx <= cx1; cx++)
      for (let cz = cz0; cz <= cz1; cz++) {
        const chave = cx * lado + cz,
          ali = grade.get(chave)
        if (ali)
          for (const j of ali) {
            if (vistos.has(j) || vizinhos(i, j)) continue
            vistos.add(j)
            const [c, d] = segmentos[j]!
            if (segmentosSeCruzam(a, b, c, d)) return true
          }
        if (ali) ali.push(i)
        else grade.set(chave, [i])
      }
  }
  return false
}
