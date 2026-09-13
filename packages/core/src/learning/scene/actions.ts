/**
 * O que a criança (ou o roteiro de uma demonstração) pode FAZER numa cena.
 *
 * Este arquivo é a única fonte de legalidade: o player, o validador de roteiro e o DTO do
 * servidor perguntam todos a `isSceneAction`. Antes existiam três cópias dessa regra —
 * uma no motor, uma no editor do admin e uma em TypeBox no members — e elas já divergiam
 * (o `interval` do servidor não tinha limite, o do editor ia de 0,5 a 2).
 */

/** As 14 cenas. Uma lista só: antes havia 13 "cenas" na v1 e 14 "missões" na v2/v3, com a
 *  v1 tratando salto como um conceito único e a v2 separando gravidade de impulso. */
export const SCENE_IDS = [
  'world',
  'layers',
  'gravity',
  'impulse',
  'jump-sound',
  'spawn',
  'cleanup',
  'game-state',
  'controls',
  'restart',
  'hitbox',
  'score',
  'random',
  'acceleration',
] as const
export type SceneId = (typeof SCENE_IDS)[number]

/** Agrupa as cenas na escolha do professor. Era `SimulationFamily`, no módulo da v1 — a
 *  única coisa que a v2/v3 realmente importava de lá. */
export const SCENE_GROUPS = [
  'world',
  'motion',
  'events',
  'population',
  'collision',
  'speed',
] as const
export type SceneGroup = (typeof SCENE_GROUPS)[number]

/** Os fios que a criança liga na bancada. ⚠️ Vários nomes aqui se repetem como id de cena
 *  (`gravity`, `cleanup`, `restart`) e como tipo de ação (`restart`, `clock`). São eixos
 *  diferentes de propósito: a cena é o assunto, a porta é a ligação, a ação é o gesto. */
export const SCENE_PORTS = [
  'draw',
  'gravity',
  'sound',
  'timer',
  'cleanup',
  'condition',
  'touch',
  'restart',
  'limit',
] as const
export type ScenePort = (typeof SCENE_PORTS)[number]

export type SceneAction =
  | { type: 'create' }
  | { type: 'connect'; port: ScenePort; enabled: boolean }
  | { type: 'layer'; front: boolean }
  | { type: 'jump'; input: 'key' | 'tap' }
  | { type: 'impulse'; force: number }
  | { type: 'advance'; seconds: number }
  | { type: 'move'; distance: number }
  | { type: 'resize'; width: number }
  | { type: 'start'; input: 'key' | 'tap' }
  | { type: 'collide' | 'home' | 'restart' | 'clock' | 'reset' }
  | { type: 'interval'; seconds: number }
  | { type: 'sample'; kind: 'position' | 'velocity'; unit: number; guided: boolean }
  | { type: 'hint'; level: number }

/** Quais portas cada cena oferece. Cena sem porta não tem bancada de fios. */
const PORTS: Record<SceneId, readonly ScenePort[]> = {
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

/** Limites numéricos das ações, num lugar só. O DTO do servidor os importa daqui em vez de
 *  redeclarar à mão, que era como o `interval` acabou sem teto do lado de lá. */
export const SCENE_LIMITS = {
  impulse: { min: 5, max: 14 },
  advance: { min: 0.001, max: 30 },
  /** O roteiro de demonstração é mais apertado: ninguém assiste 30 s parado num passo. */
  scriptAdvance: { min: 0.001, max: 10 },
  move: { min: 20, max: 260 },
  resize: { min: 24, max: 120 },
  interval: { min: 0.5, max: 2 },
  sample: { min: 0, max: 1 },
  hint: { min: 1, max: 3 },
} as const

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function between(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
}
const oneOf = (scenes: readonly SceneId[], scene: SceneId) => scenes.includes(scene)

const JUMPS: readonly SceneId[] = ['gravity', 'impulse', 'jump-sound']
const TICKS: readonly SceneId[] = [
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
]
const MATCHES: readonly SceneId[] = ['controls', 'restart', 'game-state', 'score']

/**
 * Uma ação só é legal na cena que a oferece. O motor trata ação ilegal como no-op em vez de
 * erro: um roteiro antigo ou um pacote adulterado não derruba a aula da criança.
 */
export function isSceneAction(value: unknown, scene: SceneId): value is SceneAction {
  if (!isRecord(value)) return false
  const L = SCENE_LIMITS
  switch (value.type) {
    case 'create':
      return scene === 'world'
    case 'connect':
      return PORTS[scene].some((p) => p === value.port) && typeof value.enabled === 'boolean'
    case 'layer':
      return scene === 'layers' && typeof value.front === 'boolean'
    case 'jump':
      return oneOf(JUMPS, scene) && (value.input === 'key' || value.input === 'tap')
    case 'impulse':
      return scene === 'impulse' && between(value.force, L.impulse.min, L.impulse.max)
    case 'advance':
      return between(value.seconds, L.advance.min, L.advance.max) && oneOf(TICKS, scene)
    case 'move':
      return (
        (scene === 'hitbox' || scene === 'restart') &&
        between(value.distance, L.move.min, L.move.max)
      )
    case 'resize':
      return scene === 'hitbox' && between(value.width, L.resize.min, L.resize.max)
    case 'start':
      return oneOf(MATCHES, scene) && (value.input === 'key' || value.input === 'tap')
    case 'collide':
      return scene === 'restart' || scene === 'score'
    case 'home':
      return oneOf(MATCHES, scene)
    case 'restart':
      return scene === 'restart'
    case 'clock':
      return scene === 'acceleration'
    case 'interval':
      return scene === 'spawn' && between(value.seconds, L.interval.min, L.interval.max)
    case 'sample':
      return (
        (scene === 'random' || scene === 'acceleration') &&
        (value.kind === 'position' || value.kind === 'velocity') &&
        between(value.unit, L.sample.min, L.sample.max) &&
        typeof value.guided === 'boolean'
      )
    case 'hint':
      return between(value.level, L.hint.min, L.hint.max) && Number.isInteger(value.level)
    case 'reset':
      return true
    default:
      return false
  }
}

/** As portas que uma cena oferece — o editor do admin monta a bancada a partir disto. */
export function scenePorts(scene: SceneId): readonly ScenePort[] {
  return PORTS[scene]
}
