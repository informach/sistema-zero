import type { EntregarPedido, PagamentoDoPedido } from '@sistemazero/arquipelago-contracts'
import type { DonoDaCompra } from './insumos.port'
import type { SalvamentoNoBanco } from './repositorio.port'

export interface PedidoEntregue {
  dono: DonoDaCompra
  comando: EntregarPedido
  pagamentoId: string
  pagamento: PagamentoDoPedido
  moedas: 3 | 4
}
export interface RepositorioDosPedidos {
  entregar(dono: DonoDaCompra, comando: EntregarPedido, agora: Date): Promise<PedidoEntregue>
  ler(
    dono: DonoDaCompra,
    chave: string,
  ): Promise<{ entrega: PedidoEntregue; guardado: SalvamentoNoBanco } | null>
  pendente(dono: DonoDaCompra): Promise<PedidoEntregue | null>
  confirmarPagamento(
    dono: DonoDaCompra,
    chave: string,
    creditar: (pedido: PedidoEntregue) => Promise<Exclude<PagamentoDoPedido, 'pendente'>>,
  ): Promise<void>
}
export class PedidoRecusadoError extends Error {
  constructor(
    readonly motivo: 'revisao' | 'dia' | 'pedido' | 'repetido' | 'incompativel' | 'espaco',
  ) {
    super('O pedido não foi entregue. Confira o progresso e tente novamente.')
  }
}
