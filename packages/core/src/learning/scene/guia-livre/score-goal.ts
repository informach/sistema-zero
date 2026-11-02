import type { SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A meta do jogo (`score-goal`, Nave contra Asteroides, Dia 5, 02/11/2026) em exploração livre: só a
 * IDEIA. O placar sobe a cada acerto, a placa da meta é fixa (26) e o sinal decide se chegar a 26
 * já vale (maior ou igual) ou se é preciso passar (maior que). Nada de bloco, de Se nem da palavra
 * "constante" (a do bloco): a montagem de `finais` liga a ideia aos blocos. Antes do teste, a fala
 * pergunta e diz o que observar; em que acerto veio a vitória só aparece na fala de DEPOIS dele. As
 * chaves começam com `score-goal-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/score-goal.tsx`): "Maior que (>)",
 * "Maior ou igual (≥)", "Acertar uma pedra", "Jogar de novo" e "Tentar mudar a placa".
 */
export const SCORE_GOAL_SPEECH = {
  'score-goal-start':
    'A partida está quase no fim: o placar está em 23, e a placa da meta diz 26. Escolha o sinal da vitória e clique em Acertar uma pedra, um acerto de cada vez. Em que acerto você acha que o jogo vai dar a vitória?',
  'score-goal-try':
    'A partida recomeçou no 23. Com este sinal, em que acerto você acha que a vitória vem? Clique em Acertar uma pedra, um de cada vez, e compare.',
  'score-goal-running':
    'Continue clicando em Acertar uma pedra, um acerto de cada vez, e observe o placar e a placa da meta: em que acerto vem a vitória?',
  'score-goal-running-placa':
    'A partida está no meio. E a placa da meta, dá para mudar agora? Clique em Tentar mudar a placa e observe a meta.',
  'score-goal-placa-seen':
    'A placa continuou 26: durante a partida, a meta não muda. Continue clicando em Acertar uma pedra: em que acerto vem a vitória?',
  'score-goal-equal':
    'Com maior ou igual, quando o placar chegou a 26, o jogo já deu a vitória: igual à meta também vale. E com maior que, em que acerto a vitória vem? Clique em Maior que (>) e jogue de novo.',
  'score-goal-greater':
    'Com maior que, o 26 não deu a vitória: o placar precisou passar da meta, e ela veio no 27. E com maior ou igual, o que muda? Clique em Maior ou igual (≥) e jogue de novo.',
  'score-goal-placa':
    'Você comparou os dois sinais. E a placa da meta, dá para mudar no meio da partida? Clique em Jogar de novo, em Acertar uma pedra e, no meio da partida, em Tentar mudar a placa.',
  'score-goal-complete':
    'Com maior ou igual, chegar a 26 já vale; com maior que, é preciso passar de 26. E a placa da meta é escolhida antes do jogo e não muda durante a partida. Pode jogar de novo quando quiser.',
} as const

export type FalaDaMeta = keyof typeof SCORE_GOAL_SPEECH

const METAS = ['igual-conta', 'maior-pula', 'placa-fixa'] as const

/**
 * Qual fala vale agora. Cada fala só explica o que a criança JÁ viu: a vitória daquele sinal, ou a
 * placa que não mudou. No meio de uma partida ainda não vencida, a fala só acompanha os acertos (e,
 * se a placa ainda não foi testada, propõe a tentativa, que só vale no meio da partida).
 */
export function scoreGoalGuidance(
  state: Pick<SceneState, 'scoreGoal'>,
  feita: (meta: string) => boolean,
): FalaDaMeta {
  const g = state.scoreGoal
  if (METAS.every(feita)) return 'score-goal-complete'
  const doSinal = g.op === '>=' ? 'igual-conta' : 'maior-pula'
  const doOutro = g.op === '>=' ? 'maior-pula' : 'igual-conta'
  if (g.won) {
    if (!feita(doOutro)) return g.op === '>=' ? 'score-goal-equal' : 'score-goal-greater'
    return 'score-goal-placa'
  }
  if (g.hits > 0) {
    if (!feita('placa-fixa')) return 'score-goal-running-placa'
    if (!feita(doSinal)) return 'score-goal-placa-seen'
    return 'score-goal-running'
  }
  // Os dois sinais vistos e só a placa falta: o mesmo convite, com o primeiro acerto em destaque.
  if (feita('igual-conta') && feita('maior-pula')) return 'score-goal-placa'
  return feita('igual-conta') || feita('maior-pula') ? 'score-goal-try' : 'score-goal-start'
}

export const guia: GuiaLivre = {
  speech: SCORE_GOAL_SPEECH,
  guidance: (state, has, activity) =>
    scoreGoalGuidance(state, metaFeita(activity, [...METAS], has)),
}
