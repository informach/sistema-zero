import { ShapeUtils, Vector2 } from 'three'
import { RECORTE_DA_COLINA } from './colina-da-faisca'
import { alturaDoTerritorio, type IlhaDoArquipelago } from './geografia-do-arquipelago'
import { LAGO_DA_FAISCA } from './lago-da-faisca'
import { LAGO_DE_CATALOGO } from './refino-da-faisca'

export const LADO_DO_SETOR = 80
export const RAIO_DE_SETORES = 2
export const PASSO_DO_TERRENO = 4
const malhasDeApoio = new WeakMap<IlhaDoArquipelago, Map<string, ReturnType<typeof malhaDoSetor>>>()

/** Inclui a triangulação dos recortes, que substitui a grade nas bordas da água e das escadas. */
export function alturaNaMalhaDoSetor(ilha: IlhaDoArquipelago, x: number, z: number): number {
  const abertura =
    ilha.id === 'sua-ilha'
      ? [...(LAGO_DE_CATALOGO ? [LAGO_DA_FAISCA] : []), RECORTE_DA_COLINA].find(
          ({ retangulo: r }) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ,
        )
      : undefined
  if (abertura) {
    let cache = malhasDeApoio.get(ilha)
    if (!cache) {
      cache = new Map()
      malhasDeApoio.set(ilha, cache)
    }
    // O contorno da escada termina em X=0, limite entre dois setores. O ponto de borda
    // precisa consultar também o setor da abertura, sem escolher somente floor(0/80).
    const sx = Math.floor(abertura.retangulo.minX / LADO_DO_SETOR),
      sz = Math.floor(abertura.retangulo.minZ / LADO_DO_SETOR),
      chave = `${sx},${sz}`
    let m = cache.get(chave)
    if (!m) {
      m = malhaDoSetor(ilha, sx, sz)
      cache.set(chave, m)
    }
    for (let i = 0; i < m.indices.length; i += 3) {
      const a = m.indices[i]! * 3,
        b = m.indices[i + 1]! * 3,
        c = m.indices[i + 2]! * 3,
        ax = m.vertices[a]!,
        az = m.vertices[a + 2]!,
        bx = m.vertices[b]!,
        bz = m.vertices[b + 2]!,
        cx = m.vertices[c]!,
        cz = m.vertices[c + 2]!,
        det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az)
      if (Math.abs(det) < 1e-9) continue
      const u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / det,
        v = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / det
      if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7)
        return (
          m.vertices[a + 1]! +
          u * (m.vertices[b + 1]! - m.vertices[a + 1]!) +
          v * (m.vertices[c + 1]! - m.vertices[a + 1]!)
        )
    }
    return alturaDoTerritorio(ilha, x, z)
  }
  const p = PASSO_DO_TERRENO,
    x0 = Math.floor(x / p) * p,
    z0 = Math.floor(z / p) * p
  const u = (x - x0) / p,
    v = (z - z0) / p
  const h = (dx: number, dz: number) => Math.fround(alturaDoTerritorio(ilha, x0 + dx, z0 + dz))
  if (u + v <= 1) {
    const a = h(0, 0)
    return a + u * (h(p, 0) - a) + v * (h(0, p) - a)
  }
  const b = h(p, p)
  return b + (1 - u) * (h(0, p) - b) + (1 - v) * (h(p, 0) - b)
}
export interface SetorDoTerritorio {
  id: string
  x: number
  z: number
}

/** A margem inclui o setor seguinte antes de o jogador alcançar a sua fronteira. */
export function setoresPerto(
  ilha: IlhaDoArquipelago,
  local: { x: number; z: number },
): SetorDoTerritorio[] {
  const centroX = Math.floor(local.x / LADO_DO_SETOR)
  const centroZ = Math.floor(local.z / LADO_DO_SETOR)
  const lista: SetorDoTerritorio[] = []
  for (let z = centroZ - RAIO_DE_SETORES; z <= centroZ + RAIO_DE_SETORES; z++)
    for (let x = centroX - RAIO_DE_SETORES; x <= centroX + RAIO_DE_SETORES; x++) {
      const pertoX = Math.max(x * LADO_DO_SETOR, Math.min(0, (x + 1) * LADO_DO_SETOR))
      const pertoZ = Math.max(z * LADO_DO_SETOR, Math.min(0, (z + 1) * LADO_DO_SETOR))
      if (Math.hypot(pertoX, pertoZ) > ilha.raio + 16) continue
      lista.push({ id: `${ilha.id}:${x}:${z}`, x, z })
    }
  return lista
}

/** Vértices locais à ilha, compartilhados pelo renderer e pelo Rapier. */
export function malhaDoSetor(
  ilha: IlhaDoArquipelago,
  setorX: number,
  setorZ: number,
  passo = PASSO_DO_TERRENO,
  lagoDeCatalogo = LAGO_DE_CATALOGO,
) {
  if (!Number.isFinite(passo) || passo <= 0 || LADO_DO_SETOR % passo !== 0)
    throw new Error('O passo deve dividir o lado do setor')
  const n = LADO_DO_SETOR / passo
  const vertices = new Float32Array((n + 1) ** 2 * 3)
  const indices: number[] = []
  for (let z = 0; z <= n; z++)
    for (let x = 0; x <= n; x++) {
      const px = setorX * LADO_DO_SETOR + x * passo
      const pz = setorZ * LADO_DO_SETOR + z * passo
      const i = (z * (n + 1) + x) * 3
      vertices.set([px, alturaDoTerritorio(ilha, px, pz), pz], i)
    }
  const abertura =
    ilha.id === 'sua-ilha'
      ? [...(lagoDeCatalogo ? [LAGO_DA_FAISCA] : []), RECORTE_DA_COLINA].find(
          ({ retangulo: r }) =>
            r.minX >= setorX * LADO_DO_SETOR &&
            r.maxX <= (setorX + 1) * LADO_DO_SETOR &&
            r.minZ >= setorZ * LADO_DO_SETOR &&
            r.maxZ <= (setorZ + 1) * LADO_DO_SETOR,
        )
      : null
  const recorte = abertura?.retangulo
  const temRecorte =
    recorte &&
    recorte.minX >= setorX * LADO_DO_SETOR &&
    recorte.maxX <= (setorX + 1) * LADO_DO_SETOR &&
    recorte.minZ >= setorZ * LADO_DO_SETOR &&
    recorte.maxZ <= (setorZ + 1) * LADO_DO_SETOR
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      if (
        temRecorte &&
        x * passo + setorX * LADO_DO_SETOR >= recorte.minX &&
        (x + 1) * passo + setorX * LADO_DO_SETOR <= recorte.maxX &&
        z * passo + setorZ * LADO_DO_SETOR >= recorte.minZ &&
        (z + 1) * passo + setorZ * LADO_DO_SETOR <= recorte.maxZ
      )
        continue
      const a = z * (n + 1) + x
      const b = a + n + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  if (temRecorte) {
    const r = recorte,
      borda: Vector2[] = []
    for (let x = r.minX; x < r.maxX; x += passo) borda.push(new Vector2(x, r.minZ))
    for (let z = r.minZ; z < r.maxZ; z += passo) borda.push(new Vector2(r.maxX, z))
    for (let x = r.maxX; x > r.minX; x -= passo) borda.push(new Vector2(x, r.maxZ))
    for (let z = r.maxZ; z > r.minZ; z -= passo) borda.push(new Vector2(r.minX, z))
    const furo = abertura!.furo.map((p) => new Vector2(p.x, p.z))
    const faces = ShapeUtils.triangulateShape(borda, [furo]),
      pontos = [...borda, ...furo]
    const base = vertices.length / 3,
      adicionais = pontos.flatMap((p) => [p.x, alturaDoTerritorio(ilha, p.x, p.y), p.y])
    for (const face of faces) {
      const [a, b, c] = face as [number, number, number],
        p = pontos[a]!,
        q = pontos[b]!,
        s = pontos[c]!
      const cima = (q.y - p.y) * (s.x - p.x) - (q.x - p.x) * (s.y - p.y)
      indices.push(base + a, base + (cima > 0 ? b : c), base + (cima > 0 ? c : b))
    }
    return {
      vertices: new Float32Array([...vertices, ...adicionais]),
      indices: new Uint32Array(indices),
    }
  }
  return { vertices, indices: new Uint32Array(indices) }
}

/** Leque simplificado com bordas na mesma grade de 4 m do detalhe: não abre emendas de LOD. */
export function malhaDistante(ilha: IlhaDoArquipelago, excluir: ReadonlySet<string>) {
  const vertices: number[] = []
  const indices: number[] = []
  const limite = Math.ceil((ilha.raio + 16) / LADO_DO_SETOR)
  for (let z = -limite; z < limite; z++)
    for (let x = -limite; x < limite; x++) {
      if (excluir.has(`${ilha.id}:${x}:${z}`)) continue
      const x0 = x * LADO_DO_SETOR
      const z0 = z * LADO_DO_SETOR
      if (
        Math.hypot(
          Math.max(x0, Math.min(0, x0 + LADO_DO_SETOR)),
          Math.max(z0, Math.min(0, z0 + LADO_DO_SETOR)),
        ) >
        ilha.raio + 16
      )
        continue
      const centro = vertices.length / 3
      const adicionar = (px: number, pz: number) =>
        vertices.push(px, alturaDoTerritorio(ilha, px, pz), pz)
      adicionar(x0 + LADO_DO_SETOR / 2, z0 + LADO_DO_SETOR / 2)
      for (let d = 0; d < LADO_DO_SETOR; d += PASSO_DO_TERRENO) adicionar(x0, z0 + d)
      for (let d = 0; d < LADO_DO_SETOR; d += PASSO_DO_TERRENO)
        adicionar(x0 + d, z0 + LADO_DO_SETOR)
      for (let d = 0; d < LADO_DO_SETOR; d += PASSO_DO_TERRENO)
        adicionar(x0 + LADO_DO_SETOR, z0 + LADO_DO_SETOR - d)
      for (let d = 0; d < LADO_DO_SETOR; d += PASSO_DO_TERRENO)
        adicionar(x0 + LADO_DO_SETOR - d, z0)
      const bordas = (LADO_DO_SETOR / PASSO_DO_TERRENO) * 4
      for (let i = 0; i < bordas; i++)
        indices.push(centro, centro + 1 + i, centro + 1 + ((i + 1) % bordas))
    }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) }
}
