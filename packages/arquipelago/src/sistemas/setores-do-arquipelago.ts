import { alturaDoTerritorio, type IlhaDoArquipelago } from './geografia-do-arquipelago'

export const LADO_DO_SETOR = 80
export const RAIO_DE_SETORES = 2
export const PASSO_DO_TERRENO = 4

/** Altura baricêntrica do mesmo triângulo de 4 m desenhado e usado pelo Rapier. */
export function alturaNaMalhaDoSetor(ilha: IlhaDoArquipelago, x: number, z: number): number {
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
) {
  if (!Number.isFinite(passo) || passo <= 0 || LADO_DO_SETOR % passo !== 0)
    throw new Error('O passo deve dividir o lado do setor')
  const n = LADO_DO_SETOR / passo
  const vertices = new Float32Array((n + 1) ** 2 * 3)
  const indices = new Uint32Array(n * n * 6)
  for (let z = 0; z <= n; z++)
    for (let x = 0; x <= n; x++) {
      const px = setorX * LADO_DO_SETOR + x * passo
      const pz = setorZ * LADO_DO_SETOR + z * passo
      const i = (z * (n + 1) + x) * 3
      vertices.set([px, alturaDoTerritorio(ilha, px, pz), pz], i)
    }
  let i = 0
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const a = z * (n + 1) + x
      const b = a + n + 1
      indices.set([a, b, a + 1, a + 1, b, b + 1], i)
      i += 6
    }
  return { vertices, indices }
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
