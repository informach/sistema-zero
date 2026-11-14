/**
 * Onde cada animação da arte acontece (regra pura). A arte mediu, em cada clipe, o lugar em volta do
 * `Root` do avatar: a altura do assento, a quina da borda, o eixo da corda, a linha d'água. O jogo
 * põe o desenho do avatar no mundo por essas medidas, vezes a escala do herói no mundo (o
 * `CORPO.medidas.scale`), para a bacia cair no assento e as mãos caírem na quina e na corda.
 *
 * Os números vêm do catálogo do avatar (`skeleton.game.clips[].place`, com os nomes da arte).
 * Nenhum é escrito aqui.
 */
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { CORPO } from './corpo'

const escala = CORPO.medidas.scale

/** Uma medida do lugar de um clipe, na escala do mundo (lança se a arte não a mandou). */
export function medidaDoLugar(clipe: string, chave: string): number {
  const valor = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === clipe)?.place?.[chave]
  if (typeof valor !== 'number')
    throw new Error(`O clipe ${clipe} do avatar não tem a medida ${chave}.`)
  return valor * escala
}

/** O mesmo, para uma medida em lista (as duas mãos na corda): a média. */
function mediaDoLugar(clipe: string, chave: string): number {
  const valor = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === clipe)?.place?.[chave]
  if (!Array.isArray(valor) || valor.length === 0)
    throw new Error(`O clipe ${clipe} do avatar não tem a medida ${chave}.`)
  return (valor.reduce((soma, v) => soma + v, 0) / valor.length) * escala
}

/**
 * Sentado: a origem do desenho fica no chão, embaixo da bacia, e o assento do clipe tem esta altura.
 * Num assento de outra altura, o desenho sobe ou desce a diferença.
 */
export const SENTADO = { assento: medidaDoLugar('sentado', 'assento_m') } as const

/** Deitado: a origem do desenho fica na superfície de deitar, embaixo da bacia. */
export const DEITADO = { travesseiro: medidaDoLugar('deitado', 'travesseiro_m') } as const

/** Pendurado na borda: a quina fica isto acima da origem do desenho e isto à frente dela. */
export const PENDURADO_NA_BORDA = {
  maos: medidaDoLugar('pendurar_borda', 'maos_m'),
  aFrente: medidaDoLugar('pendurar_borda', 'a_frente_m'),
} as const

/** No cipó: o eixo da corda passa isto à frente da origem do desenho, e as mãos seguram nesta altura. */
export const PENDURADO_NO_CIPO = {
  maos: mediaDoLugar('pendurar_cipo', 'maos_m'),
  cordaAFrente: medidaDoLugar('pendurar_cipo', 'corda_a_frente_m'),
} as const

/**
 * Onde a origem do desenho fica, pendurado na borda, em relação a onde ela fica de pé (os pés no fim
 * da cápsula): quanto sobe e quanto recua (para longe da parede).
 *
 * As mãos do jogo agarram a quina `maosAcimaDoCentro` acima do meio do corpo, com o corpo a
 * `daParede` dela; no clipe, a quina fica `maos` acima da origem e `aFrente` dela.
 */
export function desenhoPenduradoNaBorda(borda: { maosAcimaDoCentro: number; daParede: number }): {
  sobe: number
  recua: number
} {
  return {
    sobe: borda.maosAcimaDoCentro + CORPO.doCentroAoPe + CORPO.folga - PENDURADO_NA_BORDA.maos,
    recua: PENDURADO_NA_BORDA.aFrente - borda.daParede,
  }
}

/**
 * Nadando e boiando, a origem do desenho é a superfície da água (é onde ela está nos clipes). O
 * corpo do jogo nada com a cintura na superfície: a origem sobe dos pés até a cintura.
 */
export const DESENHO_NA_AGUA = { sobe: CORPO.cintura + CORPO.folga } as const

/**
 * Entrar na água: a arte fez o clipe saindo de pé de uma margem (o chão dela fica
 * `margem_chao_acima_da_agua_m` acima da superfície). No jogo quem começa a nadar está de pé no fundo,
 * com a água passando da cintura por `passaDaCintura`: o começo do clipe desce este tanto (em metros
 * do clipe, sem a escala), e a descida vai sumindo até o fim, quando ela boia como no clipe.
 */
export function descidaDoEntrarNaAgua(passaDaCintura: number): number {
  const margem = medidaDoLugar('entrar_na_agua', 'margem_chao_acima_da_agua_m')
  return (margem + CORPO.cintura + passaDaCintura) / escala
}
