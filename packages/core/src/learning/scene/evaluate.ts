import type { LearningResult } from '../index'
import type { SceneId } from './actions'
import { castText, type SceneCast } from './cast'
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

export function sceneGoals(
  scene: SceneId,
  state: SceneState,
  /** Quem está no palco. Sem elenco, o texto do catálogo vale como está. */
  cast?: SceneCast,
): SceneGoalProgress[] {
  return sceneModel(scene).goals.map((g) => ({
    ...g,
    label: castText(g.label, cast),
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
  cast?: SceneCast,
): LearningResult {
  const missing = sceneGoals(scene, state, cast).find((g) => !g.complete)
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
export function evaluateDemonstration(
  viewed: boolean,
  valid = true,
  /** Houve sessão guardada? Quem nunca abriu não participou — é ausência, não evidência. */
  started = true,
): LearningResult {
  return {
    participated: valid && started,
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

/**
 * A dica do momento. Os três degraus do modelo valem quase sempre, mas três cenas ganham um
 * atalho quando o estado já diz em que ponto a criança travou — mandá-la reler a mesma frase
 * genérica ali seria não responder.
 */
export function sceneHint(
  scene: SceneId,
  state: SceneState,
  level: number,
  cast?: SceneCast,
): string {
  const d = state.evidence.discoveries
  // ⚠️ Os atalhos também passam pelo elenco: eles citam o cacto e o Dino pelo nome, e uma
  // pista que fala de outro personagem é pior que pista nenhuma.
  if (scene === 'hitbox' && level < 3)
    return castText(
      d.includes('contact')
        ? 'Guarde a posição do cacto. Mude só a largura da área e compare.'
        : 'Aproxime o cacto devagar. Observe a borda da área do Dino.',
      cast,
    )
  if (scene === 'jump-sound' && level < 3)
    return state.sound.onJump
      ? 'Tente pular outra vez enquanto está no ar. Depois experimente o toque.'
      : 'Aperte Espaço duas vezes durante o mesmo salto. Conte os sons e os saltos.'
  if (scene === 'impulse' && d.includes('first-height') && level < 3)
    return 'Guarde este salto, mude o impulso e repita. A gravidade permanece igual.'
  const hints = sceneModel(scene).hints
  return castText(hints[level <= 1 ? 0 : level === 2 ? 1 : 2] ?? '', cast)
}
