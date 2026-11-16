import { BufferGeometry, Float32BufferAttribute } from 'three'

type Vertice = Record<string, number[]>
type Ponto = { x: number; z: number }
/** Envelope convexo para recortar uma peça inteira, sem subtrair milhares de triângulos internos. */
export function contornoConvexo(pontos: readonly Ponto[]): Ponto[] {
  const ordenados = [
    ...new Map(pontos.map((p) => [`${p.x.toFixed(5)},${p.z.toFixed(5)}`, p])).values(),
  ].sort((a, b) => a.x - b.x || a.z - b.z)
  if (ordenados.length < 3) return ordenados
  const produto = (a: Ponto, b: Ponto, c: Ponto) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
  const metade = (ps: readonly Ponto[]) => {
    const r: Ponto[] = []
    for (const p of ps) {
      while (r.length > 1 && produto(r[r.length - 2]!, r[r.length - 1]!, p) <= 1e-8) r.pop()
      r.push(p)
    }
    r.pop()
    return r
  }
  return [...metade(ordenados), ...metade([...ordenados].reverse())]
}
export interface PlanoDeRecorte {
  x: number
  z: number
  limite: number
}
function cortar(p: Vertice[], plano: PlanoDeRecorte, inverter = false): Vertice[] {
  const sinal = inverter ? -1 : 1,
    dist = (v: Vertice) =>
      sinal * (plano.x * v.position![0]! + plano.z * v.position![2]! - plano.limite),
    r: Vertice[] = []
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!,
      b = p[(i + 1) % p.length]!,
      da = dist(a),
      db = dist(b),
      dentroA = da <= 1e-7,
      dentroB = db <= 1e-7
    if (dentroA) r.push(a)
    if (dentroA !== dentroB) {
      const t = da / (da - db),
        novo: Vertice = {}
      for (const nome of Object.keys(a))
        novo[nome] = a[nome]!.map((v, j) => v + t * (b[nome]![j]! - v))
      r.push(novo)
    }
  }
  return r
}
/** Recorta atributos/UV junto à geometria; não pinta máscaras nem empilha pisos na junção. */
export function recortarMalha(
  original: BufferGeometry,
  planos: readonly PlanoDeRecorte[],
  excluir: readonly (readonly { x: number; z: number }[])[] = [],
): BufferGeometry {
  original.computeBoundingBox()
  const box = original.boundingBox!
  excluir = excluir.filter(
    (t) =>
      Math.max(...t.map((p) => p.x)) >= box.min.x &&
      Math.min(...t.map((p) => p.x)) <= box.max.x &&
      Math.max(...t.map((p) => p.z)) >= box.min.z &&
      Math.min(...t.map((p) => p.z)) <= box.max.z,
  )
  const nomes = Object.keys(original.attributes),
    dados = new Map(nomes.map((n) => [n, [] as number[]])),
    pos = original.getAttribute('position'),
    indices = original.index
  const vertice = (i: number) =>
    Object.fromEntries(
      nomes.map((n) => {
        const a = original.getAttribute(n)
        return [n, Array.from({ length: a.itemSize }, (_, j) => a.array[i * a.itemSize + j]!)]
      }),
    )
  for (let i = 0; i < (indices?.count ?? pos.count); i += 3) {
    let poligonos: Vertice[][] = [
      [0, 1, 2].map((j) => vertice(indices ? indices.getX(i + j) : i + j)),
    ]
    for (const plano of planos)
      poligonos = poligonos.map((p) => cortar(p, plano)).filter((p) => p.length >= 3)
    for (const triangulo of excluir) {
      if (!poligonos.length) break
      const area = triangulo.reduce((s, a, i) => {
          const b = triangulo[(i + 1) % triangulo.length]!
          return s + a.x * b.z - b.x * a.z
        }, 0),
        sentido = area > 0 ? 1 : -1
      if (Math.abs(area) < 1e-8) continue
      const minX = Math.min(...triangulo.map((p) => p.x)),
        maxX = Math.max(...triangulo.map((p) => p.x)),
        minZ = Math.min(...triangulo.map((p) => p.z)),
        maxZ = Math.max(...triangulo.map((p) => p.z))
      const fora: Vertice[][] = []
      for (const poligono of poligonos) {
        const xs = poligono.map((v) => v.position![0]!),
          zs = poligono.map((v) => v.position![2]!)
        if (
          Math.max(...xs) < minX ||
          Math.min(...xs) > maxX ||
          Math.max(...zs) < minZ ||
          Math.min(...zs) > maxZ
        ) {
          fora.push(poligono)
          continue
        }
        let dentro = poligono
        for (let j = 0; j < triangulo.length && dentro.length >= 3; j++) {
          const p = triangulo[j]!,
            q = triangulo[(j + 1) % triangulo.length]!,
            x = sentido * (q.z - p.z),
            z = -sentido * (q.x - p.x),
            plano = { x, z, limite: x * p.x + z * p.z }
          const parte = cortar(dentro, plano, true)
          if (parte.length >= 3) fora.push(parte)
          dentro = cortar(dentro, plano)
        }
      }
      poligonos = fora
    }
    for (const p of poligonos)
      for (let j = 1; j < p.length - 1; j++) {
        const a = p[0]!.position!,
          b = p[j]!.position!,
          c = p[j + 1]!.position!,
          ux = b[0]! - a[0]!,
          uy = b[1]! - a[1]!,
          uz = b[2]! - a[2]!,
          vx = c[0]! - a[0]!,
          vy = c[1]! - a[1]!,
          vz = c[2]! - a[2]!
        if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-10) continue
        for (const v of [p[0]!, p[j]!, p[j + 1]!])
          for (const nome of nomes) dados.get(nome)!.push(...v[nome]!)
      }
  }
  const geo = new BufferGeometry()
  for (const nome of nomes)
    geo.setAttribute(
      nome,
      new Float32BufferAttribute(
        dados.get(nome)!,
        original.getAttribute(nome).itemSize,
        original.getAttribute(nome).normalized,
      ),
    )
  return geo
}
