/** Geometria numérica pura: os adaptadores do Three fazem a leitura e a escrita dos atributos. */
export interface AtributoParaRecorte {
  valores: ArrayLike<number>
  itemSize: number
}
export interface MalhaParaRecorte {
  atributos: Record<string, AtributoParaRecorte>
  indices?: ArrayLike<number>
}

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
export function recortarAtributos(
  original: MalhaParaRecorte,
  planos: readonly PlanoDeRecorte[],
  excluir: readonly (readonly { x: number; z: number }[])[] = [],
): Record<string, { valores: Float32Array<ArrayBuffer>; itemSize: number }> {
  const pos = original.atributos.position
  if (pos?.itemSize !== 3 || pos.valores.length % 3)
    throw new Error('Posições inválidas para o recorte')
  const quantidade = pos.valores.length / 3
  const nomes = Object.keys(original.atributos)
  for (const a of Object.values(original.atributos)) {
    if (
      !Number.isInteger(a.itemSize) ||
      a.itemSize < 1 ||
      a.itemSize > 16 ||
      a.valores.length !== quantidade * a.itemSize
    )
      throw new Error('Atributos incompatíveis para o recorte')
    for (let i = 0; i < a.valores.length; i++)
      if (!Number.isFinite(a.valores[i])) throw new Error('Atributo não finito no recorte')
  }
  const indices = original.indices
  if ((indices?.length ?? quantidade) % 3) throw new Error('Triângulos incompletos no recorte')
  if (indices)
    for (let i = 0; i < indices.length; i++)
      if (!Number.isInteger(indices[i]) || indices[i]! < 0 || indices[i]! >= quantidade)
        throw new Error('Índice inválido no recorte')
  const box = { min: { x: Infinity, z: Infinity }, max: { x: -Infinity, z: -Infinity } }
  for (let i = 0; i < quantidade; i++) {
    const x = pos.valores[i * 3]!,
      z = pos.valores[i * 3 + 2]!
    box.min.x = Math.min(box.min.x, x)
    box.max.x = Math.max(box.max.x, x)
    box.min.z = Math.min(box.min.z, z)
    box.max.z = Math.max(box.max.z, z)
  }
  excluir = excluir.filter(
    (t) =>
      Math.max(...t.map((p) => p.x)) >= box.min.x &&
      Math.min(...t.map((p) => p.x)) <= box.max.x &&
      Math.max(...t.map((p) => p.z)) >= box.min.z &&
      Math.min(...t.map((p) => p.z)) <= box.max.z,
  )
  const dados = new Map(nomes.map((n) => [n, [] as number[]]))
  const vertice = (i: number) =>
    Object.fromEntries(
      nomes.map((n) => {
        const a = original.atributos[n]!
        return [n, Array.from({ length: a.itemSize }, (_, j) => a.valores[i * a.itemSize + j]!)]
      }),
    )
  for (let i = 0; i < (indices?.length ?? quantidade); i += 3) {
    let poligonos: Vertice[][] = [[0, 1, 2].map((j) => vertice(indices ? indices[i + j]! : i + j))]
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
  return Object.fromEntries(
    nomes.map((nome) => [
      nome,
      {
        valores: Float32Array.from(dados.get(nome)!),
        itemSize: original.atributos[nome]!.itemSize,
      },
    ]),
  )
}
