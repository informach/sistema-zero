import { describe, expect, it } from 'bun:test'
import { reinoZeroExample, reinoZeroLevelNames } from '../examples'

/**
 * ⭐ A REDE QUE FALTAVA — geometria. O `reinoZeroExample.test.ts` conta linhas,
 * colunas e unicidade das grades, mas nunca pergunta ONDE as coisas ficam. Foi por
 * isso que cano enterrado no chão, cano flutuando sobre poço, gema dentro de tijolo
 * e poço largo demais para o pulo passaram batido nas 32 fases.
 *
 * Estes testes leem a IR que de fato sai (não uma reimplementação do gerador) e
 * checam as invariantes de jogabilidade fase a fase.
 */

const TILE = 16
const COLS = 72
const ROWS = 15

/** Linhas de chão. A superfície pisável é o TOPO da linha 13 -> y = 208. */
const GROUND_ROWS = [13, 14] as const
const SURFACE_Y = 13 * TILE

/** Índices do tileset, na ordem de `mapDeclarations()`. */
const CHAO = 0
const TIJOLO = 1
const PREMIO = 2
const CANO_TOPO = 3
const PLATAFORMA = 4
const CEU = 5
const PERIGO = 6
const CANO_CORPO = 7

const SOLID = new Set<number>([CHAO, TIJOLO, PREMIO, CANO_TOPO, CANO_CORPO])
const PIPE = new Set<number>([CANO_TOPO, CANO_CORPO])

/**
 * Alcance do pulo com a física do exemplo: gravidade 0.42, impulso 7.2, velocidade
 * base 2.35. Tempo no ar = 2*v0/g quadros; alcance = velocidade * tempo.
 */
const GRAVITY = 0.42
const JUMP = 7.2
const RUN_SPEED = 2.35
const AIR_FRAMES = (2 * JUMP) / GRAVITY
const JUMP_REACH_PX = RUN_SPEED * AIR_FRAMES

/**
 * Largura máxima de poço aceita. Fica com folga confortável sob o alcance real
 * para que a travessia não dependa de partir do pixel exato da borda.
 */
const MAX_PIT_TILES = 3

type Grid = number[][]

function parseGrids(): Grid[] {
  const maps = reinoZeroExample.ir.behavior.start.filter(
    (statement) => statement.type === 'g2d:createVectorTileMap',
  )
  expect(maps).toHaveLength(reinoZeroLevelNames.length)
  return maps.map((map) =>
    map.grid.split(';').map((row) => row.split(' ').map((cell) => Number(cell))),
  )
}

/** Colunas sem chão nenhum nas linhas 13/14 — os poços de verdade. */
function pitColumns(grid: Grid): number[] {
  const columns: number[] = []
  for (let col = 0; col < COLS; col += 1) {
    const hasGround = GROUND_ROWS.some((row) => SOLID.has(grid[row]![col]!))
    if (!hasGround) columns.push(col)
  }
  return columns
}

/** Maiores sequências contíguas de uma lista de colunas. */
function longestRun(columns: number[]): number {
  let longest = 0
  let run = 0
  let previous = Number.NEGATIVE_INFINITY
  for (const col of columns) {
    run = col === previous + 1 ? run + 1 : 1
    previous = col
    if (run > longest) longest = run
  }
  return longest
}

const GRIDS = parseGrids()
const LEVELS = GRIDS.map((grid, index) => ({
  grid,
  name: reinoZeroLevelNames[index]!,
}))

describe('Reino Zero — geometria das 32 fases', () => {
  it('o alcance do pulo cobre a largura máxima de poço permitida', () => {
    // Não é sobre o mapa: é a premissa que torna MAX_PIT_TILES defensável.
    expect(JUMP_REACH_PX).toBeGreaterThan(MAX_PIT_TILES * TILE)
  })

  it('todo poço é transponível com um pulo', () => {
    const offenders = LEVELS.filter(({ grid }) => longestRun(pitColumns(grid)) > MAX_PIT_TILES).map(
      ({ name, grid }) => `${name}: ${longestRun(pitColumns(grid))} tiles`,
    )
    expect(offenders).toEqual([])
  })

  it('nenhum cano invade as linhas de chão', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      for (const row of GROUND_ROWS) {
        for (let col = 0; col < COLS; col += 1) {
          if (PIPE.has(grid[row]![col]!)) offenders.push(`${name}: linha ${row} col ${col}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('nenhum cano paira sobre poço', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pits = new Set(pitColumns(grid))
      for (let col = 0; col < COLS; col += 1) {
        const isPipeColumn = grid.some((row) => PIPE.has(row[col]!))
        if (isPipeColumn && pits.has(col)) offenders.push(`${name}: col ${col}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('todo cano tem 2 colunas, boca única no topo e ao menos 2 tiles acima do chão', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pipeColumns = new Set<number>()
      for (let col = 0; col < COLS; col += 1) {
        if (grid.some((row) => PIPE.has(row[col]!))) pipeColumns.add(col)
      }
      const sorted = [...pipeColumns].sort((a, b) => a - b)
      // Agrupa colunas contíguas: cada grupo deve ter exatamente 2 colunas.
      const groups: number[][] = []
      for (const col of sorted) {
        const last = groups[groups.length - 1]
        if (last && col === last[last.length - 1]! + 1) last.push(col)
        else groups.push([col])
      }
      for (const group of groups) {
        if (group.length !== 2) {
          offenders.push(`${name}: cano de ${group.length} coluna(s) em ${group.join(',')}`)
          continue
        }
        for (const col of group) {
          const rows = grid.map((row, index) => ({ index, tile: row[col]! }))
          const body = rows.filter((cell) => PIPE.has(cell.tile))
          if (body.length < 2) {
            offenders.push(`${name}: col ${col} tem só ${body.length} tile de cano`)
          }
          const tops = body.filter((cell) => cell.tile === CANO_TOPO)
          if (tops.length !== 1) {
            offenders.push(`${name}: col ${col} tem ${tops.length} bocas (esperado 1)`)
          }
          const highest = Math.min(...body.map((cell) => cell.index))
          if (tops[0] && tops[0].index !== highest) {
            offenders.push(`${name}: col ${col} tem a boca fora do topo`)
          }
          // O tile mais baixo do cano precisa encostar na linha logo acima do chão.
          const lowest = Math.max(...body.map((cell) => cell.index))
          if (lowest !== GROUND_ROWS[0] - 1) {
            offenders.push(`${name}: col ${col} não assenta no chão (base na linha ${lowest})`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('as linhas de chão são sólidas fora dos poços', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pits = new Set(pitColumns(grid))
      for (let col = 0; col < COLS; col += 1) {
        if (pits.has(col)) continue
        const isPipeColumn = grid.some((row) => PIPE.has(row[col]!))
        if (isPipeColumn) continue
        for (const row of GROUND_ROWS) {
          if (grid[row]![col]! !== CHAO) offenders.push(`${name}: linha ${row} col ${col}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('as bordas de entrada e saída são chão firme', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pits = new Set(pitColumns(grid))
      for (let col = 0; col < 8; col += 1) {
        if (pits.has(col)) offenders.push(`${name}: entrada col ${col}`)
      }
      for (let col = COLS - 8; col < COLS; col += 1) {
        if (pits.has(col)) offenders.push(`${name}: saída col ${col}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('a grade tem as dimensões declaradas e só índices conhecidos', () => {
    const known = new Set([CHAO, TIJOLO, PREMIO, CANO_TOPO, PLATAFORMA, CEU, PERIGO, CANO_CORPO])
    for (const { name, grid } of LEVELS) {
      expect(grid, name).toHaveLength(ROWS)
      for (const row of grid) {
        expect(row, name).toHaveLength(COLS)
        for (const tile of row) expect(known.has(tile), `${name}: tile ${tile}`).toBe(true)
      }
    }
  })

  it('a superfície do chão é a referência de altura documentada', () => {
    // Guarda-trilho: se alguém mexer nas linhas de chão, os spawns têm que acompanhar.
    expect(SURFACE_Y).toBe(208)
  })
})
