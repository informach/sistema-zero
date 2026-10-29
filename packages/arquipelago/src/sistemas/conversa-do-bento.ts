import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import {
  ANIVERSARIO_DO_BENTO,
  falasDoBento,
  GOSTOS_DO_BENTO,
  pedidoDoBentoPeloId,
  pedidoDoDiaDoBento,
} from './bento'
import { escolhaDoDia } from './conversa-da-capi'
import {
  conversar,
  coracoes,
  darPresente,
  ehAniversario,
  entregarItens,
  oQueFaltaDosItens,
  type ReacaoAoPresente,
  temOsItens,
} from './moradores'

/**
 * A conversa com o Bento sobre o salvamento inteiro (o que o painel chama): sorteia o pedido de
 * hoje, conta a conversa do dia, dá o presente e entrega o pedido. As regras ficam em `bento.ts` e
 * `moradores.ts`; aqui só se junta tudo ao salvamento.
 */

function comBento(s: Salvamento, bento: Salvamento['moradores']['bento']): Salvamento {
  return { ...s, moradores: { ...s.moradores, bento } }
}

/** O texto do pedido de hoje, se ainda não foi entregue. */
export function pedidoDoBentoDeHoje(s: Salvamento, dia: string): string | null {
  const p = s.moradores.bento.pedido
  if (!p || p.dia !== dia || p.entregue) return null
  return pedidoDoBentoPeloId(p.id)?.texto ?? null
}

/** Abrir a conversa: o pedido de hoje (se ainda não houver), a conversa do dia e as falas. */
export function comecarConversaComOBento(
  s: Salvamento,
  dia: string,
  perfilId: string,
): { salvamento: Salvamento; falas: string[] } {
  const antes = s.moradores.bento
  const { capi: bento, primeiraDoDia } = conversar(pedidoDoDiaDoBento(antes, dia, perfilId), dia)
  const salvamento = comBento(s, bento)
  const falas = falasDoBento(
    {
      coracoes: coracoes(bento.amizade),
      primeiroEncontro: antes.conversaEm === null,
      primeiraDoDia,
      aniversario: ehAniversario(dia, ANIVERSARIO_DO_BENTO),
      pedido: pedidoDoBentoDeHoje(salvamento, dia),
    },
    escolhaDoDia(dia),
  )
  return { salvamento, falas }
}

export const FALA_DO_PRESENTE_DO_BENTO: Readonly<Record<ReacaoAoPresente, string>> = {
  adorou: 'Era bem disso que eu precisava. Obrigado, você acertou em cheio.',
  agradeceu: 'Que gentileza. Vou guardar para o lanche da feira.',
  devolveu: 'Isso não vai no forno. Fica com você, que vai ser mais útil.',
  'ja-ganhou-hoje': 'Hoje eu já ganhei presente. Guarde esse para amanhã.',
  'sem-item': 'Acho que isso acabou na sua mochila.',
}

/** Dar um presente pelo painel. */
export function presentearOBento(
  s: Salvamento,
  itemId: string,
  dia: string,
): { salvamento: Salvamento; reacao: ReacaoAoPresente; falas: string[] } {
  const r = darPresente(
    s.moradores.bento,
    s.inventario,
    itemId,
    dia,
    GOSTOS_DO_BENTO,
    ANIVERSARIO_DO_BENTO,
  )
  const ganhou = r.reacao === 'adorou' || r.reacao === 'agradeceu'
  const fala =
    ganhou && ehAniversario(dia, ANIVERSARIO_DO_BENTO)
      ? `${FALA_DO_PRESENTE_DO_BENTO[r.reacao]} E no dia de São João, ainda por cima.`
      : FALA_DO_PRESENTE_DO_BENTO[r.reacao]
  if (!ganhou) return { salvamento: s, reacao: r.reacao, falas: [fala] }
  return {
    salvamento: { ...comBento(s, r.capi), inventario: r.inv },
    reacao: r.reacao,
    falas: [fala],
  }
}

export const FALA_DA_ENTREGA_AO_BENTO =
  'Era isso mesmo. Com isso eu lembro mais um pedaço da receita. Obrigado.'

/** Entregar o pedido de hoje pelo painel (pedido de outro dia não se entrega). */
export function entregarAoBento(
  s: Salvamento,
  dia: string,
): {
  salvamento: Salvamento
  entregou: boolean
  falas: string[]
} {
  if (s.moradores.bento.pedido?.dia !== dia) return { salvamento: s, entregou: false, falas: [] }
  const r = entregarItens(s.moradores.bento, s.inventario, pedidoDoBentoPeloId)
  if (!r.entregou) return { salvamento: s, entregou: false, falas: [] }
  return {
    salvamento: { ...comBento(s, r.morador), inventario: r.inv },
    entregou: true,
    falas: [FALA_DA_ENTREGA_AO_BENTO],
  }
}

/** Se o pedido de hoje está pronto para entregar (todos os itens na mochila). */
export function podeEntregarAoBento(s: Salvamento, dia: string): boolean {
  const p = s.moradores.bento.pedido
  if (!p || p.dia !== dia || p.entregue) return false
  return temOsItens(pedidoDoBentoPeloId(p.id), s.inventario)
}

/** O que ainda falta para o pedido de hoje (`null` = nada a fazer ou já dá para entregar). */
export function oQueFaltaAoBento(s: Salvamento, dia: string): string | null {
  const p = s.moradores.bento.pedido
  if (!p || p.dia !== dia || p.entregue) return null
  const pedido = pedidoDoBentoPeloId(p.id)
  return pedido ? oQueFaltaDosItens(pedido, s.inventario) : null
}
