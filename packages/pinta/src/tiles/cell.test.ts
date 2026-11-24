import { describe, expect, it } from 'bun:test'
import {
  CELL_FLAGS_MASK,
  CELL_FLIP_D,
  CELL_FLIP_H,
  CELL_FLIP_V,
  CELL_MAX_TILES,
  CELL_MAX_VALUE,
  cellFlags,
  cellTile,
  EMPTY_CELL,
  isEmptyCell,
  isValidCell,
  makeCell,
  withCellFlags,
  withCellTile,
} from './cell'

describe('célula do mapa: peça + como ela está virada', () => {
  it('sem peça virada, a célula É o índice da peça (mapas antigos não migram)', () => {
    for (const tile of [0, 1, 63, 64, 255, 4095]) {
      expect(makeCell(tile)).toBe(tile)
      expect(cellTile(tile)).toBe(tile)
      expect(cellFlags(tile)).toBe(0)
    }
  })

  it('a célula vazia é -1 e não carrega bits', () => {
    expect(makeCell(-1)).toBe(EMPTY_CELL)
    expect(makeCell(-7, CELL_FLIP_H)).toBe(EMPTY_CELL)
    expect(cellTile(EMPTY_CELL)).toBe(-1)
    expect(cellFlags(EMPTY_CELL)).toBe(0)
    expect(isEmptyCell(EMPTY_CELL)).toBe(true)
    expect(isEmptyCell(0)).toBe(false)
    expect(withCellFlags(EMPTY_CELL, CELL_FLIP_V)).toBe(EMPTY_CELL)
    expect(withCellTile(EMPTY_CELL, 5)).toBe(5)
  })

  it('ida e volta de todas as combinações de bits, nos extremos do índice', () => {
    const combos = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (n) => (n & 1 ? CELL_FLIP_H : 0) | (n & 2 ? CELL_FLIP_V : 0) | (n & 4 ? CELL_FLIP_D : 0),
    )
    for (const tile of [0, 1, 255, 256, CELL_MAX_TILES - 1])
      for (const flags of combos) {
        const cell = makeCell(tile, flags)
        expect(cellTile(cell)).toBe(tile)
        expect(cellFlags(cell)).toBe(flags)
        expect(cell).toBeGreaterThanOrEqual(0)
        expect(cell).toBeLessThanOrEqual(CELL_MAX_VALUE)
      }
  })

  it('cabe no Int16Array sem virar número negativo', () => {
    const cells = new Int16Array(2)
    cells[0] = CELL_MAX_VALUE
    cells[1] = makeCell(CELL_MAX_TILES - 1, CELL_FLAGS_MASK)
    expect(cells[0]).toBe(32767)
    expect(cellTile(cells[1] ?? -1)).toBe(CELL_MAX_TILES - 1)
    expect(cellFlags(cells[1] ?? -1)).toBe(CELL_FLAGS_MASK)
  })

  it('trocar a peça conserva o giro; trocar o giro conserva a peça', () => {
    const virada = makeCell(7, CELL_FLIP_H | CELL_FLIP_D)
    expect(cellTile(withCellTile(virada, 9))).toBe(9)
    expect(cellFlags(withCellTile(virada, 9))).toBe(CELL_FLIP_H | CELL_FLIP_D)
    expect(withCellTile(virada, -1)).toBe(EMPTY_CELL)
    expect(cellTile(withCellFlags(virada, CELL_FLIP_V))).toBe(7)
    expect(cellFlags(withCellFlags(virada, CELL_FLIP_V))).toBe(CELL_FLIP_V)
    // Bits fora da máscara são ignorados, nunca invadem o índice.
    expect(makeCell(3, 0xffff)).toBe(3 | CELL_FLAGS_MASK)
    expect(makeCell(CELL_MAX_TILES + 2)).toBe(2)
  })

  it('valida o que vem de fora', () => {
    for (const ok of [-1, 0, 63, 4095, CELL_MAX_VALUE]) expect(isValidCell(ok)).toBe(true)
    for (const bad of [-2, CELL_MAX_VALUE + 1, 1.5, Number.NaN, '3', null, undefined])
      expect(isValidCell(bad)).toBe(false)
  })
})
