import type { SceneId } from './actions'
import type { SceneState } from './state'

export interface GardenUpdate {
  before: number
  after: number
  kind: 'initial' | 'add' | 'empty' | 'repeat' | 'reset'
}

export interface GardenStep {
  id: string
  text: string
  primary?: 'connect' | 'other' | 'restart'
}
const STEPS: Record<string, GardenStep> = {
  'touch-complete': {
    id: 'touch-complete',
    text: 'Você viu a regra em outro esconderijo. Experimente os toques na ordem que quiser.',
  },
  'touch-connect': {
    id: 'touch-connect',
    text: 'Agora ligue a reação ao toque. O mesmo toque poderá executar uma ação.',
    primary: 'connect',
  },
  'touch-first': {
    id: 'touch-first',
    text: 'Primeiro, toque no arbusto. Observe o jardim com a reação desligada.',
  },
  'touch-other': {
    id: 'touch-other',
    text: 'Agora toque nas pedras. Qual esconderijo deve ficar invisível? Observe o escolhido na ligação.',
  },
  'touch-next': {
    id: 'touch-next',
    text: 'O toque executou a reação. Clique em Testar com outro esconderijo para conferir a mesma regra em outro lugar.',
    primary: 'other',
  },
  'touch-again': {
    id: 'touch-again',
    text: 'Toque no arbusto mais uma vez. A reação está ligada. Observe o que muda.',
  },
  'count-complete': {
    id: 'count-complete',
    text: 'Agora explore do seu jeito. Acompanhe o valor que fica guardado entre um toque e outro.',
  },
  'count-first': {
    id: 'count-first',
    text: 'Encontre um personagem. Olhe o valor guardado em achados e o placar.',
  },
  'count-second': {
    id: 'count-second',
    text: 'Encontre outro personagem. O jogo vai somar ao valor que já estava guardado.',
  },
  'count-empty': {
    id: 'count-empty',
    text: 'Toque no espaço vazio do jardim. O valor guardado vai mudar?',
  },
  'count-repeat': {
    id: 'count-repeat',
    text: 'Toque de novo onde um personagem apareceu. Observe se a regra de somar é executada.',
  },
  'count-restart': {
    id: 'count-restart',
    text: 'Clique em Recomeçar a busca. Observe o valor inicial e os esconderijos.',
    primary: 'restart',
  },
}
export function gardenSpeechSteps(scene?: SceneId): GardenStep[] {
  return Object.values(STEPS).filter((step) =>
    scene === 'touch-response'
      ? step.id.startsWith('touch-')
      : scene === 'found-counter'
        ? step.id.startsWith('count-')
        : false,
  )
}

/** Stable step keys also identify the optional authored Zappy recordings. */
export function gardenStep(scene: SceneId, state: SceneState): GardenStep | null {
  const d = state.evidence.discoveries
  if (scene === 'touch-response') {
    if (d.includes('second-target')) return STEPS['touch-complete']!
    if (!state.match.touch)
      return d.includes('no-response') ? STEPS['touch-connect']! : STEPS['touch-first']!
    if (state.match.gardenRound === 2) return STEPS['touch-other']!
    if (d.includes('responds')) return STEPS['touch-next']!
    return STEPS['touch-again']!
  }
  if (scene !== 'found-counter') return null
  if (
    ['first-find', 'second-find', 'no-find', 'repeat', 'back-to-zero'].every((id) => d.includes(id))
  )
    return STEPS['count-complete']!
  if (!d.includes('first-find')) return STEPS['count-first']!
  // A descoberta permanece após reiniciar, mas as próximas comparações precisam de um achado.
  if (state.match.points === 0) return STEPS['count-first']!
  if (!d.includes('second-find')) return STEPS['count-second']!
  if (!d.includes('no-find')) return STEPS['count-empty']!
  if (!d.includes('repeat')) return STEPS['count-repeat']!
  return STEPS['count-restart']!
}
