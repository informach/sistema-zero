import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import {
  ANIVERSARIO_DO_BENTO,
  falasDoBento,
  GOSTOS_DO_BENTO,
  pedidoDoBentoPeloId,
  pedidoDoDiaDoBento,
} from './bento'
import { escolhaDoDia } from './conversa-da-capi'
import { FALA_DA_PAGINA_DO_BENTO, ganhouAPaginaDaVila } from './diario'
import { adicionar, ITENS } from './itens'
import {
  conversar,
  coracoes,
  darPresente,
  ehAniversario,
  entregarItens,
  oQueFaltaDosItens,
  type ReacaoAoPresente,
  sorteio,
  temOsItens,
} from './moradores'
import { ingredientesPorExtenso, RECEITAS, type Receita } from './receitas'

/**
 * A conversa com o Bento sobre o salvamento inteiro (o que o painel chama): sorteia o pedido de
 * hoje, conta a conversa do dia, dá o presente e entrega o pedido. As regras ficam em `bento.ts` e
 * `moradores.ts`; aqui só se junta tudo ao salvamento.
 */

function comBento(s: Salvamento, bento: Salvamento['moradores']['bento']): Salvamento {
  return { ...s, moradores: { ...s.moradores, bento } }
}

// ── As receitas que ele lembra (fase2-04) ───────────────────────────────────────────────────────

/** O que ele diz quando lembra cada receita (e entrega os ingredientes da primeira vez). */
export const FALA_DA_RECEITA: Readonly<Record<string, string>> = {
  'bolo-de-fuba':
    'Lembrei a receita do bolo de fubá: fubá, leite e ovo, no forno. Leve os ingredientes da despensa e asse o primeiro.',
  'pao-de-queijo':
    'Lembrei o pão de queijo: polvilho e queijo, no forno. Esses da despensa dão para a primeira fornada.',
  brigadeiro:
    'Agora lembrei o brigadeiro: cacau e dois leites, mexendo no fogão da bancada. Leve para provar.',
  'chocolate-quente':
    'Lembrei o chocolate quente: cacau e leite, no fogão da bancada. Ele esquenta até o frio do Pico.',
}

/** As receitas do Bento que se sabe com esta amizade com ele. */
export function receitasDoBento(amizade: number): Receita[] {
  const c = coracoes(amizade)
  return RECEITAS.filter((r) => r.bento !== undefined && r.bento <= c)
}

/** As receitas que ele lembra entre a amizade de antes e a de agora. */
export function receitasNovasDoBento(antes: number, agora: number): Receita[] {
  const a = coracoes(antes)
  const d = coracoes(agora)
  return RECEITAS.filter((r) => r.bento !== undefined && r.bento > a && r.bento <= d)
}

function comOsIngredientes(s: Salvamento, r: Receita): Salvamento {
  let inventario = s.inventario
  for (const [id, qtd] of Object.entries(r.precisa)) inventario = adicionar(inventario, id, qtd)
  return { ...s, inventario }
}

/**
 * Depois de qualquer coisa que dá amizade: cada receita que ele lembrou entra na conversa, com os
 * ingredientes para a primeira vez, e a página do diário da Íris, quando a amizade chega a ela.
 */
function comAsReceitasNovas(
  s: Salvamento,
  amizadeAntes: number,
): { salvamento: Salvamento; falas: string[]; novas: Receita[] } {
  const novas = receitasNovasDoBento(amizadeAntes, s.moradores.bento.amizade)
  let salvamento = s
  const falas: string[] = []
  for (const r of novas) {
    salvamento = comOsIngredientes(salvamento, r)
    falas.push(FALA_DA_RECEITA[r.id] ?? `Lembrei a receita: ${r.nome.toLowerCase()}.`)
  }
  if (ganhouAPaginaDaVila(amizadeAntes, s.moradores.bento.amizade))
    falas.push(...FALA_DA_PAGINA_DO_BENTO)
  return { salvamento, falas, novas }
}

/** Os ingredientes que ele dá da despensa a cada pedido entregue: de uma receita que ele já ensinou. */
export function cestaDoBento(amizade: number, dia: string): Receita | null {
  const sabidas = receitasDoBento(amizade)
  if (sabidas.length === 0) return null
  return sabidas[sorteio(`cesta:${dia}`) % sabidas.length] ?? null
}

const nomeDoItem = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

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
  const receitas = comAsReceitasNovas(comBento(s, bento), antes.amizade)
  const salvamento = receitas.salvamento
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
  return { salvamento, falas: [...falas, ...receitas.falas] }
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
  const receitas = comAsReceitasNovas(
    { ...comBento(s, r.capi), inventario: r.inv },
    s.moradores.bento.amizade,
  )
  return { salvamento: receitas.salvamento, reacao: r.reacao, falas: [fala, ...receitas.falas] }
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
  const receitas = comAsReceitasNovas(
    { ...comBento(s, r.morador), inventario: r.inv },
    s.moradores.bento.amizade,
  )
  const falas = [FALA_DA_ENTREGA_AO_BENTO, ...receitas.falas]
  // A cesta da despensa: de uma receita já ensinada (quando lembrou uma agora, os ingredientes dela
  // já vieram com a fala).
  const cesta = receitas.novas.length === 0 ? cestaDoBento(r.morador.amizade, dia) : null
  if (!cesta) return { salvamento: receitas.salvamento, entregou: true, falas }
  return {
    salvamento: comOsIngredientes(receitas.salvamento, cesta),
    entregou: true,
    falas: [
      ...falas,
      `Leve da despensa ${ingredientesPorExtenso(cesta, nomeDoItem)}. Com isso dá para fazer ${cesta.nome.toLowerCase()}.`,
    ],
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
