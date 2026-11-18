import type { BaseDeTerreno } from '@sistemazero/molda-cenarios-core/v2'
import { type Raycaster, Vector3 } from 'three'

/** Consulta de edição: atravessa a máscara para poder fechar buracos, sem criar malha ou colisor. */
export function intersecaoComCampo(
  base: Pick<BaseDeTerreno, 'origem' | 'colunas' | 'linhas' | 'passo' | 'min' | 'max'>,
  raio: Raycaster,
  alturas: (x: number, z: number, saida: Float64Array) => void,
): Vector3 | null {
  const ray = raio.ray,
    { origin: o, direction: d } = ray
  if (![...o, ...d].every(Number.isFinite) || d.lengthSq() < 1e-20) return null
  let inicio = Math.max(0, raio.near),
    fim = raio.far
  for (const [eixo, min, max] of [
    ['x', base.origem.x, base.origem.x + base.colunas * base.passo],
    ['y', base.min, base.max],
    ['z', base.origem.z, base.origem.z + base.linhas * base.passo],
  ] as const) {
    if (Math.abs(d[eixo]) < 1e-14) {
      if (o[eixo] < min || o[eixo] > max) return null
      continue
    }
    const a = (min - o[eixo]) / d[eixo],
      b = (max - o[eixo]) / d[eixo]
    inicio = Math.max(inicio, Math.min(a, b))
    fim = Math.min(fim, Math.max(a, b))
  }
  if (fim < inicio || !Number.isFinite(inicio)) return null
  const celula = (g: number, direcao: number, total: number) =>
    Math.max(
      0,
      Math.min(
        total - 1,
        direcao < 0 && Math.abs(g - Math.round(g)) < 1e-9 ? Math.round(g) - 1 : Math.floor(g),
      ),
    )
  let x = celula((o.x + d.x * inicio - base.origem.x) / base.passo, d.x, base.colunas),
    z = celula((o.z + d.z * inicio - base.origem.z) / base.passo, d.z, base.linhas)
  const sx = Math.sign(d.x),
    sz = Math.sign(d.z),
    dx = sx ? base.passo / Math.abs(d.x) : Infinity,
    dz = sz ? base.passo / Math.abs(d.z) : Infinity
  let tx = sx ? (base.origem.x + (x + (sx > 0 ? 1 : 0)) * base.passo - o.x) / d.x : Infinity,
    tz = sz ? (base.origem.z + (z + (sz > 0 ? 1 : 0)) * base.passo - o.z) / d.z : Infinity
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    e = new Vector3(),
    hit = new Vector3(),
    valores = new Float64Array(4)
  for (let n = 0; n <= base.colunas + base.linhas + 2; n++) {
    if (x < 0 || z < 0 || x >= base.colunas || z >= base.linhas) break
    const ate = Math.min(tx, tz, fim),
      wx = base.origem.x + x * base.passo,
      wz = base.origem.z + z * base.passo
    alturas(x, z, valores)
    a.set(wx, Math.fround(valores[0]!), wz)
    b.set(wx + base.passo, Math.fround(valores[1]!), wz)
    c.set(wx, Math.fround(valores[2]!), wz + base.passo)
    e.set(wx + base.passo, Math.fround(valores[3]!), wz + base.passo)
    let ponto: Vector3 | null = null,
      distancia = Infinity
    for (const triangulo of [
      [a, c, b],
      [b, c, e],
    ] as const) {
      if (!ray.intersectTriangle(...triangulo, false, hit)) continue
      const t = hit.clone().sub(o).dot(d) / d.lengthSq()
      if (t >= inicio - 1e-7 && t <= ate + 1e-7 && t < distancia) {
        ponto = hit.clone()
        distancia = t
      }
    }
    if (ponto) return ponto
    if (ate >= fim) break
    inicio = ate
    if (tx < tz) {
      x += sx
      tx += dx
    } else if (tz < tx) {
      z += sz
      tz += dz
    } else {
      x += sx
      z += sz
      tx += dx
      tz += dz
    }
  }
  return null
}
