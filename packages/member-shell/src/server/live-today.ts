import 'server-only'
import type { LiveCatalogView } from '@sistemazero/core/live'
import { type LiveTodayView, pickLiveToday } from '../lib/live/journey'
import type { GatewayModule } from './gateway'

/**
 * O encontro de HOJE de quem tem vaga (proposta J de 23/10/2026): a Início do Kids o mostra no
 * alto, porque no celular "Oficinas" não está na barra de abas. Lido no servidor para o cartão
 * já nascer no primeiro quadro (nada pula), em SÓ LEITURA e melhor esforço: qualquer falha é
 * "sem encontro hoje", e a Início segue igual. Só aparece para quem tem vaga: a agenda do Members
 * lista apenas as turmas da pessoa (nada de divulgação).
 */
export async function loadLiveTodayReadonly(
  gateway: Pick<GatewayModule, 'gatewayFetchReadonly'>,
  now = new Date(),
): Promise<LiveTodayView | null> {
  try {
    const res = await gateway.gatewayFetchReadonly<LiveCatalogView>('/members/live/catalog')
    if (res.status !== 200 || !res.body) return null
    return pickLiveToday(res.body, now)
  } catch {
    return null
  }
}
