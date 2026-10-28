import { AMIZADE_MAXIMA, type Capi } from '@sistemazero/arquipelago-contracts'
import { type Inventario, ITENS, quantidade, remover } from './itens'

/**
 * A Capi, a capivara do Bosque (regras puras). A amizade sobe conversando uma vez por dia,
 * entregando o pedido do dia e dando um presente por dia; ela nunca desce. Tudo conta pelo dia do
 * calendário no horário do aparelho (`diaDe`), não pelo dia e noite do jogo.
 */

export const AMIZADE = {
  /** A primeira conversa do dia. */
  conversa: 10,
  /** Entregar o pedido do dia. */
  pedido: 30,
  /** Presente de que ela gosta e presente comum (só o primeiro do dia conta). */
  presenteQueGosta: 20,
  presenteComum: 8,
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

/** O dia do calendário no horário do aparelho, `AAAA-MM-DD`. */
export function diaDe(agora: Date): string {
  const a = agora.getFullYear()
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function ehAniversario(dia: string): boolean {
  const [, m, d] = dia.split('-').map(Number)
  return m === ANIVERSARIO_DA_CAPI.mes && d === ANIVERSARIO_DA_CAPI.dia
}

/** Quantos corações cheios (de 0 a 5). */
export function coracoes(amizade: number): number {
  return Math.min(AMIZADE_MAXIMA / AMIZADE.porCoracao, Math.floor(amizade / AMIZADE.porCoracao))
}

function somar(capi: Capi, pontos: number): Capi {
  return { ...capi, amizade: Math.min(AMIZADE_MAXIMA, capi.amizade + pontos) }
}

/** Conversar: só a primeira conversa do dia conta (e é a única com fala nova). */
export function conversar(capi: Capi, dia: string): { capi: Capi; primeiraDoDia: boolean } {
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
  capi: Capi,
  inv: Inventario,
  itemId: string,
  dia: string,
): { capi: Capi; inv: Inventario; reacao: ReacaoAoPresente } {
  if (quantidade(inv, itemId) < 1) return { capi, inv, reacao: 'sem-item' }
  const gosto = ITENS[itemId]?.comida ? (GOSTOS_DA_CAPI[itemId] ?? 'comum') : null
  if (!gosto) return { capi, inv, reacao: 'devolveu' }
  if (capi.presenteEm === dia) return { capi, inv, reacao: 'ja-ganhou-hoje' }
  const novo = remover(inv, itemId, 1)
  if (!novo) return { capi, inv, reacao: 'sem-item' }
  const base = gosto === 'gosta' ? AMIZADE.presenteQueGosta : AMIZADE.presenteComum
  const pontos = ehAniversario(dia) ? base * 2 : base
  return {
    capi: { ...somar(capi, pontos), presenteEm: dia },
    inv: novo,
    reacao: gosto === 'gosta' ? 'adorou' : 'agradeceu',
  }
}

// ── O pedido do dia ─────────────────────────────────────────────────────────────────────────────

export interface PedidoDaCapi {
  id: string
  /** O texto curto do que ela pede (na tela). */
  texto: string
  /** Itens a entregar; ausente nos pedidos de achar um bicho. */
  itens?: Readonly<Record<string, number>>
}

/** Os pedidos de itens. O de achar um bicho é montado na hora (`achar-bicho-N`). */
export const PEDIDOS_DA_CAPI: readonly PedidoDaCapi[] = [
  { id: 'alface-2', texto: 'Duas alfaces da horta', itens: { alface: 2 } },
  { id: 'tomate-2', texto: 'Dois tomates da horta', itens: { tomate: 2 } },
  { id: 'milho-1', texto: 'Um milho da horta', itens: { milho: 1 } },
  { id: 'salada-1', texto: 'Uma salada da horta', itens: { salada: 1 } },
  { id: 'pipoca-2', texto: 'Duas pipocas', itens: { pipoca: 2 } },
]

const ACHAR = 'achar-bicho-'

/** O pedido pelo id guardado (os de achar guardam quantos bichos já tinham sido achados). */
export function pedidoPeloId(id: string): PedidoDaCapi | null {
  if (id.startsWith(ACHAR)) return { id, texto: 'Achar mais um bicho escondido' }
  return PEDIDOS_DA_CAPI.find((p) => p.id === id) ?? null
}

/** Um número estável a partir de um texto (o mesmo pedido o dia inteiro, em qualquer aparelho). */
function sorteio(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

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
  const opcoes = PEDIDOS_DA_CAPI.map((p) => p.id)
  if (escondidos > 0) opcoes.push(`${ACHAR}${achados}`)
  const id = opcoes[sorteio(`${perfilId}:${dia}`) % opcoes.length] ?? opcoes[0] ?? 'milho-1'
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

/** Para onde ela olha: para a criança, se perto (ou conversando); senão para o `descanso`. */
export function olharDaCapi(
  capi: { x: number; z: number },
  crianca: { x: number; z: number },
  descanso: number,
  conversando: boolean,
): number {
  const dx = crianca.x - capi.x
  const dz = crianca.z - capi.z
  if (!conversando && dx * dx + dz * dz > CAPI_NO_BOSQUE.olharDe ** 2) return descanso
  if (dx === 0 && dz === 0) return descanso
  return Math.atan2(dx, dz)
}
