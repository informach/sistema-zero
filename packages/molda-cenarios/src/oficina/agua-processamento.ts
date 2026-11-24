import {
  type EstadoDoTerreno,
  type IdentidadeDaAgua,
  prepararOperacaoDeAgua,
} from '@sistemazero/molda-cenarios-core/v2'

/** Estado é uma cópia privada capturada pelo palco; nunca o campo usado para desenhar. */
export interface PedidoDeAgua {
  identidade: IdentidadeDaAgua
  intencao: unknown
  estado: EstadoDoTerreno | null
}
export function processarAgua({ identidade, intencao, estado }: PedidoDeAgua) {
  return prepararOperacaoDeAgua(identidade, intencao, estado)
}
