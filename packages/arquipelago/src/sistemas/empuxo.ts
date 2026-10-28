import { MATERIAIS } from './materiais-fisicos'

/**
 * A água por superfície, empuxo e forças calculadas (física viva, etapa 2, a prioridade da dona
 * para a água). Nada de fluido: a água é uma superfície com altura conhecida, e cada corpo que boia
 * tem pontos de flutuação. Em cada passo da física, cada ponto recebe:
 * - o empuxo para cima, `ρ_água × g × volume submerso do pedaço`, de acordo com a profundidade dele;
 * - o arrasto da água contra a velocidade do ponto, na parte submersa (sem ele o corpo pula na
 *   superfície como mola).
 * Como cada ponto recebe a sua força, o corpo fica deitado, balança e inclina quando algo pesa numa
 * ponta (o exemplo prático do levantamento: o tronco com quatro pontos de flutuação).
 */

export const EMPUXO = {
  /** Arrasto da água (1/s, por kg de água deslocada) subindo e descendo: o corpo assenta. */
  arrastoVertical: 2.5,
  /** Arrasto de lado (1/s): na água o corpo desliza e para devagar. */
  arrastoDeLado: 0.8,
  /** Giro freado na água (o amortecimento angular do Rapier, vezes a parte submersa). */
  giroNaAgua: 2.5,
} as const

export interface Vetor {
  x: number
  y: number
  z: number
}

/**
 * A parte submersa (0 a 1) de um pedaço de `altura` (o diâmetro do tronco) com o meio a
 * `profundidade` abaixo da superfície (negativa: acima dela).
 */
export function fracaoSubmersa(profundidade: number, altura: number): number {
  return Math.min(1, Math.max(0, profundidade / altura + 0.5))
}

/**
 * A força da água num ponto de flutuação (N, no mundo), escrita em `saida` (sem alocar): o empuxo
 * do pedaço de `volume` m³ e `altura` m com o meio a `profundidade` abaixo da superfície, mais o
 * arrasto contra a velocidade `vel` do ponto. `g` é a gravidade do jogo (positiva). Devolve a parte
 * submersa (0 = fora da água, força zero).
 */
export function forcaDaAgua(
  profundidade: number,
  altura: number,
  volume: number,
  vel: Vetor,
  g: number,
  saida: Vetor,
): number {
  const f = fracaoSubmersa(profundidade, altura)
  if (f === 0) {
    saida.x = 0
    saida.y = 0
    saida.z = 0
    return 0
  }
  const aguaDeslocada = MATERIAIS.agua.densidade * volume * f
  saida.x = -EMPUXO.arrastoDeLado * aguaDeslocada * vel.x
  saida.y = aguaDeslocada * g - EMPUXO.arrastoVertical * aguaDeslocada * vel.y
  saida.z = -EMPUXO.arrastoDeLado * aguaDeslocada * vel.z
  return f
}

/**
 * Os pontos de flutuação de um tronco deitado ao longo do X local, de `comprimento` m: `n` pontos
 * no meio de pedaços iguais (o padrão é 4, como no levantamento).
 */
export function pontosDoTronco(comprimento: number, n = 4): Vetor[] {
  return Array.from({ length: n }, (_, i) => ({
    x: ((i + 0.5) / n - 0.5) * comprimento,
    y: 0,
    z: 0,
  }))
}
