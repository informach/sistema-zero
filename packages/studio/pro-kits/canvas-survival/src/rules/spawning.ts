import type { ArenaRole, BodyBounds, ValidatedArenaConfig } from '../config'
import type { ArenaEnemy, ArenaEvent, ArenaState, EnemyKind } from '../model'
import { bodyOffsetX } from './collisions'
import { direction } from './movement'
import { nextRandom } from './random'

export function createEnemySlot(body: BodyBounds): ArenaEnemy {
  return {
    id: 0,
    kind: 'seeker',
    x: 0,
    y: 0,
    previousX: 0,
    previousY: 0,
    previousFacingX: 1,
    vx: 0,
    vy: 0,
    health: 0,
    maxHealth: 0,
    facingX: 1,
    facingY: 0,
    moving: false,
    hitUntilTick: 0,
    invulnerableUntilTick: 0,
    body,
    speed: 0,
    damage: 0,
    directionX: 0,
    directionY: 0,
    idling: false,
    phaseUntilTick: 0,
  }
}

export function validateSpawnSpace(
  settings: ValidatedArenaConfig,
  bodies: Record<ArenaRole, BodyBounds>,
) {
  for (const kind of ['seeker', 'drifter'] as const) {
    const body = bodies[kind]
    // Mesmo do centro do retângulo elegível, pelo menos um canto precisa ser seguro.
    const guaranteedDistance =
      Math.hypot(settings.width - body.width, settings.height - body.height) / 2
    if (settings.safeSpawnDistance > guaranteedDistance) {
      throw new Error(
        `config.safeSpawnDistance: o corpo ${kind} não garante uma posição segura; use no máximo ${Math.floor(guaranteedDistance)}.`,
      )
    }
  }
}

function candidate(state: ArenaState, body: BodyBounds) {
  const minX = -body.offsetX,
    maxX = state.config.width - body.offsetX - body.width
  const minY = -body.offsetY,
    maxY = state.config.height - body.offsetY - body.height
  const edge = Math.floor(nextRandom(state) * 4)
  const fraction = nextRandom(state)
  let x = edge === 1 ? maxX : edge === 3 ? minX : minX + fraction * (maxX - minX)
  const y = edge === 0 ? minY : edge === 2 ? maxY : minY + fraction * (maxY - minY)
  const facingX = state.player.x < x ? -1 : 1
  const offsetX = bodyOffsetX(body, facingX)
  x = Math.max(-offsetX, Math.min(state.config.width - offsetX - body.width, x))
  return { x, y, facingX }
}

export function spawnDueEnemy(state: ArenaState, tick: number, events: ArenaEvent[]) {
  if (tick < state.spawnAtTick) return
  // Um único prazo representa a intenção pendente. Não existe fila de ondas atrasadas.
  state.spawnAtTick = tick + state.config.spawnTicks
  if (state.freeEnemies.length === 0) {
    state.spawnBlocked++
    return
  }
  const kind: EnemyKind = nextRandom(state) < 0.5 ? 'seeker' : 'drifter'
  const body = state.bodies[kind]
  for (let attempt = 0; attempt < 4; attempt++) {
    const position = candidate(state, body)
    if (
      Math.hypot(position.x - state.player.x, position.y - state.player.y) <
      state.config.safeSpawnDistance
    )
      continue
    const enemy = state.freeEnemies.pop()!
    const vector = direction(state.player.x - position.x, state.player.y - position.y, 1)
    // Reescrever todos os campos evita transportar dano, direção ou timers entre spawns.
    Object.assign(enemy, createEnemySlot(body), {
      id: state.nextEnemyId++,
      kind,
      x: position.x,
      y: position.y,
      previousX: position.x,
      previousY: position.y,
      previousFacingX: position.facingX,
      facingX: position.facingX,
      facingY: Math.sign(vector.y),
      health: state.config[`${kind}Health`],
      maxHealth: state.config[`${kind}Health`],
      speed: state.config[`${kind}Speed`],
      damage: state.config[`${kind}Damage`],
      directionX: vector.x,
      directionY: vector.y,
      phaseUntilTick: tick + state.config.drifterMoveTicks,
    })
    state.enemies.push(enemy)
    events.push({ type: 'spawn', tick, entityId: enemy.id, kind, x: enemy.x, y: enemy.y })
    return
  }
  state.spawnBlocked++
}
