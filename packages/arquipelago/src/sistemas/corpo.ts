import {
  AVATAR_CATALOG,
  type AvatarCatalog,
  type BodyMeasures,
  bodyMeasures,
  physicalBody,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { MUNDO_ATUAL, type MundoDoJogo } from '../mundo/mundo-do-jogo'

/** O corpo do personagem num mundo: as medidas do esqueleto na escala do mundo e as regras dele. */
export interface CorpoDoJogo {
  /** Meia altura do cilindro da cápsula do Rapier. */
  meiaAltura: number
  raio: number
  /** Do centro da cápsula até os pés. */
  doCentroAoPe: number
  /** Da sola à linha d'água de quem nada (o quadril). */
  cintura: number
  /**
   * O corpo como o avatar é desenhado, para as cordas encostarem nele (metros a partir dos pés,
   * no meio do corpo): o tronco e as pernas como uma cápsula e a cabeça, que é grande e sai da
   * cápsula do Rapier, como uma bola.
   */
  desenho: { de: number; ate: number; raio: number; cabeca: number; raioDaCabeca: number }
  /** Alturas do corpo a partir do CENTRO da cápsula (o `rastro` é o centro). */
  doCentro: {
    /** O meio da cabeça: para onde a câmera olha. */
    cabeca: number
    /** O alto da cabeça (sem cabelo nem chapéu). */
    topo: number
    /** A junta do ombro (o peito). */
    ombro: number
    /** As mãos penduradas na corda do cipó, ao lado do rosto: meio braço acima do ombro. */
    maosNoCipo: number
  }
  /** As medidas de onde tudo isto saiu (já na escala do mundo). */
  medidas: BodyMeasures
  andar: number
  correr: number
  nadar: number
  pulo: number
  degrau: number
  sobeAte: number
  /** Acima desta inclinação ele escorrega (graus); entre `sobeAte` e esta, não sobe nem escorrega. */
  escorregaAcimaDe: number
  grudaAte: number
  /**
   * O controlador do Rapier mantém esta folga entre a cápsula e o chão. O desenho desce o mesmo
   * tanto para o pé encostar (sem ela o avatar anda flutuando), e os modos que põem o corpo direto
   * num lugar (o tronco caído) deixam a mesma folga.
   */
  folga: number
  maosNaBorda: number
  maosNaEscalada: number
}

/**
 * O corpo do personagem num mundo: a cápsula e as alturas saem do esqueleto do catálogo
 * (`bodyMeasures`/`physicalBody` do core, as regras escritas uma vez lá), as velocidades e os
 * alcances são regras do mundo (`mundo/mundo-do-jogo.ts`).
 */
export function corpoDoMundo(catalogo: AvatarCatalog, mundo: MundoDoJogo): CorpoDoJogo {
  const m = bodyMeasures(catalogo.base.skeleton, mundo.escalaDoHeroi)
  const f = physicalBody(m)
  const c = f.centerToFoot
  return {
    meiaAltura: f.halfHeight,
    raio: f.radius,
    doCentroAoPe: c,
    cintura: f.waist,
    desenho: {
      de: f.drawn.from,
      ate: f.drawn.to,
      raio: f.drawn.radius,
      cabeca: f.drawn.head,
      raioDaCabeca: f.drawn.headRadius,
    },
    doCentro: {
      cabeca: m.headCenter - c,
      topo: m.height - c,
      ombro: m.shoulder - c,
      maosNoCipo: m.shoulder + m.arm / 2 - c,
    },
    medidas: m,
    andar: mundo.andar,
    correr: mundo.correr,
    nadar: mundo.nadar,
    pulo: mundo.pulo,
    degrau: mundo.degrau,
    sobeAte: mundo.sobeAte,
    escorregaAcimaDe: mundo.escorregaAcimaDe,
    grudaAte: mundo.grudaAte,
    folga: mundo.folga,
    maosNaBorda: mundo.maosNaBorda,
    maosNaEscalada: mundo.maosNaEscalada,
  }
}

/**
 * O corpo do personagem no mundo de hoje (a ponte de escala 1,85), dividido entre o personagem, as
 * regras do cipó e da escalada e os testes que leem os GLBs das ilhas. Uma constante de módulo:
 * há um mundo só; a troca de mundo com o jogo aberto chega com os mundos novos.
 */
export const CORPO: Readonly<CorpoDoJogo> = corpoDoMundo(AVATAR_CATALOG, MUNDO_ATUAL)

/** Até onde chega um pulo no plano, saindo a `velocidade` (m/s): o tempo no ar vezes ela. */
export function alcanceDoPulo(velocidade: number, gravidade: number): number {
  return (velocidade * 2 * CORPO.pulo) / gravidade
}

/** A altura do pulo (m), do pé no chão ao pé no alto. */
export function alturaDoPulo(gravidade: number): number {
  return CORPO.pulo ** 2 / (2 * gravidade)
}

/**
 * O vão mais largo que um pulo atravessa saindo a `velocidade`, com a ajuda do corpo: o pé redondo
 * pega a borda antes do meio do corpo chegar (um raio de cada lado). O degrau automático não vale
 * no ar (o controlador só sobe degrau pisando; quem chega perto de uma quina marcada a agarra,
 * `modos/borda.ts`). Para desenhar vãos: abaixo de `alcanceDoPulo` passa sempre; acima deste, nunca
 * (sem borda marcada para agarrar).
 */
export function alcanceMaximoDoPulo(velocidade: number, gravidade: number): number {
  return velocidade * ((2 * CORPO.pulo) / gravidade) + 2 * CORPO.raio
}

/**
 * A beirada mais alta que um pulo alcança sem agarrar: a altura do pulo (o degrau automático não
 * vale no ar). Agarrando a quina, vai mais alto (`beiradaMaximaAgarrando` em `modos/borda.ts`).
 */
export function beiradaMaximaDoPulo(gravidade: number): number {
  return alturaDoPulo(gravidade)
}
