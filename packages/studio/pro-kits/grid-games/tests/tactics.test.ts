import { describe, expect, it } from 'bun:test'
import { config } from '../src/tactics-config'
import { Tactics, type TacticsConfig } from '../src/tactics-model'

const scenario = (change: Partial<TacticsConfig> = {}): TacticsConfig => ({
  terrain: Array.from({ length: 5 }, () => Array(5).fill(1)),
  home: { x: 0, y: 0 },
  moveRange: 2,
  recruitCost: 2,
  maxFriends: 4,
  initialCoins: 4,
  units: [
    { id: 'a', side: 'friend', role: 'guardian', x: 0, y: 0, health: 5, maxHealth: 5 },
    { id: 'b', side: 'rival', role: 'guardian', x: 4, y: 4, health: 3, maxHealth: 3 },
  ],
  ...change,
})
describe('regras táticas compartilhadas 2D/3D', () => {
  it('a configuração do chamador não altera partidas já criadas nem seus resets', () => {
    const settings = scenario(),
      game = new Tactics(settings)
    settings.units[0]!.health = 1
    settings.home.x = 4
    game.reset()
    expect(game.units[0]!.health).toBe(5)
    expect(game.cursor).toEqual({ x: 0, y: 0 })
  })
  it('rejeita objetivos isolados e mantém cursor inteiro diante de entrada inválida', () => {
    const settings = scenario(),
      terrain = settings.terrain.map((row) => [...row])
    for (const row of terrain) row[2] = 0
    expect(() => new Tactics({ ...settings, terrain })).toThrow('caminho de terra')
    const game = new Tactics(settings)
    game.moveCursor({ x: 0.5, y: 0.5 })
    expect(game.cursor).toEqual(settings.home)
  })
  it('BFS respeita água, ocupação e uma movimentação por turno', () => {
    const settings = scenario()
    const terrain = settings.terrain.map((row) => [...row])
    terrain[0]![1] = 0
    const game = new Tactics({ ...settings, terrain })
    expect(game.activate({ x: 2, y: 0 })).toBe(false)
    expect(game.activate({ x: 0, y: 2 })).toBe(true)
    expect(game.activate({ x: 0, y: 3 })).toBe(false)
    expect(game.moves(game.units[0]!)).toEqual([])
    game.endTurn()
    game.stepRival()
    expect(game.round).toBe(2)
    expect(game.units[0]!.moved).toBe(false)
  })
  it('ataque consome ação, bloqueia gestos durante oponente e alcança vitória/derrota', () => {
    const settings = scenario()
    const units = settings.units.map((unit) => ({ ...unit }))
    units[1] = { ...units[1]!, x: 1, y: 0, health: 2 }
    const win = new Tactics({ ...settings, units })
    expect(win.activate({ x: 1, y: 0 })).toBe(true)
    expect(win.outcome).toBe('won')
    expect(win.score).toBe(100)
    expect(win.activate({ x: 2, y: 0 })).toBe(false)
    units[0]!.health = 1
    units[1]!.health = 3
    const loss = new Tactics({ ...settings, units })
    loss.endTurn()
    expect(loss.activate({ x: 0, y: 1 })).toBe(false)
    expect(loss.recruit()).toBe(false)
    loss.stepRival()
    expect(loss.outcome).toBe('lost')
  })
  it('o caminho do oponente contorna barreiras mesmo começando a se afastar', () => {
    const settings = scenario()
    const terrain = settings.terrain.map((row) => [...row])
    terrain[1]![2] = 0
    terrain[2]![2] = 0
    terrain[3]![2] = 0
    const units = settings.units.map((unit) => ({ ...unit }))
    units[0] = { ...units[0]!, x: 1, y: 2 }
    units[1] = { ...units[1]!, x: 3, y: 2 }
    const game = new Tactics({ ...settings, terrain, units })
    for (let i = 0; i < 4; i++) {
      game.endTurn()
      game.stepRival()
    }
    expect(game.units[0]!.health).toBeLessThan(5)
  })
  it('recrutamento cobra moedas, limita equipe, evita IDs e espera o próximo turno', () => {
    const settings = scenario()
    const units = settings.units.map((unit) => ({ ...unit }))
    units[0]!.id = 'helper-1'
    const game = new Tactics({ ...settings, units, maxFriends: 2 })
    expect(game.recruit()).toBe(true)
    expect(game.coins).toBe(2)
    expect(game.units[2]!.id).toBe('helper-2')
    expect(game.units[2]!.acted).toBe(true)
    expect(game.recruit()).toBe(false)
    expect(new Set(game.units.map((unit) => unit.id)).size).toBe(game.units.length)
  })
  it('disparos não atravessam unidades nem quinas de água', () => {
    const settings = scenario()
    const terrain = settings.terrain.map((row) => [...row])
    terrain[0]![1] = 0
    const units = settings.units.map((unit) => ({ ...unit }))
    units[0]!.role = 'scout'
    units[1] = { ...units[1]!, x: 1, y: 1 }
    const game = new Tactics({ ...settings, terrain, units })
    expect(game.canAttack(game.units[0]!, game.units[1]!)).toBe(false)
  })
  it('inspeção é cópia e reinício restaura todas as regras', () => {
    const game = new Tactics(config),
      initial = game.snapshot(),
      view = game.snapshot()
    view.units[0]!.health = 0
    view.terrain[0]![0] = 2
    view.cursor.x = 20
    expect(game.snapshot()).toEqual(initial)
    game.recruit()
    game.endTurn()
    game.stepRival()
    game.reset()
    expect(game.snapshot()).toEqual(initial)
  })
})
