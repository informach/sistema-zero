import {
  isRecord,
  isSceneAction,
  type SceneAction,
  type SceneId,
  sceneFrameRate,
  sceneLongFrame,
} from './actions'

import { openScene, stepScene } from './engine'
import {
  cloneScene,
  hydrateSceneState,
  isSceneState,
  type MatchScreen,
  type SceneStart,
  type SceneState,
} from './state'

/**
 * A sessão: o estado da cena mais o que só existe enquanto a criança está nela.
 *
 * A criança conduz a experiência; o checkpoint guarda apenas o mundo que ela manipulou.
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

/**
 * O caminho de volta: o retrato vira um estado de cena de novo, para ser DESENHADO.
 *
 * ⚠️ O retrato é achatado de propósito (ele viaja até o servidor, e guardar o estado inteiro
 * duas vezes por sessão custa caro). Quem o desenha precisa recompor os grupos — espalhar o
 * retrato por cima de um estado inicial só empilha chaves órfãs no topo e a comparação mostra
 * a cena INICIAL: a criança guarda um salto de impulso 14 e vê o de 9, lado a lado com o de
 * agora. O `tsc` não pega (o objeto passa por variável, sem checagem de excesso), então a
 * recomposição mora aqui, num lugar só, com teste.
 */
export function sceneFromTrial(start: SceneStart, trial: SceneTrial): SceneState {
  const base = openScene(start)
  const t = trial.state
  return {
    ...base,
    flight: {
      ...base.flight,
      force: t.force,
      gravity: t.gravity,
      peak: t.peak,
      y: t.y,
      atForce: t.force,
      atGravity: t.gravity,
    },
    contact: { distance: t.distance, width: t.width },
    sound: { ...base.sound, onJump: t.soundOnJump, count: t.soundCount, jumps: t.jumpCount },
    match: { ...base.match, screen: t.screen, points: t.points },
    crowd: { ...base.crowd, born: t.born, removed: t.removed },
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
  type: 'discovery' | 'jump' | 'sound' | 'landed'
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

export const SESSION_LIMITS = {
  past: 4,
  trials: 2,
  population: 500,
  segment: 100,
  /**
   * ⚠️⚠️ O tempo que UM comando da criança pode pedir: 1 s e 30 quadros da cena (review do lote 4).
   * Com o relógio de quadro fixo o custo de um `advance` no servidor cresce com os QUADROS: um
   * segmento de 100 comandos de 30 s (o teto do `SCENE_LIMITS`, que é o do professor) custava ~0,25 s
   * de CPU do members por requisição na `spawn`. O player nunca manda mais que ~0,3 s por fatia do ▶
   * nem mais que 1 s no passo (o de produção, 0,2 s), então o teto não recusa ninguém de verdade, e
   * um segmento passa a rodar no máximo 3.000 quadros. O caso e o roteiro do professor não passam
   * por aqui e seguem com a régua da cena.
   */
  advanceSeconds: 1,
  advanceFrames: 30,
} as const

export function initialExperiment(start: SceneStart): ExperimentSession {
  return { state: openScene(start), past: [], trials: [] }
}

export function isExperimentCommand(value: unknown, start: SceneStart): value is ExperimentCommand {
  if (!isRecord(value)) return false
  if (value.type === 'capture' || value.type === 'undo') return Object.keys(value).length === 1
  if (!isSceneAction(value, start.scene)) return false
  if (value.type !== 'advance') return true
  const quadros = value.seconds * (sceneFrameRate(start.scene) ?? 0)
  return (
    value.seconds <= SESSION_LIMITS.advanceSeconds && quadros <= SESSION_LIMITS.advanceFrames + 1e-6
  )
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
      // ⚠️⚠️ Desfazer também é GESTO, e nas cenas de quadro longo ele recomeça o quadro como os
      // outros (`stepScene`). O retrato guarda a sobra de ANTES do gesto desfeito: voltar com ela
      // fechava o quadro logo depois, e "no início o placar ficou parado" contava o segundo em que a
      // partida estava rodando.
      if (sceneLongFrame(start.scene)) next.state.clock = { carry: 0 }
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

  return { session: next, events: sceneEvents(before, next.state, command.type) }
}

function withoutEvidence(state: SceneState): SceneState {
  const copia = cloneScene(state)
  copia.evidence = { actions: state.evidence.actions, discoveries: [], observations: [], hints: 0 }
  return copia
}

/**
 * A cena FAZ som? É a pergunta que decide se o player oferece "Ligar som".
 *
 * ⚠️⚠️ O botão aparecia em todas as cenas, mas o único gerador de evento `sound` é o salto da
 * `jump-sound`: nas demais ele era um botão
 * mudo, que ensina a criança que o som está quebrado. A régua é a de LEGALIDADE (a porta `sound`
 * existe nesta cena), como o relógio já faz com `advance`, e não uma lista escrita no player.
 * `session.test.ts` confere contra o MOTOR: cena que diz não nunca emite som, e a que diz sim emite.
 */
export function sceneEmitsSound(scene: SceneId): boolean {
  return isSceneAction({ type: 'connect', port: 'sound', enabled: true }, scene)
}

/**
 * O que aconteceu no mundo entre dois estados. O player usa isto para o som e a animação.
 *
 * Só um gesto da criança ou o relógio da própria experimentação produz estes eventos.
 */
function sceneEvents(before: SceneState, after: SceneState, command: string): SceneEvent[] {
  const events: SceneEvent[] = []
  if (after.sound.jumps > before.sound.jumps)
    events.push({ type: 'jump', id: String(after.sound.jumps) })
  if (after.sound.count > before.sound.count)
    events.push({ type: 'sound', id: String(after.sound.count) })
  if (before.flight.time !== null && after.flight.time === null && command !== 'reset')
    events.push({ type: 'landed', id: String(after.sound.jumps) })
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

/**
 * ⚠️ A cena vai GRAVADA no que se guarda, e a leitura exige que ela confira.
 *
 * O estado de todas as cenas tem a mesma forma, então um retrato do `spawn` passa como
 * retrato do `world` sem nada acusar — e as cenas compartilham ids de descoberta. O professor
 * que troca a cena de um bloco já publicado faria o registro antigo ser relido como se fosse
 * desta cena: a criança apareceria com uma descoberta que nunca fez, ou com uma montagem que
 * nunca montou. A revisão do bloco esconde esse registro do PLAYER, mas não do relatório.
 */
export function packExperiment(scene: SceneId, session: ExperimentSession): string[] {
  return chunks(
    JSON.stringify({
      scene,
      state: pack(session.state),
      past: session.past.map(pack),
      trials: session.trials,
    }),
  )
}
function hydrateSceneStateForScene(scene: SceneId, value: unknown): unknown {
  const state = hydrateSceneState(value)
  // Retratos publicados antes do preset guardavam 1 s no campo do intervalo, embora o motor
  // criasse cactos a cada 0,6 s. Ao passar a usar o campo, a sessão antiga precisa desse ajuste.
  if (
    scene === 'game-state' &&
    isRecord(state) &&
    isRecord(state.crowd) &&
    state.crowd.interval === 1
  )
    return { ...state, crowd: { ...state.crowd, interval: 0.6 } }
  return state
}

export function readExperimentSession(scene: SceneId, parts: unknown): ExperimentSession | null {
  const raw = parseChunks(parts)
  // ⚠️ Hidrata ANTES de validar: retrato gravado antes de a cena ganhar um grupo novo de
  // estado continua válido, e recusá-lo apagaria o trabalho da criança (ver `hydrateSceneState`).
  if (!isRecord(raw) || raw.scene !== scene) return null
  const state = hydrateSceneStateForScene(scene, raw.state)
  if (!isSceneState(state)) return null
  if (!Array.isArray(raw.past) || raw.past.length > SESSION_LIMITS.past) return null
  const past = raw.past.map((snapshot: unknown) => hydrateSceneStateForScene(scene, snapshot))
  if (!past.every(isSceneState)) return null
  if (!Array.isArray(raw.trials) || raw.trials.length > SESSION_LIMITS.trials) return null
  if (!raw.trials.every(isSceneTrial)) return null
  return { state, past, trials: raw.trials }
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

/** Comando da experiência enviado pelo player e conferido no servidor. */
export type SceneCommand = ExperimentCommand

/** O estado da experiência guardado no checkpoint. */
export type SceneSession = ExperimentSession
