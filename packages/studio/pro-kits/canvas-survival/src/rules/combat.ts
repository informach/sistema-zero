import type { ArenaEvent, ArenaState } from '../model'
import { actorBounds, circleIntersectsAabb, sweptAabbTime } from './collisions'
import { direction } from './movement'

export function resolvePulse(
  state: ArenaState,
  pressed: boolean,
  tick: number,
  events: ArenaEvent[],
) {
  const player = state.player
  if (!pressed || player.health <= 0 || tick < state.pulseReadyTick) return
  state.pulseReadyTick = tick + state.config.pulseCooldownTicks
  events.push({ type: 'pulse', tick, x: player.x, y: player.y, radius: state.config.pulseRadius })
  for (let index = 0; index < state.enemies.length; ) {
    const enemy = state.enemies[index]!
    if (!circleIntersectsAabb(player.x, player.y, state.config.pulseRadius, actorBounds(enemy))) {
      index++
      continue
    }
    enemy.health = Math.max(0, enemy.health - state.config.pulseDamage)
    enemy.hitUntilTick = tick + state.config.hitStunTicks
    events.push({ type: 'hit', tick, entityId: enemy.id, role: enemy.kind, x: enemy.x, y: enemy.y })
    if (enemy.health === 0) {
      state.defeated++
      events.push({
        type: 'defeat',
        tick,
        entityId: enemy.id,
        kind: enemy.kind,
        x: enemy.x,
        y: enemy.y,
      })
      state.enemies.splice(index, 1)
      state.freeEnemies.push(enemy)
      continue
    }
    const vector = direction(enemy.x - player.x, enemy.y - player.y, enemy.id % 2 === 0 ? 1 : -1)
    enemy.vx = vector.x * state.config.pulsePushback
    enemy.vy = vector.y * state.config.pulsePushback
    index++
  }
}

export function resolveContacts(state: ArenaState, tick: number, events: ArenaEvent[]) {
  const player = state.player
  if (player.health <= 0 || tick < player.invulnerableUntilTick) return
  const before = actorBounds(player, true),
    after = actorBounds(player)
  for (const enemy of state.enemies) {
    const time = sweptAabbTime(before, after, actorBounds(enemy, true), actorBounds(enemy))
    if (time === null) continue
    player.health = Math.max(0, player.health - enemy.damage)
    player.invulnerableUntilTick = tick + state.config.playerInvulnerabilityTicks
    player.hitUntilTick = tick + state.config.hitStunTicks
    const dx =
      player.previousX +
      (player.x - player.previousX) * time -
      enemy.previousX -
      (enemy.x - enemy.previousX) * time
    const dy =
      player.previousY +
      (player.y - player.previousY) * time -
      enemy.previousY -
      (enemy.y - enemy.previousY) * time
    const vector = direction(dx, dy, enemy.id % 2 === 0 ? 1 : -1)
    player.vx = vector.x * state.config.playerPushback
    player.vy = vector.y * state.config.playerPushback
    events.push({
      type: 'hit',
      tick,
      entityId: player.id,
      role: 'player',
      x: player.x,
      y: player.y,
    })
    return
  }
}
