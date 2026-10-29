import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import type { DequeDoPercurso, PontosDoPercurso } from '../sistemas/percurso'
import { PLATAFORMAS_DAS_NUVENS } from '../sistemas/plataformas-das-nuvens'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { GRAVIDADE } from './medidas'

/**
 * Os saltos entre nuvens no referencial do `nuvens.glb` (fase4-07): a largada no chão antes dos
 * degraus de nuvem, as paradas no terceiro degrau e nas plataformas 1 a 3, a chegada no tampo da
 * plataforma 4 e uma fita do arco-íris em cada vão entre plataformas. Os tampos saem dos colisores
 * (`col-cil-degrau-nuvem-3`, `col-cil-plataforma-N`), na posição de baixo do ciclo (fase4-06). O
 * terceiro degrau fica por baixo da beira da plataforma 1: dele para ela é um passo, sem vão.
 */

/** No chão, antes do primeiro degrau, onde o verificador das Nuvens também começa. */
export const LARGADA_DOS_SALTOS: Ponto = { x: -10.3, y: 1, z: -2.2 }
/** O chão das Nuvens (o colisor mais longe fica a 18,74 m do meio; fase4-06). */
export const RAIO_DOS_SALTOS = 19.2
/** A volta de uma queda fica esta altura acima do tampo (ele anda até 0,16 m no corte). */
export const FOLGA_DA_VOLTA = 0.3
/** As paradas: o degrau mais alto e as plataformas 1 a 3 (a 4 é a chegada). */
export const PARADAS_DOS_SALTOS = [
  'col-cil-degrau-nuvem-3',
  'col-cil-plataforma-1',
  'col-cil-plataforma-2',
  'col-cil-plataforma-3',
] as const
export const CHEGADA_DOS_SALTOS = 'col-cil-plataforma-4'

export interface TampoDosSaltos extends Ponto {
  raio: number
  /** A plataforma que sobe e desce (0 a 3), ou `null` para o degrau parado. */
  plataforma: number | null
}

/**
 * Os tampos do caminho (paradas e chegada) lidos dos colisores, no referencial do modelo, ou `null`
 * se faltar algum. Os colisores da ilha preparada vêm girados com ela (`lerColisores` guarda o giro
 * da raiz): `giro` desfaz, para o percurso girar uma vez só (`percursoNoMundo`).
 */
export function tamposDosSaltos(
  colisores: readonly ColisorDaIlha[],
  giro = 0,
): TampoDosSaltos[] | null {
  const c0 = Math.cos(giro)
  const s0 = Math.sin(giro)
  const tampos: TampoDosSaltos[] = []
  for (const nome of [...PARADAS_DOS_SALTOS, CHEGADA_DOS_SALTOS]) {
    const c = colisores.find((k) => k.nome === nome)
    if (c?.forma !== 'cilindro') return null
    const n = /plataforma-(\d)$/.exec(nome)?.[1]
    const [x, y, z] = c.posicao
    tampos.push({
      // O inverso de `paraOMundo` (x' = x cos + z sen; z' = −x sen + z cos).
      x: x * c0 - z * s0,
      y: y + c.meiaAltura,
      z: x * s0 + z * c0,
      raio: c.raio,
      plataforma: n ? Number(n) - 1 : null,
    })
  }
  return tampos
}

/**
 * A fita de um vão: no meio dele (entre as beiradas, na linha dos meios), na altura do centro do
 * corpo de quem salta correndo da beirada de `a` (com `a` na altura `alturaDeA`).
 */
export function fitaDoVao(a: TampoDosSaltos, b: TampoDosSaltos, alturaDeA: number): Ponto {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const d = Math.hypot(dx, dz)
  const vao = Math.max(0, d - a.raio - b.raio)
  const meio = a.raio + vao / 2
  const t = vao / 2 / CORPO.correr
  const centro = alturaDeA + CORPO.doCentroAoPe + CORPO.folga
  return {
    x: a.x + (dx / d) * meio,
    y: centro + CORPO.pulo * t - (GRAVIDADE * t * t) / 2,
    z: a.z + (dz / d) * meio,
  }
}

/** Para onde a criança olha numa parada: para o próximo tampo. */
function rumo(de: Ponto, para: Ponto): number {
  return Math.atan2(para.x - de.x, para.z - de.z)
}

/**
 * Os pontos do percurso no modelo. As fitas ficam nos vãos entre as plataformas, no salto feito na
 * hora certa: de uma plataforma no alto para a seguinte embaixo (a janela da fase4-06).
 */
export function saltosNoModelo(tampos: readonly TampoDosSaltos[]): PontosDoPercurso {
  const paradas = tampos.slice(0, -1)
  const chegada = tampos[tampos.length - 1] as TampoDosSaltos
  const deques: DequeDoPercurso[] = paradas.map((t, i) => {
    const proximo = tampos[i + 1] as TampoDosSaltos
    return {
      x: t.x,
      y: t.y,
      z: t.z,
      raio: t.raio - 0.1,
      volta: { x: t.x, y: t.y + FOLGA_DA_VOLTA, z: t.z },
      rumoDaVolta: rumo(t, proximo),
    }
  })
  const vagalumes = paradas
    .map((a, i) => ({ a, b: tampos[i + 1] as TampoDosSaltos }))
    .filter(({ a }) => a.plataforma !== null)
    .map(({ a, b }) => fitaDoVao(a, b, a.y + PLATAFORMAS_DAS_NUVENS.altura))
  const primeiro = tampos[0] as TampoDosSaltos
  return {
    largada: { ...LARGADA_DOS_SALTOS },
    rumoDaLargada: rumo(LARGADA_DOS_SALTOS, primeiro),
    deques,
    // A chegada vale em qualquer altura do ciclo: o pé fica abaixo do tampo no alto mais 0,6 m.
    chegada: { x: chegada.x, y: chegada.y + PLATAFORMAS_DAS_NUVENS.altura, z: chegada.z },
    vagalumes,
    centro: { x: 0, y: LARGADA_DOS_SALTOS.y, z: 0 },
    raioDaIlha: RAIO_DOS_SALTOS,
  }
}
