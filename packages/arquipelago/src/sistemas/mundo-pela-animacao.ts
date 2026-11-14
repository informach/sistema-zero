/**
 * As regras de um mundo novo (escala real do avatar) tiradas das ANIMAÇÕES do pack, não de números
 * escritos à mão. A referência do próprio pack Cute Characters (o `CharacterMover` do pacote Unity,
 * conferido em 14/11/2026) não serve: nenhuma cena o usa, as unidades se contradizem (km/h ou m/s) e
 * o pulo dele sobe uns 15 m. O que o pack garante é o deslocamento de cada clipe: a velocidade em que
 * o pé não escorrega.
 *
 * - Andar, correr e nadar: a velocidade natural do clipe (passada ÷ duração, vezes a escala) vezes um
 *   fator de jogo. Jogos andam mais rápido que a animação; até `RITMO_MAXIMO` (2) vezes a cadência as
 *   pernas acompanham sem escorregar (`sistemas/locomocao.ts`).
 * - Pulo: a altura que o quadril sobe no `pulo_inicio`, com a gravidade de verdade.
 * - Degrau, rampas, folga e alcance das mãos: os do mundo de hoje, na proporção do corpo (o de hoje
 *   tem o herói 1,85 vez maior).
 *
 * Os fatores são para a equipe sentir e ajustar (playground `?mundo=aventura`); as ilhas novas
 * serão medidas com o resultado.
 */
import { AVATAR_CATALOG, type AvatarCatalog } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { MUNDO_ATUAL, type MundoDoJogo } from '../mundo/mundo-do-jogo'

/** A gravidade de verdade (a do pack no Unity). */
export const GRAVIDADE_DE_VERDADE = 9.81

/** Quantas vezes a velocidade natural de cada clipe o mundo usa. */
export interface FatoresDoMundo {
  andar: number
  correr: number
  nadar: number
  /** A altura do pulo em relação à subida do quadril no clipe. */
  pulo: number
}

/**
 * Andar 1,5 vez o natural (as pernas um pouco mais rápidas, como em jogo); correr e nadar 2 vezes,
 * o máximo sem o pé escorregar; o pulo da altura do clipe.
 */
export const FATORES_DA_AVENTURA: FatoresDoMundo = { andar: 1.5, correr: 2, nadar: 2, pulo: 1 }

function clipe(catalogo: AvatarCatalog, id: string) {
  const c = catalogo.base.skeleton.game.clips.find((x) => x.id === id)
  if (!c) throw new Error(`O catálogo do avatar não tem o clipe do jogo ${id}.`)
  return c
}

/** A velocidade natural de um clipe (m/s, na escala nativa): passada ÷ duração. */
export function velocidadeNatural(catalogo: AvatarCatalog, id: string): number {
  const c = clipe(catalogo, id)
  return c.duration > 0 ? c.stride / c.duration : 0
}

/** As regras de um mundo de escala `escala` pelas animações do catálogo. */
export function mundoPelaAnimacao(
  catalogo: AvatarCatalog,
  id: string,
  escala: number,
  fatores: FatoresDoMundo = FATORES_DA_AVENTURA,
  gravidade = GRAVIDADE_DE_VERDADE,
): MundoDoJogo {
  const natural = (clipeId: string, fator: number) =>
    velocidadeNatural(catalogo, clipeId) * escala * fator
  // A proporção do corpo em relação ao mundo de hoje (lá o herói é 1,85 vez maior).
  const proporcao = escala / MUNDO_ATUAL.escalaDoHeroi
  const alturaDoPulo = clipe(catalogo, 'pulo_inicio').rise * escala * fatores.pulo
  return {
    id,
    escalaDoHeroi: escala,
    gravidade,
    andar: natural('andar_frente', fatores.andar),
    correr: natural('correr_frente', fatores.correr),
    nadar: natural('nadar', fatores.nadar),
    // Velocidade para cima que chega a essa altura: v² = 2·g·h.
    pulo: Math.sqrt(2 * gravidade * alturaDoPulo),
    degrau: MUNDO_ATUAL.degrau * proporcao,
    sobeAte: MUNDO_ATUAL.sobeAte,
    escorregaAcimaDe: MUNDO_ATUAL.escorregaAcimaDe,
    grudaAte: MUNDO_ATUAL.grudaAte * proporcao,
    folga: MUNDO_ATUAL.folga * proporcao,
    maosNaBorda: MUNDO_ATUAL.maosNaBorda * proporcao,
    maosNaEscalada: MUNDO_ATUAL.maosNaEscalada * proporcao,
  }
}

/** O primeiro mundo novo: a biblioteca de aventura, com o avatar no tamanho de verdade. */
export const MUNDO_DA_AVENTURA: MundoDoJogo = mundoPelaAnimacao(AVATAR_CATALOG, 'aventura-1', 1)
