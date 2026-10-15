import { type Cell, cellKey, directions, distance, reachable, sameCell } from './grid'

export interface Unit extends Cell {
  id: string
  side: 'friend' | 'rival'
  role: 'guardian' | 'scout'
  health: number
  maxHealth: number
  moved: boolean
  acted: boolean
}
export interface TacticsConfig {
  /** 0 = water; 1 = grass; 2 = elevated ground. Drawing size is independent of occupancy. */
  terrain: readonly (readonly number[])[]
  units: readonly Omit<Unit, 'moved' | 'acted'>[]
  home: Cell
  moveRange: number
  recruitCost: number
  maxFriends: number
  initialCoins: number
}

/** One model for the 2D and 3D kits. Commands have the same rules under keyboard and picking. */
export class Tactics {
  units: Unit[] = []
  cursor: Cell
  selectedId: string | null = null
  round = 1
  coins = 0
  score = 0
  revision = 0
  turn: 'player' | 'rival' = 'player'
  outcome: 'playing' | 'won' | 'lost' = 'playing'
  private enemyOrder: string[] = []
  private recruitSerial = 0
  readonly rows: number
  readonly columns: number
  readonly config: TacticsConfig
  constructor(config: TacticsConfig) {
    this.config = structuredClone(config)
    this.rows = config.terrain.length
    this.columns = config.terrain[0]?.length ?? 0
    this.cursor = { ...config.home }
    if (
      this.rows < 3 ||
      this.columns < 3 ||
      this.rows > 12 ||
      this.columns > 12 ||
      config.terrain.some(
        (row) => row.length !== this.columns || row.some((tile) => ![0, 1, 2].includes(tile)),
      ) ||
      !Number.isInteger(config.moveRange) ||
      config.moveRange < 1 ||
      config.moveRange > 5 ||
      !Number.isInteger(config.maxFriends) ||
      config.maxFriends < 1 ||
      config.maxFriends > 6 ||
      !Number.isInteger(config.recruitCost) ||
      config.recruitCost < 1 ||
      !Number.isInteger(config.initialCoins) ||
      config.initialCoins < 0 ||
      config.initialCoins > 10 ||
      config.units.length < 2 ||
      config.units.length > 12
    )
      throw new Error('Configuração tática fora dos limites.')
    const ids = new Set<string>(),
      positions = new Set<string>()
    for (const unit of config.units) {
      if (
        !/^[a-z0-9-]{1,40}$/.test(unit.id) ||
        !['friend', 'rival'].includes(unit.side) ||
        !['guardian', 'scout'].includes(unit.role) ||
        ids.has(unit.id) ||
        positions.has(cellKey(unit)) ||
        !this.walkable(unit) ||
        !Number.isInteger(unit.health) ||
        !Number.isInteger(unit.maxHealth) ||
        unit.maxHealth < 1 ||
        unit.maxHealth > 10 ||
        unit.health < 1 ||
        unit.health > unit.maxHealth
      )
        throw new Error('Unidade inicial inválida.')
      ids.add(unit.id)
      positions.add(cellKey(unit))
    }
    if (
      !this.walkable(config.home) ||
      !config.units.some((unit) => unit.side === 'friend') ||
      !config.units.some((unit) => unit.side === 'rival') ||
      config.units.filter((unit) => unit.side === 'friend').length > config.maxFriends ||
      config.units.filter((unit) => unit.side === 'rival').length > 6
    )
      throw new Error('O cenário precisa de duas equipes e uma base em terra.')
    const connected = new Set([
      cellKey(config.home),
      ...reachable(
        config.home,
        this.rows * this.columns,
        (from, to) => this.walkable(to) && Math.abs(this.tile(from) - this.tile(to)) <= 1,
      ).map(cellKey),
    ])
    if (config.units.some((unit) => !connected.has(cellKey(unit))))
      throw new Error('As unidades precisam de um caminho de terra até a base.')
    this.reset()
  }
  tile(cell: Cell): number {
    return this.config.terrain[cell.y]?.[cell.x] ?? 0
  }
  walkable(cell: Cell): boolean {
    return Number.isInteger(cell.x) && Number.isInteger(cell.y) && this.tile(cell) > 0
  }
  at(cell: Cell): Unit | undefined {
    return this.units.find((unit) => unit.health > 0 && sameCell(unit, cell))
  }
  selected(): Unit | undefined {
    return this.units.find((unit) => unit.id === this.selectedId && unit.health > 0)
  }
  reset(): void {
    this.units = this.config.units.map((unit) => ({ ...unit, moved: false, acted: false }))
    this.round = 1
    this.coins = this.config.initialCoins
    this.score = 0
    this.recruitSerial = 0
    this.turn = 'player'
    this.outcome = 'playing'
    this.enemyOrder = []
    this.cursor = { ...this.config.home }
    this.selectedId = this.units.find((unit) => unit.side === 'friend')!.id
    this.revision++
  }
  moves(unit: Unit): Cell[] {
    if (unit.moved || unit.acted || unit.health <= 0) return []
    return reachable(
      unit,
      this.config.moveRange,
      (from, to) =>
        this.walkable(to) && Math.abs(this.tile(from) - this.tile(to)) <= 1 && !this.at(to),
    )
  }
  canAttack(unit: Unit, target: Unit): boolean {
    if (unit.health <= 0 || target.health <= 0 || unit.acted || target.side === unit.side)
      return false
    const range = unit.role === 'scout' ? 3 : 1
    if (distance(unit, target) > range) return false
    // Conservative grid ray: water and occupied cells also block a diagonal corner.
    let x = unit.x,
      y = unit.y
    while (x !== target.x || y !== target.y) {
      const dx = Math.sign(target.x - x),
        dy = Math.sign(target.y - y)
      if (
        dx &&
        dy &&
        [
          { x: x + dx, y },
          { x, y: y + dy },
        ].some((cell) => !this.walkable(cell) || (!sameCell(cell, target) && !!this.at(cell)))
      )
        return false
      if (Math.abs(target.x - x) >= Math.abs(target.y - y)) x += dx
      else y += dy
      if (!this.walkable({ x, y }) || (!sameCell({ x, y }, target) && this.at({ x, y })))
        return false
    }
    return true
  }
  moveCursor(direction: Cell): void {
    if (
      !Number.isInteger(direction.x) ||
      !Number.isInteger(direction.y) ||
      this.outcome !== 'playing' ||
      this.turn !== 'player' ||
      distance({ x: 0, y: 0 }, direction) !== 1
    )
      return
    this.cursor = {
      x: Math.max(0, Math.min(this.columns - 1, this.cursor.x + direction.x)),
      y: Math.max(0, Math.min(this.rows - 1, this.cursor.y + direction.y)),
    }
    this.revision++
  }
  activate(cell = this.cursor): boolean {
    if (this.outcome !== 'playing' || this.turn !== 'player' || !this.walkable(cell)) return false
    this.cursor = { ...cell }
    this.revision++
    const target = this.at(cell),
      unit = this.selected()
    if (target?.side === 'friend') {
      if (target.acted) return false
      this.selectedId = target.id
      this.revision++
      return true
    }
    if (!unit || unit.acted) return false
    if (target?.side === 'rival') {
      if (!this.canAttack(unit, target)) return false
      this.attack(unit, target)
      this.nextUnit()
      return true
    }
    if (!this.moves(unit).some((next) => sameCell(next, cell))) return false
    unit.x = cell.x
    unit.y = cell.y
    unit.moved = true
    this.revision++
    return true
  }
  waitUnit(): boolean {
    if (this.turn !== 'player' || this.outcome !== 'playing') return false
    const unit = this.selected()
    if (!unit || unit.acted) return false
    unit.acted = true
    this.revision++
    this.nextUnit()
    return true
  }
  endTurn(): void {
    if (this.turn !== 'player' || this.outcome !== 'playing') return
    for (const unit of this.units) if (unit.side === 'friend') unit.acted = true
    this.turn = 'rival'
    this.selectedId = null
    this.enemyOrder = this.units
      .filter((unit) => unit.side === 'rival' && unit.health > 0)
      .map((unit) => unit.id)
    for (const unit of this.units)
      if (unit.side === 'rival') {
        unit.moved = false
        unit.acted = false
      }
    this.revision++
  }
  recruit(): boolean {
    if (
      this.turn !== 'player' ||
      this.outcome !== 'playing' ||
      this.coins < this.config.recruitCost ||
      this.units.filter((unit) => unit.side === 'friend' && unit.health > 0).length >=
        this.config.maxFriends
    )
      return false
    const spot = [
      this.config.home,
      ...reachable(this.config.home, 1, (_from, to) => this.walkable(to)),
    ].find((cell) => !this.at(cell))
    if (!spot) return false
    // Dead units need not accumulate across an arbitrarily long match.
    this.units = this.units.filter((unit) => unit.health > 0)
    let id: string
    do {
      id = `helper-${++this.recruitSerial}`
    } while (this.units.some((unit) => unit.id === id))
    this.units.push({
      ...spot,
      id,
      side: 'friend',
      role: 'guardian',
      health: 3,
      maxHealth: 3,
      moved: false,
      acted: true,
    })
    this.coins -= this.config.recruitCost
    this.revision++
    return true
  }
  private attack(unit: Unit, target: Unit): void {
    target.health = Math.max(0, target.health - (unit.role === 'guardian' ? 2 : 1))
    unit.acted = true
    if (target.health === 0 && target.side === 'rival') {
      this.score += 100
      this.coins++
    }
    if (!this.units.some((entry) => entry.side === 'friend' && entry.health > 0))
      this.outcome = 'lost'
    else if (!this.units.some((entry) => entry.side === 'rival' && entry.health > 0))
      this.outcome = 'won'
    this.revision++
  }
  private nextUnit(): void {
    if (this.outcome !== 'playing') return
    this.selectedId =
      this.units.find((unit) => unit.side === 'friend' && unit.health > 0 && !unit.acted)?.id ??
      null
    if (!this.selectedId) this.endTurn()
  }
  private approach(unit: Unit, targets: Unit[]): Cell | undefined {
    // Reverse BFS finds routes around water; a greedy Manhattan step can become stuck.
    const candidates = this.moves(unit)
    let best: { cell: Cell; cost: number } | undefined
    for (const target of targets) {
      const queue = [{ x: target.x, y: target.y, cost: 0 }],
        costs = new Map([[cellKey(target), 0]])
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index]!
        for (const direction of directions) {
          const cell = { x: current.x + direction.x, y: current.y + direction.y },
            key = cellKey(cell)
          if (
            costs.has(key) ||
            !this.walkable(cell) ||
            Math.abs(this.tile(cell) - this.tile(current)) > 1 ||
            (this.at(cell) && !sameCell(cell, unit))
          )
            continue
          costs.set(key, current.cost + 1)
          queue.push({ ...cell, cost: current.cost + 1 })
        }
      }
      const currentCost = costs.get(cellKey(unit)) ?? Infinity
      for (const cell of candidates) {
        const cost = costs.get(cellKey(cell)) ?? Infinity
        if (cost < currentCost && (!best || cost < best.cost)) best = { cell, cost }
      }
    }
    return best?.cell
  }
  /** One deterministic opponent action; the controller supplies pacing and pauses between actions. */
  stepRival(): void {
    if (this.turn !== 'rival' || this.outcome !== 'playing') return
    const id = this.enemyOrder.shift(),
      unit = this.units.find((entry) => entry.id === id && entry.health > 0)
    if (unit) {
      const targets = this.units
        .filter((entry) => entry.side === 'friend' && entry.health > 0)
        .sort((a, b) => distance(unit, a) - distance(unit, b) || a.id.localeCompare(b.id))
      let target = targets.find((entry) => this.canAttack(unit, entry))
      if (!target && targets[0]) {
        const move = this.approach(unit, targets)
        if (move) {
          unit.x = move.x
          unit.y = move.y
          unit.moved = true
        }
        target = targets.find((entry) => this.canAttack(unit, entry))
      }
      if (target) this.attack(unit, target)
      unit.acted = true
      this.revision++
    }
    if (!this.enemyOrder.length && this.outcome === 'playing') {
      this.turn = 'player'
      this.round++
      for (const unit of this.units)
        if (unit.side === 'friend') {
          unit.moved = false
          unit.acted = false
        }
      this.selectedId =
        this.units.find((unit) => unit.side === 'friend' && unit.health > 0)?.id ?? null
      this.revision++
    }
  }
  snapshot() {
    const selected = this.selected()
    return {
      round: this.round,
      turn: this.turn,
      outcome: this.outcome,
      score: this.score,
      coins: this.coins,
      selectedId: this.selectedId,
      cursor: { ...this.cursor },
      units: this.units.map((unit) => ({ ...unit })),
      terrain: this.config.terrain.map((row) => [...row]),
      moves: selected ? this.moves(selected) : [],
      goal: this.config.units.filter((unit) => unit.side === 'rival').length,
    }
  }
}
