import {
  type IlhaComMapa,
  type IlhaId,
  LADO_DO_MAPA,
  MAPA_VAZIO,
  MAPAS_DAS_ILHAS,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

/**
 * O mapa que se revela andando (E02, levantamento de 30/10). A proposta: "Mapa que se revela
 * conforme você anda". Cada ilha tem uma grade de 8 × 8 partes num quadrado em volta dela
 * (`salvamento.mapa`, 64 bits em hexadecimal; a parte `i` é a linha `i / 8`, de -z para +z, e a
 * coluna `i % 8`, de -x para +x, como o papel do mapa visto de cima). Andando, as partes a até
 * `VISTA` metros se revelam. Só contam as partes de terra (o meio delas dentro da ilha).
 */

/** Metade do lado do quadrado do mapa de cada ilha (m) e o raio da terra dela. */
export const MEDIDAS_DO_MAPA: Readonly<Record<IlhaComMapa, { meioLado: number; terra: number }>> = {
  'sua-ilha': { meioLado: 30, terra: 29 },
  bosque: { meioLado: 14, terra: 13 },
  'vila-doce': { meioLado: 14, terra: 13 },
  recife: { meioLado: 14, terra: 13 },
  pico: { meioLado: 14, terra: 13 },
  'vale-dos-dinos': { meioLado: 14, terra: 13 },
  nuvens: { meioLado: 14, terra: 13 },
}

/** Até onde a vista revela o mapa, em metros. */
export const VISTA = 6

export function temMapa(ilha: IlhaId): ilha is IlhaComMapa {
  return (MAPAS_DAS_ILHAS as readonly string[]).includes(ilha)
}

function lado(ilha: IlhaComMapa): number {
  return (2 * MEDIDAS_DO_MAPA[ilha].meioLado) / LADO_DO_MAPA
}

/** O meio de cada parte, relativo ao centro da ilha. */
export function meioDaParte(ilha: IlhaComMapa, i: number): { x: number; z: number } {
  const l = lado(ilha)
  const m = MEDIDAS_DO_MAPA[ilha].meioLado
  return {
    x: -m + (i % LADO_DO_MAPA) * l + l / 2,
    z: -m + Math.floor(i / LADO_DO_MAPA) * l + l / 2,
  }
}

/** As partes de terra da ilha (o meio dentro da terra, com meia parte de folga). */
export function partesDeTerra(ilha: IlhaComMapa): number[] {
  const l = lado(ilha)
  const limite = MEDIDAS_DO_MAPA[ilha].terra + l / 2
  const lista: number[] = []
  for (let i = 0; i < LADO_DO_MAPA * LADO_DO_MAPA; i++) {
    const p = meioDaParte(ilha, i)
    if (Math.hypot(p.x, p.z) <= limite) lista.push(i)
  }
  return lista
}

/** As partes a até `VISTA` de um ponto (relativo ao centro da ilha): o retângulo de cada uma. */
export function partesAVista(ilha: IlhaComMapa, rel: { x: number; z: number }): number[] {
  const l = lado(ilha)
  const m = MEDIDAS_DO_MAPA[ilha].meioLado
  const lista: number[] = []
  for (let i = 0; i < LADO_DO_MAPA * LADO_DO_MAPA; i++) {
    const x0 = -m + (i % LADO_DO_MAPA) * l
    const z0 = -m + Math.floor(i / LADO_DO_MAPA) * l
    const dx = Math.max(x0 - rel.x, 0, rel.x - (x0 + l))
    const dz = Math.max(z0 - rel.z, 0, rel.z - (z0 + l))
    if (dx * dx + dz * dz <= VISTA * VISTA) lista.push(i)
  }
  return lista
}

export function parteVista(mapa: string | undefined, i: number): boolean {
  return ((BigInt(`0x${mapa ?? MAPA_VAZIO}`) >> BigInt(i)) & 1n) === 1n
}

export function revelar(mapa: string | undefined, partes: readonly number[]): string {
  let x = BigInt(`0x${mapa ?? MAPA_VAZIO}`)
  for (const i of partes) x |= 1n << BigInt(i)
  return x.toString(16).padStart(16, '0')
}

/** Quantas partes de terra já foram vistas e o total delas. */
export function partesVistas(ilha: IlhaComMapa, mapa: string | undefined) {
  const terra = partesDeTerra(ilha)
  return { vistas: terra.filter((i) => parteVista(mapa, i)).length, total: terra.length }
}

export function porcentoDoMapa(ilha: IlhaComMapa, mapa: string | undefined): number {
  const { vistas, total } = partesVistas(ilha, mapa)
  return total === 0 ? 0 : Math.round((vistas / total) * 100)
}

/** Revela no salvamento o que se vê de `p` (no mundo) na ilha de centro `centro`. */
export function registrarNoMapa(
  s: Salvamento,
  ilha: IlhaComMapa,
  centro: { x: number; z: number },
  p: { x: number; z: number },
): Salvamento {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return s
  const rel = { x: p.x - centro.x, z: p.z - centro.z }
  const m = MEDIDAS_DO_MAPA[ilha].meioLado
  if (Math.abs(rel.x) > m + VISTA || Math.abs(rel.z) > m + VISTA) return s
  const antes = s.mapa[ilha]
  const depois = revelar(antes, partesAVista(ilha, rel))
  if (depois === (antes ?? MAPA_VAZIO)) return s
  return { ...s, mapa: { ...s.mapa, [ilha]: depois } }
}
