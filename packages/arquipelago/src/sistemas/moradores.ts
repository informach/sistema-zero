import {
  AMIZADE_DO_PEDIDO,
  diaDeSaoPaulo,
  escolherPedidoDoMorador,
  type PedidoDaCapi,
  type PedidoDeMorador,
  pedidoDoMoradorPeloId,
} from '@sistemazero/arquipelago-contracts'

export {
  PEDIDOS_DA_CAPI,
  type PedidoDaCapi,
  type PedidoDeMorador,
} from '@sistemazero/arquipelago-contracts'

import { AMIZADE_MAXIMA, type Capi, type Morador } from '@sistemazero/arquipelago-contracts'
import { type Inventario, ITENS, quantidade, remover } from './itens'

/**
 * Os moradores (regras puras): a Capi, a capivara do Bosque, e o Bento, o tamanduá da Vila Doce
 * (`bento.ts`). A amizade sobe conversando uma vez por dia, entregando o pedido do dia e dando um
 * presente por dia; ela nunca desce. Tudo conta pelo dia do calendário de São Paulo
 * (`diaDe`), não pelo dia e noite do jogo. Cada morador tem os gostos, o aniversário e os pedidos
 * dele; as contas são as mesmas.
 */

export const AMIZADE = {
  /** A primeira conversa do dia. */
  conversa: 10,
  /** Entregar o pedido do dia. */
  pedido: AMIZADE_DO_PEDIDO,
  /** Presente de que ela gosta e presente comum (só o primeiro do dia conta). */
  presenteQueGosta: 20,
  presenteComum: 8,
  /** O primeiro turno do dia no balcão da padaria do Bento (fase2-03). */
  turno: 10,
  /** Cada coração. */
  porCoracao: 100,
} as const

/** 12 de março: no aniversário ela fala diferente e o presente vale o dobro. */
export const ANIVERSARIO_DA_CAPI = { mes: 3, dia: 12 } as const

/** O que ela acha de cada comida. Tudo o que não é comida ela devolve. */
export const GOSTOS_DA_CAPI: Readonly<Record<string, 'gosta' | 'comum'>> = {
  milho: 'gosta',
  salada: 'gosta',
  pipoca: 'comum',
  alface: 'comum',
  tomate: 'comum',
}

/** O mesmo dia de São Paulo usado pelo serviço, independentemente do fuso do aparelho. */
export function diaDe(agora: Date): string {
  return diaDeSaoPaulo(agora)
}

/** O dia do aniversário de um morador (mês e dia). */
export interface Aniversario {
  mes: number
  dia: number
}

/** Se `dia` é o aniversário (de quem for; sem dizer, o da Capi). */
export function ehAniversario(
  dia: string,
  aniversario: Aniversario = ANIVERSARIO_DA_CAPI,
): boolean {
  const [, m, d] = dia.split('-').map(Number)
  return m === aniversario.mes && d === aniversario.dia
}

/** O que um morador acha de cada comida (o que não está aqui é comum; o que não é comida volta). */
export type Gostos = Readonly<Record<string, 'gosta' | 'comum'>>

/** Quantos corações cheios (de 0 a 5). */
export function coracoes(amizade: number): number {
  return Math.min(AMIZADE_MAXIMA / AMIZADE.porCoracao, Math.floor(amizade / AMIZADE.porCoracao))
}

function somar<M extends Morador>(m: M, pontos: number): M {
  return { ...m, amizade: Math.min(AMIZADE_MAXIMA, m.amizade + pontos) }
}

/** Conversar: só a primeira conversa do dia conta (e é a única com fala nova). */
export function conversar(capi: Morador, dia: string): { capi: Morador; primeiraDoDia: boolean } {
  if (capi.conversaEm === dia) return { capi, primeiraDoDia: false }
  return { capi: { ...somar(capi, AMIZADE.conversa), conversaEm: dia }, primeiraDoDia: true }
}

export type ReacaoAoPresente = 'adorou' | 'agradeceu' | 'devolveu' | 'ja-ganhou-hoje' | 'sem-item'

/**
 * Dar um presente do inventário. Comida de que ela gosta vale mais; o que não é comida volta (o
 * item não sai do inventário). Depois do primeiro presente do dia ela pede para guardar para
 * amanhã, e o item também não sai.
 */
export function darPresente(
  capi: Morador,
  inv: Inventario,
  itemId: string,
  dia: string,
  gostos: Gostos = GOSTOS_DA_CAPI,
  aniversario: Aniversario = ANIVERSARIO_DA_CAPI,
): { capi: Morador; inv: Inventario; reacao: ReacaoAoPresente } {
  if (quantidade(inv, itemId) < 1) return { capi, inv, reacao: 'sem-item' }
  const gosto = ITENS[itemId]?.comida ? (gostos[itemId] ?? 'comum') : null
  if (!gosto) return { capi, inv, reacao: 'devolveu' }
  if (capi.presenteEm === dia) return { capi, inv, reacao: 'ja-ganhou-hoje' }
  const novo = remover(inv, itemId, 1)
  if (!novo) return { capi, inv, reacao: 'sem-item' }
  const base = gosto === 'gosta' ? AMIZADE.presenteQueGosta : AMIZADE.presenteComum
  const pontos = ehAniversario(dia, aniversario) ? base * 2 : base
  return {
    capi: { ...somar(capi, pontos), presenteEm: dia },
    inv: novo,
    reacao: gosto === 'gosta' ? 'adorou' : 'agradeceu',
  }
}

// ── O pedido do dia ─────────────────────────────────────────────────────────────────────────────

const ACHAR = 'achar-bicho-'

/** O pedido pelo id guardado (os de achar guardam quantos bichos já tinham sido achados). */
export function pedidoPeloId(id: string): PedidoDaCapi | null {
  return pedidoDoMoradorPeloId('capi', id)
}

export { numeroEstavel as sorteio } from '@sistemazero/arquipelago-contracts'

/**
 * O pedido de hoje: o guardado, se for de hoje; senão um novo, sorteado pelo dia e pelo perfil.
 * Enquanto houver bicho escondido, achar um bicho entra no sorteio.
 */
export function pedidoDoDia(
  capi: Capi,
  dia: string,
  perfilId: string,
  achados: number,
  escondidos: number,
): Capi {
  if (capi.pedido?.dia === dia) return capi
  const id = escolherPedidoDoMorador('capi', perfilId, dia, achados, escondidos > 0)
  return { ...capi, pedido: { dia, id, entregue: false } }
}

/** Se dá para entregar agora: os itens no inventário, ou um bicho achado depois do pedido. */
export function podeEntregar(capi: Capi, inv: Inventario, achados: number): boolean {
  const p = capi.pedido
  if (!p || p.entregue) return false
  if (p.id.startsWith(ACHAR)) return achados > Number(p.id.slice(ACHAR.length))
  const pedido = pedidoPeloId(p.id)
  if (!pedido?.itens) return false
  return Object.entries(pedido.itens).every(([id, qtd]) => quantidade(inv, id) >= qtd)
}

/** Entrega o pedido do dia: tira os itens e dá a amizade. Sem poder entregar, nada muda. */
export function entregarPedido(
  capi: Capi,
  inv: Inventario,
  achados: number,
): { capi: Capi; inv: Inventario; entregou: boolean } {
  if (!podeEntregar(capi, inv, achados) || !capi.pedido) return { capi, inv, entregou: false }
  let novo: Inventario | null = inv
  for (const [id, qtd] of Object.entries(pedidoPeloId(capi.pedido.id)?.itens ?? {})) {
    novo = novo && remover(novo, id, qtd)
  }
  if (!novo) return { capi, inv, entregou: false }
  return {
    capi: { ...somar(capi, AMIZADE.pedido), pedido: { ...capi.pedido, entregue: true } },
    inv: novo,
    entregou: true,
  }
}

// ── Pedido de itens (qualquer morador) ─────────────────────────────────────────────────────────

/** Se os itens do pedido estão todos no inventário. */
export function temOsItens(pedido: PedidoDeMorador | null, inv: Inventario): boolean {
  if (!pedido?.itens) return false
  return Object.entries(pedido.itens).every(([id, qtd]) => quantidade(inv, id) >= qtd)
}

/**
 * Entrega um pedido de itens guardado em `m.pedido` (`pedidos` traduz o id): tira os itens e dá a
 * amizade do pedido. Sem pedido de hoje em aberto ou sem os itens, nada muda.
 */
export function entregarItens<M extends Morador>(
  m: M,
  inv: Inventario,
  pedidos: (id: string) => PedidoDeMorador | null,
): { morador: M; inv: Inventario; entregou: boolean } {
  const pedido = m.pedido && !m.pedido.entregue ? pedidos(m.pedido.id) : null
  if (!m.pedido || !pedido || !temOsItens(pedido, inv)) return { morador: m, inv, entregou: false }
  let novo: Inventario | null = inv
  for (const [id, qtd] of Object.entries(pedido.itens ?? {})) novo = novo && remover(novo, id, qtd)
  if (!novo) return { morador: m, inv, entregou: false }
  return {
    morador: { ...somar(m, AMIZADE.pedido), pedido: { ...m.pedido, entregue: true } },
    inv: novo,
    entregou: true,
  }
}

/** O que falta no inventário para um pedido de itens (`null` se nada falta ou não há itens). */
export function oQueFaltaDosItens(pedido: PedidoDeMorador, inv: Inventario): string | null {
  if (!pedido.itens || temOsItens(pedido, inv)) return null
  return Object.entries(pedido.itens)
    .filter(([id, qtd]) => quantidade(inv, id) < qtd)
    .map(([id, qtd]) => `${ITENS[id]?.nome ?? id}: você tem ${quantidade(inv, id)} de ${qtd}`)
    .join('. ')
}

// ── A Capi no Bosque ────────────────────────────────────────────────────────────────────────────

export const CAPI_NO_BOSQUE = {
  /** A esta distância (no chão) ela se vira para a criança; mais longe, volta a olhar a trilha. */
  olharDe: 7,
  /** De que distância aparece "Conversar com a Capi". */
  alcance: 2.2,
  /** Ela acena quando a criança chega perto, no máximo uma vez a cada tanto (s). */
  acenoACada: 45,
  /** Quão rápido ela se vira (maior, mais rápido). */
  rapidezDoGiro: 3,
  /** O corpo que segura a criança (raio e altura do cilindro). */
  raio: 0.45,
  altura: 1.3,
} as const

/**
 * Para onde um morador olha: para a criança, se a menos de `olharDe` no chão (ou conversando);
 * senão para o `descanso`.
 */
export function olharDoMorador(
  morador: { x: number; z: number },
  crianca: { x: number; z: number },
  descanso: number,
  conversando: boolean,
  olharDe: number,
): number {
  const dx = crianca.x - morador.x
  const dz = crianca.z - morador.z
  if (!conversando && dx * dx + dz * dz > olharDe ** 2) return descanso
  if (dx === 0 && dz === 0) return descanso
  return Math.atan2(dx, dz)
}

/** Para onde a Capi olha (`olharDoMorador` com a distância dela). */
export function olharDaCapi(
  capi: { x: number; z: number },
  crianca: { x: number; z: number },
  descanso: number,
  conversando: boolean,
): number {
  return olharDoMorador(capi, crianca, descanso, conversando, CAPI_NO_BOSQUE.olharDe)
}
