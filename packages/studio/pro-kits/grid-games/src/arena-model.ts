import { type Cell, cellKey, directions, distance, sameCell, seededRandom } from './grid'

export interface ArenaConfig {
  columns: number
  rows: number
  spawn: Cell
  walls: readonly Cell[]
  crates: readonly Cell[]
  targetSpawns: readonly Cell[]
  targetCount: number
  fuseTicks: number
  pulseTicks: number
  movementTicks: number
  range: number
  maxCharges: number
}
export interface Charge extends Cell {
  id: number
  remaining: number
}
export interface Pulse {
  cells: Cell[]
  remaining: number
}
export type ArenaCommand = { move?: Cell; place?: boolean }

/** Fixed-step model; walls stop a pulse, crates receive it and stop it, charges can chain. */
export class GridArena {
  tick = 0
  seed = 1
  score = 0
  outcome: 'playing' | 'won' | 'lost' = 'playing'
  player: Cell
  charges: Charge[] = []
  pulses: Pulse[] = []
  targets: Cell[] = []
  private crates = new Set<string>()
  private walls: Set<string>
  private cooldown = 0
  private serial = 0
  readonly config: ArenaConfig
  constructor(config: ArenaConfig, seed: number) {
    this.config = structuredClone(config)
    if (
      !Number.isInteger(config.columns) ||
      !Number.isInteger(config.rows) ||
      config.columns < 5 ||
      config.rows < 5 ||
      config.columns > 21 ||
      config.rows > 21 ||
      !Number.isInteger(config.maxCharges) ||
      config.maxCharges < 1 ||
      config.maxCharges > 8 ||
      !Number.isInteger(config.range) ||
      config.range < 1 ||
      config.range > 5 ||
      !Number.isInteger(config.fuseTicks) ||
      config.fuseTicks < 6 ||
      config.fuseTicks > 360 ||
      !Number.isInteger(config.pulseTicks) ||
      config.pulseTicks < 1 ||
      config.pulseTicks > 60 ||
      !Number.isInteger(config.movementTicks) ||
      config.movementTicks < 1 ||
      config.movementTicks > 30 ||
      !Number.isInteger(config.targetCount) ||
      config.targetCount < 1 ||
      config.targetCount > config.targetSpawns.length ||
      config.targetCount > 12
    )
      throw new Error('Configuração da arena fora dos limites.')
    this.walls = new Set(config.walls.map(cellKey))
    this.player = { ...config.spawn }
    for (const cell of [config.spawn, ...config.walls, ...config.crates, ...config.targetSpawns])
      if (!this.inside(cell)) throw new Error('Uma célula da arena está fora do tabuleiro.')
    if (
      this.walls.has(cellKey(config.spawn)) ||
      this.walls.size !== config.walls.length ||
      new Set(config.crates.map(cellKey)).size !== config.crates.length ||
      config.crates.some((cell) => sameCell(cell, config.spawn) || this.walls.has(cellKey(cell))) ||
      config.targetSpawns.some(
        (cell) =>
          this.walls.has(cellKey(cell)) ||
          config.crates.some((crate) => sameCell(crate, cell)) ||
          sameCell(cell, config.spawn),
      ) ||
      new Set(config.targetSpawns.map(cellKey)).size !== config.targetSpawns.length
    )
      throw new Error('As posições iniciais da arena se sobrepõem.')
    this.reset(seed)
  }
  private inside(cell: Cell): boolean {
    return (
      Number.isInteger(cell.x) &&
      Number.isInteger(cell.y) &&
      cell.x >= 0 &&
      cell.y >= 0 &&
      cell.x < this.config.columns &&
      cell.y < this.config.rows
    )
  }
  tile(x: number, y: number): number {
    const key = `${x},${y}`
    return this.walls.has(key) ? 1 : this.crates.has(key) ? 2 : 0
  }
  reset(seed: number): void {
    this.seed = seed >>> 0 || 1
    this.tick = 0
    this.score = 0
    this.serial = 0
    this.cooldown = 0
    this.outcome = 'playing'
    this.player = { ...this.config.spawn }
    this.charges = []
    this.pulses = []
    this.crates = new Set(this.config.crates.map(cellKey))
    const random = seededRandom(this.seed),
      candidates = this.config.targetSpawns.map((cell) => ({ ...cell }))
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!]
    }
    this.targets = candidates.slice(0, this.config.targetCount)
  }
  step(command: ArenaCommand = {}): void {
    if (this.outcome !== 'playing') return
    this.tick++
    this.cooldown = Math.max(0, this.cooldown - 1)
    this.pulses = this.pulses.filter((pulse) => --pulse.remaining > 0)
    if (
      command.place &&
      this.charges.length < this.config.maxCharges &&
      !this.charges.some((charge) => sameCell(charge, this.player))
    )
      this.charges.push({ ...this.player, id: ++this.serial, remaining: this.config.fuseTicks })
    if (command.move && distance({ x: 0, y: 0 }, command.move) === 1 && this.cooldown === 0) {
      const next = { x: this.player.x + command.move.x, y: this.player.y + command.move.y }
      if (
        this.inside(next) &&
        !this.walls.has(cellKey(next)) &&
        !this.crates.has(cellKey(next)) &&
        !this.charges.some((charge) => sameCell(charge, next))
      ) {
        this.player = next
        this.cooldown = this.config.movementTicks
      }
    }
    const due = this.charges.filter((charge) => --charge.remaining <= 0).map((charge) => charge.id)
    for (let index = 0; index < due.length; index++) {
      const charge = this.charges.find((entry) => entry.id === due[index])
      if (!charge) continue
      this.charges = this.charges.filter((entry) => entry.id !== charge.id)
      const cells: Cell[] = [{ x: charge.x, y: charge.y }]
      for (const direction of directions)
        for (let step = 1; step <= this.config.range; step++) {
          const cell = { x: charge.x + direction.x * step, y: charge.y + direction.y * step },
            key = cellKey(cell)
          if (!this.inside(cell) || this.walls.has(key)) break
          cells.push(cell)
          if (this.crates.delete(key)) {
            this.score += 10
            break
          }
        }
      const hit = new Set(cells.map(cellKey))
      for (const chained of this.charges)
        if (hit.has(cellKey(chained)) && !due.includes(chained.id)) due.push(chained.id)
      const remaining = this.targets.filter((target) => !hit.has(cellKey(target)))
      this.score += (this.targets.length - remaining.length) * 100
      this.targets = remaining
      this.pulses.push({ cells, remaining: this.config.pulseTicks })
    }
    // Losing takes precedence when a pulse hits the player and the last target in the same tick.
    if (this.pulses.some((pulse) => pulse.cells.some((cell) => sameCell(cell, this.player))))
      this.outcome = 'lost'
    else if (!this.targets.length) this.outcome = 'won'
  }
  snapshot() {
    return {
      tick: this.tick,
      seed: this.seed,
      score: this.score,
      goal: this.config.targetCount,
      rules: {
        range: this.config.range,
        fuseTicks: this.config.fuseTicks,
        movementTicks: this.config.movementTicks,
      },
      outcome: this.outcome,
      player: { ...this.player },
      targets: this.targets.map((cell) => ({ ...cell })),
      board: Array.from({ length: this.config.rows }, (_, y) =>
        Array.from({ length: this.config.columns }, (_, x) =>
          this.walls.has(cellKey({ x, y })) ? 1 : this.crates.has(cellKey({ x, y })) ? 2 : 0,
        ),
      ),
      charges: this.charges.map((charge) => ({ ...charge })),
      pulses: this.pulses.map((pulse) => ({
        remaining: pulse.remaining,
        cells: pulse.cells.map((cell) => ({ ...cell })),
      })),
    }
  }
}
