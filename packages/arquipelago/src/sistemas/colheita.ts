import type { ContextoDaColheita, Salvamento } from '@sistemazero/arquipelago-contracts'
import { climaEfetivo } from './clima'

/**
 * O clima da colheita é o que vale na sua ilha: o natural do dia antes das Nuvens, o escolhido
 * depois (`climaEfetivo`). A escolha guardada antes das Nuvens não vale: vale o natural.
 */
export function contextoDaColheita(
  s: Salvamento,
  jornada: number,
  agoraMs = Date.now(),
): ContextoDaColheita {
  return {
    clima: climaEfetivo({ jornada, visita: null, salvamento: s }, agoraMs),
    necessidades: s.necessidades,
  }
}
