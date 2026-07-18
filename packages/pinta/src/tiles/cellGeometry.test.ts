import { describe, expect, it } from 'bun:test'
import { cellInRect, lineCells, normalizeCellRect, rectCells } from './cellGeometry'

describe('normalizeCellRect', () => {
  it('ordena os cantos e clampa à grade', () => {
    expect(normalizeCellRect({ col: 3, row: 2 }, { col: 1, row: 0 }, 5, 5)).toEqual({
      col: 1,
      row: 0,
      cols: 3,
      rows: 3,
    })
  })

  it('clampa cantos negativos e além do limite', () => {
    expect(normalizeCellRect({ col: -2, row: -1 }, { col: 100, row: 100 }, 4, 3)).toEqual({
      col: 0,
      row: 0,
      cols: 4,
      rows: 3,
    })
  })

  it('grade vazia devolve null', () => {
    expect(normalizeCellRect({ col: 0, row: 0 }, { col: 0, row: 0 }, 0, 5)).toBeNull()
  })
})

describe('lineCells (Bresenham)', () => {
  it('linha horizontal', () => {
    expect(lineCells({ col: 0, row: 2 }, { col: 3, row: 2 })).toEqual([
      { col: 0, row: 2 },
      { col: 1, row: 2 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
    ])
  })

  it('diagonal perfeita', () => {
    expect(lineCells({ col: 0, row: 0 }, { col: 2, row: 2 })).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 2 },
    ])
  })

  it('invertida termina no destino', () => {
    const cells = lineCells({ col: 4, row: 1 }, { col: 1, row: 0 })
    expect(cells[0]).toEqual({ col: 4, row: 1 })
    expect(cells.at(-1)).toEqual({ col: 1, row: 0 })
  })

  it('ponto único', () => {
    expect(lineCells({ col: 2, row: 2 }, { col: 2, row: 2 })).toEqual([{ col: 2, row: 2 }])
  })
})

describe('rectCells / cellInRect', () => {
  it('lista as células row-major', () => {
    expect(rectCells({ col: 1, row: 1, cols: 2, rows: 2 })).toEqual([
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 1, row: 2 },
      { col: 2, row: 2 },
    ])
  })

  it('cellInRect', () => {
    const rect = { col: 1, row: 1, cols: 2, rows: 2 }
    expect(cellInRect(rect, { col: 2, row: 2 })).toBe(true)
    expect(cellInRect(rect, { col: 3, row: 2 })).toBe(false)
    expect(cellInRect(rect, { col: 0, row: 1 })).toBe(false)
  })
})
