import { ilhaVisitada } from '@sistemazero/arquipelago-contracts'
import { type AreaDaDescoberta, registrarDescoberta } from '../sistemas/exploracao'
import { jogoPausado } from '../sistemas/pausa'
import type { Movimento, Pedidos, Rastro } from './contexto'
import type { LojaDoJogo } from './loja'

/** Adapta presença ao salvamento da montagem, respeitando pausa, suporte e visita alheia. */
export function observarDescoberta(
  loja: LojaDoJogo,
  area: AreaDaDescoberta,
  rastro: Pick<Rastro, 'x' | 'y' | 'z'>,
  movimento: Pick<Movimento, 'noChao'>,
  pedidos: Pick<Pedidos, 'teleporte' | 'chaoChegando'>,
): void {
  const estado = loja.getState()
  if (
    ilhaVisitada(estado.salvamento.ilhasVisitadas, area.ilha) ||
    jogoPausado(estado) ||
    estado.visita ||
    estado.acesso.somenteLeitura ||
    estado.nadando ||
    estado.modo !== 'chao' ||
    !movimento.noChao ||
    pedidos.teleporte ||
    pedidos.chaoChegando.size > 0
  )
    return
  const novo = registrarDescoberta(estado.salvamento, area, rastro, estado.jornada, true)
  if (novo !== estado.salvamento) estado.mudar(() => novo)
}
