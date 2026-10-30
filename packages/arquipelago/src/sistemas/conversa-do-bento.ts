import {
  AMIZADE_MAXIMA,
  cestaDiariaDoBento,
  prepararEntregaDoPedido,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import {
  ANIVERSARIO_DO_BENTO,
  falasDoBento,
  GOSTOS_DO_BENTO,
  pedidoDoBentoPeloId,
  pedidoDoDiaDoBento,
} from './bento'
import { receberLanterna } from './borroes'
import { escolhaDoDia } from './conversa-da-capi'
import { FALA_DA_PAGINA_DO_BENTO, ganhouAPaginaDaVila } from './diario'
import { adicionarConjunto, ITENS } from './itens'
import {
  AMIZADE,
  conversar,
  coracoes,
  darPresente,
  ehAniversario,
  oQueFaltaDosItens,
  type ReacaoAoPresente,
  temOsItens,
} from './moradores'
import {
  ingredientesPorExtenso,
  type Receita,
  receitasDoMorador,
  receitasNovasDoMorador,
} from './receitas'

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
  return receitasDoMorador('bento', amizade)
}

/** As receitas que ele lembra entre a amizade de antes e a de agora. */
export function receitasNovasDoBento(antes: number, agora: number): Receita[] {
  return receitasNovasDoMorador('bento', antes, agora)
}

export const FALA_DA_CESTA_CHEIA =
  'A cesta não cabe inteira na mochila. Use alguns ingredientes e volte para receber tudo.'

function comOsIngredientes(s: Salvamento, r: Receita): Salvamento | null {
  const inventario = adicionarConjunto(s.inventario, r.precisa)
  return inventario ? { ...s, inventario } : null
}

/**
 * Depois de qualquer coisa que dá amizade: cada receita que ele lembrou entra na conversa, com os
 * ingredientes para a primeira vez, e a página do diário da Íris, quando a amizade chega a ela.
 */
function comAsReceitasNovas(
  s: Salvamento,
  amizadeAntes: number,
): { salvamento: Salvamento; falas: string[]; novas: Receita[] } | null {
  const novas = receitasNovasDoBento(amizadeAntes, s.moradores.bento.amizade)
  let salvamento = s
  const falas: string[] = []
  for (const r of novas) {
    const proximo = comOsIngredientes(salvamento, r)
    if (!proximo) return null
    salvamento = proximo
    falas.push(FALA_DA_RECEITA[r.id] ?? `Lembrei a receita: ${r.nome.toLowerCase()}.`)
  }
  if (ganhouAPaginaDaVila(amizadeAntes, s.moradores.bento.amizade))
    falas.push(...FALA_DA_PAGINA_DO_BENTO)
  return { salvamento, falas, novas }
}

/** Os ingredientes que ele dá da despensa a cada pedido entregue: de uma receita que ele já ensinou. */
export function cestaDoBento(amizade: number, dia: string): Receita | null {
  return cestaDiariaDoBento(amizade, dia)
}

const nomeDoItem = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

/** O texto do pedido de hoje, se ainda não foi entregue. */
export function pedidoDoBentoDeHoje(s: Salvamento, dia: string): string | null {
  const p = s.moradores.bento.pedido
  if (!p || p.dia !== dia || p.entregue) return null
  return pedidoDoBentoPeloId(p.id)?.texto ?? null
}

/**
 * Abrir a conversa: o pedido de hoje (se ainda não houver), a conversa do dia e as falas. Do
 * segundo encontro em diante, quem não tem a lanterna ganha (fase2-06), por último: o primeiro
 * encontro fica só com a apresentação e o pedido.
 */
export function comecarConversaComOBento(
  s: Salvamento,
  dia: string,
  perfilId: string,
): { salvamento: Salvamento; falas: string[] } {
  const antes = s.moradores.bento
  const { capi: bento, primeiraDoDia } = conversar(pedidoDoDiaDoBento(antes, dia, perfilId), dia)
  const receitas = comAsReceitasNovas(comBento(s, bento), antes.amizade)
  if (!receitas) return { salvamento: s, falas: [FALA_DA_CESTA_CHEIA] }
  const lanterna = antes.conversaEm === null ? null : receberLanterna(receitas.salvamento)
  const salvamento = lanterna?.salvamento ?? receitas.salvamento
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
  return {
    salvamento,
    falas: [...falas, ...receitas.falas, ...(lanterna ? [lanterna.fala] : [])],
  }
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
  if (!receitas) return { salvamento: s, reacao: 'devolveu', falas: [FALA_DA_CESTA_CHEIA] }
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
  const r = prepararEntregaDoPedido(s, 'bento', dia)
  if (!r.ok)
    return {
      salvamento: s,
      entregou: false,
      falas:
        r.motivo === 'mochila-cheia' || r.motivo === 'salvamento-cheio'
          ? [FALA_DA_CESTA_CHEIA]
          : [],
    }
  const falas = [
    FALA_DA_ENTREGA_AO_BENTO,
    ...r.novas.map(
      (receita) =>
        FALA_DA_RECEITA[receita.id] ?? `Lembrei a receita: ${receita.nome.toLowerCase()}.`,
    ),
  ]
  if (ganhouAPaginaDaVila(s.moradores.bento.amizade, r.salvamento.moradores.bento.amizade))
    falas.push(...FALA_DA_PAGINA_DO_BENTO)
  const cesta = r.cesta
  if (!cesta) return { salvamento: r.salvamento, entregou: true, falas }
  return {
    salvamento: r.salvamento,
    entregou: true,
    falas: [
      ...falas,
      `Leve da despensa ${ingredientesPorExtenso(cesta, nomeDoItem)}. Com isso dá para fazer ${cesta.nome.toLowerCase()}.`,
    ],
  }
}

export const FALA_DO_TURNO_NA_PADARIA =
  'Obrigado pela ajuda no balcão. Com você lá, o forno não parou.'

/**
 * O primeiro turno do dia no balcão da padaria (`sistemas/turnos.ts` decide quando): a amizade
 * do turno e, se ela passar um coração, a receita nova e a página do diário.
 */
export function ajudarOBento(
  s: Salvamento,
  dia: string,
): { salvamento: Salvamento; falas: string[] } | null {
  const antes = s.moradores.bento
  if (s.turnos.padaria?.pagoEm !== dia) return { salvamento: s, falas: [] }
  const bento = { ...antes, amizade: Math.min(AMIZADE_MAXIMA, antes.amizade + AMIZADE.turno) }
  const receitas = comAsReceitasNovas(comBento(s, bento), antes.amizade)
  if (!receitas) return null
  return { salvamento: receitas.salvamento, falas: [FALA_DO_TURNO_NA_PADARIA, ...receitas.falas] }
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
