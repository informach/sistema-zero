/**
 * Os borrões do Cinza e os Lumis da Vila Doce (fase2-06). À noite os borrões de névoa saem pela
 * ilha; sem a lanterna acesa eles fogem de quem chega perto, e com ela acesa a luz prende um: ele
 * chacoalha, se desfaz em faíscas e vira um Lumi colorido da família da ilha (na Vila, o Quindim,
 * comum, e o Brigadeiro, raro). Tensão boa, sem dano: nada se perde por não pegar.
 *
 * Regras puras, sem three nem React. O que muda o salvamento é só `prenderBorrao` (os Lumis presos,
 * `salvamento.lumis`) e `receberLanterna` (o item na mochila). Quais borrões já foram presos nesta
 * noite não é salvo: recarregar a página traz os da noite de volta.
 */
import type { LumiId, Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, type Inventario, quantidade } from './itens'

export const ID_DA_LANTERNA = 'lanterna'

/** A família de Lumis de cada ilha que já tem borrões (a comum e a rara). */
export const FAMILIA_DA_VILA = { comum: 'quindim', raro: 'brigadeiro' } as const satisfies Record<
  'comum' | 'raro',
  LumiId
>

export const NOMES_DOS_LUMIS: Readonly<Partial<Record<LumiId, string>>> = {
  quindim: 'Quindim',
  brigadeiro: 'Brigadeiro',
}

/** Quantos borrões saem em cada noite na Vila Doce. */
export const BORROES_POR_NOITE = 2
/** Um borrão em cada `RARO_A_CADA` vira o Lumi raro (o primeiro Lumi de todos é sempre o comum). */
export const RARO_A_CADA = 5
/** As âncoras `lumi-1` a `lumi-4` do `vila-doce.glb`: os borrões saem perto delas. */
export const ANCORAS_DOS_LUMIS = 4

/** Andando sem a lanterna acesa, o borrão foge quando ela chega a esta distância (m). */
export const FOGE_A = 3
/** Ele foge até ficar a esta distância dela, sem passar de `SOLTO_ATE` do lugar dele. */
export const FOGE_ATE = 4.5
export const SOLTO_ATE = 3
/** Com a lanterna acesa, dá para prender a esta distância (m). */
export const PRENDE_A = 2.2

/** Quanto dura cada parte da captura (s): preso na luz e depois virando faíscas (o clipe `virar`). */
export const PRESO_POR = 1.2
export const VIRANDO_POR = 1.5

export interface BorraoDaNoite {
  /** Único na noite (o dia do jogo e a ordem). */
  id: string
  /** Perto de qual âncora `lumi-N` ele sai (0 a 3). */
  ancora: number
  /** O Lumi que ele vira se for preso. */
  lumi: LumiId
}

/** Um número de 0 a 1 que só depende do texto (o mesmo em qualquer aparelho). */
function sorteio(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/**
 * Os borrões de uma noite (pelo dia do jogo): em âncoras diferentes, cada um com o Lumi que vira.
 * `lumis` são os já presos: enquanto nenhum Lumi foi preso, todos viram o comum.
 */
export function borroesDaNoite(dia: number, lumis: Salvamento['lumis']): BorraoDaNoite[] {
  const primeiraAncora = Math.floor(sorteio(`ancora:${dia}`) * ANCORAS_DOS_LUMIS)
  const nenhumAinda = Object.keys(lumis).length === 0
  return Array.from({ length: BORROES_POR_NOITE }, (_, i) => {
    const id = `${dia}:${i}`
    const raro = !nenhumAinda && sorteio(`raro:${id}`) < 1 / RARO_A_CADA
    return {
      id,
      ancora: (primeiraAncora + i * 2) % ANCORAS_DOS_LUMIS,
      lumi: raro ? FAMILIA_DA_VILA.raro : FAMILIA_DA_VILA.comum,
    }
  })
}

export function falaDoLumiNovo(lumi: LumiId, quantos: number): string {
  const nome = NOMES_DOS_LUMIS[lumi] ?? 'Lumi'
  if (lumi === FAMILIA_DA_VILA.raro)
    return quantos === 1
      ? `Um ${nome}. É o raro da Vila: quando ele comemora, o granulado acende.`
      : `Mais um ${nome}. O granulado dele já está aceso.`
  return quantos === 1
    ? `Um ${nome}. O borrão virou um Lumi da Vila Doce, e ele já quer ajudar na cozinha.`
    : `Mais um ${nome} para a turma da Vila.`
}

/** Prender um borrão: mais um Lumi daquela espécie no salvamento, e a fala do Zappy. */
export function prenderBorrao(
  s: Salvamento,
  lumi: LumiId,
): { salvamento: Salvamento; quantos: number; fala: string } {
  const quantos = Math.min(999, (s.lumis[lumi] ?? 0) + 1)
  return {
    salvamento: { ...s, lumis: { ...s.lumis, [lumi]: quantos } },
    quantos,
    fala: falaDoLumiNovo(lumi, quantos),
  }
}

/**
 * Os Lumis que moram na Vila (um em cada âncora `lumi-N`, na ordem): o primeiro Quindim, o
 * primeiro Brigadeiro e depois mais Quindins, até as quatro âncoras.
 */
export function lumisNaVila(lumis: Salvamento['lumis']): { ancora: number; lumi: LumiId }[] {
  const comuns = lumis[FAMILIA_DA_VILA.comum] ?? 0
  const raros = lumis[FAMILIA_DA_VILA.raro] ?? 0
  const fila: LumiId[] = []
  if (comuns > 0) fila.push(FAMILIA_DA_VILA.comum)
  if (raros > 0) fila.push(FAMILIA_DA_VILA.raro)
  for (let i = 1; i < comuns && fila.length < ANCORAS_DOS_LUMIS; i++)
    fila.push(FAMILIA_DA_VILA.comum)
  for (let i = 1; i < raros && fila.length < ANCORAS_DOS_LUMIS; i++) fila.push(FAMILIA_DA_VILA.raro)
  return fila.slice(0, ANCORAS_DOS_LUMIS).map((lumi, ancora) => ({ ancora, lumi }))
}

export const FALA_DA_LANTERNA =
  'Leve esta lanterna. À noite os borrões do Cinza saem pela vila, e a luz dela prende um. Acenda na mochila.'
export const FALA_DE_ACENDER = 'Lanterna acesa. Chegue perto de um borrão e use a luz para prender.'
export const FALA_DE_APAGAR = 'Lanterna apagada e guardada.'
export const FALA_DO_BORRAO_FUGINDO =
  'O borrão fugiu da escuridão. Com a lanterna acesa ele não foge.'

export function temLanterna(inv: Inventario): boolean {
  return quantidade(inv, ID_DA_LANTERNA) > 0
}

/** A lanterna vale só acesa e na mochila. */
export function comLanterna(acesa: boolean, inv: Inventario): boolean {
  return acesa && temLanterna(inv)
}

/** O Bento dá a lanterna a quem ainda não tem (de novo, se ela sumir da mochila). */
export function receberLanterna(s: Salvamento): { salvamento: Salvamento; fala: string } | null {
  if (temLanterna(s.inventario)) return null
  return {
    salvamento: { ...s, inventario: adicionar(s.inventario, ID_DA_LANTERNA) },
    fala: FALA_DA_LANTERNA,
  }
}
