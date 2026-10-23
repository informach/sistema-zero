import { TICK_SECONDS } from '../config'
import type { ArenaActor, ArenaEnemy, ArenaInput, ArenaState } from '../model'
import { bodyOffsetX } from './collisions'
import { nextRandom } from './random'

export function direction(x: number, y: number, fallbackX = 0): { x: number; y: number } {
  const scale = Math.max(Math.abs(x), Math.abs(y))
  if (scale === 0) return { x: fallbackX, y: 0 }
  const length = Math.hypot(x / scale, y / scale)
  return { x: x / scale / length, y: y / scale / length }
}

export function clampActor(actor: ArenaActor, width: number, height: number) {
  const left = bodyOffsetX(actor.body, actor.facingX)
  actor.x = Math.max(-left, Math.min(width - left - actor.body.width, actor.x))
  actor.y = Math.max(
    -actor.body.offsetY,
    Math.min(height - actor.body.offsetY - actor.body.height, actor.y),
  )
}

function integrate(actor: ArenaActor, dx: number, dy: number, speed: number, state: ArenaState) {
  actor.previousX = actor.x
  actor.previousY = actor.y
  actor.previousFacingX = actor.facingX
  if (dx !== 0) actor.facingX = Math.sign(dx)
  if (dx !== 0 || dy !== 0) actor.facingY = Math.sign(dy)
  actor.x += (dx * speed + actor.vx) * TICK_SECONDS
  actor.y += (dy * speed + actor.vy) * TICK_SECONDS
  const pushSpeed = Math.hypot(actor.vx, actor.vy)
  const nextSpeed = Math.max(0, pushSpeed - state.config.pushbackDecay * TICK_SECONDS)
  const ratio = pushSpeed > 0 ? nextSpeed / pushSpeed : 0
  actor.vx *= ratio
  actor.vy *= ratio
  clampActor(actor, state.config.width, state.config.height)
  actor.moving = actor.x !== actor.previousX || actor.y !== actor.previousY
}

function enemyDirection(state: ArenaState, enemy: ArenaEnemy, tick: number) {
  if (tick < enemy.hitUntilTick) return { x: 0, y: 0 }
  if (enemy.kind === 'seeker') return direction(state.player.x - enemy.x, state.player.y - enemy.y)
  if (tick >= enemy.phaseUntilTick) {
    enemy.idling = !enemy.idling
    enemy.phaseUntilTick =
      tick + (enemy.idling ? state.config.drifterIdleTicks : state.config.drifterMoveTicks)
    if (!enemy.idling) {
      const angle = nextRandom(state) * Math.PI * 2
      enemy.directionX = Math.cos(angle)
      enemy.directionY = Math.sin(angle)
    }
  }
  return enemy.idling ? { x: 0, y: 0 } : { x: enemy.directionX, y: enemy.directionY }
}

export function moveActors(state: ArenaState, input: ArenaInput, tick: number) {
  const vector =
    tick < state.player.hitUntilTick || state.player.health <= 0
      ? { x: 0, y: 0 }
      : direction(input.x, input.y)
  integrate(state.player, vector.x, vector.y, state.config.playerSpeed, state)
  for (const enemy of state.enemies) {
    const vector = enemyDirection(state, enemy, tick)
    integrate(enemy, vector.x, vector.y, enemy.speed, state)
  }
}
