import {
  isRecord,
  isSceneAction,
  SCENE_IDS,
  SCENE_LIMITS,
  type SceneId,
  type SceneSetup,
  SETUP_LIMITS,
} from './actions'
import { castText, isSceneCast, type SceneCast } from './cast'
import { type SceneModel, type SceneStep, sceneGoalIds, sceneModel } from './catalog'
import { openScene, stepScene } from './engine'
import type { SceneStart } from './state'

export * from './actions'
export * from './cast'
export * from './catalog'
export * from './engine'
export * from './evaluate'
export * from './readout'
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
  /** Quem está no palco. Sem elenco, é o do Corre Dino. Ver `cast.ts`. */
  cast?: SceneCast
  /** De onde a cena parte. ⚠️ Sem `goals`: a demonstração não cobra meta nenhuma. */
  setup?: SceneSetup
  /**
   * Como a demonstração se apresenta.
   *
   * `guided` (o padrão) é a de sempre: as etapas à vista, uma fala por etapa, a criança avança
   * quando quiser. `inline` é o TERCEIRO FORMATO — a cena rodando o roteiro de uma vez, com um
   * ▶ e nada mais, dentro do texto da explicação. É o degrau que faltava entre o parágrafo e a
   * simulação, e é o que o Brilliant usa no meio das lições: dois segundos, sem áudio, que a
   * criança repete quantas vezes quiser. O motor é o mesmo; muda só a apresentação.
   */
  presentation?: 'guided' | 'inline'
}
export interface ExperimentationActivity {
  type: 'experimentation'
  scene: SceneId
  /** Só `gravity` e `impulse`: a altura de partida do salto. */
  initialImpulse?: number
  instructionAudioUrl?: string
  /** Quem está no palco. Sem elenco, é o do Corre Dino. Ver `cast.ts`. */
  cast?: SceneCast
  /** De onde a cena parte e o que ela cobra. Ver `SceneSetup`. */
  setup?: SceneSetup
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
  if (value.cast !== undefined && !isSceneCast(value.cast)) return false
  // ⚠️ Meta é assunto de quem experimenta. Numa demonstração a lista não teria efeito nenhum,
  // e campo sem efeito é armadilha para quem autora: aqui ele é recusado.
  if (value.setup !== undefined && !isSceneSetup(value.setup, value.scene, { goals: false }))
    return false
  if (
    value.presentation !== undefined &&
    value.presentation !== 'guided' &&
    value.presentation !== 'inline'
  )
    return false
  // ⚠️⚠️ Sem roteiro autoral vale o do MODELO — e ele também precisa tocar a partir do caso.
  // O `playsOut` existe porque um roteiro que promete uma descoberta e não a produz trava a
  // criança na tela; conferindo só o autoral, uma demonstração com `setup` escapava inteira:
  // um caso que já liga a reciclagem faz o `waitFor: 'grows'` do `pool` nunca chegar, com a
  // fala narrando "sem reciclagem, cada passo cria mais um corpo" sobre a tela contrária.
  if (value.script === undefined)
    return (
      value.setup === undefined ||
      playsOut([...sceneModel(value.scene).script], value.scene, value.setup as SceneSetup)
    )
  return isSceneScript(value.script, value.scene, value.setup as SceneSetup | undefined)
}

export function isExperimentationActivity(value: unknown): value is ExperimentationActivity {
  if (!isRecord(value) || value.type !== 'experimentation' || !isScene(value.scene)) return false
  if (!validAudio(value.instructionAudioUrl)) return false
  if (value.cast !== undefined && !isSceneCast(value.cast)) return false
  if (value.setup !== undefined && !isSceneSetup(value.setup, value.scene)) return false
  const { initialImpulse: impulse } = value
  if (impulse === undefined) return true
  if (value.scene !== 'gravity' && value.scene !== 'impulse') return false
  const { min, max } = SCENE_LIMITS.impulse
  return (
    typeof impulse === 'number' && Number.isInteger(impulse) && impulse >= min && impulse <= max
  )
}

/**
 * O caso é legal nesta cena?
 *
 * As ações passam pela régua única (`isSceneAction`) e as metas precisam existir no modelo —
 * uma lista que cita uma meta inexistente é uma atividade que nunca fecha, e é exatamente o
 * tipo de erro que só aparece com a criança na tela.
 */
export function isSceneSetup(
  value: unknown,
  scene: SceneId,
  { goals = true }: { goals?: boolean } = {},
): value is SceneSetup {
  if (!isRecord(value)) return false
  const { actions, goals: alvo } = value
  if (actions !== undefined) {
    if (!Array.isArray(actions) || actions.length === 0 || actions.length > SETUP_LIMITS.actions)
      return false
    for (const acao of actions) {
      if (!isSceneAction(acao, scene)) return false
      // ⚠️ `reset` volta para o próprio caso: dentro dele seria um laço. `hint` é gesto de quem
      // está travado, não estado de partida.
      if (isRecord(acao) && (acao.type === 'reset' || acao.type === 'hint')) return false
    }
  }
  if (alvo === undefined) return actions !== undefined
  if (!goals) return false
  const disponiveis = sceneGoalIds(scene)
  return (
    Array.isArray(alvo) &&
    alvo.length > 0 &&
    alvo.length <= SETUP_LIMITS.goals &&
    new Set(alvo).size === alvo.length &&
    alvo.every((g) => typeof g === 'string' && disponiveis.includes(g))
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
export function isSceneScript(
  value: unknown,
  scene: SceneId,
  /** O caso de onde o roteiro parte: um roteiro válido no mundo de fábrica pode não valer aqui. */
  setup?: SceneSetup,
): value is SceneStep[] {
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
  return playsOut(value as SceneStep[], scene, setup)
}

function playsOut(steps: SceneStep[], scene: SceneId, setup?: SceneSetup): boolean {
  const start: SceneStart = setup ? { scene, setup } : { scene }
  let state = openScene(start)
  for (const step of steps) {
    for (const action of step.actions) state = stepScene(start, state, action)
    if (step.waitFor === undefined) continue
    // A espera só faz sentido depois de deixar o tempo correr, e a descoberta tem de existir.
    if (step.actions.at(-1)?.type !== 'advance') return false
    if (!state.evidence.discoveries.includes(step.waitFor)) return false
  }
  return true
}

/** Por onde a cena desta atividade começa: a cena, o impulso de partida e o caso. */
export function sceneStart(activity: SceneActivity): SceneStart {
  const impulso =
    activity.type === 'experimentation' && activity.initialImpulse !== undefined
      ? { initialImpulse: activity.initialImpulse }
      : {}
  return { scene: activity.scene, ...impulso, ...(activity.setup ? { setup: activity.setup } : {}) }
}

/** As metas que ESTA atividade cobra: as do caso, quando há; as do modelo, quando não. */
export function sceneTargets(activity: SceneActivity): readonly string[] {
  const alvo = activity.type === 'experimentation' ? activity.setup?.goals : undefined
  return alvo?.length ? alvo : sceneGoalIds(activity.scene)
}

/**
 * O roteiro que vale: o autorado, quando existe; senão o do modelo da cena.
 *
 * ⚠️ As falas passam pelo elenco, o roteiro do professor inclusive: ele escreve contra a cena
 * que escolheu, e um curso que veste a cena com outro personagem precisa que as duas falas
 * sigam juntas. Quem não quiser a troca não declara elenco.
 */
export function sceneScript(activity: SceneActivity): readonly SceneStep[] {
  const roteiro =
    activity.type === 'demonstration' && activity.script
      ? activity.script
      : sceneModel(activity.scene).script
  if (!activity.cast) return roteiro
  return roteiro.map((passo) => ({ ...passo, caption: castText(passo.caption, activity.cast) }))
}

/**
 * O modelo da cena VESTIDO com o elenco da atividade.
 *
 * É por aqui que o título, a instrução, o que a criança mexe, a frase de sucesso, o "e se…" e
 * a escada de pistas chegam prontos a quem exibe. `sceneModel` continua devolvendo o texto
 * cru: ele é o conteúdo de fábrica, e é contra ele que o professor escolhe a cena no admin.
 */
export function sceneModelFor(activity: SceneActivity) {
  const m = sceneModel(activity.scene)
  if (!activity.cast) return m
  const c = activity.cast
  return {
    ...m,
    title: castText(m.title, c),
    instruction: castText(m.instruction, c),
    manipulates: castText(m.manipulates, c),
    success: castText(m.success, c),
    extra: castText(m.extra, c),
    goals: m.goals.map((g) => ({ ...g, label: castText(g.label, c) })),
    hints: m.hints.map((h) => castText(h, c)) as unknown as SceneModel['hints'],
    script: sceneScript(activity),
  }
}
