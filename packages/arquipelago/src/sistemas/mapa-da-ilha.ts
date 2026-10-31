import {
  type IlhaComMapa,
  type IlhaId,
  ilha as ilhaPeloId,
  LADO_DO_MAPA,
  MAPA_VAZIO,
  MAPAS_DAS_ILHAS,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { giroDaIlha, noModelo, raioDaEsperaDaIlha } from '../mundo/medidas'

/**
 * O mapa que se revela andando (E02, levantamento de 30/10). A proposta: "Mapa que se revela
 * conforme você anda". Cada ilha tem uma grade de 8 × 8 partes num quadrado em volta dela
 * (`salvamento.mapa`, 64 bits em hexadecimal; a parte `i` é a linha `i / 8`, de -z para +z, e a
 * coluna `i % 8`, de -x para +x, como o papel do mapa visto de cima). Andando, as partes a até
 * `VISTA` metros se revelam. Só contam as partes de terra (o meio delas dentro da ilha).
 */

/**
 * Até onde cada ilha do anel vai, a contar do meio, no rumo de um ponto do mundo (relativo ao
 * centro): o mesmo alcance que o jogo espera ao abrir a ilha (`raioDaEsperaDaIlha`, com o lóbulo da
 * cabana do Bosque, a caverna do Pico, o labirinto do Recife, as Nuvens e os portos). Antes de
 * 01/11/2026 o mapa cobria só 13 m em todas, e o navio do Recife e a cabana nunca apareciam.
 */
export function alcanceNoRumo(ilha: Exclude<IlhaComMapa, 'sua-ilha'>, x: number, z: number) {
  const dados = ilhaPeloId(ilha)
  const m = noModelo(x, z, giroDaIlha(dados))
  return raioDaEsperaDaIlha(dados, m.x, m.z)
}

function maiorAlcance(ilha: Exclude<IlhaComMapa, 'sua-ilha'>): number {
  let maior = 0
  for (let i = 0; i < 360; i++) {
    const a = (i * Math.PI) / 180
    maior = Math.max(maior, alcanceNoRumo(ilha, Math.cos(a), Math.sin(a)))
  }
  return Math.ceil(maior * 10) / 10
}

const doAnel = (ilha: Exclude<IlhaComMapa, 'sua-ilha'>) => {
  const terra = maiorAlcance(ilha)
  return { meioLado: Math.ceil(terra), terra }
}

/** Metade do lado do quadrado do mapa de cada ilha (m) e o maior raio da terra dela. */
export const MEDIDAS_DO_MAPA: Readonly<Record<IlhaComMapa, { meioLado: number; terra: number }>> = {
  'sua-ilha': { meioLado: 30, terra: 29 },
  bosque: doAnel('bosque'),
  'vila-doce': doAnel('vila-doce'),
  recife: doAnel('recife'),
  pico: doAnel('pico'),
  'vale-dos-dinos': doAnel('vale-dos-dinos'),
  nuvens: doAnel('nuvens'),
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

/**
 * As partes de terra da ilha (o meio dentro da terra no rumo dele, com meia parte de folga). Na sua
 * ilha, um círculo; nas do anel, o alcance de cada rumo (`alcanceNoRumo`).
 */
export function partesDeTerra(ilha: IlhaComMapa): number[] {
  const guardado = TERRA.get(ilha)
  if (guardado) return guardado
  const l = lado(ilha)
  const lista: number[] = []
  for (let i = 0; i < LADO_DO_MAPA * LADO_DO_MAPA; i++) {
    const p = meioDaParte(ilha, i)
    if (ilha === 'sua-ilha') {
      if (Math.hypot(p.x, p.z) <= MEDIDAS_DO_MAPA[ilha].terra + l / 2) lista.push(i)
      continue
    }
    // Nas do anel, a parte é de terra se algum ponto dela (uma grade de 5 × 5) fica no chão: o
    // porto e a caverna são estreitos e podem não passar pelo meio da parte.
    // O ponto da parte mais perto do meio da ilha também conta (o canto de dentro).
    const px = Math.max(p.x - l / 2, Math.min(0, p.x + l / 2))
    const pz = Math.max(p.z - l / 2, Math.min(0, p.z + l / 2))
    let terra = Math.hypot(px, pz) <= alcanceNoRumo(ilha, px || p.x, pz || p.z)
    for (let a = 0; a < 5 && !terra; a++)
      for (let b = 0; b < 5 && !terra; b++) {
        const x = p.x - l / 2 + ((a + 0.5) * l) / 5
        const z = p.z - l / 2 + ((b + 0.5) * l) / 5
        terra = Math.hypot(x, z) <= alcanceNoRumo(ilha, x, z)
      }
    if (terra) lista.push(i)
  }
  TERRA.set(ilha, lista)
  return lista
}
const TERRA = new Map<IlhaComMapa, number[]>()

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
