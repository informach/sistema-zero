/** Valores em unidades do mundo e segundos; a simulação não depende dos pixels do desenho. */
export const TICK_RATE = 60
export const TICK_SECONDS = 1 / TICK_RATE
export const MAX_ENEMIES = 64

export type ArenaRole = 'player' | 'seeker' | 'drifter'
export interface BodyBounds {
  /** Canto superior esquerdo relativo ao centro visual do personagem, olhando à direita. */
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export interface ArenaConfig {
  width: number
  height: number
  surviveSeconds: number
  defeatGoal: number
  maxEnemies: number
  spawnSeconds: number
  safeSpawnDistance: number
  playerSpeed: number
  playerHealth: number
  playerInvulnerabilitySeconds: number
  playerPushback: number
  playerBody: BodyBounds
  pulseRadius: number
  pulseDamage: number
  pulseCooldownSeconds: number
  pulsePushback: number
  pushbackDecay: number
  hitStunSeconds: number
  seekerSpeed: number
  seekerHealth: number
  seekerDamage: number
  seekerBody: BodyBounds
  drifterSpeed: number
  drifterHealth: number
  drifterDamage: number
  drifterMoveSeconds: number
  drifterIdleSeconds: number
  drifterBody: BodyBounds
}

export const config: ArenaConfig = {
  width: 720,
  height: 540,
  // Vencer por tempo OU por adversários superados. Vida zero sempre significa derrota.
  surviveSeconds: 60,
  defeatGoal: 10,
  maxEnemies: MAX_ENEMIES,
  spawnSeconds: 1.4,
  safeSpawnDistance: 120,
  playerSpeed: 170,
  playerHealth: 5,
  playerInvulnerabilitySeconds: 1,
  playerPushback: 180,
  playerBody: { offsetX: -12, offsetY: -12, width: 24, height: 24 },
  pulseRadius: 100,
  pulseDamage: 1,
  pulseCooldownSeconds: 0.65,
  pulsePushback: 260,
  pushbackDecay: 850,
  hitStunSeconds: 0.18,
  seekerSpeed: 68,
  seekerHealth: 2,
  seekerDamage: 1,
  seekerBody: { offsetX: -13, offsetY: -13, width: 26, height: 26 },
  drifterSpeed: 46,
  drifterHealth: 1,
  drifterDamage: 1,
  drifterMoveSeconds: 2.4,
  drifterIdleSeconds: 0.8,
  drifterBody: { offsetX: -16, offsetY: -11, width: 32, height: 22 },
}

export interface ValidatedArenaConfig extends ArenaConfig {
  surviveTicks: number
  spawnTicks: number
  playerInvulnerabilityTicks: number
  pulseCooldownTicks: number
  hitStunTicks: number
  drifterMoveTicks: number
  drifterIdleTicks: number
}

const derivedFields = new Set([
  'surviveTicks',
  'spawnTicks',
  'playerInvulnerabilityTicks',
  'pulseCooldownTicks',
  'hitStunTicks',
  'drifterMoveTicks',
  'drifterIdleTicks',
])

function range(name: string, value: number, min: number, max: number, integer = false) {
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(
      `config.${name}: use ${integer ? 'um inteiro' : 'um número'} entre ${min} e ${max}.`,
    )
  }
}

/** Usado também para a hitbox opcional já convertida pelo loader, sem depender de DOM. */
export function validateBody(
  body: BodyBounds,
  width: number,
  height: number,
  field: string,
): BodyBounds {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Error(`${field}: corpo inválido.`)
  range(`${field}.offsetX`, body.offsetX, -width, width)
  range(`${field}.offsetY`, body.offsetY, -height, height)
  range(`${field}.width`, body.width, 0.01, width)
  range(`${field}.height`, body.height, 0.01, height)
  return { offsetX: body.offsetX, offsetY: body.offsetY, width: body.width, height: body.height }
}

/** Uma nova cópia por partida; editar uma configuração não altera outra partida em andamento. */
export function validateConfig(overrides: Partial<ArenaConfig> = {}): ValidatedArenaConfig {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new Error('config: objeto esperado.')
  for (const key of Object.keys(overrides)) {
    // Configuração já validada também é aceita; os ticks são sempre recalculados abaixo.
    if (!Object.hasOwn(config, key) && !derivedFields.has(key))
      throw new Error(`config.${key}: parâmetro desconhecido.`)
  }
  const next = { ...config, ...overrides }
  range('width', next.width, 160, 4096)
  range('height', next.height, 120, 4096)
  range('surviveSeconds', next.surviveSeconds, TICK_SECONDS, 3600)
  range('defeatGoal', next.defeatGoal, 1, 10000000, true)
  range('maxEnemies', next.maxEnemies, 1, MAX_ENEMIES, true)
  range('spawnSeconds', next.spawnSeconds, TICK_SECONDS, 60)
  range('safeSpawnDistance', next.safeSpawnDistance, 0, Math.hypot(next.width, next.height))
  range('playerSpeed', next.playerSpeed, 1, 1200)
  range('playerHealth', next.playerHealth, 1, 1000, true)
  range('playerInvulnerabilitySeconds', next.playerInvulnerabilitySeconds, TICK_SECONDS, 10)
  range('pulseRadius', next.pulseRadius, 1, Math.hypot(next.width, next.height))
  range('pulseDamage', next.pulseDamage, 1, 1000, true)
  range('pulseCooldownSeconds', next.pulseCooldownSeconds, TICK_SECONDS, 30)
  range('playerPushback', next.playerPushback, 0, 2400)
  range('pulsePushback', next.pulsePushback, 0, 2400)
  range('pushbackDecay', next.pushbackDecay, 1, 10000)
  range('hitStunSeconds', next.hitStunSeconds, 0, 2)
  for (const kind of ['seeker', 'drifter'] as const) {
    range(`${kind}Speed`, next[`${kind}Speed`], 0, 1200)
    range(`${kind}Health`, next[`${kind}Health`], 1, 1000, true)
    range(`${kind}Damage`, next[`${kind}Damage`], 1, 1000, true)
  }
  range('drifterMoveSeconds', next.drifterMoveSeconds, TICK_SECONDS, 60)
  range('drifterIdleSeconds', next.drifterIdleSeconds, TICK_SECONDS, 60)
  for (const role of ['player', 'seeker', 'drifter'] as const) {
    next[`${role}Body`] = validateBody(next[`${role}Body`], next.width, next.height, `${role}Body`)
  }
  const ticks = (seconds: number) => Math.ceil(seconds * TICK_RATE)
  return {
    ...next,
    surviveTicks: ticks(next.surviveSeconds),
    spawnTicks: ticks(next.spawnSeconds),
    playerInvulnerabilityTicks: ticks(next.playerInvulnerabilitySeconds),
    pulseCooldownTicks: ticks(next.pulseCooldownSeconds),
    hitStunTicks: ticks(next.hitStunSeconds),
    drifterMoveTicks: ticks(next.drifterMoveSeconds),
    drifterIdleTicks: ticks(next.drifterIdleSeconds),
  }
}
