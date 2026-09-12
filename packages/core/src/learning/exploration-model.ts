import type { ExplorationActivity, ExplorationMission } from './exploration'
import { isLearningAnswers, type LearningAnswers } from './index'

export type ExplorationPort =
  | 'draw'
  | 'gravity'
  | 'sound'
  | 'timer'
  | 'cleanup'
  | 'condition'
  | 'touch'
  | 'restart'
  | 'limit'
export type ExplorationAction =
  | { type: 'create' }
  | { type: 'connect'; port: ExplorationPort; enabled: boolean }
  | { type: 'layer'; front: boolean }
  | { type: 'jump'; input: 'key' | 'tap' }
  | { type: 'impulse'; force: number }
  | { type: 'advance'; seconds: number }
  | { type: 'move'; distance: number }
  | { type: 'resize'; width: number }
  | { type: 'start'; input: 'key' | 'tap' }
  | { type: 'collide' | 'home' | 'restart' | 'clock' | 'reset' | 'undo' }
  | { type: 'interval'; seconds: number }
  | { type: 'sample'; kind: 'position' | 'velocity'; unit: number; guided: boolean }
  | { type: 'hint'; level: number }

export interface ExplorationCactus {
  id: number
  x: number
  velocity: number
}
export interface ExplorationObservation {
  id: string
  label: string
  height: number
  force: number
  gravity: boolean
  front: boolean
  distance: number
  width: number
  collision: boolean
  points: number
  screen: 'start' | 'playing' | 'end'
  stored: number
  visible: number
  base: number
  x: number
  velocity: number
}
export interface ExplorationState {
  actions: number
  discoveries: string[]
  observations: ExplorationObservation[]
  hints: number
  created: boolean
  drawn: boolean
  front: boolean
  gravity: boolean
  force: number
  y: number
  flightTime: number | null
  flightForce: number
  flightGravity: boolean
  peak: number
  soundOnJump: boolean
  soundCount: number
  jumpCount: number
  timer: boolean
  interval: number
  cleanup: boolean
  guarded: boolean
  touch: boolean
  restartConnected: boolean
  limited: boolean
  screen: 'start' | 'playing' | 'end'
  elapsed: number
  clockRemainder: number
  scoreIdleSeconds: number
  spawnRemainder: number
  born: number
  removed: number
  cacti: ExplorationCactus[]
  points: number
  distance: number
  width: number
  base: number
  ticks: number
  sampleX: number
  sampleVelocity: number
  positionSamples: number[]
  velocitySamples: number[]
  caption: string
}
export function initialExploration(activity: ExplorationActivity): ExplorationState {
  return {
    actions: 0,
    discoveries: [],
    observations: [],
    hints: 0,
    created: activity.mission !== 'world',
    drawn: activity.mission !== 'world',
    front: false,
    gravity: activity.mission !== 'gravity',
    force: activity.initialImpulse ?? 9,
    y: 0,
    flightTime: null,
    flightForce: 9,
    flightGravity: true,
    peak: 0,
    soundOnJump: false,
    soundCount: 0,
    jumpCount: 0,
    timer: false,
    interval: 1,
    cleanup: false,
    guarded: false,
    touch: false,
    restartConnected: false,
    limited: false,
    screen: 'start',
    elapsed: 0,
    clockRemainder: 0,
    scoreIdleSeconds: 0,
    spawnRemainder: 0,
    born: 0,
    removed: 0,
    cacti: [],
    points: 0,
    distance: 140,
    width: 48,
    base: -5,
    ticks: 0,
    sampleX: 500,
    sampleVelocity: -5,
    positionSamples: [],
    velocitySamples: [],
    caption: '',
  }
}
export function explorationContact(state: Pick<ExplorationState, 'distance' | 'width'>) {
  return state.distance <= state.width / 2 + 18
}
function observe(state: ExplorationState, id: string, label: string, discovered = true) {
  if (discovered && !state.discoveries.includes(id)) state.discoveries.push(id)
  const snapshot: ExplorationObservation = {
    id,
    label,
    height: state.peak,
    force: state.flightForce,
    gravity: state.flightGravity,
    front: state.front,
    distance: state.distance,
    width: state.width,
    collision: explorationContact(state),
    points: state.points,
    screen: state.screen,
    stored: state.born - state.removed,
    visible: state.cacti.filter((c) => c.x >= 0 && c.x <= 480).length,
    base: state.base,
    x: state.sampleX,
    velocity: state.sampleVelocity,
  }
  if (!state.observations.some((o) => o.id === id)) state.observations.push(snapshot)
  state.caption = label
}

const PORTS: Record<ExplorationMission, readonly ExplorationPort[]> = {
  world: ['draw'],
  layers: [],
  gravity: ['gravity'],
  impulse: [],
  'jump-sound': ['sound'],
  spawn: ['timer'],
  cleanup: ['cleanup'],
  'game-state': ['condition'],
  controls: ['touch'],
  restart: ['restart'],
  hitbox: [],
  score: ['condition'],
  random: [],
  acceleration: ['limit'],
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function between(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
}
export function isExplorationAction(
  value: unknown,
  mission: ExplorationMission,
): value is ExplorationAction {
  if (!object(value)) return false
  switch (value.type) {
    case 'create':
      return mission === 'world'
    case 'connect':
      return PORTS[mission].some((p) => p === value.port) && typeof value.enabled === 'boolean'
    case 'layer':
      return mission === 'layers' && typeof value.front === 'boolean'
    case 'jump':
      return (
        ['gravity', 'impulse', 'jump-sound'].includes(mission) &&
        (value.input === 'key' || value.input === 'tap')
      )
    case 'impulse':
      return mission === 'impulse' && between(value.force, 5, 14)
    case 'advance':
      return (
        between(value.seconds, 0.001, 30) &&
        [
          'gravity',
          'impulse',
          'jump-sound',
          'spawn',
          'cleanup',
          'game-state',
          'score',
          'random',
          'acceleration',
          'restart',
        ].includes(mission)
      )
    case 'move':
      return (mission === 'hitbox' || mission === 'restart') && between(value.distance, 20, 260)
    case 'resize':
      return mission === 'hitbox' && between(value.width, 24, 120)
    case 'start':
      return (
        ['controls', 'restart', 'game-state', 'score'].includes(mission) &&
        (value.input === 'key' || value.input === 'tap')
      )
    case 'collide':
      return mission === 'restart' || mission === 'score'
    case 'home':
      return ['controls', 'restart', 'game-state', 'score'].includes(mission)
    case 'restart':
      return mission === 'restart'
    case 'clock':
      return mission === 'acceleration'
    case 'interval':
      return mission === 'spawn' && between(value.seconds, 0.5, 2)
    case 'sample':
      return (
        (mission === 'random' || mission === 'acceleration') &&
        (value.kind === 'position' || value.kind === 'velocity') &&
        between(value.unit, 0, 1) &&
        typeof value.guided === 'boolean'
      )
    case 'hint':
      return between(value.level, 1, 3) && Number.isInteger(value.level)
    case 'reset':
    case 'undo':
      return true
    default:
      return false
  }
}

/** Model time is seconds. Jump units follow a 30 Hz teaching model (g = 0.6 per tick),
 * with analytic position; animation duration is never stretched to fit a preset playback. */
function advanceFlight(state: ExplorationState, mission: ExplorationMission, seconds: number) {
  if (state.flightTime === null) return
  state.flightTime += seconds
  const t = state.flightTime * 30
  const g = state.flightGravity ? 0.6 : 0
  state.y = Math.max(0, state.flightForce * t - 0.5 * g * t * t)
  const peakTime = g > 0 ? Math.min(t, state.flightForce / g) : t
  state.peak = state.flightForce * peakTime - 0.5 * g * peakTime * peakTime
  if (mission === 'gravity' && !state.flightGravity && state.y >= 120)
    observe(state, 'floating', 'Sem aplicar gravidade, o Dino continua subindo.')
  if (g > 0 && t >= (2 * state.flightForce) / g) {
    state.y = 0
    state.flightTime = null
    if (mission === 'gravity') observe(state, 'landed', 'Com gravidade aplicada, voltou ao chão.')
    if (mission === 'impulse') {
      const first = state.observations.find((o) => o.id === 'first-height')
      if (!first) observe(state, 'first-height', 'Primeiro salto: guarde esta marca de altura.')
      else if (Math.abs(first.force - state.flightForce) >= 1)
        observe(state, 'other-height', 'Outro impulso, outra altura. A gravidade ficou igual.')
      else state.caption = 'Esse impulso alcançou a mesma altura. Mude a seta para comparar.'
    }
    if (mission === 'jump-sound')
      state.caption = 'De volta ao chão. Você pode saltar por outro controle.'
  }
}
function advancePopulation(state: ExplorationState, mission: ExplorationMission, seconds: number) {
  const active = mission !== 'game-state' || !state.guarded || state.screen === 'playing'
  const interval = mission === 'spawn' ? (state.timer ? state.interval : 1 / 30) : 0.6
  // Birth offsets preserve the distance between objects even when stepping two seconds at once.
  for (const c of state.cacti) c.x -= seconds * 100
  if (active) {
    const before = state.spawnRemainder
    const count = Math.floor((before + seconds + 1e-9) / interval)
    state.spawnRemainder = before + seconds - count * interval
    for (let i = 1; i <= count; i++) {
      state.born++
      state.cacti.push({
        id: state.born,
        x: 480 - (seconds - (i * interval - before)) * 100,
        velocity: -5,
      })
    }
  }
  if (state.cleanup) {
    const outside = state.born - state.removed - state.cacti.filter((c) => c.x >= 0).length
    state.removed += outside
    state.cacti = state.cacti.filter((c) => c.x >= 0)
    if (outside > 0 && mission === 'cleanup')
      observe(state, 'removed', 'A regra retirou automaticamente os cactos que saíram.')
  }
  if (mission === 'cleanup' && !state.cleanup && state.cacti.some((c) => c.x < 0))
    observe(state, 'invisible-stored', 'Saiu da tela, mas continua no grupo dos bastidores.')
  if (mission === 'spawn' && state.elapsed >= 0.1 && state.born > 1)
    observe(
      state,
      state.timer ? 'spaced' : 'every-frame',
      state.timer
        ? 'O intervalo abriu espaço entre os cactos.'
        : 'Em cada quadro nasce outro cacto.',
    )
  if (mission === 'game-state') {
    if (!state.guarded && state.screen === 'start' && state.born > 0)
      observe(state, 'outside', 'O relógio criou cactos antes da partida.')
    if (state.guarded && state.screen === 'start')
      observe(state, 'waiting', 'No início, o relógio espera.')
    if (state.guarded && state.screen === 'playing' && state.born > 0)
      observe(state, 'playing', 'Jogando, o relógio cria cactos.')
  }
  // Positions outside the scene remain represented by the stored count, not thousands of SVGs.
  state.cacti = state.cacti.filter((c) => c.x >= -480)
}

/** Pure transition. Only events valid for this mission can create its observations. */
export function transitionExploration(
  activity: ExplorationActivity,
  previous: ExplorationState,
  action: ExplorationAction,
): ExplorationState {
  if (!isExplorationAction(action, activity.mission)) return previous
  const s: ExplorationState = {
    ...previous,
    discoveries: [...previous.discoveries],
    observations: [...previous.observations],
    cacti: previous.cacti.map((c) => ({ ...c })),
    positionSamples: [...previous.positionSamples],
    velocitySamples: [...previous.velocitySamples],
    actions: previous.actions + 1,
  }
  const m = activity.mission
  switch (action.type) {
    case 'create':
      if (!s.created) {
        s.created = true
        observe(
          s,
          s.drawn ? 'visible' : 'hidden',
          s.drawn
            ? 'O Dino foi criado e aparece na tela.'
            : 'O Dino existe nos bastidores, sem desenho na tela.',
        )
      }
      break
    case 'connect':
      switch (action.port) {
        case 'draw':
          s.drawn = action.enabled
          if (s.created)
            observe(
              s,
              s.drawn ? 'visible' : 'hidden',
              s.drawn
                ? 'O mesmo Dino agora aparece na tela.'
                : 'O Dino continua existindo sem aparecer.',
            )
          break
        case 'gravity':
          s.gravity = action.enabled
          s.y = 0
          s.flightTime = null
          s.caption = 'Dino de volta à posição inicial. Repita o mesmo salto para comparar.'
          break
        case 'sound':
          s.soundOnJump = action.enabled
          s.caption = s.soundOnJump
            ? 'O fio do som escuta o acontecimento Pulou.'
            : 'O fio do som escuta a tecla Espaço.'
          break
        case 'timer':
          s.timer = action.enabled
          s.spawnRemainder = 0
          s.born = 0
          s.removed = 0
          s.cacti = []
          s.elapsed = 0
          s.caption = 'A pista recomeça vazia para comparar o mesmo tempo.'
          break
        case 'cleanup':
          s.cleanup = action.enabled
          break
        case 'condition':
          if (s.guarded !== action.enabled) s.scoreIdleSeconds = 0
          s.guarded = action.enabled
          break
        case 'touch':
          s.touch = action.enabled
          break
        case 'restart':
          s.restartConnected = action.enabled
          break
        case 'limit':
          s.limited = action.enabled
          if (s.limited) s.base = Math.max(-9, s.base)
          break
      }
      break
    case 'layer':
      observe(
        s,
        s.front ? 'front' : 'covered',
        s.front
          ? 'Dino desenhado por último: aparece na frente.'
          : 'Floresta desenhada por último: cobre o Dino.',
      )
      s.front = action.front
      observe(
        s,
        s.front ? 'front' : 'covered',
        s.front
          ? 'Dino desenhado por último: aparece na frente.'
          : 'Floresta desenhada por último: cobre o Dino.',
      )
      break
    case 'jump': {
      const jumped = s.flightTime === null
      const sounded = m === 'jump-sound' && (s.soundOnJump ? jumped : action.input === 'key')
      if (sounded) s.soundCount++
      if (jumped) {
        s.flightTime = 0
        s.flightForce = s.force
        s.flightGravity = s.gravity
        s.peak = 0
        s.jumpCount++
        s.caption = sounded ? 'Pulou! O som acompanhou.' : 'O impulso iniciou o salto.'
      } else
        s.caption = sounded
          ? 'Som! Mas não aconteceu outro salto.'
          : 'O Dino já está no ar. Não aconteceu outro salto.'
      if (m === 'jump-sound') {
        if (!jumped && sounded) observe(s, 'false-sound', 'A tecla fez som, mesmo sem outro salto.')
        if (!jumped && !sounded && s.soundOnJump)
          observe(s, 'quiet-air', 'Sem novo salto, o som esperou.')
        if (jumped && sounded && s.soundOnJump)
          observe(
            s,
            action.input === 'key' ? 'key-sound' : 'tap-sound',
            action.input === 'key' ? 'Salto por Espaço com som.' : 'Salto por toque com som.',
          )
      }
      break
    }
    case 'impulse':
      s.force = action.force
      s.caption = 'A seta mudou o impulso do próximo salto.'
      break
    case 'advance': {
      advanceFlight(s, m, action.seconds)
      s.elapsed += action.seconds
      if (['spawn', 'cleanup', 'game-state'].includes(m)) advancePopulation(s, m, action.seconds)
      if (m === 'score') {
        const enabled = !s.guarded || s.screen === 'playing'
        if (enabled) {
          s.clockRemainder += action.seconds
          const points = Math.floor(s.clockRemainder + 1e-9)
          s.points += points
          s.clockRemainder -= points
          if (s.guarded && s.screen === 'playing' && points > 0)
            observe(s, 'score-playing', 'Os pontos cresceram durante a partida.')
          else if (!s.guarded)
            s.caption = 'A soma está fora da condição: o placar cresce em qualquer tela.'
        } else {
          s.scoreIdleSeconds += action.seconds
          if (s.scoreIdleSeconds + 1e-9 >= 0.5)
            observe(
              s,
              s.screen === 'start' ? 'score-start' : 'score-end',
              s.screen === 'start'
                ? 'No início, o placar ficou parado.'
                : 'No fim, o valor da rodada ficou guardado.',
            )
        }
      }
      if (m === 'random' || m === 'acceleration')
        for (const c of s.cacti) c.x += c.velocity * action.seconds * 30
      break
    }
    case 'move':
      s.distance = action.distance
      if (m === 'hitbox')
        observe(
          s,
          explorationContact(s) ? 'contact' : 'separate',
          explorationContact(s) ? 'As áreas encostaram: batida!' : 'As áreas estão separadas.',
        )
      else if (s.screen === 'playing' && explorationContact(s)) {
        s.screen = 'end'
        observe(s, 'ended', 'O cacto encostou e a partida terminou.')
      }
      break
    case 'resize': {
      const before = explorationContact(s)
      observe(s, 'area-before', 'Antes: esta área, com o cacto nesta posição.', false)
      s.width = action.width
      const after = explorationContact(s)
      observe(
        s,
        after ? 'contact' : 'separate',
        after ? 'A área nova encostou no cacto.' : 'A área nova não encosta no cacto.',
      )
      if (before !== after) {
        s.observations = s.observations.filter((o) => o.id !== 'area-before')
        const old = { ...s, width: previous.width, observations: [...s.observations] }
        observe(old, 'area-before', 'Antes: mesma posição, outra área.', false)
        const beforeSnapshot = old.observations.find((o) => o.id === 'area-before')
        if (beforeSnapshot) s.observations.push(beforeSnapshot)
        observe(s, 'area-contrast', 'A posição e o desenho ficaram iguais. A área mudou a batida.')
      }
      break
    }
    case 'start':
      if (s.screen !== 'start') break
      if (m === 'controls' && action.input === 'tap' && !s.touch) {
        observe(s, 'missing-touch', 'O convite prometeu toque, mas falta conectar esse controle.')
        break
      }
      s.screen = 'playing'
      s.scoreIdleSeconds = 0
      if (m === 'controls' && s.touch)
        observe(
          s,
          action.input === 'key' ? 'start-key' : 'start-tap',
          action.input === 'key' ? 'Enter iniciou a partida.' : 'O toque iniciou a partida.',
        )
      else s.caption = 'A partida começou.'
      break
    case 'collide':
      if (s.screen === 'playing') {
        s.screen = 'end'
        s.scoreIdleSeconds = 0
        s.distance = 25
        if (m === 'restart') observe(s, 'ended', 'O cacto encostou: fim da partida.')
        else s.caption = 'Fim da partida. Confira se os pontos ficam parados.'
      }
      break
    case 'home':
      if (s.screen !== 'start') s.scoreIdleSeconds = 0
      s.screen = 'start'
      s.caption = 'De volta ao início. O placar foi preservado.'
      break
    case 'restart':
      if (s.screen === 'end' && s.restartConnected) {
        s.screen = 'playing'
        s.points = 0
        s.distance = 240
        s.cacti = []
        s.born = 0
        s.removed = 0
        s.elapsed = 0
        s.spawnRemainder = 0
        observe(s, 'restarted', 'Nova partida: pontos zerados e cacto de volta ao começo.')
      } else s.caption = 'A ligação de Jogar de novo ainda não inicia outra partida.'
      break
    case 'interval':
      s.interval = action.seconds
      s.spawnRemainder = 0
      s.cacti = []
      s.born = 0
      s.removed = 0
      s.elapsed = 0
      s.caption = 'Pista vazia novamente. Compare o mesmo passo do relógio.'
      break
    case 'clock': {
      const before = s.base
      s.base = s.limited ? Math.max(-9, s.base - 1) : s.base - 1
      s.ticks++
      s.caption = `Base do próximo cacto: ${s.base}. As setas dos antigos continuam iguais.`
      if (s.limited && before === -9 && s.base === -9)
        observe(s, 'base-limit', 'O relógio avançou, mas a base permaneceu em −9.')
      if (s.cacti.some((c) => c.velocity !== s.base && c.velocity > s.base))
        observe(s, 'old-speed', 'O cacto anterior guardou a velocidade recebida ao nascer.')
      break
    }
    case 'sample': {
      const sample = action.unit < 0.5 ? 0 : 1
      s.sampleX = action.kind === 'position' ? Math.round(500 + action.unit * 60) : 500
      s.sampleVelocity =
        action.kind === 'velocity' ? (m === 'acceleration' ? s.base : -5) - sample : -5
      s.born++
      s.cacti.push({ id: s.born, x: s.sampleX, velocity: s.sampleVelocity })
      s.cacti = s.cacti.slice(-12)
      s.caption = `${action.guided ? 'Exemplo guiado' : 'Sorteio'}: posição ${s.sampleX}, velocidade ${s.sampleVelocity}.`
      if (m === 'random') {
        if (action.kind === 'position') {
          if (!s.positionSamples.includes(s.sampleX)) s.positionSamples.push(s.sampleX)
          observe(s, `position-${Math.min(s.positionSamples.length, 2)}`, s.caption, false)
          if (s.positionSamples.length >= 2)
            observe(s, 'positions', 'Dois lugares de nascimento, sempre com velocidade −5.')
        } else {
          if (!s.velocitySamples.includes(s.sampleVelocity))
            s.velocitySamples.push(s.sampleVelocity)
          observe(s, `velocity-${s.sampleVelocity}`, s.caption, false)
          if (s.velocitySamples.length >= 2)
            observe(s, 'velocities', 'Base −5, descontando 0 ou 1: −5 e −6, da mesma posição.')
        }
      } else if (s.limited && s.base === -9 && s.sampleVelocity === -10)
        observe(s, 'variation-limit', 'A base parou em −9. Descontar 1 criou um cacto a −10.')
      s.positionSamples = s.positionSamples.slice(0, 2)
      break
    }
    case 'hint':
      s.hints = Math.max(s.hints, action.level)
      break
    case 'reset':
      return {
        ...initialExploration(activity),
        discoveries: s.discoveries,
        observations: s.observations,
        hints: s.hints,
        actions: s.actions,
        caption: 'Experiência recomeçada. Suas descobertas foram guardadas.',
      }
    case 'undo':
      return previous // Undo uses the replay stack, never a recursive serialized state.
  }
  return s
}

/** Compact command trace, replayed by both server and client. No client-supplied success flags.
 * It remains browser-originated evidence of a teaching model, not proof of learning. */
export function readExplorationTrace(
  activity: ExplorationActivity,
  answers: LearningAnswers,
): ExplorationAction[] | null {
  if (answers.explorationVersion === undefined && answers.explorationTrace === undefined)
    return Object.keys(answers).some((key) => key.startsWith('simulation')) ? null : []
  if (
    answers.explorationVersion !== 2 ||
    answers.explorationMission !== activity.mission ||
    !Array.isArray(answers.explorationTrace) ||
    answers.explorationTrace.length > 100
  )
    return null
  const actions: ExplorationAction[] = []
  for (const chunk of answers.explorationTrace) {
    try {
      const parsed: unknown = JSON.parse(chunk)
      if (!Array.isArray(parsed) || parsed.length > 20) return null
      for (const action of parsed) {
        if (!isExplorationAction(action, activity.mission)) return null
        actions.push(action)
      }
    } catch {
      return null
    }
  }
  return actions.length <= 1000 ? actions : null
}
export function replayExploration(activity: ExplorationActivity, answers: LearningAnswers) {
  const trace = readExplorationTrace(activity, answers)
  let state = initialExploration(activity)
  const past: ExplorationState[] = []
  if (!trace) return { state, valid: false, canUndo: false }
  for (const action of trace) {
    if (action.type === 'undo') {
      const prior = past.pop()
      if (prior)
        state = {
          ...prior,
          discoveries: state.discoveries,
          observations: state.observations,
          hints: state.hints,
          actions: state.actions + 1,
        }
    } else {
      if (action.type !== 'advance' && action.type !== 'hint') {
        past.push(state)
        if (past.length > 20) past.shift()
      }
      state = transitionExploration(activity, state, action)
    }
  }
  return { state, valid: true, canUndo: past.length > 0 }
}
export function appendExplorationAction(
  activity: ExplorationActivity,
  answers: LearningAnswers,
  action: ExplorationAction,
): LearningAnswers {
  if (!isExplorationAction(action, activity.mission)) return answers
  const trace = readExplorationTrace(activity, answers) ?? []
  const last = trace.at(-1)
  // Animation frames coalesce into elapsed time; pointer moves coalesce only when no new
  // observation happened, so a brief contact cannot disappear from the saved evidence.
  if (action.type === 'advance' && last?.type === 'advance' && last.seconds + action.seconds <= 30)
    trace[trace.length - 1] = {
      type: 'advance',
      seconds: Math.round((last.seconds + action.seconds) * 1000000) / 1000000,
    }
  else if (last?.type === action.type && ['move', 'resize', 'impulse'].includes(action.type)) {
    const before = {
      ...answers,
      explorationTrace: trace.slice(0, -1).reduce<string[]>((chunks, _item, i, all) => {
        if (i % 20 === 0) chunks.push(JSON.stringify(all.slice(i, i + 20)))
        return chunks
      }, []),
    }
    const priorState = replayExploration(activity, before).state
    const lastState = transitionExploration(activity, priorState, last)
    if (lastState.discoveries.length === priorState.discoveries.length)
      trace[trace.length - 1] = action
    else trace.push(action)
  } else trace.push(action)
  const chunks: string[] = []
  for (let i = 0; i < trace.length; i += 20) chunks.push(JSON.stringify(trace.slice(i, i + 20)))
  const next: LearningAnswers = {
    ...answers,
    explorationVersion: 2,
    explorationMission: activity.mission,
    explorationTrace: chunks,
  }
  return trace.length <= 1000 && isLearningAnswers(next) ? next : answers
}
