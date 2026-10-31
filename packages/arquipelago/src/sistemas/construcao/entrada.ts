import type { Abertura, Obra } from '@sistemazero/arquipelago-contracts'
import { type Planta, planta } from './comodos'
import {
  arestasDaAbertura,
  chaveDaAresta,
  LARGURA_DA_ABERTURA,
  ladosDaAresta,
  type Ponto,
} from './grade'
import { type Celula, chaveDaCelula, type Lote, type Retangulo } from './lote'

/**
 * A porta de entrada da casa construída e a varanda dela (31/10/2026, pedido dela: a porta de
 * entrada muda de lugar no Construir, e a varanda vai junto).
 *
 * A entrada é a PRIMEIRA porta de fora na ordem de `obra.aberturas`: uma porta com um lado dentro de
 * casa e o outro fora, o mesmo lado em toda a largura. O salvamento não mudou: nas obras já salvas a
 * entrada é a porta nova (a primeira da obra inicial). A varanda fica do lado de fora dela, com 5
 * células ao longo da parede (a porta e uma de cada lado) e 2 de fundo, e ocupa essas células no lote
 * (não se constrói em cima). Só o lote da casa tem entrada (`lote.varanda`).
 */
export interface Entrada {
  /** O índice da porta em `obra.aberturas`. */
  indice: number
  abertura: Abertura
  /** O lado de fora: -1 é o lado de menos da aresta (-z ou -x), 1 o de mais. */
  fora: -1 | 1
  /** O meio da porta, na linha da grade (a origem da peça da varanda). */
  meio: Ponto
  /** O giro da peça da varanda: o da parede da porta (a de lambri, com a fachada para fora). */
  giro: number
}

/** A varanda: células ao longo da parede (a porta no meio) e de fundo, para fora. */
export const VARANDA = { largura: 5, fundo: 2 } as const

/** O nome do que a varanda ocupa no lote (a fala da recusa: "Ali já tem a varanda."). */
export const NOME_DA_VARANDA = 'a varanda'

/**
 * O lado de fora de uma porta de fora, ou `null` se ela não é de fora: precisa estar inteira em
 * parede e, em toda a largura, ter um lado dentro de casa e o outro fora (o mesmo lado). Porta numa
 * parede solta (fora dos dois lados) ou entre dois cômodos não é de fora.
 */
export function ladoDeFora(ab: Abertura, p: Planta): -1 | 1 | null {
  if (ab.tipo !== 'porta') return null
  let fora: -1 | 1 | null = null
  for (const a of arestasDaAbertura(ab)) {
    if (!p.paredes.has(chaveDaAresta(a))) return null
    const [menos, mais] = ladosDaAresta(a)
    const dMenos = p.dentro.has(chaveDaCelula(menos))
    const dMais = p.dentro.has(chaveDaCelula(mais))
    if (dMenos === dMais) return null
    const lado = dMenos ? 1 : -1
    if (fora !== null && fora !== lado) return null
    fora = lado
  }
  return fora
}

/** O giro da peça da varanda: o da parede de lambri com o lado de dentro oposto a `fora`. */
export function giroDaEntrada(eixo: Abertura['eixo'], fora: -1 | 1): number {
  // O mesmo de `giroDaParede` (`pecas.ts`) com o dentro em -fora.
  if (eixo === 'x') return fora === 1 ? 0 : Math.PI
  return fora === 1 ? Math.PI / 2 : -Math.PI / 2
}

function meioDaAbertura(ab: Abertura): Ponto {
  const meia = LARGURA_DA_ABERTURA[ab.tipo] / 2
  return ab.eixo === 'x' ? { x: ab.x + meia, z: ab.z } : { x: ab.x, z: ab.z + meia }
}

/** A entrada como a porta `ab` no índice `indice`, se ela for de fora. */
export function comoEntrada(ab: Abertura, indice: number, p: Planta): Entrada | null {
  const fora = ladoDeFora(ab, p)
  if (fora === null) return null
  return {
    indice,
    abertura: ab,
    fora,
    meio: meioDaAbertura(ab),
    giro: giroDaEntrada(ab.eixo, fora),
  }
}

/** A porta de entrada da obra (a primeira porta de fora), ou `null` sem nenhuma ou fora da casa. */
export function entradaDaObra(
  obra: Obra,
  lote: Lote,
  p: Planta = planta(obra, lote),
): Entrada | null {
  if (!lote.varanda) return null
  for (let i = 0; i < obra.aberturas.length; i++) {
    const e = comoEntrada(obra.aberturas[i] as Abertura, i, p)
    if (e) return e
  }
  return null
}

/** As duas são a mesma porta, do mesmo lado (o índice pode mudar). */
export function mesmaEntrada(a: Entrada | null, b: Entrada | null): boolean {
  if (!a || !b) return a === b
  const x = a.abertura
  const y = b.abertura
  return x.eixo === y.eixo && x.x === y.x && x.z === y.z && a.fora === b.fora
}

/** As células da varanda de uma entrada: 5 ao longo da parede (a porta no meio) e 2 para fora. */
export function retanguloDaVaranda(e: Pick<Entrada, 'abertura' | 'fora'>): Retangulo {
  const { eixo, x, z } = e.abertura
  const recuo = (VARANDA.largura - LARGURA_DA_ABERTURA.porta) / 2
  const [f0, f1] = e.fora === 1 ? [0, VARANDA.fundo] : [-VARANDA.fundo, 0]
  return eixo === 'x'
    ? { x0: x - recuo, x1: x - recuo + VARANDA.largura, z0: z + f0, z1: z + f1 }
    : { x0: x + f0, x1: x + f1, z0: z - recuo, z1: z - recuo + VARANDA.largura }
}

export function celulasDoRetangulo(r: Retangulo): Celula[] {
  const celulas: Celula[] = []
  for (let z = r.z0; z < r.z1; z++) for (let x = r.x0; x < r.x1; x++) celulas.push({ x, z })
  return celulas
}

/**
 * O que ocupa o lote com esta obra: o que é do lote (o pé do farol) e a varanda da entrada. Na casa
 * construída a varanda segue a entrada; sem entrada (uma obra antiga sem porta de fora), não há
 * varanda.
 */
export function ocupadasDaObra(obra: Obra, lote: Lote, p?: Planta): Lote['ocupadas'] {
  const e = entradaDaObra(obra, lote, p)
  if (!e) return lote.ocupadas
  return [{ nome: NOME_DA_VARANDA, ret: retanguloDaVaranda(e) }, ...lote.ocupadas]
}

/** O lote com a varanda desta obra entre as ocupadas (as regras de construir leem daqui). */
export function loteDaObra(lote: Lote, obra: Obra, p?: Planta): Lote {
  if (!lote.varanda) return lote
  return { ...lote, ocupadas: ocupadasDaObra(obra, lote, p) }
}

/**
 * Um ponto na frente da porta de entrada, `distancia` para fora da linha da parede (no referencial
 * da grade: na casa, o do mundo). Quem apontava a porta da frente fixa (o Zappy dos primeiros
 * passos, o lugar de sair do quarto) aponta para cá na casa construída.
 */
export function frenteDaEntrada(
  e: Pick<Entrada, 'abertura' | 'fora' | 'meio'>,
  distancia: number,
): Ponto {
  return e.abertura.eixo === 'x'
    ? { x: e.meio.x, z: e.meio.z + e.fora * distancia }
    : { x: e.meio.x + e.fora * distancia, z: e.meio.z }
}
