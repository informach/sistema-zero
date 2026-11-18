import {
  type EstadoDoTerreno,
  prepararOperacaoDeCaminho,
} from '@sistemazero/molda-cenarios-core/v2'

export interface PedidoDeCaminho {
  intencao: unknown
  /** Cópia privada capturada pelo Palco; transferir não invalida a cena. */
  estado: EstadoDoTerreno | null
  moldarTerreno?: boolean
}
export function processarCaminho({ intencao, estado, moldarTerreno }: PedidoDeCaminho) {
  return prepararOperacaoDeCaminho(intencao, estado, { moldarTerreno })
}
