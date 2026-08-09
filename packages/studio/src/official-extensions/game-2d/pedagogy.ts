import { BEHAVIOR_AREA_LABELS } from '../../blockly/blockContracts'

/**
 * Vocabulário pedagógico canônico do Jogo 2D.
 *
 * A toolbox, as ajudas dos blocos e as guardas de documentação partem daqui para
 * não voltarem a ensinar ciclos de vida diferentes para a mesma criança.
 */
export const GAME_TWO_D_AREAS = {
  molds: BEHAVIOR_AREA_LABELS.molds,
  start: BEHAVIOR_AREA_LABELS.start,
  events: BEHAVIOR_AREA_LABELS.events,
  loop: BEHAVIOR_AREA_LABELS.loops,
} as const

export const GAME_TWO_D_PERIODIC_TOOLTIPS = {
  frames: `Roda o “fazer” de tempos em tempos, a cada N quadros. É uma raiz de “${GAME_TWO_D_AREAS.loop}”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”.`,
  seconds: `Roda o “fazer” a cada N segundos. É uma raiz de “${GAME_TWO_D_AREAS.loop}”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”.`,
  after: `Espera N segundos depois que o jogo começa (ou reinicia) e roda o “fazer” UMA vez só. É uma raiz de “${GAME_TWO_D_AREAS.loop}”; não encaixe dentro de “A cada quadro”. Para repetir sempre, use “A cada N segundos”.`,
} as const

export const GAME_TWO_D_LIFECYCLE_GUIDANCE = {
  molds: `Crie as figuras desenhadas por código, os tipos de inimigo, as folhas de quadros e os sons carregados em “${GAME_TWO_D_AREAS.molds}”. Nada acontece ali: são receitas, e você pode criar várias sem usar nenhuma. Usar cada uma é trabalho de “${GAME_TWO_D_AREAS.start}”.`,
  start: `Prepare tela, personagens, grupos, variáveis e estado inicial em “${GAME_TWO_D_AREAS.start}”. Essa área roda novamente em cada nova partida.`,
  events: `Registre tecla, qualquer tecla ou toque, clique, pulo e começo de contato em “${GAME_TWO_D_AREAS.events}”, uma vez por partida.`,
  loop: `Coloque “A cada quadro”, “A cada N quadros” e “A cada N segundos” como raízes independentes em “${GAME_TWO_D_AREAS.loop}”. As raízes periódicas rodam em todas as telas; coloque “se a tela atual é jogando?” dentro delas quando o comando só puder acontecer durante a partida. Comandos contínuos ficam no corpo dessas raízes ou em funções/métodos chamados por elas, nunca diretamente em “${GAME_TWO_D_AREAS.start}” ou “${GAME_TWO_D_AREAS.events}”.`,
} as const

const GAME_TWO_D_LIFECYCLE_TOKENS = {
  '[[G2D_LIFECYCLE_MOLDS]]': GAME_TWO_D_LIFECYCLE_GUIDANCE.molds,
  '[[G2D_LIFECYCLE_START]]': GAME_TWO_D_LIFECYCLE_GUIDANCE.start,
  '[[G2D_LIFECYCLE_EVENTS]]': GAME_TWO_D_LIFECYCLE_GUIDANCE.events,
  '[[G2D_LIFECYCLE_LOOP]]': GAME_TWO_D_LIFECYCLE_GUIDANCE.loop,
} as const

export function withGameTwoDLifecycleGuidance(template: string): string {
  let result = template
  for (const [token, guidance] of Object.entries(GAME_TWO_D_LIFECYCLE_TOKENS)) {
    result = result.replaceAll(token, guidance)
  }
  return result
}
