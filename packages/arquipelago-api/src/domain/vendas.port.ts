import type { PagamentoDaVenda, VenderNaFeira } from '@sistemazero/arquipelago-contracts'
import type { DonoDaCompra } from './insumos.port'
import type { SalvamentoNoBanco } from './repositorio.port'

export interface VendaFeita {
  dono: DonoDaCompra
  comando: VenderNaFeira
  pagamentoId: string
  pagamento: PagamentoDaVenda
  /** Com `teto`: a semana (`semanaDeSaoPaulo`) em que bateu; o crédito volta numa seguinte (A32). */
  tetoSemana: string | null
  moedas: number
}
export interface RepositorioDasVendas {
  vender(dono: DonoDaCompra, comando: VenderNaFeira, agora: Date): Promise<VendaFeita>
  ler(
    dono: DonoDaCompra,
    chave: string,
  ): Promise<{ venda: VendaFeita; guardado: SalvamentoNoBanco } | null>
  pendente(dono: DonoDaCompra): Promise<VendaFeita | null>
  /**
   * Credita com a chave de sempre. Pendente, ou teto de uma semana anterior a `semana` (§6.28, A32:
   * o que passa do teto espera a semana seguinte e nunca se perde); o resto não muda.
   */
  confirmarPagamento(
    dono: DonoDaCompra,
    chave: string,
    semana: string,
    creditar: (venda: VendaFeita) => Promise<Exclude<PagamentoDaVenda, 'pendente'>>,
  ): Promise<void>
  /** Os que bateram no teto numa semana anterior a `semana`, do mais antigo ao mais novo. */
  esperandoOTeto(dono: DonoDaCompra, semana: string, limite: number): Promise<VendaFeita[]>
}
export class VendaRecusadaError extends Error {
  constructor(
    readonly motivo: 'revisao' | 'dia' | 'pratos' | 'repetida' | 'incompativel' | 'espaco',
  ) {
    super('A venda não foi feita. Confira os pratos e tente novamente.')
  }
}
