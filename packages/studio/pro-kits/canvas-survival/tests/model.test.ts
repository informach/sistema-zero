import { describe, expect, test } from 'bun:test'
import { TICK_RATE, TICK_SECONDS, validateConfig } from '../src/config'
import {
  type ArenaConfig,
  type ArenaEnemy,
  type ArenaInput,
  type ArenaState,
  createArenaState,
  stepArena,
} from '../src/model'
import { actorBounds, circleIntersectsAabb, overlaps, sweptAabbTime } from '../src/rules/collisions'
import { createEnemySlot } from '../src/rules/spawning'

const still: ArenaInput = { x: 0, y: 0, pulse: false }

function arena(config: Partial<ArenaConfig> = {}) {
  return createArenaState({
    seed: 42,
    config: { spawnSeconds: 60, playerPushback: 0, hitStunSeconds: 0, ...config },
  })
}

/** Fixtures constroem estados reais de partida, sem APIs de produção que forcem resultado. */
function enemy(state: ArenaState, changes: Partial<ArenaEnemy> = {}) {
  const kind = changes.kind ?? 'seeker'
  const slot = state.freeEnemies.pop()!
  Object.assign(
    slot,
    createEnemySlot(state.bodies[kind]),
    {
      id: state.nextEnemyId++,
      kind,
      x: state.player.x,
      y: state.player.y,
      previousX: state.player.x,
      previousY: state.player.y,
      health: 3,
      maxHealth: 3,
      damage: 1,
      phaseUntilTick: 100000,
    },
    changes,
  )
  state.enemies.push(slot)
  return slot
}

describe('configuração e identidade da arena', () => {
  test('converte segundos em ticks uma vez e valida limites com o nome do campo', () => {
    expect(validateConfig({ surviveSeconds: 0.025 }).surviveTicks).toBe(2)
    expect(validateConfig({ hitStunSeconds: 0 }).hitStunTicks).toBe(0)
    for (const [field, value] of [
      ['playerSpeed', NaN],
      ['spawnSeconds', 0],
      ['maxEnemies', 65],
      ['defeatGoal', 1.5],
      ['playerHealth', Infinity],
      ['pulseDamage', -1],
    ] as const) {
      expect(() => validateConfig({ [field]: value })).toThrow(field)
    }
    expect(() => validateConfig({ playerSpeeed: 1 } as Partial<ArenaConfig>)).toThrow(
      'playerSpeeed',
    )
  })

  test('recusa corpo que não cabe, distância impossível e seed inválida', () => {
    expect(() =>
      createArenaState({ bodies: { seeker: { offsetX: 0, offsetY: 0, width: 721, height: 20 } } }),
    ).toThrow('bodies.seeker.width')
    expect(() => createArenaState({ config: { safeSpawnDistance: 500 } })).toThrow(
      'safeSpawnDistance',
    )
    expect(() => createArenaState({ seed: -1 })).toThrow('seed')
    expect(() => createArenaState({ seed: 1.2 })).toThrow('seed')
    expect(createArenaState({ seed: 0 }).seed).toBe(0)
  })

  test('configuração e corpos são independentes entre partidas e do chamador', () => {
    const body = { offsetX: -4, offsetY: -6, width: 8, height: 12 }
    const a = createArenaState({ bodies: { player: body } })
    const b = createArenaState({ bodies: { player: body } })
    body.width = 50
    a.player.body.width = 70
    expect(b.player.body.width).toBe(8)
    expect(b.config.playerBody.width).toBe(24)
  })

  test('controller pode entregar configuração já validada; timers são recalculados', () => {
    const settings = validateConfig({ surviveSeconds: 15, pulseCooldownSeconds: 0.1 })
    const state = createArenaState({ config: settings, seed: 19 })
    expect(state.config).toEqual(settings)
    settings.surviveSeconds = 20
    settings.surviveTicks = -1
    const next = createArenaState({ config: settings, seed: 19 })
    expect(next.config.surviveTicks).toBe(1200)
    expect(state.config.surviveTicks).toBe(900)
  })

  test('um input inválido não avança nem corrompe a simulação', () => {
    const state = arena()
    const before = structuredClone(state)
    expect(() => stepArena(state, { ...still, x: NaN })).toThrow('input')
    expect(state).toEqual(before)
  })
})

describe('movimento e relógio fixo', () => {
  test('diagonal percorre a mesma distância que um eixo', () => {
    const horizontal = arena({ playerSpeed: 60 })
    const diagonal = arena({ playerSpeed: 60 })
    for (let tick = 0; tick < TICK_RATE; tick++) {
      stepArena(horizontal, { x: 1, y: 0, pulse: false })
      stepArena(diagonal, { x: 1, y: 1, pulse: false })
    }
    expect(horizontal.player.x - 360).toBeCloseTo(60, 8)
    expect(Math.hypot(diagonal.player.x - 360, diagonal.player.y - 270)).toBeCloseTo(60, 8)
  })

  test('limita a hitbox ao mundo, incluindo offset assimétrico e flip', () => {
    const state = createArenaState({
      config: { spawnSeconds: 60, playerSpeed: 1200 },
      bodies: { player: { offsetX: -18, offsetY: 2, width: 4, height: 5 } },
    })
    for (let tick = 0; tick < 100; tick++) stepArena(state, { x: -1, y: -1, pulse: false })
    expect(actorBounds(state.player).x).toBeCloseTo(0)
    expect(actorBounds(state.player).y).toBeCloseTo(0)
    expect(state.player.facingX).toBe(-1)
    for (let tick = 0; tick < 100; tick++) stepArena(state, { x: 1, y: 1, pulse: false })
    const box = actorBounds(state.player)
    expect(box.x + box.width).toBeCloseTo(state.config.width)
    expect(box.y + box.height).toBeCloseTo(state.config.height)
  })

  test('mesma seed e inputs por tick produzem o mesmo estado sob render a 30/60/120 Hz', () => {
    function run(renderHz: number) {
      const state = createArenaState({
        seed: 985,
        config: { playerHealth: 100, surviveSeconds: 3600 },
      })
      let accumulated = 0
      for (let frame = 0; frame < renderHz * 8; frame++) {
        accumulated += 1 / renderHz
        let steps = 0
        while (accumulated + 1e-12 >= TICK_SECONDS && steps < 3) {
          const phase = Math.floor(state.tick / 120) % 4
          stepArena(state, {
            x: phase === 0 ? 1 : phase === 2 ? -1 : 0,
            y: phase === 1 ? 1 : phase === 3 ? -1 : 0,
            pulse: state.tick % 50 === 0,
          })
          accumulated -= TICK_SECONDS
          steps++
        }
      }
      expect(state.tick).toBe(480)
      return state
    }
    expect(run(30)).toEqual(run(60))
    expect(run(120)).toEqual(run(60))
  })

  test('recriar uma partida com a seed original restaura modelo e PRNG', () => {
    const options = { seed: 0, config: { surviveSeconds: 3600, playerHealth: 100 } }
    const a = createArenaState(options)
    const b = createArenaState(options)
    for (let tick = 0; tick < 600; tick++) {
      const input = { x: 0, y: 0, pulse: tick % 42 === 0 }
      stepArena(a, input)
      // Sorteios decorativos externos não influenciam o PRNG do modelo.
      Math.random()
      stepArena(b, input)
    }
    expect(a).toEqual(b)
    expect(createArenaState(options)).toEqual(createArenaState(options))
    const other = createArenaState({ ...options, seed: 1 })
    for (let tick = 0; tick < 600; tick++) stepArena(other, still)
    expect(other.randomState).not.toBe(a.randomState)
  })
})

describe('combate, objetivos e apresentação', () => {
  test('pulso elimina antes do contato e pontua uma vez sem esperar animação', () => {
    const state = arena()
    const target = enemy(state, { health: 1, maxHealth: 1 })
    const id = target.id
    const events = stepArena(state, { ...still, pulse: true })
    expect(state.player.health).toBe(state.player.maxHealth)
    expect(state.defeated).toBe(1)
    expect(state.enemies).toHaveLength(0)
    expect(state.freeEnemies).toHaveLength(state.config.maxEnemies)
    expect(
      events.filter((event) => event.type === 'defeat').map((event) => event.entityId),
    ).toEqual([id])
    expect(stepArena(state, still).some((event) => event.type === 'defeat')).toBe(false)
  })

  test('um pulso acerta cada alvo uma vez e sobreviventes ainda causam contato', () => {
    const state = arena()
    const target = enemy(state)
    const events = stepArena(state, { ...still, pulse: true })
    expect(target.health).toBe(2)
    expect(state.player.health).toBe(state.player.maxHealth - 1)
    expect(events.filter((event) => event.type === 'hit' && event.role === 'seeker')).toHaveLength(
      1,
    )
    expect(Number.isFinite(target.vx)).toBe(true)
    expect(Number.isFinite(target.vy)).toBe(true)
  })

  test('cooldown rejeita bordas sem enfileirar disparo futuro', () => {
    const state = arena({ pulseCooldownSeconds: 0.1 })
    expect(
      stepArena(state, { ...still, pulse: true }).some((event) => event.type === 'pulse'),
    ).toBe(true)
    for (let tick = 2; tick <= 6; tick++)
      expect(
        stepArena(state, { ...still, pulse: true }).some((event) => event.type === 'pulse'),
      ).toBe(false)
    expect(stepArena(state, still).some((event) => event.type === 'pulse')).toBe(false)
    expect(
      stepArena(state, { ...still, pulse: true }).some((event) => event.type === 'pulse'),
    ).toBe(true)
  })

  test('vários contatos usam identidade estável e invulnerabilidade vence no tick correto', () => {
    const state = arena({ playerHealth: 10, playerInvulnerabilitySeconds: 2 / 60 })
    enemy(state, { damage: 1 })
    enemy(state, { damage: 4 })
    stepArena(state, still)
    expect(state.player.health).toBe(9)
    stepArena(state, still)
    expect(state.player.health).toBe(9)
    stepArena(state, still)
    expect(state.player.health).toBe(8)
  })

  test('derrota prevalece sobre eliminações e tempo no mesmo tick; resultado congela o modelo', () => {
    const state = arena({ playerHealth: 1, defeatGoal: 1, surviveSeconds: 1 / 60 })
    enemy(state, { health: 1 })
    enemy(state, { health: 2 })
    const events = stepArena(state, { ...still, pulse: true })
    expect(state.defeated).toBe(1)
    expect(state.tick).toBe(state.config.surviveTicks)
    expect(state.result).toBe('lost')
    expect(events.filter((event) => event.type === 'result')).toEqual([
      { type: 'result', tick: 1, x: 360, y: 270, result: 'lost', score: 1 },
    ])
    const final = structuredClone(state)
    expect(stepArena(state, { x: 1, y: 1, pulse: true })).toEqual([])
    expect(state).toEqual(final)
  })

  test('eliminações prevalecem no rótulo de vitória simultânea; tempo funciona separadamente', () => {
    const defeats = arena({ defeatGoal: 1, surviveSeconds: 1 / 60 })
    enemy(defeats, { health: 1 })
    stepArena(defeats, { ...still, pulse: true })
    expect(defeats.result).toBe('win-defeats')
    const time = arena({ surviveSeconds: 0.025 })
    expect(stepArena(time, still).some((event) => event.type === 'result')).toBe(false)
    expect(time.result).toBeNull()
    expect(stepArena(time, still).filter((event) => event.type === 'result')).toHaveLength(1)
    expect(time.result).toBe('win-time')
  })
})

describe('geometria de colisão', () => {
  test('swept relativo encontra cruzamento sem sobreposição final e rejeita faixas separadas', () => {
    const a0 = { x: 0, y: 0, width: 1, height: 1 },
      a1 = { ...a0, x: 20 }
    const b0 = { x: 20, y: 0, width: 1, height: 1 },
      b1 = { ...b0, x: 0 }
    expect(overlaps(a1, b1)).toBe(false)
    expect(sweptAabbTime(a0, a1, b0, b1)).toBeCloseTo(19 / 40)
    expect(sweptAabbTime(a0, a1, { ...b0, y: 2 }, { ...b1, y: 2 })).toBeNull()
    expect(sweptAabbTime(a0, a0, b0, b0)).toBeNull()
  })

  test('sobreposição inicial e tangência são contatos válidos', () => {
    const a = { x: 0, y: 0, width: 2, height: 2 }
    expect(sweptAabbTime(a, { ...a, x: -10 }, { ...a, x: 1 }, { ...a, x: 1 })).toBe(0)
    expect(sweptAabbTime(a, a, { ...a, x: 2 }, { ...a, x: 2 })).toBe(0)
    expect(circleIntersectsAabb(-1, 1, 1, a)).toBe(true)
    expect(circleIntersectsAabb(-1.01, 1, 1, a)).toBe(false)
  })

  test('hitbox estreita não atravessa inimigo rápido sem receber contato', () => {
    const body = { offsetX: -0.5, offsetY: -0.5, width: 1, height: 1 }
    const state = createArenaState({
      config: { spawnSeconds: 60, playerSpeed: 1200, playerPushback: 0, hitStunSeconds: 0 },
      bodies: { player: body, seeker: body },
    })
    state.player.x = 100
    const target = enemy(state, { x: 110, y: state.player.y })
    stepArena(state, { x: 1, y: 0, pulse: false })
    expect(state.player.x).toBe(120)
    expect(overlaps(actorBounds(state.player), actorBounds(target))).toBe(false)
    expect(state.player.health).toBe(state.player.maxHealth - 1)
  })

  test('espelha offset da caixa, sem trocar seu tamanho', () => {
    const state = arena()
    state.player.body = { offsetX: -18, offsetY: -5, width: 4, height: 10 }
    expect(actorBounds(state.player).x).toBe(342)
    state.player.facingX = -1
    expect(actorBounds(state.player)).toEqual({ x: 374, y: 265, width: 4, height: 10 })
  })
})

describe('spawn, capacidade e reaproveitamento', () => {
  test('pool cheio não acumula ondas nem consome sorteios de spawn', () => {
    const state = arena({
      maxEnemies: 1,
      spawnSeconds: 1 / 60,
      seekerSpeed: 0,
      drifterSpeed: 0,
      drifterMoveSeconds: 60,
    })
    stepArena(state, still)
    const random = state.randomState
    for (let tick = 0; tick < 30; tick++) stepArena(state, still)
    expect(state.enemies).toHaveLength(1)
    expect(state.freeEnemies).toHaveLength(0)
    expect(state.nextEnemyId).toBe(2)
    expect(state.randomState).toBe(random)
    expect(state.spawnBlocked).toBe(30)
    expect(state.spawnAtTick).toBe(state.tick + 1)
  })

  test('slot liberado recicla identidade e todos os timers sem modificar eventos antigos', () => {
    const state = arena({
      maxEnemies: 1,
      spawnSeconds: 1 / 60,
      seekerSpeed: 0,
      drifterSpeed: 0,
      pulseDamage: 100,
    })
    stepArena(state, still)
    const old = state.enemies[0]
    old.x = state.player.x
    old.y = state.player.y
    old.vx = 10
    old.vy = -10
    old.hitUntilTick = 999
    old.invulnerableUntilTick = 999
    old.phaseUntilTick = 999
    old.idling = true
    const events = stepArena(state, { ...still, pulse: true })
    const death = events.find((event) => event.type === 'defeat')!
    expect(state.enemies).toHaveLength(0)
    expect(state.freeEnemies).toHaveLength(1)
    const after = stepArena(state, still)
    expect(state.enemies).toHaveLength(1)
    const fresh = state.enemies[0]
    expect(fresh).toBe(old)
    expect(fresh.id).toBe(2)
    expect(fresh.health).toBe(fresh.maxHealth)
    expect(fresh.hitUntilTick).toBe(0)
    expect(fresh.invulnerableUntilTick).toBe(0)
    expect(fresh.idling).toBe(false)
    expect(fresh.vx).toBe(0)
    expect(fresh.vy).toBe(0)
    expect(after.filter((event) => event.type === 'spawn')).toHaveLength(1)
    expect(death.entityId).toBe(1)
  })

  test('ocupação respeita 64 slots e spawns respeitam a distância segura', () => {
    const state = arena({
      spawnSeconds: 1 / 60,
      seekerSpeed: 0,
      drifterSpeed: 0,
      playerHealth: 1000,
    })
    for (let tick = 0; tick < 300; tick++) {
      for (const event of stepArena(state, still)) {
        if (event.type === 'spawn')
          expect(
            Math.hypot(event.x - state.player.x, event.y - state.player.y),
          ).toBeGreaterThanOrEqual(state.config.safeSpawnDistance)
      }
      expect(state.enemies.length + state.freeEnemies.length).toBe(64)
    }
    expect(state.enemies).toHaveLength(64)
    expect(state.nextEnemyId).toBe(65)
  })

  test('perseguidor se aproxima e errante alterna movimento/repouso por ticks', () => {
    const state = arena({ drifterMoveSeconds: 2 / 60, drifterIdleSeconds: 2 / 60 })
    const seeker = enemy(state, { x: 100, y: 100, speed: 60 })
    const drifter = enemy(state, {
      kind: 'drifter',
      x: 100,
      y: 400,
      speed: 60,
      directionX: 1,
      directionY: 0,
      phaseUntilTick: 2,
    })
    const distance = Math.hypot(seeker.x - state.player.x, seeker.y - state.player.y)
    stepArena(state, still)
    expect(Math.hypot(seeker.x - state.player.x, seeker.y - state.player.y)).toBeLessThan(distance)
    expect(drifter.x).toBe(101)
    stepArena(state, still)
    expect(drifter.idling).toBe(true)
    expect(drifter.x).toBe(101)
    stepArena(state, still)
    expect(drifter.x).toBe(101)
    stepArena(state, still)
    expect(drifter.idling).toBe(false)
    expect(Math.hypot(drifter.x - 101, drifter.y - 400)).toBeCloseTo(1)
  })
})
