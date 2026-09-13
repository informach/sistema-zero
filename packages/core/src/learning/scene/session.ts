import { isRecord, isSceneAction, type SceneAction } from './actions'

/** Os mesmos tetos do validador de roteiro — um checkpoint não pode apontar para um passo
 *  que nenhum roteiro válido teria. */
const SCRIPT_STEPS = 12
const SCRIPT_ACTIONS = 16

import { type SceneStep, sceneModel } from './catalog'
import { stepScene } from './engine'
import {
  cloneScene,
  initialScene,
  isSceneState,
  type MatchScreen,
  type SceneStart,
  type SceneState,
} from './state'

/**
 * A sessão: o estado da cena mais o que só existe enquanto a criança está nela.
 *
 * ⚠️ São DUAS sessões, uma por tipo. Antes era uma só, com um campo `demo` que ficava `null`
 * na experimentação — e o `stepExperience` virava uma sucessão de `if (!next.demo)`. Pior:
 * a sessão carregava um `demo.learner` que nunca era atualizado mas tinha PRECEDÊNCIA na
 * avaliação, e um `demo.past` que nunca recebia nada. Separando, cada sessão tem só os seus
 * campos e nenhum caminho morto sobra.
 */

/** Um retrato para comparar lado a lado. A criança guarda no máximo dois. */
export interface SceneTrial {
  label: string
  state: {
    force: number
    gravity: boolean
    peak: number
    distance: number
    width: number
    y: number
    soundCount: number
    jumpCount: number
    soundOnJump: boolean
    screen: MatchScreen
    points: number
    born: number
    removed: number
  }
}

export function sceneTrial(state: SceneState, label: string): SceneTrial {
  // Depois de um salto, o que interessa comparar são as condições DAQUELE voo, não as que
  // estão nos controles agora.
  const saltou = state.sound.jumps > 0
  return {
    label,
    state: {
      force: saltou ? state.flight.atForce : state.flight.force,
      gravity: saltou ? state.flight.atGravity : state.flight.gravity,
      peak: state.flight.peak,
      distance: state.contact.distance,
      width: state.contact.width,
      y: state.flight.y,
      soundCount: state.sound.count,
      jumpCount: state.sound.jumps,
      soundOnJump: state.sound.onJump,
      screen: state.match.screen,
      points: state.match.points,
      born: state.crowd.born,
      removed: state.crowd.removed,
    },
  }
}

export interface SceneEvent {
  type: 'discovery' | 'jump' | 'sound' | 'landed' | 'viewed'
  id: string
}

// ── Experimentação ────────────────────────────────────────────────────────────────

export interface ExperimentSession {
  state: SceneState
  /** Pilha de desfazer, limitada. O estado atual e as descobertas nunca entram nela. */
  past: SceneState[]
  trials: SceneTrial[]
}
export type ExperimentCommand = SceneAction | { type: 'capture' } | { type: 'undo' }

export const SESSION_LIMITS = { past: 4, trials: 2, population: 500, segment: 100 } as const

export function initialExperiment(start: SceneStart): ExperimentSession {
  return { state: initialScene(start), past: [], trials: [] }
}

export function isExperimentCommand(value: unknown, start: SceneStart): value is ExperimentCommand {
  if (!isRecord(value)) return false
  if (value.type === 'capture' || value.type === 'undo') return Object.keys(value).length === 1
  return isSceneAction(value, start.scene)
}

export function stepExperiment(
  start: SceneStart,
  previous: ExperimentSession,
  command: ExperimentCommand,
): { session: ExperimentSession; events: SceneEvent[] } {
  if (!isExperimentCommand(command, start)) throw new Error('Comando de experimentação inválido.')
  const before = previous.state
  const next: ExperimentSession = {
    state: before,
    past: [...previous.past],
    trials: [...previous.trials],
  }

  if (command.type === 'capture') {
    next.trials = [
      ...next.trials,
      sceneTrial(before, `Experiência ${before.evidence.actions + 1}`),
    ].slice(-SESSION_LIMITS.trials)
    next.state = cloneScene(before)
    next.state.evidence.actions = before.evidence.actions + 1
  } else if (command.type === 'undo') {
    const anterior = next.past.pop()
    if (anterior) {
      next.state = cloneScene(anterior)
      // Desfazer volta o MUNDO, nunca o que a criança já aprendeu.
      next.state.evidence = { ...before.evidence, actions: before.evidence.actions + 1 }
    }
  } else {
    // Deixar o tempo correr e pedir dica não são passos de desfazer: a criança espera que
    // "voltar" desfaça o que ELA montou.
    if (command.type !== 'advance' && command.type !== 'hint')
      next.past = [...next.past, withoutEvidence(before)].slice(-SESSION_LIMITS.past)
    next.state = stepScene(start, before, command)
    if (command.type === 'advance') next.state.evidence.actions = before.evidence.actions
  }

  // Memória de desfazer limitada pela POPULAÇÃO, não pela duração: uma sessão longa numa
  // cena calma não deve custar mais que uma curta numa cena cheia.
  const populacao = () =>
    next.state.crowd.cacti.length + next.past.reduce((n, s) => n + s.crowd.cacti.length, 0)
  while (next.past.length && populacao() > SESSION_LIMITS.population) next.past.shift()

  return { session: next, events: sceneEvents(before, next.state, command.type, true) }
}

function withoutEvidence(state: SceneState): SceneState {
  const copia = cloneScene(state)
  copia.evidence = { actions: state.evidence.actions, discoveries: [], observations: [], hints: 0 }
  return copia
}

// ── Demonstração ──────────────────────────────────────────────────────────────────

export interface DemonstrationSession {
  state: SceneState
  /** Em que passo do roteiro a demonstração está. */
  step: number
  /** Qual ação DENTRO do passo está sendo tocada. */
  action: number
  elapsed: number
  /** O passo terminou e espera a criança pedir o próximo. */
  ready: boolean
  viewed: boolean
  before?: SceneTrial
}
export type DemonstrationCommand =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'tick'; seconds: number }

/** Respiro entre duas ações do roteiro, para a criança ver uma coisa de cada vez. */
const BREATH = 0.45
const MAX_TICK = 1

export function initialDemonstration(start: SceneStart): DemonstrationSession {
  return { state: initialScene(start), step: 0, action: 0, elapsed: 0, ready: false, viewed: false }
}

export function isDemonstrationCommand(value: unknown): value is DemonstrationCommand {
  if (!isRecord(value)) return false
  if (value.type === 'start' || value.type === 'next') return Object.keys(value).length === 1
  return (
    value.type === 'tick' &&
    typeof value.seconds === 'number' &&
    Number.isFinite(value.seconds) &&
    value.seconds >= 0.001 &&
    value.seconds <= MAX_TICK
  )
}

export function stepDemonstration(
  start: SceneStart,
  script: readonly SceneStep[],
  previous: DemonstrationSession,
  command: DemonstrationCommand,
): { session: DemonstrationSession; events: SceneEvent[] } {
  if (!isDemonstrationCommand(command)) throw new Error('Comando de demonstração inválido.')
  const before = previous.state
  const next: DemonstrationSession = { ...previous }

  if (command.type === 'start') {
    const inicio = initialScene(start)
    return {
      session: {
        state: inicio,
        step: 0,
        action: 0,
        elapsed: 0,
        ready: false,
        viewed: false,
        before: sceneTrial(inicio, 'Antes desta etapa'),
      },
      events: [],
    }
  }

  if (command.type === 'next') {
    if (next.ready && next.step < script.length - 1) {
      next.step += 1
      next.action = 0
      next.elapsed = 0
      next.ready = false
      next.before = sceneTrial(next.state, 'Antes desta etapa')
    }
    return { session: next, events: [] }
  }

  if (next.ready) return { session: next, events: [] }
  const passo = script[next.step]
  if (!passo) throw new Error('Etapa de demonstração inválida.')
  const acao = passo.actions[next.action]
  if (!acao) throw new Error('Ação de demonstração inválida.')

  next.elapsed += command.seconds
  if (acao.type === 'advance') {
    // O tempo do roteiro é consumido em fatias do tamanho do quadro, para a criança ver o
    // movimento acontecer em vez de receber o resultado pronto.
    const fatia = Math.min(command.seconds, acao.seconds - (next.elapsed - command.seconds))
    if (fatia >= 0.001)
      next.state = stepScene(start, next.state, { type: 'advance', seconds: fatia })
    const acabou = next.elapsed + 1e-6 >= acao.seconds
    const alcancou =
      next.action === passo.actions.length - 1 &&
      passo.waitFor !== undefined &&
      next.state.evidence.discoveries.includes(passo.waitFor)
    if (acabou || alcancou) {
      next.action += 1
      next.elapsed = 0
    }
  } else if (next.elapsed >= BREATH) {
    next.state = stepScene(start, next.state, acao)
    next.action += 1
    next.elapsed = 0
  }

  if (next.action >= passo.actions.length) {
    next.ready = true
    if (next.step === script.length - 1) next.viewed = true
  }

  const events = sceneEvents(before, next.state, 'tick', false)
  if (next.viewed && !previous.viewed) events.push({ type: 'viewed', id: 'viewed' })
  return { session: next, events }
}

/**
 * O que aconteceu no mundo entre dois estados. O player usa isto para o som e a animação.
 *
 * ⚠️ Descoberta feita DURANTE uma demonstração não conta: quem conduziu foi o roteiro, e
 * creditar a criança por assistir tiraria o sentido da experimentação que vem depois.
 */
function sceneEvents(
  before: SceneState,
  after: SceneState,
  command: string,
  colheDescobertas: boolean,
): SceneEvent[] {
  const events: SceneEvent[] = []
  if (after.sound.jumps > before.sound.jumps)
    events.push({ type: 'jump', id: String(after.sound.jumps) })
  if (after.sound.count > before.sound.count)
    events.push({ type: 'sound', id: String(after.sound.count) })
  if (before.flight.time !== null && after.flight.time === null && command !== 'reset')
    events.push({ type: 'landed', id: String(after.sound.jumps) })
  if (colheDescobertas)
    for (const id of after.evidence.discoveries)
      if (!before.evidence.discoveries.includes(id)) events.push({ type: 'discovery', id })
  return events
}

// ── O que vai e volta do servidor ─────────────────────────────────────────────────

/** O que o cliente MANDA: um punhado de comandos a aplicar sobre a versão que ele conhece. */
export interface SceneSegment {
  sessionId: string
  segmentId: string
  baseSequence: number
  commands: unknown[]
}
/** O que o servidor GUARDA: a sessão inteira, com a versão que ela representa. */
export interface SceneCheckpoint<S> {
  sequence: number
  sessionId: string
  segmentId: string
  session: S
}

const ID = /^[a-zA-Z0-9_-]{1,80}$/
const CHUNK = 7000

function chunks(json: string): string[] {
  const out: string[] = []
  for (let i = 0; i < json.length; i += CHUNK) out.push(json.slice(i, i + CHUNK))
  return out
}

/** Cactos viram tuplas: um objeto por cacto multiplicava o tamanho do checkpoint por três. */
const pack = (s: SceneState) => ({
  ...s,
  crowd: { ...s.crowd, cacti: s.crowd.cacti.map((c) => [c.id, c.x, c.velocity]) },
})
const unpack = (key: string, value: unknown) =>
  key === 'cacti' &&
  Array.isArray(value) &&
  value.every((c) => Array.isArray(c) && c.length === 3 && c.every(Number.isFinite))
    ? value.map((c) => ({ id: c[0], x: c[1], velocity: c[2] }))
    : value

export function packExperiment(session: ExperimentSession): string[] {
  return chunks(
    JSON.stringify({
      state: pack(session.state),
      past: session.past.map(pack),
      trials: session.trials,
    }),
  )
}
export function packDemonstration(session: DemonstrationSession): string[] {
  return chunks(JSON.stringify({ ...session, state: pack(session.state) }))
}

export function readExperimentSession(parts: unknown): ExperimentSession | null {
  const raw = parseChunks(parts)
  if (!isRecord(raw) || !isSceneState(raw.state)) return null
  if (!Array.isArray(raw.past) || raw.past.length > SESSION_LIMITS.past) return null
  if (!raw.past.every(isSceneState)) return null
  if (!Array.isArray(raw.trials) || raw.trials.length > SESSION_LIMITS.trials) return null
  if (!raw.trials.every(isSceneTrial)) return null
  return { state: raw.state, past: raw.past, trials: raw.trials }
}

export function readDemonstrationSession(parts: unknown): DemonstrationSession | null {
  const raw = parseChunks(parts)
  if (!isRecord(raw) || !isSceneState(raw.state)) return null
  const { step, action, elapsed, ready, viewed, before } = raw
  if (!Number.isInteger(step) || (step as number) < 0 || (step as number) >= SCRIPT_STEPS)
    return null
  if (!Number.isInteger(action) || (action as number) < 0 || (action as number) > SCRIPT_ACTIONS)
    return null
  if (typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed < 0) return null
  if (typeof ready !== 'boolean' || typeof viewed !== 'boolean') return null
  if (before !== undefined && !isSceneTrial(before)) return null
  return {
    state: raw.state,
    step: step as number,
    action: action as number,
    elapsed,
    ready,
    viewed,
    ...(before === undefined ? {} : { before: before as SceneTrial }),
  }
}

function parseChunks(parts: unknown): unknown {
  if (!Array.isArray(parts) || !parts.every((p) => typeof p === 'string')) return null
  try {
    return JSON.parse(parts.join(''), unpack)
  } catch {
    return null
  }
}

function isSceneTrial(value: unknown): value is SceneTrial {
  if (!isRecord(value) || typeof value.label !== 'string' || value.label.length > 200) return false
  const s = value.state
  if (!isRecord(s)) return false
  const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  if (s.screen !== 'start' && s.screen !== 'playing' && s.screen !== 'end') return false
  if (typeof s.gravity !== 'boolean' || typeof s.soundOnJump !== 'boolean') return false
  return (
    n(s.force) &&
    n(s.peak) &&
    n(s.distance) &&
    n(s.width) &&
    n(s.y) &&
    n(s.soundCount) &&
    n(s.jumpCount) &&
    n(s.points) &&
    n(s.born) &&
    n(s.removed)
  )
}

/**
 * Lê o pacote que o CLIENTE mandou. Nunca aceita um checkpoint por aqui.
 *
 * ⚠️ O segmento chega ACHATADO nas respostas, com os comandos como strings JSON. Não é
 * estilo: `LearningAnswers` só admite valores rasos (string, número, booleano, lista de
 * strings ou objeto de números), então um segmento aninhado seria recusado na borda.
 */
export function readSceneSegment(answers: unknown): SceneSegment | null {
  if (!isRecord(answers)) return null
  const sessionId = answers.sceneSessionId
  const segmentId = answers.sceneSegmentId
  const baseSequence = answers.sceneBaseSequence
  const cru = answers.sceneCommands
  if (typeof sessionId !== 'string' || !ID.test(sessionId)) return null
  if (typeof segmentId !== 'string' || !ID.test(segmentId)) return null
  if (!Number.isSafeInteger(baseSequence) || (baseSequence as number) < 0) return null
  if (!Array.isArray(cru) || cru.length === 0 || cru.length > SESSION_LIMITS.segment) return null
  if (!cru.every((c) => typeof c === 'string' && c.length <= 8000)) return null
  const commands: unknown[] = []
  for (const texto of cru as string[]) {
    try {
      commands.push(JSON.parse(texto))
    } catch {
      return null
    }
  }
  return { sessionId, segmentId, baseSequence: baseSequence as number, commands }
}

/** O lado do cliente: monta as respostas achatadas de um segmento. */
export function sceneSegmentAnswers(segment: {
  sessionId: string
  segmentId: string
  baseSequence: number
  commands: unknown[]
}): Record<string, unknown> {
  return {
    sceneSessionId: segment.sessionId,
    sceneSegmentId: segment.segmentId,
    sceneBaseSequence: segment.baseSequence,
    sceneCommands: segment.commands.map((c) => JSON.stringify(c)),
  }
}

export class SceneConflictError extends Error {
  constructor() {
    super('EXPERIENCE_CONFLICT')
    this.name = 'SceneConflictError'
  }
}

/**
 * Aplica um segmento sobre o checkpoint guardado, com verificação otimista de versão.
 *
 * Se a base que o cliente diz conhecer não é a versão atual, alguém escreveu no meio — duas
 * abas abertas, ou um pedido que chegou fora de ordem. Recusar é o certo: aplicar por cima
 * perderia o que a outra ponta fez.
 */
export function applyExperimentSegment(
  start: SceneStart,
  checkpoint: SceneCheckpoint<ExperimentSession> | null,
  segment: SceneSegment,
): SceneCheckpoint<ExperimentSession> {
  if (segment.baseSequence !== (checkpoint?.sequence ?? 0)) throw new SceneConflictError()
  let session = checkpoint?.session ?? initialExperiment(start)
  for (const command of segment.commands) {
    if (!isExperimentCommand(command, start)) throw new Error('Comando de experimentação inválido.')
    session = stepExperiment(start, session, command).session
  }
  return {
    sequence: segment.baseSequence + segment.commands.length,
    sessionId: segment.sessionId,
    segmentId: segment.segmentId,
    session,
  }
}

export function applyDemonstrationSegment(
  start: SceneStart,
  checkpoint: SceneCheckpoint<DemonstrationSession> | null,
  segment: SceneSegment,
): SceneCheckpoint<DemonstrationSession> {
  if (segment.baseSequence !== (checkpoint?.sequence ?? 0)) throw new SceneConflictError()
  const script = sceneModel(start.scene).script
  let session = checkpoint?.session ?? initialDemonstration(start)
  for (const command of segment.commands) {
    if (!isDemonstrationCommand(command)) throw new Error('Comando de demonstração inválido.')
    session = stepDemonstration(start, script, session, command).session
  }
  return {
    sequence: segment.baseSequence + segment.commands.length,
    sessionId: segment.sessionId,
    segmentId: segment.segmentId,
    session,
  }
}
