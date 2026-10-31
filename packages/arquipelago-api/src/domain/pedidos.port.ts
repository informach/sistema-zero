import type { EntregarPedido, PagamentoDoPedido } from '@sistemazero/arquipelago-contracts'
import type { DonoDaCompra } from './insumos.port'
import type { SalvamentoNoBanco } from './repositorio.port'

export interface PedidoEntregue {
  dono: DonoDaCompra
  comando: EntregarPedido
  pagamentoId: string
  pagamento: PagamentoDoPedido
  /** Com `teto`: a semana (`semanaDeSaoPaulo`) em que bateu; o crédito volta numa seguinte (A32). */
  tetoSemana: string | null
  moedas: 3 | 4
}
export interface RepositorioDosPedidos {
  entregar(dono: DonoDaCompra, comando: EntregarPedido, agora: Date): Promise<PedidoEntregue>
  ler(
    dono: DonoDaCompra,
    chave: string,
  ): Promise<{ entrega: PedidoEntregue; guardado: SalvamentoNoBanco } | null>
  pendente(dono: DonoDaCompra): Promise<PedidoEntregue | null>
  /**
   * Credita com a chave de sempre. Pendente, ou teto de uma semana anterior a `semana` (§6.28, A32:
   * o que passa do teto espera a semana seguinte e nunca se perde); o resto não muda.
   */
  confirmarPagamento(
    dono: DonoDaCompra,
    chave: string,
    semana: string,
    creditar: (pedido: PedidoEntregue) => Promise<Exclude<PagamentoDoPedido, 'pendente'>>,
  ): Promise<void>
  /** Os que bateram no teto numa semana anterior a `semana`, do mais antigo ao mais novo. */
  esperandoOTeto(dono: DonoDaCompra, semana: string, limite: number): Promise<PedidoEntregue[]>
}
export class PedidoRecusadoError extends Error {
  constructor(
    readonly motivo: 'revisao' | 'dia' | 'pedido' | 'repetido' | 'incompativel' | 'espaco',
  ) {
    super('O pedido não foi entregue. Confira o progresso e tente novamente.')
  }
}
