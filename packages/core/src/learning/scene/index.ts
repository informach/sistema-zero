import {
  isRecord,
  isSceneAction,
  SCENE_IDS,
  SCENE_LIMITS,
  type SceneId,
  type SceneSetup,
  SETUP_LIMITS,
} from './actions'
import { isSceneAudioUrl } from './audio-url'
import { castText, isSceneCast, type SceneCast } from './cast'
import { type SceneModel, sceneDefaultGoalIds, sceneGoalIds, sceneModel } from './catalog'
import { isSceneCenario, type SceneCenarioId } from './cenario'
import { LAYERS_CAMADAS, SCENE_PILHAS, type ScenePilha, scenePilhaAceita } from './pilha'
import {
  isCleanupPreset,
  isGameStatePreset,
  isOnceVsAlwaysPreset,
  isRandomPreset,
  isSpawnPreset,
  ONCE_GOALS_BY_PRESET,
  oncePreset,
  RANDOM_GOALS_BY_PRESET,
  randomPreset,
  SPAWN_GOALS_BY_PRESET,
  spawnPreset,
} from './presets'
import {
  isSceneSpeechOverrides,
  isSceneVozes,
  type SceneSpeechOverrides,
  type SceneVozes,
} from './voz'

export * from './actions'
// O ateliê do lote 5 do Raio-X: as réguas do fogo, do espelho, da lupa e da folha.
export * from './atelie'
export * from './audio-url'
export * from './cast'
export * from './catalog'
// O CENÁRIO: qual jogo a cena retrata (o fundo, o chão e o elenco de fábrica de cada jogo).
export * from './cenario'
export * from './engine'
export * from './evaluate'
// O núcleo do Iniciante 2D do lote 5 do Raio-X: as réguas da tecla, do laço, da ficha, da câmera,
// do encosto, da recarga, da mira, da diagonal e do mapa escrito.
export * from './nucleo'
export * from './once-vs-always'
// A pilha da `layers` como o painel Camadas do Pinta e a meta de cada degrau de pista (full review de
// experiência do conjunto, 16/09/2026).
export * from './pilha'
export * from './pistas'
export * from './prediction-preview'
export * from './presets'
export * from './questions'
export * from './readout'
export * from './session'
export * from './start'
export * from './state'
// A voz do Zappy: o dicionário `texto falado → MP3` e a regra do tudo-ou-nada da fala.
export * from './voz'

export interface ExperimentationActivity {
  type: 'experimentation'
  scene: SceneId
  /** Só `gravity` e `impulse`: a altura de partida do salto. */
  initialImpulse?: number
  instructionAudioUrl?: string
  /**
   * A voz do Zappy: `texto falado → MP3`, gerado na autoria. Ver `voz.ts`.
   *
   * ⚠️ O `instructionAudioUrl` acima continua valendo e GANHA dele na instrução: ele é a
   * narração escolhida à mão para esta cena, e escolha de quem autora nunca perde para o lote.
   */
  vozes?: SceneVozes
  /** Ajustes de pronúncia do Zappy, presos ao texto visível de cada fala. */
  zappySpeech?: SceneSpeechOverrides
  /** Quem está no palco. Sem elenco, é o do Corre Dino. Ver `cast.ts`. */
  cast?: SceneCast
  /** De onde a cena parte e o que ela cobra. Ver `SceneSetup`. */
  setup?: SceneSetup
  /**
   * Só `layers`: como a pilha se apresenta (`pilha.ts`). ⚠️ É APRESENTAÇÃO: ações e metas não mudam.
   * `camadas` fala com os botões do Pinta ("Uma camada para a frente/para trás") e lista a da frente
   * em cima (full review de experiência, A1).
   */
  /**
   * O JOGO que esta cena retrata: `corre-dino`, `nave`, `gorilas` ou `meu-jeito` (`cenario.ts`).
   *
   * ⚠️ OPCIONAL de propósito: sem ele o cenário é DERIVADO das figuras do elenco, que é o que
   * mantém de pé os manifestos já publicados, sem reimportação. Declarar só é preciso quando a
   * derivação não acerta — um curso cujo elenco não diz o jogo, ou uma cena abstrata que ainda
   * assim deve mostrar a paisagem do curso.
   */
  cenario?: SceneCenarioId
  pilha?: ScenePilha
}
export type SceneActivity = ExperimentationActivity

/**
 * O cenário declarado é legal: ausente, ou um dos quatro.
 *
 * ⚠️ Um id desconhecido é RECUSADO em vez de cair no padrão: o campo vem do manifesto, e um
 * cenário silenciosamente trocado desenharia o jogo errado numa aula inteira sem ninguém saber.
 */
const cenarioValido = (value: Record<string, unknown>) =>
  value.cenario === undefined || isSceneCenario(value.cenario)

/** A pilha declarada é legal: um dos valores, e só na cena que tem pilha. */
const pilhaValida = (value: Record<string, unknown>) =>
  value.pilha === undefined ||
  (SCENE_PILHAS.some((p) => p === value.pilha) && scenePilhaAceita(value.scene as SceneId))

const isScene = (v: unknown): v is SceneId => SCENE_IDS.some((s) => s === v)
const validAudio = isSceneAudioUrl

export function isExperimentationActivity(value: unknown): value is ExperimentationActivity {
  if (!isRecord(value) || value.type !== 'experimentation' || !isScene(value.scene)) return false
  if (!validAudio(value.instructionAudioUrl)) return false
  if (!isSceneVozes(value.vozes)) return false
  if (!isSceneSpeechOverrides(value.zappySpeech)) return false
  if (!pilhaValida(value)) return false
  if (!cenarioValido(value)) return false
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
export function isSceneSetup(value: unknown, scene: SceneId): value is SceneSetup {
  if (!isRecord(value)) return false
  const { actions, goals: alvo, preset, goalCopy } = value
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
  if (
    preset !== undefined &&
    !(
      (scene === 'once-vs-always' && isOnceVsAlwaysPreset(preset)) ||
      (scene === 'random' && isRandomPreset(preset)) ||
      (scene === 'spawn' && isSpawnPreset(preset)) ||
      (scene === 'cleanup' && isCleanupPreset(preset)) ||
      (scene === 'game-state' && isGameStatePreset(preset))
    )
  )
    return false
  if (goalCopy !== undefined) {
    if (!isRecord(goalCopy) || Object.keys(goalCopy).length === 0) return false
    const known = sceneGoalIds(scene)
    for (const [id, copy] of Object.entries(goalCopy)) {
      if (!known.includes(id) || !isRecord(copy)) return false
      const label = copy.label
      const pedido = copy.pedido
      if (label === undefined && pedido === undefined) return false
      if (label !== undefined && (typeof label !== 'string' || !label.trim() || label.length > 120))
        return false
      if (
        pedido !== undefined &&
        (typeof pedido !== 'string' || !pedido.trim() || pedido.length > 240)
      )
        return false
    }
  }
  if (alvo === undefined)
    return actions !== undefined || preset !== undefined || goalCopy !== undefined
  const disponiveis = sceneGoalIds(scene)
  const possiveis =
    scene === 'once-vs-always'
      ? ONCE_GOALS_BY_PRESET[oncePreset(preset as SceneSetup['preset']).id]
      : scene === 'random' && preset !== undefined
        ? RANDOM_GOALS_BY_PRESET[randomPreset(preset as SceneSetup['preset']).id]
        : scene === 'spawn' && preset !== undefined
          ? SPAWN_GOALS_BY_PRESET[spawnPreset(preset as SceneSetup['preset']).id]
          : disponiveis
  return (
    Array.isArray(alvo) &&
    alvo.length > 0 &&
    alvo.length <= SETUP_LIMITS.goals &&
    new Set(alvo).size === alvo.length &&
    alvo.every((g) => typeof g === 'string' && disponiveis.includes(g) && possiveis.includes(g))
  )
}

export function isSceneActivity(value: unknown): value is SceneActivity {
  return isExperimentationActivity(value)
}

/**
 * As metas que ESTA atividade cobra: as do caso, quando há; as da missão de fábrica, quando não.
 *
 * ⚠️ A missão de fábrica deixa de fora as metas `soNoCaso` (ver `SceneGoal`): elas existem para um
 * caso específico do professor, e somá-las à missão sem caso a tornava maior que a instrução.
 */
export function sceneTargets(activity: SceneActivity): readonly string[] {
  // ⚠️⚠️ Pela `sceneSetupGoals`: um id que a cena não tem não esvazia a missão (vazia, ela reprovaria
  // para sempre). Player e members leem daqui.
  const alvo = sceneSetupGoals(activity.scene, activity.setup?.goals)
  if (alvo.length) return alvo
  if (activity.scene === 'once-vs-always')
    return ONCE_GOALS_BY_PRESET[oncePreset(activity.setup?.preset).id]
  if (activity.scene === 'random' && isRandomPreset(activity.setup?.preset))
    return RANDOM_GOALS_BY_PRESET[activity.setup.preset.id]
  if (activity.scene === 'spawn' && isSpawnPreset(activity.setup?.preset))
    return SPAWN_GOALS_BY_PRESET[activity.setup.preset.id]
  return sceneDefaultGoalIds(activity.scene)
}

/**
 * As metas do caso que ESTA cena conhece, na ordem do professor: o id que a cena não tem fica fora.
 * ⚠️ É LEITURA, contra dado que pode estar adulterado ou meio salvo: quem publica continua passando
 * pelo `isSceneSetup`, estrito, e o editor do admin NOMEIA a meta que não existe.
 */
export function sceneSetupGoals(scene: SceneId, goals: unknown): string[] {
  if (!Array.isArray(goals)) return []
  const conhecidas = sceneGoalIds(scene)
  const alvo: string[] = []
  for (const meta of goals)
    if (typeof meta === 'string' && conhecidas.includes(meta) && !alvo.includes(meta))
      alvo.push(meta)
  return alvo.slice(0, SETUP_LIMITS.goals)
}

/** O aviso do ADMIN: cada meta que o caso cita e a cena não tem. Vazio quando o caso está inteiro. */
export function sceneUnknownSetupGoals(scene: SceneId, goals: unknown): string[] {
  if (!Array.isArray(goals)) return []
  const conhecidas = sceneGoalIds(scene)
  return goals.filter(
    (meta): meta is string => typeof meta === 'string' && !conhecidas.includes(meta),
  )
}

/**
 * ⚠️⚠️ A atividade de cena como o PLAYER a lê (full review final de dados e deploy, MÉDIO-3).
 *
 * Roda sobre o conteúdo CRU (a projeção do members e o guarda do navegador) e devolve a mesma
 * atividade com a meta desconhecida tratada: no `setup.goals`, pela `sceneSetupGoals` (sem nenhuma
 * que valha, a lista sai e a missão volta a ser a do modelo, como no `sceneTargets`; o caso vazio sai
 * junto); no `waitFor` de um passo do roteiro, a espera sai (ela é a promessa conferida pela autoria,
 * e o player toca a etapa inteira do mesmo jeito). O que NÃO é meta desconhecida continua passando
 * pelo validador inteiro: uma ação que deixou de ser legal, ou um roteiro que não toca mais, seguem
 * recusados na leitura e aparecem na varredura do banco.
 */
export function sceneActivityForReading(value: unknown): unknown {
  if (!isRecord(value) || !isScene(value.scene)) return value
  const scene = value.scene
  let atividade: Record<string, unknown> = value
  const setup = value.setup
  if (value.type === 'experimentation' && isRecord(setup) && setup.goals !== undefined) {
    const goals = sceneSetupGoals(scene, setup.goals)
    const { goals: _metas, ...semMetas } = setup
    const caso = goals.length ? { ...semMetas, goals } : semMetas
    const { setup: _caso, ...semCaso } = value
    atividade = Object.keys(caso).length ? { ...value, setup: caso } : semCaso
  }
  /**
   * ⚠⚠ Dicionário de voz inválido SAI, em vez de derrubar a cena.
   *
   * É a mesma arapuca do `revealOn`: o `isPublicInteractiveBlock` roda no NAVEGADOR, contra o core
   * que ESTE app tem. Com o members um deploy à frente (a ordem de deploy manda members primeiro),
   * um teto novo em `VOZ_LIMITS` faria o kids antigo recusar a atividade inteira — "esta atividade
   * precisa de uma configuração válida" no lugar da cena, por causa do ÁUDIO. Sem o dicionário a
   * cena abre igual e o "Ouvir" cai na voz do navegador, que é o pior aceitável.
   */
  if (atividade.vozes !== undefined && !isSceneVozes(atividade.vozes)) {
    const { vozes: _voz, ...semVozes } = atividade
    atividade = semVozes
  }
  /** Um ajuste de fala torto não pode derrubar a cena no player. */
  if (atividade.zappySpeech !== undefined && !isSceneSpeechOverrides(atividade.zappySpeech)) {
    const { zappySpeech: _roteiro, ...semRoteiro } = atividade
    atividade = semRoteiro
  }
  return atividade
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
  if (!activity.cast)
    return activity.pilha === 'camadas'
      ? { ...m, hints: sceneHintsFor(activity) as unknown as SceneModel['hints'] }
      : m
  const c = activity.cast
  return {
    ...m,
    title: castText(m.title, c),
    instruction: castText(m.instruction, c),
    manipulates: castText(m.manipulates, c),
    success: castText(m.success, c),
    extra: castText(m.extra, c),
    goals: m.goals.map((g) => ({ ...g, label: castText(g.label, c) })),
    hints: sceneHintsFor(activity).map((h) => castText(h, c)) as unknown as SceneModel['hints'],
  }
}

/**
 * A escada de pistas do MODELO para esta atividade, sem o elenco: a de sempre, ou a do painel Camadas
 * quando a `layers` se apresenta assim (full review de experiência, A1). ⚠️ `learningHints` (a escada
 * que o player mostra quando o professor não escreveu pistas) lê daqui.
 */
export function sceneHintsFor(activity: SceneActivity): readonly string[] {
  if (activity.scene === 'layers' && activity.pilha === 'camadas') return LAYERS_CAMADAS.hints
  return sceneModel(activity.scene).hints
}
