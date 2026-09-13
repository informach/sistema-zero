import { isRecord, isSceneAction, SCENE_IDS, SCENE_LIMITS, type SceneId } from './actions'
import { type SceneStep, sceneGoalIds, sceneModel } from './catalog'
import { stepScene } from './engine'
import { initialScene, type SceneStart } from './state'

export * from './actions'
export * from './catalog'
export * from './engine'
export * from './evaluate'
export * from './session'
export * from './state'

/**
 * As duas atividades de cena.
 *
 * ⚠️ São TIPOS IRMÃOS, não modos de um mesmo tipo. Antes existia um `exploration` com um
 * campo `mode: 'explore' | 'demonstrate'` — e esse campo só existia quando `version` era 3,
 * de modo que os campos disponíveis mudavam conforme um número que o professor nunca
 * escolhia. Demonstrar e experimentar têm objetivo, avaliação e tela diferentes; separá-los
 * aqui é o que faz o professor escolher uma vez só.
 *
 * ⚠️ Não confundir com o `intent` de SEÇÃO, que também tem os valores `demonstration` e
 * `exploration`. Aquele eixo diz o papel da seção na aula; este diz o que a criança faz.
 */
export interface DemonstrationActivity {
  type: 'demonstration'
  scene: SceneId
  /** Sem roteiro próprio, vale o do modelo. O professor só escreve quando quer outro. */
  script?: SceneStep[]
  instructionAudioUrl?: string
}
export interface ExperimentationActivity {
  type: 'experimentation'
  scene: SceneId
  /** Só `gravity` e `impulse`: a altura de partida do salto. */
  initialImpulse?: number
  instructionAudioUrl?: string
}
export type SceneActivity = DemonstrationActivity | ExperimentationActivity

const isScene = (v: unknown): v is SceneId => SCENE_IDS.some((s) => s === v)
// ⚠️ O `[^/]` não é enfeite: sem ele, `//host-qualquer/audio.mp3` passa como se fosse
// caminho local e o player carrega áudio de terceiro, pelo protocolo da página.
const AUDIO = /^(https:\/\/|\/[^/])/

/**
 * O endereço do áudio da instrução: `https://` ou um caminho do próprio site.
 *
 * ⚠️ EXPORTADA para o editor do admin fazer a mesma pergunta em vez de copiar o regex. O editor
 * antes derivava "áudio inválido" de `!isSceneActivity(...)`, que também é falso por roteiro
 * inválido e por impulso fora de faixa — e a tela acusava um `https://` perfeito.
 */
export function isSceneAudioUrl(value: unknown): boolean {
  if (value === undefined) return true
  return typeof value === 'string' && value.length <= 4000 && AUDIO.test(value)
}
const validAudio = isSceneAudioUrl

export function isDemonstrationActivity(value: unknown): value is DemonstrationActivity {
  if (!isRecord(value) || value.type !== 'demonstration' || !isScene(value.scene)) return false
  if (!validAudio(value.instructionAudioUrl)) return false
  return value.script === undefined || isSceneScript(value.script, value.scene)
}

export function isExperimentationActivity(value: unknown): value is ExperimentationActivity {
  if (!isRecord(value) || value.type !== 'experimentation' || !isScene(value.scene)) return false
  if (!validAudio(value.instructionAudioUrl)) return false
  const { initialImpulse: impulse } = value
  if (impulse === undefined) return true
  if (value.scene !== 'gravity' && value.scene !== 'impulse') return false
  const { min, max } = SCENE_LIMITS.impulse
  return (
    typeof impulse === 'number' && Number.isInteger(impulse) && impulse >= min && impulse <= max
  )
}

export function isSceneActivity(value: unknown): value is SceneActivity {
  return isDemonstrationActivity(value) || isExperimentationActivity(value)
}

export const SCRIPT_LIMITS = { steps: 12, actions: 16, caption: 500, id: 80 } as const
const ID = /^[a-zA-Z0-9_-]{1,80}$/

/**
 * Um roteiro só é válido se ele REALMENTE acontece: além da forma, o validador executa os
 * passos no motor e confere que cada `waitFor` foi de fato alcançado. Um roteiro que promete
 * uma descoberta e não a produz é um roteiro que trava a criança na tela.
 */
export function isSceneScript(value: unknown, scene: SceneId): value is SceneStep[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > SCRIPT_LIMITS.steps)
    return false
  const goals = sceneGoalIds(scene)
  const ids = new Set<string>()
  for (const step of value) {
    if (!isRecord(step)) return false
    if (typeof step.id !== 'string' || !ID.test(step.id) || ids.has(step.id)) return false
    ids.add(step.id)
    if (typeof step.caption !== 'string') return false
    if (step.caption.length === 0 || step.caption.length > SCRIPT_LIMITS.caption) return false
    if (
      step.highlight !== undefined &&
      step.highlight !== 'scene' &&
      step.highlight !== 'tools' &&
      step.highlight !== 'compare'
    )
      return false
    if (step.waitFor !== undefined && !goals.includes(step.waitFor as string)) return false
    if (!Array.isArray(step.actions)) return false
    if (step.actions.length === 0 || step.actions.length > SCRIPT_LIMITS.actions) return false
    for (const action of step.actions) {
      if (!isSceneAction(action, scene)) return false
      // Dica não é gesto de roteiro: quem demonstra já está explicando.
      if (isRecord(action) && action.type === 'hint') return false
      if (isRecord(action) && action.type === 'advance') {
        const { seconds } = action
        const { min, max } = SCENE_LIMITS.scriptAdvance
        if (typeof seconds !== 'number' || seconds < min || seconds > max) return false
      }
    }
  }
  return playsOut(value as SceneStep[], scene)
}

function playsOut(steps: SceneStep[], scene: SceneId): boolean {
  let state = initialScene({ scene })
  for (const step of steps) {
    for (const action of step.actions) state = stepScene({ scene }, state, action)
    if (step.waitFor === undefined) continue
    // A espera só faz sentido depois de deixar o tempo correr, e a descoberta tem de existir.
    if (step.actions.at(-1)?.type !== 'advance') return false
    if (!state.evidence.discoveries.includes(step.waitFor)) return false
  }
  return true
}

/** Por onde a cena desta atividade começa. */
export function sceneStart(activity: SceneActivity): SceneStart {
  if (activity.type === 'experimentation' && activity.initialImpulse !== undefined)
    return { scene: activity.scene, initialImpulse: activity.initialImpulse }
  return { scene: activity.scene }
}

/** O roteiro que vale: o autorado, quando existe; senão o do modelo da cena. */
export function sceneScript(activity: SceneActivity): readonly SceneStep[] {
  if (activity.type === 'demonstration' && activity.script) return activity.script
  return sceneModel(activity.scene).script
}
