import {
  ILHA_DO_PEDIDO,
  ilhaVisitada,
  type MoradorDoPedido,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

/**
 * O Nico, caranguejo carteiro da praia da sua ilha (§6.28, A19; a proposta: "Zappy e o caranguejo
 * Nico, carteiro da praia"). Tem amizade, gostos, aniversário e pedidos como os moradores do anel
 * (`moradores-do-anel.ts`); o papel de carteiro é o correio do dia: na primeira conversa de cada
 * dia, ele conta de quem há pedido esperando nas ilhas que a criança já visitou.
 */
export const APRESENTACAO_DO_NICO = [
  'Eu sou o Nico, o carteiro da praia.',
  'Quando a cor foi embora, as cartas pararam de chegar às ilhas.',
  'Agora, toda manhã, eu conto quem está esperando a sua ajuda.',
] as const

/** Medidas do `nico.glb` (as mesmas do habitante da praia) e o jeito de acenar e olhar. */
export const NICO_NA_PRAIA = {
  olharDe: 6,
  alcance: 2.2,
  acenoACada: 8,
  rapidezDoGiro: 4,
  raio: 0.43,
  altura: 1.15,
  alturaDaCabeca: 0.8,
} as const

/** Quem tem pedido no correio, na ordem das ilhas, com o artigo da fala. */
const REMETENTES: readonly { quem: Exclude<MoradorDoPedido, 'nico'>; de: string }[] = [
  { quem: 'capi', de: 'da Capi' },
  { quem: 'bento', de: 'do Bento' },
  { quem: 'mare', de: 'da Maré' },
  { quem: 'floco', de: 'do Floco' },
  { quem: 'jade', de: 'da Jade' },
  { quem: 'irie', de: 'da Iriê' },
]

/**
 * O correio do dia: os pedidos de hoje que ainda esperam, dos moradores das ilhas já visitadas.
 * Todo morador tem um pedido por dia; só sai do correio o que já foi entregue hoje.
 */
export function correioDoDia(s: Salvamento, dia: string): string | null {
  const visitados = REMETENTES.filter(({ quem }) =>
    ilhaVisitada(s.ilhasVisitadas, ILHA_DO_PEDIDO[quem]),
  )
  if (visitados.length === 0) return null
  const esperando = visitados.filter(({ quem }) => {
    const p = s.moradores[quem].pedido
    return !(p?.dia === dia && p.entregue)
  })
  if (esperando.length === 0)
    return 'O correio de hoje está em dia. Todos os pedidos foram entregues.'
  const nomes = esperando.map((r) => r.de)
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
  return esperando.length === 1
    ? `No correio de hoje, um pedido ${lista} espera por você.`
    : `No correio de hoje, pedidos ${lista} esperam por você.`
}

/**
 * A atividade da conversa (`conversarComAtividade`): na primeira vez, a apresentação; na primeira
 * conversa de cada dia, o correio. O resto (amizade, pedido dele, aniversário) é do anel.
 */
export function comecarConversaComONico(s: Salvamento, dia: string) {
  const nico = s.moradores.nico
  const primeiraVez = nico.conversaEm === null && nico.amizade === 0
  const falas: string[] = primeiraVez ? [...APRESENTACAO_DO_NICO] : []
  if (nico.conversaEm !== dia) {
    const correio = correioDoDia(s, dia)
    if (correio) falas.push(correio)
  }
  return { salvamento: s, falas }
}
