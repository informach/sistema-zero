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

/**
 * Uma medida do lugar de um clipe, na escala do mundo. Sem ela no catálogo: com `reserva` (a medida
 * que a arte mandou em 14/11/2026, em metros do clipe), avisa e usa a reserva; sem, lança. As medidas
 * deste arquivo são lidas ao carregar o jogo: catálogo novo sem uma delas não pode impedir o jogo
 * de abrir.
 */
export function medidaDoLugar(clipe: string, chave: string, reserva?: number): number {
  const valor = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === clipe)?.place?.[chave]
  const lista = Array.isArray(valor) && valor.length > 0 ? valor : null
  const numero =
    typeof valor === 'number'
      ? valor
      : lista
        ? lista.reduce((s, v) => s + v, 0) / lista.length
        : null
  if (numero !== null) return numero * escala
  if (reserva === undefined)
    throw new Error(`O clipe ${clipe} do avatar não tem a medida ${chave}.`)
  console.warn(`O clipe ${clipe} do avatar não tem a medida ${chave}: vale a reserva.`)
  return reserva * escala
}

/**
 * Sentado: a origem do desenho fica no chão, embaixo da bacia, e o assento do clipe tem esta altura.
 * Num assento de outra altura, o desenho sobe ou desce a diferença.
 */
export const SENTADO = { assento: medidaDoLugar('sentado', 'assento_m', 0.3) } as const

/** Deitado: a origem do desenho fica na superfície de deitar, embaixo da bacia. */
export const DEITADO = { travesseiro: medidaDoLugar('deitado', 'travesseiro_m', 0.07) } as const

/** Pendurado na borda: a quina fica isto acima da origem do desenho e isto à frente dela. */
export const PENDURADO_NA_BORDA = {
  maos: medidaDoLugar('pendurar_borda', 'maos_m', 0.6),
  aFrente: medidaDoLugar('pendurar_borda', 'a_frente_m', 0.25),
} as const

/** No cipó: o eixo da corda passa isto à frente da origem do desenho, e as mãos seguram nesta altura. */
export const PENDURADO_NO_CIPO = {
  maos: medidaDoLugar('pendurar_cipo', 'maos_m', 0.52),
  cordaAFrente: medidaDoLugar('pendurar_cipo', 'corda_a_frente_m', 0.21),
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
  const margem = medidaDoLugar('entrar_na_agua', 'margem_chao_acima_da_agua_m', 0.162)
  return (margem + CORPO.cintura + passaDaCintura) / escala
}
