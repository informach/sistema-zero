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

/**
 * Montado (`montado`): a origem do desenho é a sela, com a bacia logo acima dela e as pernas para os
 * dois lados. Escorregando (`escorregar`): a origem é a pista, embaixo da bacia.
 */

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
  cordaAFrente: medidaDoLugar('pendurar_cipo', 'corda_a_frente_m', 0.17),
} as const

/**
 * No planador: as duas mãos seguram a barra isto acima da origem do desenho (os pés, pendurados) e
 * isto à frente dela. É onde a barra do planador fica no desenho.
 */
export const NO_PLANADOR = {
  barra: medidaDoLugar('planar', 'barra_m', 0.6),
  aFrente: medidaDoLugar('planar', 'a_frente_m', 0.25),
} as const

/** Escalando: a parede (a casca do tronco) fica isto à frente da origem do desenho. */
export const NA_PAREDE = { aFrente: medidaDoLugar('escalar', 'parede_a_frente_m', 0.25) } as const

/**
 * Quanto o desenho anda para a frente na escalada: no jogo a casca fica `daCasca` à frente do meio
 * do corpo; no clipe, `NA_PAREDE.aFrente` à frente da origem (negativo: recua).
 */
export function avancoNaParede(daCasca: number): number {
  return daCasca - NA_PAREDE.aFrente
}

/** Empurrando: a face do que se empurra fica isto à frente da origem do desenho (0,30 m nativos). */
export const NO_EMPURRAR = {
  aFrente: medidaDoLugar('empurrar', 'plano_a_frente_m', 0.3),
} as const

/**
 * Empurrando objeto baixo (`empurrar_baixo`, agachada, a cabeça passando por cima): a face fica isto
 * à frente da origem, e o objeto não pode passar de `objetoAte` de altura (a cabeça bateria).
 */
export const NO_EMPURRAR_BAIXO = {
  aFrente: medidaDoLugar('empurrar_baixo', 'plano_a_frente_m', 0.3),
  objetoAte: medidaDoLugar('empurrar_baixo', 'objeto_ate_m', 0.25),
} as const

/**
 * O que se empurra diz ao jogo como é (no `userData` do corpo dinâmico): a altura dele e, num objeto
 * redondo, quanto a face fica mais perto para os dedos encostarem (a arte, 15/11/2026: no tronco do
 * lago, 0,02 m do clipe, já na escala do mundo aqui).
 */
export type ComoSeEmpurra = { altura: number; encostaMais?: number }

/**
 * Empurrando objeto de meia altura (`empurrar_meio`, o caixote): mãos a 0,31 m do clipe. Serve até
 * `objetoAte`; acima disso, o `empurrar` de pé.
 */
export const NO_EMPURRAR_MEIO = {
  aFrente: medidaDoLugar('empurrar_meio', 'plano_a_frente_m', 0.3),
  objetoAte: medidaDoLugar('empurrar_meio', 'objeto_ate_m', 0.45),
} as const

/** De que jeito se empurra: agachada (`baixo`), de meia altura (`meio`) ou de pé (`alto`). */
export type JeitoDeEmpurrar = 'baixo' | 'meio' | 'alto'

/**
 * O jeito pela altura do objeto (`objeto_ate_m` de cada variação da arte). Entre o teto do baixo e
 * o começo do meio (0,25 a 0,34 m do clipe) nenhuma serve bem; o jogo não tem objeto nessa faixa e
 * fica com o meio (as mãos perto do alto do objeto, a cabeça longe dele). Objeto que não diz a
 * altura: de pé, como sempre.
 */
export function jeitoDeEmpurrar(objeto: ComoSeEmpurra | null | undefined): JeitoDeEmpurrar {
  if (!objeto) return 'alto'
  if (objeto.altura <= NO_EMPURRAR_BAIXO.objetoAte) return 'baixo'
  if (objeto.altura <= NO_EMPURRAR_MEIO.objetoAte) return 'meio'
  return 'alto'
}

/**
 * Quanto o desenho anda para a frente empurrando: no jogo a face encosta na cápsula, a `daFace` do
 * meio do corpo; no clipe, a face fica `aFrente` da origem (a da variação do jeito, menos o
 * `encostaMais` de um objeto redondo nas variações de mão baixa). Negativo: recua (mais perto, a
 * cabeça entraria no objeto; a arte avisou que essa distância quase não pode mudar).
 */
export function avancoNoEmpurrao(daFace: number, objeto?: ComoSeEmpurra | null): number {
  const jeito = jeitoDeEmpurrar(objeto)
  const aFrente =
    jeito === 'baixo'
      ? NO_EMPURRAR_BAIXO.aFrente - (objeto?.encostaMais ?? 0)
      : jeito === 'meio'
        ? NO_EMPURRAR_MEIO.aFrente - (objeto?.encostaMais ?? 0)
        : NO_EMPURRAR.aFrente
  return daFace - aFrente
}

/** Lê o `ComoSeEmpurra` do `userData` de um corpo (qualquer outra coisa: `null`). */
export function comoSeEmpurra(userData: unknown): ComoSeEmpurra | null {
  const dado = (userData as { empurrao?: unknown } | null | undefined)?.empurrao as
    | Partial<ComoSeEmpurra>
    | undefined
  if (!dado || typeof dado.altura !== 'number' || !Number.isFinite(dado.altura)) return null
  const encostaMais = typeof dado.encostaMais === 'number' ? dado.encostaMais : undefined
  return encostaMais === undefined ? { altura: dado.altura } : { altura: dado.altura, encostaMais }
}

/**
 * Os patins do pack (só do jogo: fora da loja). A criança calça e o jogo veste esta peça no lugar
 * do calçado; as rodas ficam abaixo da sola, e o desenho sobe o que elas somam à altura do corpo.
 */
export const PATINS_NOS_PES = {
  peca: 'calcado_patins',
  sobe: (AVATAR_CATALOG.parts.calcado_patins?.lift ?? 0) * escala,
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
