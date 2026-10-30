import {
  diaDeSaoPaulo,
  type EntregarPedido,
  EntregarPedidoSchema,
  ILHA_DO_PEDIDO,
  ilhaAberta,
  type PagamentoDoPedido,
  prepararEntregaDoPedido,
  type RespostaDoServico,
  type SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'
import { mesmosDados } from '../sistemas/conciliar-salvamento'

export interface RegistroDePedidoFalso {
  pedido: EntregarPedido
  pagamentoId: string
  moedas: 3 | 4
  pagamento: PagamentoDoPedido
}
export function criarPedidosFalsos(o: {
  somenteLeitura: boolean
  posicao: number
  ler(): SalvamentoGuardado
  gravar(s: SalvamentoGuardado, registros: RegistroDePedidoFalso[]): void
  registros?: RegistroDePedidoFalso[]
  compraPendente(): boolean
  creditar(id: string, moedas: number, dia: string): 'creditado' | 'teto'
  agora(): Date
}) {
  const registros = new Map((o.registros ?? []).map((r) => [r.pedido.chave, r]))
  const recusar = (status: number, code: string) => ({ status, corpo: { error: { code } } })
  return {
    buscar(path: string, metodo: string, corpo: unknown): RespostaDoServico | null {
      if (!path.startsWith('/pedidos/')) return null
      if (o.somenteLeitura) return recusar(403, 'SOMENTE_LEITURA')
      if (path === '/pedidos/pendentes' && metodo === 'GET')
        return {
          status: 200,
          corpo: {
            versao: 1,
            pedidos: [...registros.values()]
              .filter((r) => r.pagamento === 'pendente')
              .slice(0, 1)
              .map((r) => r.pedido),
          },
        }
      if (path !== '/pedidos/entregar' || metodo !== 'POST') return recusar(404, 'NOT_FOUND')
      const p = EntregarPedidoSchema.safeParse(corpo)
      if (!p.success) return recusar(400, 'VALIDATION_ERROR')
      const c = p.data
      let r = registros.get(c.chave)
      if (r && !mesmosDados(r.pedido, c)) return recusar(409, 'PEDIDO_INCOMPATIVEL')
      let guardado = o.ler()
      if (!r) {
        if (!ilhaAberta(ILHA_DO_PEDIDO[c.morador], o.posicao)) return recusar(403, 'ILHA_FECHADA')
        if (o.compraPendente()) return recusar(423, 'COMPRA_PENDENTE')
        if (
          c.dia !== diaDeSaoPaulo(o.agora()) ||
          guardado.revisao !== c.revisaoBase ||
          !guardado.salvamento ||
          guardado.salvamento.moradores[c.morador].pedido?.id !== c.pedido ||
          [...registros.values()].some(
            (r) => r.pedido.dia === c.dia && r.pedido.morador === c.morador,
          )
        )
          return recusar(409, 'PEDIDO_BASE_RECUSADO')
        const preparado = prepararEntregaDoPedido(guardado.salvamento, c.morador, c.dia)
        if (!preparado.ok) return recusar(409, 'PEDIDO_BASE_RECUSADO')
        r = {
          pedido: c,
          pagamentoId: crypto.randomUUID(),
          moedas: preparado.moedas,
          pagamento: 'pendente',
        }
        registros.set(c.chave, r)
        guardado = {
          revisao: guardado.revisao + 1,
          salvamento: preparado.salvamento,
          atualizadoEm: o.agora().toISOString(),
        }
        o.gravar(guardado, [...registros.values()])
      }
      if (r.pagamento === 'pendente') {
        r = { ...r, pagamento: o.creditar(r.pagamentoId, r.moedas, diaDeSaoPaulo(o.agora())) }
        registros.set(c.chave, r)
        o.gravar(guardado, [...registros.values()])
      }
      return {
        status: 200,
        corpo: {
          versao: 1,
          pedido: r.pedido,
          moedas: r.moedas,
          pagamento: r.pagamento,
          guardado: structuredClone(guardado),
        },
      }
    },
  }
}
