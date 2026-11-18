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
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      if (segmentosSeCruzam(a[i]!, a[(i + 1) % a.length]!, b[j]!, b[(j + 1) % b.length]!))
        return true
  return false
}
