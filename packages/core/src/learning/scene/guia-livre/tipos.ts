import type { SceneActivity } from '../index'
import type { SceneState } from '../state'

/**
 * As falas do Zappy de uma cena em exploração livre e a escolha da fala pelo estado. Cada cena
 * tem o seu arquivo em `guia-livre/`; `discoveryGuidance` e `discoverySpeechSteps` leem o registro.
 */
export interface GuiaLivre {
  /** Chave → fala. As chaves começam com o id da cena e um hífen. */
  speech: Readonly<Record<string, string>>
  /** A chave da fala para o estado de agora (o que a criança já descobriu e o que está à vista). */
  guidance: (state: SceneState, has: (meta: string) => boolean, activity: SceneActivity) => string
}
