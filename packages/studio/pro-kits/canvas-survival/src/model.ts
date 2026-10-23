import {
  type ArenaConfig,
  type ArenaRole,
  type BodyBounds,
  type ValidatedArenaConfig,
  validateBody,
  validateConfig,
} from './config'
import { resolveContacts, resolvePulse } from './rules/combat'
import { clampActor, moveActors } from './rules/movement'
import { resolveObjective } from './rules/objectives'
import { createEnemySlot, spawnDueEnemy, validateSpawnSpace } from './rules/spawning'

export type { ArenaConfig, ArenaRole, BodyBounds, ValidatedArenaConfig } from './config'
export type EnemyKind = Exclude<ArenaRole, 'player'>
export type ArenaResult = 'win-time' | 'win-defeats' | 'lost'
export interface ArenaInput {
  x: number
  y: number
  pulse: boolean
}

export interface ArenaActor {
  id: number
  kind: ArenaRole
  /** Centro visual em unidades do mundo. */
  x: number
  y: number
  previousX: number
  previousY: number
  previousFacingX: number
  /** Velocidade de empurrão; movimento voluntário é separado. */
  vx: number
  vy: number
  health: number
  maxHealth: number
  facingX: number
  facingY: number
  moving: boolean
  hitUntilTick: number
  invulnerableUntilTick: number
  body: BodyBounds
}

export interface ArenaEnemy extends ArenaActor {
  kind: EnemyKind
  speed: number
  damage: number
  directionX: number
  directionY: number
  idling: boolean
  phaseUntilTick: number
}

interface EventPoint {
  tick: number
  x: number
  y: number
}
export type ArenaEvent =
  | (EventPoint & { type: 'pulse'; radius: number })
  | (EventPoint & { type: 'spawn'; entityId: number; kind: EnemyKind })
  | (EventPoint & { type: 'hit'; entityId: number; role: ArenaRole })
  | (EventPoint & { type: 'defeat'; entityId: number; kind: EnemyKind })
  | (EventPoint & { type: 'result'; result: ArenaResult; score: number })

export interface ArenaState {
  config: ValidatedArenaConfig
  bodies: Record<ArenaRole, BodyBounds>
  seed: number
  randomState: number
  /** Quantidade de ticks concluídos; não é a fase da UI. */
  tick: number
  player: ArenaActor
  /** Apenas adversários vivos, em ordem crescente de identidade lógica. */
  enemies: ArenaEnemy[]
  /** Capacidade livre do pool. Efeitos de morte nunca retêm esses slots. */
  freeEnemies: ArenaEnemy[]
  nextEnemyId: number
  spawnAtTick: number
  spawnBlocked: number
  pulseReadyTick: number
  defeated: number
  result: ArenaResult | null
}

export interface ArenaOptions {
  config?: Partial<ArenaConfig>
  seed?: number
  bodies?: Partial<Record<ArenaRole, BodyBounds>>
}

export function createArenaState(options: ArenaOptions = {}): ArenaState {
  const settings = validateConfig(options.config)
  const seed = options.seed ?? 1
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('seed: use um inteiro entre 0 e 4294967295.')
  const bodies = {} as Record<ArenaRole, BodyBounds>
  for (const role of ['player', 'seeker', 'drifter'] as const) {
    bodies[role] = validateBody(
      options.bodies?.[role] ?? settings[`${role}Body`],
      settings.width,
      settings.height,
      `bodies.${role}`,
    )
  }
  validateSpawnSpace(settings, bodies)
  const player: ArenaActor = {
    id: 0,
    kind: 'player',
    x: settings.width / 2,
    y: settings.height / 2,
    previousX: settings.width / 2,
    previousY: settings.height / 2,
    previousFacingX: 1,
    vx: 0,
    vy: 0,
    health: settings.playerHealth,
    maxHealth: settings.playerHealth,
    facingX: 1,
    facingY: 0,
    moving: false,
    hitUntilTick: 0,
    invulnerableUntilTick: 0,
    body: bodies.player,
  }
  clampActor(player, settings.width, settings.height)
  player.previousX = player.x
  player.previousY = player.y
  return {
    config: settings,
    bodies,
    seed,
    randomState: seed,
    tick: 0,
    player,
    enemies: [],
    freeEnemies: Array.from({ length: settings.maxEnemies }, () => createEnemySlot(bodies.seeker)),
    nextEnemyId: 1,
    spawnAtTick: settings.spawnTicks,
    spawnBlocked: 0,
    pulseReadyTick: 0,
    defeated: 0,
    result: null,
  }
}

/** Executa exatamente um tick. O controller decide quando chamar, pausar ou reiniciar. */
export function stepArena(state: ArenaState, input: ArenaInput): ArenaEvent[] {
  if (state.result !== null) return []
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y) || typeof input.pulse !== 'boolean') {
    throw new Error('input: direção finita e pulso booleano são obrigatórios.')
  }
  const tick = state.tick + 1
  const events: ArenaEvent[] = []
  spawnDueEnemy(state, tick, events)
  moveActors(state, input, tick)
  resolvePulse(state, input.pulse, tick, events)
  resolveContacts(state, tick, events)
  state.tick = tick
  resolveObjective(state, events)
  return events
}
