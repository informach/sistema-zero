import type { CharacterRole } from '../characters'
import type { ArenaEvent } from '../model'

export interface VisualEffect {
  kind: 'spark' | 'ring' | 'death'
  x: number
  y: number
  vx: number
  vy: number
  age: number
  duration: number
  color: string
  radius: number
  role?: CharacterRole
}
export interface VisualPreferences {
  reducedQuality: boolean
  reducedMotion: boolean
}
export const MAX_EFFECTS = 256
const colors = { player: '#a6f6ce', seeker: '#ffb48c', drifter: '#d3beff' }

export function createEffects() {
  const effects: VisualEffect[] = []
  // Presentation owns its PRNG. Changes to particles never consume gameplay randomness.
  let randomState = 0x73ac19f2
  const random = () => {
    randomState ^= randomState << 13
    randomState ^= randomState >>> 17
    randomState ^= randomState << 5
    return (randomState >>> 0) / 4294967296
  }
  const append = (effect: VisualEffect, limit: number) => {
    if (effects.length < Math.min(MAX_EFFECTS, limit)) effects.push(effect)
  }
  return {
    list: effects as readonly VisualEffect[],
    add(events: readonly ArenaEvent[], preferences: VisualPreferences) {
      const limit = preferences.reducedQuality ? 64 : MAX_EFFECTS
      for (const event of events) {
        if (event.type === 'pulse') {
          append(
            {
              kind: 'ring',
              x: event.x,
              y: event.y,
              vx: 0,
              vy: 0,
              age: 0,
              duration: preferences.reducedMotion ? 0.12 : 0.32,
              color: '#a6f6ce',
              radius: event.radius,
            },
            limit,
          )
        } else if (event.type === 'defeat') {
          append(
            {
              kind: 'death',
              role: event.kind,
              x: event.x,
              y: event.y,
              vx: 0,
              vy: 0,
              age: 0,
              duration: 0.38,
              color: colors[event.kind],
              radius: 0,
            },
            limit,
          )
        }
        if (preferences.reducedMotion || !['hit', 'defeat'].includes(event.type)) continue
        const role =
          event.type === 'hit' ? event.role : event.type === 'defeat' ? event.kind : 'player'
        const count = preferences.reducedQuality ? 2 : event.type === 'defeat' ? 7 : 4
        for (let i = 0; i < count; i++) {
          const angle = random() * Math.PI * 2,
            speed = 25 + random() * 55
          append(
            {
              kind: 'spark',
              x: event.x,
              y: event.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              age: 0,
              duration: 0.3 + random() * 0.2,
              color: colors[role],
              radius: 2 + random() * 2,
            },
            limit,
          )
        }
      }
    },
    advance(seconds: number) {
      const dt = Math.min(0.05, Math.max(0, Number.isFinite(seconds) ? seconds : 0))
      for (let index = effects.length - 1; index >= 0; index--) {
        const effect = effects[index]!
        effect.age += dt
        if (effect.age >= effect.duration) effects.splice(index, 1)
        else {
          effect.x += effect.vx * dt
          effect.y += effect.vy * dt
        }
      }
    },
    reset() {
      effects.length = 0
      randomState = 0x73ac19f2
    },
  }
}
