import type { CompraDeInsumos, PublicoJogo } from '@sistemazero/arquipelago-contracts'
import type { PortaDoDebito } from './moedas.port'
import type { SalvamentoNoBanco } from './repositorio.port'

export interface DonoDaCompra {
  jogadorId: string
  contaId: string
  publico: PublicoJogo
}
export type SituacaoDaCompra = 'pendente' | 'entregue' | 'saldo-insuficiente' | 'recusada'
export interface CompraDeInsumosGuardada {
  dono: DonoDaCompra
  pedido: CompraDeInsumos
  moedas: number
  situacao: SituacaoDaCompra
  saldo: number | null
}
export interface RepositorioDosInsumos {
  /** Reserva durável antes de falar com a carteira; só uma pendência por jogador. */
  reservar(
    dono: DonoDaCompra,
    pedido: CompraDeInsumos,
    agora: Date,
  ): Promise<CompraDeInsumosGuardada>
  pendente(dono: DonoDaCompra): Promise<CompraDeInsumosGuardada | null>
  /** Serializa com PUT e outras compras. Rede incerta mantém a reserva, nunca entrega por suposição. */
  concluir(
    dono: DonoDaCompra,
    chave: string,
    debitar: (compra: CompraDeInsumosGuardada) => ReturnType<PortaDoDebito['debitar']>,
    agora: Date,
  ): Promise<{ compra: CompraDeInsumosGuardada; guardado: SalvamentoNoBanco }>
}

export class CompraPendenteError extends Error {
  constructor() {
    super('Uma compra está sendo confirmada. Seu progresso continua guardado neste aparelho.')
  }
}
export class CompraIncompativelError extends Error {
  constructor() {
    super('Esta compra não corresponde à solicitação guardada.')
  }
}
export class CompraSemEspacoError extends Error {
  constructor(
    readonly motivo: 'mochila-cheia' | 'salvamento-cheio',
    readonly reservada = false,
  ) {
    super('Não há espaço para guardar a compra inteira.')
  }
}
export class CompraDesatualizadaError extends Error {
  constructor(
    readonly atual: SalvamentoNoBanco | null,
    readonly reservada = false,
  ) {
    super('Guarde o progresso antes de comprar.')
  }
}
