import type { PagamentoDaVenda, VenderNaFeira } from '@sistemazero/arquipelago-contracts'
import type { DonoDaCompra } from './insumos.port'
import type { SalvamentoNoBanco } from './repositorio.port'

export interface VendaFeita {
  dono: DonoDaCompra
  comando: VenderNaFeira
  pagamentoId: string
  pagamento: PagamentoDaVenda
  moedas: number
}
export interface RepositorioDasVendas {
  vender(dono: DonoDaCompra, comando: VenderNaFeira, agora: Date): Promise<VendaFeita>
  ler(
    dono: DonoDaCompra,
    chave: string,
  ): Promise<{ venda: VendaFeita; guardado: SalvamentoNoBanco } | null>
  pendente(dono: DonoDaCompra): Promise<VendaFeita | null>
  confirmarPagamento(
    dono: DonoDaCompra,
    chave: string,
    creditar: (venda: VendaFeita) => Promise<Exclude<PagamentoDaVenda, 'pendente'>>,
  ): Promise<void>
}
export class VendaRecusadaError extends Error {
  constructor(
    readonly motivo: 'revisao' | 'dia' | 'pratos' | 'repetida' | 'incompativel' | 'espaco',
  ) {
    super('A venda não foi feita. Confira os pratos e tente novamente.')
  }
}
