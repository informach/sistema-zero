import type { IdDaGaleria, ObjetoDaCasa } from '@sistemazero/arquipelago-contracts'

/** Uma compra guardada: `pendente` até o Members confirmar o débito, depois `paga`. */
export interface CompraDaGaleria {
  aparencia: IdDaGaleria
  objeto: ObjetoDaCasa
  moedas: number
  chave: string
  situacao: 'pendente' | 'paga'
}

/** As compras da galeria (fase1-13, 29/10/2026). */
export interface RepositorioDaGaleria {
  compras(jogadorId: string): Promise<CompraDaGaleria[]>
  /**
   * Guarda a compra `pendente` com esta chave e este preço, ou devolve a que já existe para a
   * mesma aparência (com a chave e o preço dela): a mesma compra nunca ganha duas chaves.
   */
  reservar(pedido: {
    jogadorId: string
    aparencia: IdDaGaleria
    objeto: ObjetoDaCasa
    moedas: number
    chave: string
    agora: Date
  }): Promise<CompraDaGaleria>
  /** O Members confirmou: a compra vale. */
  marcarPaga(jogadorId: string, aparencia: IdDaGaleria, agora: Date): Promise<void>
  /** Nada foi cobrado (saldo curto): a reserva sai, e a próxima tentativa começa do zero. */
  desistir(jogadorId: string, aparencia: IdDaGaleria, chave: string): Promise<void>
}
