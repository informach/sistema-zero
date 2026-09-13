import type { LearningResult } from '../index'
import type { SceneId } from './actions'
import { sceneModel } from './catalog'
import type { SceneState } from './state'

/**
 * O que a criança descobriu, e se isso fecha a cena.
 *
 * A regra é a mesma para demonstração e experimentação no que diz respeito ao mundo — o que
 * muda é o que conta como pronto: assistir ao roteiro inteiro, ou alcançar as metas.
 */

export interface SceneGoalProgress {
  id: string
  label: string
  complete: boolean
}

export function sceneGoals(scene: SceneId, state: SceneState): SceneGoalProgress[] {
  return sceneModel(scene).goals.map((g) => ({
    ...g,
    complete: state.evidence.discoveries.includes(g.id),
  }))
}

/**
 * Duas cenas pedem que a montagem FIQUE no estado descoberto, não só que ele tenha passado:
 * em `layers`, o Dino na frente; em `jump-sound`, o fio do som no acontecimento. Descobrir e
 * depois desfazer não fecha essas duas — nas outras doze, descobrir basta.
 */
function settled(scene: SceneId, state: SceneState): boolean {
  if (scene === 'layers') return state.world.front
  if (scene === 'jump-sound') return state.sound.onJump
  return true
}

/** A criança mexeu e descobriu. */
export function evaluateExperimentation(
  scene: SceneId,
  state: SceneState,
  valid = true,
): LearningResult {
  const missing = sceneGoals(scene, state).find((g) => !g.complete)
  const ready = settled(scene, state)
  return {
    participated: valid && state.evidence.actions > 0,
    passed: valid && missing === undefined && ready,
    feedback: !valid
      ? 'Esta descoberta mudou. Recomece a experiência; seu projeto está guardado.'
      : (missing?.label ??
        (!ready ? 'Deixe a montagem com a descoberta que você fez.' : sceneModel(scene).success)),
    verifiedBy: 'client',
    evidence: 'exploration',
  }
}

/**
 * A criança assistiu. Aqui as metas NÃO são cobradas: quem conduz é o roteiro, e exigir
 * descoberta de quem só observou seria cobrar por um gesto que a tela não ofereceu.
 */
export function evaluateDemonstration(viewed: boolean, valid = true): LearningResult {
  return {
    participated: valid,
    passed: valid && viewed,
    feedback: !valid
      ? 'Esta demonstração mudou. Abra de novo para assistir do começo.'
      : viewed
        ? 'Demonstração concluída.'
        : 'Acompanhe todas as etapas para concluir.',
    verifiedBy: 'client',
    evidence: 'demonstration',
  }
}
