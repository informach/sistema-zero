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
import {
  type SceneModel,
  type SceneStep,
  sceneDefaultGoalIds,
  sceneGoalIds,
  sceneModel,
} from './catalog'
import { openScene, stepScene } from './engine'
import { LAYERS_CAMADAS, SCENE_PILHAS, type ScenePilha, scenePilhaAceita } from './pilha'
import type { SceneStart } from './state'
import { isSceneVozes, type SceneVozes } from './voz'

export * from './actions'
// O ateliê do lote 5 do Raio-X: as réguas do fogo, do espelho, da lupa e da folha.
export * from './atelie'
export * from './audio-url'
export * from './cast'
export * from './catalog'
export * from './engine'
export * from './evaluate'
// O núcleo do Iniciante 2D do lote 5 do Raio-X: as réguas da tecla, do laço, da ficha, da câmera,
// do encosto, da recarga, da mira, da diagonal e do mapa escrito.
export * from './nucleo'
// A pilha da `layers` como o painel Camadas do Pinta e a meta de cada degrau de pista (full review de
// experiência do conjunto, 16/09/2026).
export * from './pilha'
export * from './pistas'
export * from './prediction-preview'
export * from './questions'
export * from './readout'
export * from './session'
export * from './start'
export * from './state'
// A voz do Zappy: o dicionário `texto falado → MP3` e a regra do tudo-ou-nada da fala.
export * from './voz'

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
  /**
   * A voz do Zappy: `texto falado → MP3`, gerado na autoria. Ver `voz.ts`.
   *
   * ⚠️ O `instructionAudioUrl` acima continua valendo e GANHA dele na instrução: ele é a
   * narração escolhida à mão para esta cena, e escolha de quem autora nunca perde para o lote.
   */
  vozes?: SceneVozes
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
  /** Só `layers`: a pilha como a lista de blocos do Estúdio (padrão) ou o painel Camadas do Pinta. */
  pilha?: ScenePilha
}
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
  /** Quem está no palco. Sem elenco, é o do Corre Dino. Ver `cast.ts`. */
  cast?: SceneCast
  /** De onde a cena parte e o que ela cobra. Ver `SceneSetup`. */
  setup?: SceneSetup
  /**
   * Só `layers`: como a pilha se apresenta (`pilha.ts`). ⚠️ É APRESENTAÇÃO: ações e metas não mudam.
   * `camadas` fala com os botões do Pinta ("Uma camada para a frente/para trás") e lista a da frente
   * em cima (full review de experiência, A1).
   */
  pilha?: ScenePilha
}
export type SceneActivity = DemonstrationActivity | ExperimentationActivity

/** A pilha declarada é legal: um dos valores, e só na cena que tem pilha. */
const pilhaValida = (value: Record<string, unknown>) =>
  value.pilha === undefined ||
  (SCENE_PILHAS.some((p) => p === value.pilha) && scenePilhaAceita(value.scene as SceneId))

const isScene = (v: unknown): v is SceneId => SCENE_IDS.some((s) => s === v)
const validAudio = isSceneAudioUrl

export function isDemonstrationActivity(value: unknown): value is DemonstrationActivity {
  if (!isRecord(value) || value.type !== 'demonstration' || !isScene(value.scene)) return false
  if (!validAudio(value.instructionAudioUrl)) return false
  if (!isSceneVozes(value.vozes)) return false
  if (!pilhaValida(value)) return false
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
  if (!isSceneVozes(value.vozes)) return false
  if (!pilhaValida(value)) return false
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

/**
 * As metas que ESTA atividade cobra: as do caso, quando há; as da missão de fábrica, quando não.
 *
 * ⚠️ A missão de fábrica deixa de fora as metas `soNoCaso` (ver `SceneGoal`): elas existem para um
 * caso específico do professor, e somá-las à missão sem caso a tornava maior que a instrução.
 */
export function sceneTargets(activity: SceneActivity): readonly string[] {
  // ⚠️⚠️ Pela `sceneSetupGoals`: um id que a cena não tem não esvazia a missão (vazia, ela reprovaria
  // para sempre). Player e members leem daqui.
  const alvo =
    activity.type === 'experimentation'
      ? sceneSetupGoals(activity.scene, activity.setup?.goals)
      : []
  return alvo.length ? alvo : sceneDefaultGoalIds(activity.scene)
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
  if (value.type === 'demonstration' && Array.isArray(value.script)) {
    const conhecidas = sceneGoalIds(scene)
    const desconhecida = (passo: unknown) =>
      isRecord(passo) && typeof passo.waitFor === 'string' && !conhecidas.includes(passo.waitFor)
    if (value.script.some(desconhecida))
      atividade = {
        ...atividade,
        script: value.script.map((passo) => {
          if (!desconhecida(passo)) return passo
          const { waitFor: _espera, ...semEspera } = passo as Record<string, unknown>
          return semEspera
        }),
      }
  }
  return atividade
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
    script: sceneScript(activity),
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
