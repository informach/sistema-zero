import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, quantidade } from './itens'

/**
 * O planador (fase3-09): o presente do Floco quando o festival de inverno começa (a conversa com ele
 * põe o item na mochila, uma vez; o inventário já aceita itens novos, então não há versão nova do
 * salvamento). Com ele na mochila, no ar, pular de novo abre o planador: o corpo desce devagar e
 * segue para a frente, guiado como no chão; pular fecha, pisar no chão ou cair na água também. As
 * correntes de vento que sobem (`CorrenteDeAr`) levam quem plana para cima: a do Pico fica na
 * frente da parede de gelo e leva até o alto dela. Vale em qualquer ilha. Sem prazo nem castigo.
 */
export const ID_DO_PLANADOR = 'planador'

export const PLANADOR = {
  /** Velocidade da descida (m/s): do platô do cume (uns 8,5 m) ficam uns 4,7 s no ar. */
  descida: 1.8,
  /** O quanto a velocidade vertical vai até a pedida por segundo (abrir caindo freia suave). */
  ajusteVertical: 3,
  /** A velocidade no plano com o controle pedindo (m/s) e soltando (segue para a frente). */
  velocidade: 5.5,
  solto: 4.2,
  /** m/s² para chegar na velocidade pedida e para mudar de rumo (o ar segura). */
  aceleracao: 4,
  freio: 2.5,
  /**
   * Abre só no ar, depois deste tempo fora do chão (s; o pulo de beirada e o pulo de tolerância
   * continuam sendo pulo) e subindo a menos que isto (m/s; perto do alto do pulo ou caindo).
   */
  noArHa: 0.15,
  subindoAte: 1,
  /** A subida dentro de uma corrente (m/s); some nos últimos `paraNoTopo` metros dela. */
  subida: 3.2,
  paraNoTopo: 1.5,
} as const

/** Uma corrente de vento que sobe: um cilindro em pé (as ilhas registram em `movimento.correntes`). */
export interface CorrenteDeAr {
  id: string
  x: number
  z: number
  raio: number
  /** A altura do chão dela e do alto, onde a subida acaba (no mundo). */
  base: number
  topo: number
}

/** A corrente da parede de gelo do Pico: raio e altura acima do chão (a âncora `corrente-de-ar`). */
export const CORRENTE_DO_PICO = { raio: 1, altura: 4.75 } as const

export const FALA_DO_PLANADOR =
  'Pela música de volta, este planador é seu. No ar, pule de novo para abrir e pule outra vez para fechar.'
export const COMO_USAR_O_PLANADOR =
  'O planador abre no ar: pule e, lá no alto, pule de novo. Pular outra vez fecha.'
export const FALA_DA_CORRENTE =
  'Com o planador, o vento na frente da parede de gelo leva lá para o alto dela.'

export function temPlanador(s: Salvamento): boolean {
  return quantidade(s.inventario, ID_DO_PLANADOR) > 0
}

/** Põe o planador na mochila (uma vez: com ele lá, o mesmo salvamento). */
export function pegarPlanador(s: Salvamento): Salvamento {
  if (temPlanador(s)) return s
  return { ...s, inventario: adicionar(s.inventario, ID_DO_PLANADOR) }
}

/**
 * Está na coluna de alguma corrente (dentro do raio, da base para cima, inclusive acima do topo)?
 * Ali o ar segura quem plana no lugar: acima do topo ele desce devagar até o alto do vento.
 */
export function naColunaDaCorrente(
  correntes: readonly CorrenteDeAr[] | undefined,
  x: number,
  y: number,
  z: number,
): boolean {
  if (!correntes) return false
  for (const c of correntes)
    if (y >= c.base && (x - c.x) ** 2 + (z - c.z) ** 2 <= c.raio ** 2) return true
  return false
}

/**
 * Quanto a corrente leva para cima neste ponto (m/s), ou `null` fora de todas: dentro do raio e
 * entre a base e o topo; perto do topo a subida some (quem plana fica pairando lá em cima).
 */
export function subidaDaCorrente(
  correntes: readonly CorrenteDeAr[] | undefined,
  x: number,
  y: number,
  z: number,
): number | null {
  if (!correntes) return null
  let melhor: number | null = null
  for (const c of correntes) {
    if (y < c.base || y > c.topo) continue
    if ((x - c.x) ** 2 + (z - c.z) ** 2 > c.raio ** 2) continue
    const v = PLANADOR.subida * Math.min(1, (c.topo - y) / PLANADOR.paraNoTopo)
    if (melhor === null || v > melhor) melhor = v
  }
  return melhor
}
