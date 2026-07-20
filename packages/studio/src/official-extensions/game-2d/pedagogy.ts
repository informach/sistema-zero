import { BEHAVIOR_AREA_LABELS } from '../../blockly/blockContracts'

/**
 * Vocabulário pedagógico canônico do Jogo 2D.
 *
 * A toolbox, as ajudas dos blocos e as guardas de documentação partem daqui para
 * não voltarem a ensinar ciclos de vida diferentes para a mesma criança.
 */
export const GAME_TWO_D_AREAS = {
  start: BEHAVIOR_AREA_LABELS.start,
  events: BEHAVIOR_AREA_LABELS.events,
  loop: BEHAVIOR_AREA_LABELS.loops,
} as const

export const GAME_TWO_D_LIFECYCLE_TOOLBOX = {
  events: {
    name: GAME_TWO_D_AREAS.events,
    types: ['sz_g2d_on_key', 'sz_g2d_on_overlap', 'sz_g2d_on_pointer'],
  },
  loop: {
    name: GAME_TWO_D_AREAS.loop,
    types: ['sz_g2d_update_each_frame', 'sz_g2d_every_frames', 'sz_g2d_every_seconds'],
  },
} as const

export const GAME_TWO_D_PERIODIC_TOOLTIPS = {
  frames: `Roda o “fazer” de tempos em tempos, a cada N quadros. É uma raiz de “${GAME_TWO_D_AREAS.loop}”; não encaixe dentro de “A cada quadro”.`,
  seconds: `Roda o “fazer” a cada N segundos. É uma raiz de “${GAME_TWO_D_AREAS.loop}”; não encaixe dentro de “A cada quadro”.`,
} as const

export const GAME_TWO_D_LIFECYCLE_GUIDANCE = {
  start:
    'Prepare tela, personagens, grupos, variáveis e estado inicial em “Ao iniciar”. Essa área roda novamente em cada nova partida.',
  events: `Registre tecla, clique e começo de contato em “${GAME_TWO_D_AREAS.events}”, uma vez por partida.`,
  loop: `Coloque “A cada quadro”, “A cada N quadros” e “A cada N segundos” como raízes independentes em “${GAME_TWO_D_AREAS.loop}”.`,
} as const
