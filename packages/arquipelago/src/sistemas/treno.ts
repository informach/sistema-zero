import type { Escorregador } from '../estado/contexto'
import type { Ponto } from './cipo'
import { MATERIAIS } from './materiais-fisicos'

/**
 * O trenó do Pico Gelado (fase3-07): no platô, "Descer de trenó" senta a criança e a trilha em
 * espiral vira a pista do escorregador (`modos/escorregar.ts`), com o atrito do gelo e um teto de
 * velocidade mais baixo, porque a trilha faz curva. Andar na trilha não senta (`soPorPedido`).
 */
export const TRENO = {
  /** O atrito do gelo (`a = g × (sen θ − μ × cos θ)`). */
  atrito: MATERIAIS.gelo.atrito,
  /** Mais devagar que o escorregador: a trilha é longa e faz curva, e a criança acompanha. */
  velocidadeMaxima: 4.5,
  /**
   * A largura em que o trenó mexe de lado: a trilha tem 1,75 m de chão (`TRILHA.largura` do
   * `pico.py`); sobra uma folga para a parede de dentro e o guarda-corpo da beira.
   */
  largura: 1.4,
  /** De quão perto do trenó parado o "Descer de trenó" aparece. */
  alcance: 1.6,
} as const

/** A pista do trenó: do trenó parado no platô, pela linha do meio da trilha, até o pé. */
export function pistaDoTreno(id: string, pontos: readonly Ponto[]): Escorregador | null {
  if (pontos.length < 2) return null
  return {
    id,
    pontos: pontos.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    largura: TRENO.largura,
    soPorPedido: true,
    atrito: TRENO.atrito,
    velocidadeMaxima: TRENO.velocidadeMaxima,
  }
}

/** Andando no chão, perto do começo da pista: dá para sentar no trenó. */
export function podeDescerDeTreno(pista: Escorregador, de: Ponto): boolean {
  const inicio = pista.pontos[0]
  return !!inicio && Math.hypot(de.x - inicio.x, de.z - inicio.z) <= TRENO.alcance
}
