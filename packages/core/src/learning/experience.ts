import {
  EXPLORATION_DEFINITIONS,
  EXPLORATION_MISSIONS,
  type ExplorationActivity,
  evaluateExplorationState,
} from './exploration'
import {
  type ExplorationAction,
  type ExplorationState,
  initialExploration,
  isExplorationAction,
  transitionExploration,
} from './exploration-model'
import { isLearningAnswers, type LearningAnswers, type LearningResult } from './index'

export interface ExperienceStep {
  id: string
  caption: string
  highlight?: 'scene' | 'tools' | 'compare'
  actions: ExplorationAction[]
  /** The final advance is the deadline for this observed discovery. */
  waitFor?: string
}
export type ExperienceCommand =
  | ExplorationAction
  | { type: 'demo-start' }
  | { type: 'demo-next' }
  | { type: 'capture' }
  | { type: 'demo-tick'; seconds: number }
export interface ExperienceTrial {
  label: string
  state: Pick<
    ExplorationState,
    | 'force'
    | 'gravity'
    | 'peak'
    | 'distance'
    | 'width'
    | 'y'
    | 'soundCount'
    | 'jumpCount'
    | 'soundOnJump'
    | 'screen'
    | 'points'
    | 'born'
    | 'removed'
  >
}
export interface ExperienceSession {
  state: ExplorationState
  past: ExplorationState[]
  trials: ExperienceTrial[]
  viewed: boolean
  demo: null | {
    step: number
    action: number
    elapsed: number
    ready: boolean
    learner: ExplorationState
    past: ExplorationState[]
    before?: ExperienceTrial
  }
}
export interface ExperienceEvent {
  type: 'discovery' | 'jump' | 'sound' | 'landed' | 'demo-complete'
  id: string
}
export const EXPERIENCE_SEGMENT_LIMIT = 100
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function isExperienceScript(
  value: unknown,
  mission: unknown,
  initialImpulse?: unknown,
): value is ExperienceStep[] {
  const resolved = EXPLORATION_MISSIONS.find((m) => m === mission)
  if (!resolved) return false
  const valid =
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 12 &&
    new Set(value.map((s) => (object(s) ? s.id : undefined))).size === value.length &&
    value.every(
      (s) =>
        object(s) &&
        typeof s.id === 'string' &&
        /^[a-zA-Z0-9_-]{1,80}$/.test(s.id) &&
        typeof s.caption === 'string' &&
        s.caption.length > 0 &&
        s.caption.length <= 500 &&
        (s.highlight === undefined ||
          ['scene', 'tools', 'compare'].includes(String(s.highlight))) &&
        (s.waitFor === undefined ||
          EXPLORATION_DEFINITIONS[resolved].goals.some((g) => g.id === s.waitFor)) &&
        Array.isArray(s.actions) &&
        s.actions.length > 0 &&
        s.actions.length <= 16 &&
        s.actions.every(
          (a) =>
            isExplorationAction(a, resolved) &&
            a.type !== 'undo' &&
            a.type !== 'hint' &&
            (a.type !== 'advance' || a.seconds <= 10),
        ),
    )
  if (!valid || !Array.isArray(value)) return false
  const activity: ExplorationActivity = {
    type: 'exploration',
    version: 3,
    mission: resolved,
    ...(typeof initialImpulse === 'number' ? { initialImpulse } : {}),
  }
  let state = initialExploration(activity)
  for (const step of value) {
    for (const action of step.actions) state = transitionExploration(activity, state, action)
    if (
      step.waitFor &&
      (step.actions.at(-1)?.type !== 'advance' || !state.discoveries.includes(step.waitFor))
    )
      return false
  }
  return true
}

/** Small, authored examples. The same transitions drive examples and learner experiments. */
export function experienceScript(activity: ExplorationActivity): ExperienceStep[] {
  if (activity.demonstration) return activity.demonstration
  let stepNumber = 0
  const step = (caption: string, ...actions: ExplorationAction[]): ExperienceStep => ({
    id: `step-${++stepNumber}`,
    caption,
    highlight: 'scene',
    actions,
    ...(activity.mission === 'gravity' &&
    actions.some((a) => a.type === 'connect' && a.port === 'gravity' && a.enabled)
      ? { waitFor: 'landed' }
      : {}),
  })
  switch (activity.mission) {
    case 'gravity':
      return [
        step(
          'Observe o salto sem gravidade.',
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 0.6 },
        ),
        step(
          'Agora a gravidade traz o mesmo Dino de volta.',
          { type: 'connect', port: 'gravity', enabled: true },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ),
      ]
    case 'impulse':
      return [
        step(
          'Guarde a altura deste salto.',
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ),
        step(
          'Só o impulso mudou. A gravidade continua igual.',
          { type: 'impulse', force: activity.initialImpulse === 14 ? 7 : 14 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ),
      ]
    case 'hitbox':
      return [
        step('As áreas se tocam antes de os desenhos se misturarem.', {
          type: 'move',
          distance: 25,
        }),
        step(
          'Mesma posição, outra área. O resultado muda?',
          { type: 'move', distance: 60 },
          { type: 'resize', width: 100 },
        ),
      ]
    case 'jump-sound':
      return [
        step(
          'A tecla pode soar mesmo com o Dino no ar.',
          { type: 'jump', input: 'key' },
          { type: 'advance', seconds: 0.1 },
          { type: 'jump', input: 'key' },
        ),
        step(
          'Ligado ao acontecimento Pulou, o som acompanha o salto.',
          { type: 'connect', port: 'sound', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ),
      ]
    case 'world':
      return [
        step('O Dino existe nos bastidores.', { type: 'create' }),
        step('Ligar o desenho faz o mesmo Dino aparecer.', {
          type: 'connect',
          port: 'draw',
          enabled: true,
        }),
      ]
    case 'layers':
      return [
        step('A floresta cobre o Dino.', { type: 'layer', front: false }),
        step('Quem é desenhado depois fica na frente.', { type: 'layer', front: true }),
      ]
    case 'spawn':
      return [
        step('Veja quantos cactos nascem sem intervalo.', { type: 'advance', seconds: 2 }),
        step(
          'No mesmo tempo, o intervalo reduz os nascimentos.',
          { type: 'connect', port: 'timer', enabled: true },
          { type: 'advance', seconds: 2 },
        ),
      ]
    case 'cleanup':
      return [
        step('Sair da tela ainda deixa o cacto guardado.', { type: 'advance', seconds: 6 }),
        step(
          'A regra remove quem saiu.',
          { type: 'connect', port: 'cleanup', enabled: true },
          { type: 'advance', seconds: 2 },
        ),
      ]
    case 'game-state':
      return [
        step('O relógio está funcionando antes de jogar.', { type: 'advance', seconds: 1 }),
        step(
          'Dentro de Jogando, ele espera o início.',
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ),
      ]
    case 'controls':
      return [
        step('Tocar ainda não inicia a partida.', { type: 'start', input: 'tap' }),
        step(
          'A ligação adiciona o toque ao mesmo início.',
          { type: 'connect', port: 'touch', enabled: true },
          { type: 'start', input: 'tap' },
        ),
      ]
    case 'restart':
      return [
        step(
          'O contato encerra a partida.',
          { type: 'start', input: 'tap' },
          { type: 'move', distance: 25 },
        ),
        step(
          'Jogar de novo prepara uma nova partida.',
          { type: 'connect', port: 'restart', enabled: true },
          { type: 'restart' },
        ),
      ]
    case 'score':
      return [
        step(
          'O placar espera enquanto não estamos jogando.',
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
        ),
        step(
          'Jogando, ele cresce. No fim, conserva o valor.',
          { type: 'start', input: 'key' },
          { type: 'advance', seconds: 3 },
          { type: 'collide' },
          { type: 'advance', seconds: 1 },
        ),
      ]
    case 'random':
      return [
        step(
          'Dois exemplos de lugar, com a mesma velocidade.',
          { type: 'sample', kind: 'position', unit: 0, guided: true },
          { type: 'sample', kind: 'position', unit: 1, guided: true },
        ),
        step(
          'Mesmo lugar, duas velocidades possíveis.',
          { type: 'sample', kind: 'velocity', unit: 0, guided: true },
          { type: 'sample', kind: 'velocity', unit: 1, guided: true },
        ),
      ]
    case 'acceleration':
      return [
        step('Este cacto guarda a velocidade de nascimento.', {
          type: 'sample',
          kind: 'velocity',
          unit: 0,
          guided: true,
        }),
        step(
          'O limite vale para a base dos próximos.',
          { type: 'connect', port: 'limit', enabled: true },
          ...Array.from({ length: 5 }, (): ExplorationAction => ({ type: 'clock' })),
          { type: 'sample', kind: 'velocity', unit: 1, guided: true },
        ),
      ]
  }
}
export function initialExperience(activity: ExplorationActivity): ExperienceSession {
  return {
    state: initialExploration(activity),
    past: [],
    trials: [],
    viewed: false,
    demo: null,
  }
}
export function experienceTrial(state: ExplorationState, label: string): ExperienceTrial {
  const {
    force,
    gravity,
    peak,
    distance,
    width,
    y,
    soundCount,
    jumpCount,
    soundOnJump,
    screen,
    points,
    born,
    removed,
  } = state
  return {
    label,
    state: {
      force: state.jumpCount ? state.flightForce : force,
      gravity: state.jumpCount ? state.flightGravity : gravity,
      peak,
      distance,
      width,
      y,
      soundCount,
      jumpCount,
      soundOnJump,
      screen,
      points,
      born,
      removed,
    },
  }
}
function withoutEvidence(state: ExplorationState): ExplorationState {
  return { ...state, observations: [], discoveries: [] }
}
export function isExperienceCommand(
  value: unknown,
  activity: ExplorationActivity,
): value is ExperienceCommand {
  if (!object(value)) return false
  if (activity.mode === 'demonstrate') {
    if (value.type === 'demo-start' || value.type === 'demo-next')
      return Object.keys(value).length === 1
    return (
      value.type === 'demo-tick' &&
      finite(value.seconds) &&
      value.seconds >= 0.001 &&
      value.seconds <= 1
    )
  }
  if (value.type === 'capture') return Object.keys(value).length === 1
  return isExplorationAction(value, activity.mission)
}
export function stepExperience(
  activity: ExplorationActivity,
  previous: ExperienceSession,
  command: ExperienceCommand,
): { session: ExperienceSession; events: ExperienceEvent[] } {
  if (!isExperienceCommand(command, activity)) throw new Error('Comando de experiência inválido.')
  let next: ExperienceSession = {
    ...previous,
    past: [...previous.past],
    trials: [...previous.trials],
    demo: previous.demo ? { ...previous.demo } : null,
  }
  const before = previous.state
  if (command.type === 'demo-start') {
    next = {
      ...next,
      state: initialExploration(activity),
      past: [],
      demo: {
        learner: initialExploration(activity),
        past: [],
        step: 0,
        action: 0,
        elapsed: 0,
        ready: false,
        before: experienceTrial(initialExploration(activity), 'Antes desta etapa'),
      },
    }
  } else if (command.type === 'demo-next') {
    if (next.demo?.ready && next.demo.step < experienceScript(activity).length - 1)
      next.demo = {
        ...next.demo,
        step: next.demo.step + 1,
        action: 0,
        elapsed: 0,
        ready: false,
        before: experienceTrial(next.state, 'Antes desta etapa'),
      }
  } else if (command.type === 'demo-tick') {
    const demo = next.demo
    if (demo && !demo.ready) {
      const script = experienceScript(activity)
      const actions = script[demo.step]?.actions
      if (!actions) throw new Error('Etapa de demonstração inválida.')
      const action = actions[demo.action]
      if (!action) throw new Error('Ação de demonstração inválida.')
      demo.elapsed += command.seconds
      if (action.type === 'advance') {
        const seconds = Math.min(command.seconds, action.seconds - (demo.elapsed - command.seconds))
        if (seconds >= 0.001)
          next.state = transitionExploration(activity, next.state, { type: 'advance', seconds })
        if (
          demo.elapsed + 0.000001 >= action.seconds ||
          (demo.action === actions.length - 1 &&
            script[demo.step]?.waitFor &&
            next.state.discoveries.includes(script[demo.step]?.waitFor ?? ''))
        ) {
          demo.action++
          demo.elapsed = 0
        }
      } else if (demo.elapsed >= 0.45) {
        next.state = transitionExploration(activity, next.state, action)
        demo.action++
        demo.elapsed = 0
      }
      if (demo.action >= actions.length) {
        demo.ready = true
        if (demo.step === script.length - 1) next.viewed = true
      }
    }
  } else if (!next.demo) {
    if (command.type === 'capture') {
      next.trials = [
        ...next.trials,
        experienceTrial(before, `Experiência ${before.actions + 1}`),
      ].slice(-2)
      next.state = { ...before, actions: before.actions + 1 }
    } else if (command.type === 'undo') {
      const prior = next.past.pop()
      if (prior)
        next.state = {
          ...prior,
          discoveries: before.discoveries,
          observations: before.observations,
          hints: before.hints,
          actions: before.actions + 1,
        }
    } else {
      if (command.type !== 'advance' && command.type !== 'hint')
        next.past = [...next.past, withoutEvidence(before)].slice(-4)
      next.state = transitionExploration(activity, before, command)
      if (command.type === 'advance') next.state.actions = before.actions
    }
  }
  // Bounded undo memory, independent of session duration. Current state and discoveries are never discarded.
  const population = () =>
    next.state.cacti.length +
    (next.demo?.learner.cacti.length ?? 0) +
    next.past.reduce((n, s) => n + s.cacti.length, 0) +
    (next.demo?.past.reduce((n, s) => n + s.cacti.length, 0) ?? 0)
  while (next.past.length && population() > 500) next.past.shift()
  if (next.demo) {
    next.demo.past = [...next.demo.past]
    while (next.demo.past.length && population() > 500) next.demo.past.shift()
  }
  const events: ExperienceEvent[] = []
  if (next.state.jumpCount > before.jumpCount)
    events.push({ type: 'jump', id: String(next.state.jumpCount) })
  if (next.state.soundCount > before.soundCount)
    events.push({ type: 'sound', id: String(next.state.soundCount) })
  if (before.flightTime !== null && next.state.flightTime === null && command.type !== 'reset')
    events.push({ type: 'landed', id: String(next.state.jumpCount) })
  if (!next.demo)
    for (const id of next.state.discoveries)
      if (!before.discoveries.includes(id)) events.push({ type: 'discovery', id })
  if (next.viewed && !previous.viewed) events.push({ type: 'demo-complete', id: 'viewed' })
  return { session: next, events }
}

export interface ExperienceCheckpoint {
  sequence: number
  sessionId: string
  segmentId: string
  session: ExperienceSession
}
/** Internal, server-created checkpoint. Never accept this shape as a client save command. */
export function experienceAnswers(
  activity: ExplorationActivity,
  checkpoint: ExperienceCheckpoint,
): LearningAnswers {
  const pack = (s: ExplorationState) => ({
    ...s,
    cacti: s.cacti.map((c) => [c.id, c.x, c.velocity]),
  })
  const session = checkpoint.session
  const json = JSON.stringify({
    ...session,
    state: pack(session.state),
    past: session.past.map(pack),
    demo: session.demo
      ? { ...session.demo, learner: pack(session.demo.learner), past: session.demo.past.map(pack) }
      : null,
  })
  const chunks: string[] = []
  for (let i = 0; i < json.length; i += 7000) chunks.push(json.slice(i, i + 7000))
  const answers: LearningAnswers = {
    experienceVersion: 3,
    experienceMission: activity.mission,
    sequence: checkpoint.sequence,
    sessionId: checkpoint.sessionId,
    segmentId: checkpoint.segmentId,
    checkpoint: chunks,
  }
  if (!isLearningAnswers(answers))
    throw new Error('O estado da experiência excedeu o limite de armazenamento.')
  return answers
}
function validState(value: unknown, activity: ExplorationActivity): value is ExplorationState {
  if (!object(value)) return false
  const initial = initialExploration(activity)
  return Object.entries(initial).every(([key, exemplar]) => {
    const v = value[key]
    if (key === 'flightTime') return v === null || finite(v)
    if (typeof exemplar === 'number') return finite(v)
    if (typeof exemplar === 'boolean') return typeof v === 'boolean'
    if (key === 'screen') return v === 'start' || v === 'playing' || v === 'end'
    if (typeof exemplar === 'string') return typeof v === 'string' && v.length <= 1000
    if (!Array.isArray(v)) return false
    if (key === 'discoveries') return v.length <= 30 && v.every((x) => typeof x === 'string')
    if (key === 'cacti')
      return (
        v.length <= 400 &&
        v.every((x) => object(x) && finite(x.id) && finite(x.x) && finite(x.velocity))
      )
    if (key === 'observations')
      return (
        v.length <= 30 &&
        v.every(
          (x) =>
            object(x) &&
            typeof x.id === 'string' &&
            typeof x.label === 'string' &&
            [
              'height',
              'force',
              'distance',
              'width',
              'points',
              'stored',
              'visible',
              'base',
              'x',
              'velocity',
            ].every((k) => finite(x[k])) &&
            ['gravity', 'front', 'collision'].every((k) => typeof x[k] === 'boolean') &&
            ['start', 'playing', 'end'].includes(String(x.screen)),
        )
      )
    return v.length <= 12 && v.every(finite)
  })
}
export function readExperienceCheckpoint(
  activity: ExplorationActivity,
  answers: LearningAnswers,
): ExperienceCheckpoint | null {
  if (
    answers.experienceVersion !== 3 ||
    answers.experienceMission !== activity.mission ||
    !Number.isSafeInteger(answers.sequence) ||
    Number(answers.sequence) < 0 ||
    typeof answers.sessionId !== 'string' ||
    typeof answers.segmentId !== 'string' ||
    !Array.isArray(answers.checkpoint) ||
    !isLearningAnswers(answers)
  )
    return null
  try {
    const s: unknown = JSON.parse(answers.checkpoint.join(''), (key: string, value: unknown) =>
      key === 'cacti' &&
      Array.isArray(value) &&
      value.every((c) => Array.isArray(c) && c.length === 3 && c.every(finite))
        ? value.map((c) => ({ id: c[0], x: c[1], velocity: c[2] }))
        : value,
    )
    if (!validSession(s, activity)) return null
    return {
      sequence: Number(answers.sequence),
      sessionId: answers.sessionId,
      segmentId: answers.segmentId,
      session: s,
    }
  } catch {
    return null
  }
}
function validTrial(value: unknown, activity: ExplorationActivity): value is ExperienceTrial {
  if (!object(value) || typeof value.label !== 'string' || !object(value.state)) return false
  const state = value.state
  return Object.entries(experienceTrial(initialExploration(activity), '').state).every(
    ([key, exemplar]) =>
      typeof exemplar === 'number' ? finite(state[key]) : typeof state[key] === typeof exemplar,
  )
}
function validSession(s: unknown, activity: ExplorationActivity): s is ExperienceSession {
  if (
    !object(s) ||
    !validState(s.state, activity) ||
    !Array.isArray(s.past) ||
    s.past.length > 4 ||
    !s.past.every((x) => validState(x, activity)) ||
    typeof s.viewed !== 'boolean' ||
    !Array.isArray(s.trials) ||
    s.trials.length > 2
  )
    return false
  if (
    !s.trials.every((t) => {
      if (!object(t) || typeof t.label !== 'string' || !object(t.state)) return false
      const state = t.state
      return Object.entries(experienceTrial(initialExploration(activity), '').state).every(
        ([k, v]) => (typeof v === 'number' ? finite(state[k]) : typeof state[k] === typeof v),
      )
    })
  )
    return false
  if (
    s.demo !== null &&
    (!object(s.demo) ||
      !validState(s.demo.learner, activity) ||
      (s.demo.before !== undefined && !validTrial(s.demo.before, activity)) ||
      !Array.isArray(s.demo.past) ||
      s.demo.past.length > 4 ||
      !s.demo.past.every((x) => validState(x, activity)) ||
      !Number.isInteger(s.demo.step) ||
      Number(s.demo.step) < 0 ||
      Number(s.demo.step) >= experienceScript(activity).length ||
      !Number.isInteger(s.demo.action) ||
      Number(s.demo.action) < 0 ||
      Number(s.demo.action) >
        (experienceScript(activity)[Number(s.demo.step)]?.actions.length ?? -1) ||
      !finite(s.demo.elapsed) ||
      typeof s.demo.ready !== 'boolean')
  )
    return false
  return true
}
export function evaluateExperience(
  activity: ExplorationActivity,
  answers: LearningAnswers,
): LearningResult {
  const checkpoint = readExperienceCheckpoint(activity, answers)
  const session = checkpoint?.session
  if (activity.mode === 'demonstrate')
    return {
      participated: !!session && (session.viewed || !!session.demo),
      passed: !!session?.viewed,
      feedback: session?.viewed
        ? 'Demonstração concluída. Você acompanhou o conceito em funcionamento.'
        : 'Acompanhe as etapas do exemplo.',
      verifiedBy: 'client',
      evidence: 'demonstration',
    }
  return evaluateExplorationState(
    activity,
    session?.demo?.learner ?? session?.state ?? initialExploration(activity),
    !!session,
  )
}

export interface ExperienceSegment {
  sessionId: string
  segmentId: string
  baseSequence: number
  commands: ExperienceCommand[]
}
export function segmentAnswers(segment: ExperienceSegment): LearningAnswers {
  return {
    experienceVersion: 3,
    sessionId: segment.sessionId,
    segmentId: segment.segmentId,
    baseSequence: segment.baseSequence,
    commands: segment.commands.map((c) => JSON.stringify(c)),
  }
}
export function readExperienceSegment(
  activity: ExplorationActivity,
  answers: LearningAnswers,
): ExperienceSegment | null {
  if (
    !isLearningAnswers(answers) ||
    Object.keys(answers).some(
      (k) =>
        !['experienceVersion', 'sessionId', 'segmentId', 'baseSequence', 'commands'].includes(k),
    ) ||
    answers.experienceVersion !== 3 ||
    !Number.isSafeInteger(answers.baseSequence) ||
    Number(answers.baseSequence) < 0 ||
    !Array.isArray(answers.commands) ||
    !answers.commands.length ||
    answers.commands.length > EXPERIENCE_SEGMENT_LIMIT ||
    typeof answers.sessionId !== 'string' ||
    typeof answers.segmentId !== 'string' ||
    !/^[\w-]{8,80}$/.test(answers.sessionId) ||
    !/^[\w-]{8,80}$/.test(answers.segmentId)
  )
    return null
  try {
    const commands: unknown[] = answers.commands.map((c) => JSON.parse(c))
    if (!commands.every((c) => isExperienceCommand(c, activity))) return null
    return {
      sessionId: answers.sessionId,
      segmentId: answers.segmentId,
      baseSequence: Number(answers.baseSequence),
      commands,
    }
  } catch {
    return null
  }
}
export function applyExperienceSegment(
  activity: ExplorationActivity,
  current: ExperienceCheckpoint | null,
  segment: ExperienceSegment,
): ExperienceCheckpoint {
  if (segment.baseSequence !== (current?.sequence ?? 0)) throw new Error('EXPERIENCE_CONFLICT')
  let session = current?.session ?? initialExperience(activity)
  for (const command of segment.commands)
    session = stepExperience(activity, session, command).session
  return {
    session,
    sequence: segment.baseSequence + segment.commands.length,
    sessionId: segment.sessionId,
    segmentId: segment.segmentId,
  }
}

export function experienceHint(
  activity: ExplorationActivity,
  session: ExperienceSession,
  level: number,
): string {
  const s = session.state
  if (activity.mission === 'hitbox' && level < 3)
    return s.discoveries.includes('contact')
      ? 'Guarde a posição do cacto. Mude só a largura da área e compare.'
      : 'Aproxime o cacto devagar. Observe a borda da área do Dino.'
  if (activity.mission === 'jump-sound' && level < 3)
    return s.soundOnJump
      ? 'Tente pular outra vez enquanto está no ar. Depois experimente o toque.'
      : 'Aperte Espaço duas vezes durante o mesmo salto. Conte os sons e os saltos.'
  if (activity.mission === 'impulse' && s.discoveries.includes('first-height') && level < 3)
    return 'Guarde este salto, mude o impulso e repita. A gravidade permanece igual.'
  return EXPLORATION_DEFINITIONS[activity.mission].hints[level <= 1 ? 0 : level === 2 ? 1 : 2]
}
