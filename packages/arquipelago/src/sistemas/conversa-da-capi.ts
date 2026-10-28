import { BICHOS_DO_BOSQUE, type Salvamento } from '@sistemazero/arquipelago-contracts'
import { escondidos } from './esconde'
import { falasDaCapi } from './falas-da-capi'
import { ITENS, quantidade } from './itens'
import {
  conversar,
  coracoes,
  darPresente,
  ehAniversario,
  entregarPedido,
  pedidoDoDia,
  pedidoPeloId,
  podeEntregar,
  type ReacaoAoPresente,
} from './moradores'

/**
 * A conversa com a Capi sobre o salvamento inteiro (o que o painel chama). Junta as regras de
 * `moradores.ts` com os achados e o bicho adotado, e devolve o salvamento novo e o que ela diz.
 */

/** Um número do dia para escolher a fala dentro do nível (muda todo dia, igual o dia inteiro). */
export function escolhaDoDia(dia: string): number {
  return Number(dia.replaceAll('-', '')) || 0
}

/** O texto do pedido de hoje, se ainda não foi entregue. */
export function pedidoDeHoje(s: Salvamento, dia: string): string | null {
  const p = s.moradores.capi.pedido
  if (!p || p.dia !== dia || p.entregue) return null
  return pedidoPeloId(p.id)?.texto ?? null
}

/**
 * Abrir a conversa: sorteia o pedido de hoje (se ainda não houver), conta a conversa do dia e
 * monta as falas.
 */
export function comecarConversa(
  s: Salvamento,
  dia: string,
  perfilId: string,
): { salvamento: Salvamento; falas: string[] } {
  const antes = s.moradores.capi
  const achados = s.bichos.achados.length
  const comPedido = pedidoDoDia(antes, dia, perfilId, achados, escondidos(s.bichos).length)
  const { capi, primeiraDoDia } = conversar(comPedido, dia)
  const salvamento: Salvamento = { ...s, moradores: { ...s.moradores, capi } }
  const falas = falasDaCapi(
    {
      coracoes: coracoes(capi.amizade),
      primeiroEncontro: antes.conversaEm === null,
      primeiraDoDia,
      aniversario: ehAniversario(dia),
      achados,
      total: BICHOS_DO_BOSQUE.length,
      adotado: s.bichos.adotado?.nome ?? null,
      pedido: pedidoDeHoje(salvamento, dia),
    },
    escolhaDoDia(dia),
  )
  return { salvamento, falas }
}

export const FALA_DO_PRESENTE: Readonly<Record<ReacaoAoPresente, string>> = {
  adorou: 'Esse é dos que eu mais gosto. Obrigada, de coração.',
  agradeceu: 'Que gentil. Vou guardar para o lanche da tarde.',
  devolveu: 'Isso eu não sei usar. Fica com você, que vai ser mais útil.',
  'ja-ganhou-hoje': 'Hoje eu já ganhei presente. Guarde esse para amanhã.',
  'sem-item': 'Acho que isso acabou na sua mochila.',
}

/** Dar um presente pelo painel. */
export function presentear(
  s: Salvamento,
  itemId: string,
  dia: string,
): { salvamento: Salvamento; reacao: ReacaoAoPresente; fala: string } {
  const r = darPresente(s.moradores.capi, s.inventario, itemId, dia)
  const ganhou = r.reacao === 'adorou' || r.reacao === 'agradeceu'
  const fala =
    ganhou && ehAniversario(dia)
      ? `${FALA_DO_PRESENTE[r.reacao]} E no meu aniversário, ainda por cima.`
      : FALA_DO_PRESENTE[r.reacao]
  if (!ganhou) return { salvamento: s, reacao: r.reacao, fala }
  return {
    salvamento: { ...s, inventario: r.inv, moradores: { ...s.moradores, capi: r.capi } },
    reacao: r.reacao,
    fala,
  }
}

export const FALA_DA_ENTREGA = 'Era isso mesmo que eu precisava. Obrigada, você ajudou muito.'

/** Entregar o pedido de hoje pelo painel. */
export function entregar(s: Salvamento): { salvamento: Salvamento; entregou: boolean } {
  const r = entregarPedido(s.moradores.capi, s.inventario, s.bichos.achados.length)
  if (!r.entregou) return { salvamento: s, entregou: false }
  return {
    salvamento: { ...s, inventario: r.inv, moradores: { ...s.moradores, capi: r.capi } },
    entregou: true,
  }
}

/** O que ainda falta para o pedido de hoje, para mostrar embaixo dele (`null` = nada a fazer). */
export function oQueFaltaNoPedido(s: Salvamento): string | null {
  const capi = s.moradores.capi
  const pedido = capi.pedido && !capi.pedido.entregue ? pedidoPeloId(capi.pedido.id) : null
  if (!pedido || podeEntregar(capi, s.inventario, s.bichos.achados.length)) return null
  if (!pedido.itens) return 'Ache mais um bicho escondido no bosque.'
  return Object.entries(pedido.itens)
    .filter(([id, qtd]) => quantidade(s.inventario, id) < qtd)
    .map(
      ([id, qtd]) => `${ITENS[id]?.nome ?? id}: você tem ${quantidade(s.inventario, id)} de ${qtd}`,
    )
    .join('. ')
}
