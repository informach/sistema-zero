import { alturaDaIlha } from '../mundo/medidas'
import { CHEGADA_DA_VISITA } from '../sistemas/visitas'
import type { Pedidos } from './contexto'

export function irParaAFrenteDaCasa(pedidos: Pick<Pedidos, 'teleporte' | 'olharPara'>) {
  const { x, z, olhar } = CHEGADA_DA_VISITA
  pedidos.teleporte = { x, y: alturaDaIlha(x, z) + 1.2, z }
  pedidos.olharPara = olhar
}
