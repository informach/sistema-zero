import type {
  DonoDaGaleria,
  PedidoDePosseDaGaleria,
  PosseDaGaleria,
  ResultadoDaCompraDaGaleria,
} from '@sistemazero/arquipelago-contracts'

/** Autoridade única no Members. Esta porta nunca concede posse pelo salvamento do cliente. */
export interface PortaDaPosse {
  ler(dono: DonoDaGaleria): Promise<PosseDaGaleria>
  comprar(pedido: PedidoDePosseDaGaleria): Promise<ResultadoDaCompraDaGaleria>
}
export class PosseIndisponivelError extends Error {
  constructor() {
    super('A galeria está indisponível agora')
    this.name = 'PosseIndisponivelError'
  }
}
