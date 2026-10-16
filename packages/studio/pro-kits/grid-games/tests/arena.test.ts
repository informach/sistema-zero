import { describe, expect, test } from 'bun:test'
import { config } from '../src/arena-config'
import { type ArenaConfig, GridArena } from '../src/arena-model'

const small = (overrides: Partial<ArenaConfig> = {}): ArenaConfig => ({
  columns: 7,
  rows: 7,
  spawn: { x: 1, y: 1 },
  walls: [],
  crates: [],
  targetSpawns: [{ x: 6, y: 6 }],
  targetCount: 1,
  fuseTicks: 8,
  pulseTicks: 2,
  movementTicks: 1,
  range: 2,
  maxCharges: 4,
  ...overrides,
})
const tick = (game: GridArena, count: number) => {
  for (let i = 0; i < count; i++) game.step()
}

describe('arena grid rules', () => {
  test('seed and restart reproduce the initial board/targets, snapshots cannot mutate the game', () => {
    const game = new GridArena(config, 42),
      initial = game.snapshot()
    game.step({ move: { x: 1, y: 0 }, place: true })
    game.reset(42)
    expect(game.snapshot()).toEqual(initial)
    const other = game.snapshot()
    other.player.x = 99
    other.targets[0]!.x = 99
    other.board[0]![0] = 0
    expect(game.snapshot()).toEqual(initial)
  })
  test('walls stop pulses before the wall; crates receive the pulse but stop its propagation', () => {
    const game = new GridArena(small({ walls: [{ x: 2, y: 1 }], crates: [{ x: 1, y: 3 }] }), 1)
    game.step({ place: true, move: { x: 0, y: 1 } })
    game.step({ move: { x: 1, y: 0 } })
    tick(game, 6)
    expect(game.outcome).toBe('playing')
    const state = game.snapshot(),
      cells = state.pulses.flatMap((pulse) => pulse.cells)
    expect(cells).not.toContainEqual({ x: 2, y: 1 })
    expect(cells).toContainEqual({ x: 1, y: 3 })
    expect(cells).not.toContainEqual({ x: 1, y: 4 })
    expect(state.board[3]![1]).toBe(0)
  })
  test('one expiring charge triggers the second before its own fuse expires, once per charge', () => {
    const game = new GridArena(small(), 1)
    game.step({ place: true, move: { x: 1, y: 0 } })
    game.step({ place: true, move: { x: 1, y: 0 } })
    game.step({ move: { x: 0, y: 1 } })
    game.step({ move: { x: 0, y: 1 } })
    tick(game, 4)
    expect(game.snapshot().charges).toHaveLength(0)
    expect(game.snapshot().pulses).toHaveLength(2)
    expect(game.outcome).toBe('playing')
  })
  test('cannot walk through obstacles or enter another charge; leaving your own charge is allowed', () => {
    const game = new GridArena(small({ walls: [{ x: 1, y: 0 }], crates: [{ x: 0, y: 1 }] }), 1)
    game.step({ move: { x: 0, y: -1 } })
    game.step({ move: { x: -1, y: 0 } })
    expect(game.player).toEqual({ x: 1, y: 1 })
    game.step({ place: true, move: { x: 1, y: 0 } })
    game.step({ move: { x: -1, y: 0 } })
    expect(game.player).toEqual({ x: 2, y: 1 })
  })
  test('win requires the actual pulse; self-hit takes priority and terminal states stop simulation', () => {
    const rules = small({ targetSpawns: [{ x: 3, y: 1 }] })
    const win = new GridArena(rules, 1)
    win.step({ place: true, move: { x: 0, y: 1 } })
    win.step({ move: { x: 1, y: 0 } })
    tick(win, 6)
    expect(win.outcome).toBe('won')
    expect(win.score).toBe(100)
    const lost = new GridArena(rules, 1)
    lost.step({ place: true })
    tick(lost, 7)
    expect(lost.outcome).toBe('lost')
    const stopped = lost.snapshot()
    tick(lost, 20)
    expect(lost.snapshot()).toEqual(stopped)
  })
})
