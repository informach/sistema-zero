import {
  BALCOES,
  estrelasDoTurno,
  type PostoDaVila,
  type Salvamento,
  type TurnoEmAndamento,
  terminou,
} from '@sistemazero/arquipelago-contracts'
import { ajudarOBento } from './conversa-do-bento'
import { adicionarConjunto, ITENS } from './itens'

export {
  BALCOES,
  type BalcaoDaVila as Balcao,
  comecarTurno,
  entregarBandeja,
  estrelasDoTurno,
  FREGUESES,
  falaDoPedido,
  itensPorExtenso,
  MAXIMO_NA_BANDEJA,
  type PedidoDoTurno as Pedido,
  type ProdutoDoBalcao as Produto,
  pedidoDaVez,
  pedidosDoTurno,
  porNaBandeja,
  produtoDoBalcao,
  TAMANHO_DOS_PEDIDOS,
  type TurnoEmAndamento,
  terminou,
  tirarDaBandeja,
  totalNaBandeja,
} from '@sistemazero/arquipelago-contracts'

/** O jogo adapta a recompensa em itens e a amizade; as regras do balcão são compartilhadas. */
const nomeDoItem = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

function pagamentoPorExtenso(pagamento: Readonly<Record<string, number>>): string {
  const partes = Object.entries(pagamento).map(([id, q]) => `${q} ${nomeDoItem(id)}`)
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`
}

/** Já pagou hoje neste balcão. */
export function jaPagouHoje(s: Salvamento, posto: PostoDaVila, dia: string): boolean {
  const pago = s.turnos[posto]?.pagoEm
  return pago !== null && pago !== undefined && pago >= dia
}

/**
 * Fechar um turno terminado: guarda as melhores estrelas e quantos turnos ela fez ali e, no
 * primeiro turno do dia do balcão, paga. Na padaria, esse turno também é amizade com o Bento (e
 * pode trazer uma receita nova, com as falas dele).
 */
export function fecharTurno(
  s: Salvamento,
  t: TurnoEmAndamento,
  dia: string,
): { salvamento: Salvamento; estrelas: 1 | 2 | 3; pagou: boolean; falas: string[] } | null {
  if (!terminou(t)) return null
  const balcao = BALCOES[t.posto]
  const estrelas = estrelasDoTurno(t.erros)
  const antes = s.turnos[t.posto]
  const pagou = !jaPagouHoje(s, t.posto, dia)
  let salvamento: Salvamento = {
    ...s,
    turnos: {
      ...s.turnos,
      [t.posto]: {
        pagoEm: pagou ? dia : (antes?.pagoEm ?? null),
        melhor: Math.max(antes?.melhor ?? 1, estrelas),
        vezes: Math.min(9999, (antes?.vezes ?? 0) + 1),
      },
    },
  }
  if (!pagou)
    return {
      salvamento,
      estrelas,
      pagou,
      falas: ['O pagamento de hoje deste balcão já veio. Amanhã tem turno pago de novo.'],
    }
  const inventario = adicionarConjunto(salvamento.inventario, balcao.pagamento)
  if (!inventario) return null
  salvamento = { ...salvamento, inventario }
  const falas = [`${balcao.quemPaga} o turno com ${pagamentoPorExtenso(balcao.pagamento)}.`]
  if (t.posto === 'padaria') {
    const bento = ajudarOBento(salvamento, dia)
    if (!bento) return null
    salvamento = bento.salvamento
    falas.push(...bento.falas)
  }
  return { salvamento, estrelas, pagou, falas }
}
