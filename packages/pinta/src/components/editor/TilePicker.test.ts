import { describe, expect, it } from 'bun:test'
import { pickerCellFromPoint } from './TilePicker'

describe('pickerCellFromPoint', () => {
  const rect = { left: 0, top: 0 }
  // pitch = 48 + 2 = 50

  it('mapeia o ponto para a célula da grade', () => {
    expect(pickerCellFromPoint(rect, 8, 4, 5, 5)).toEqual({ col: 0, row: 0 })
    expect(pickerCellFromPoint(rect, 8, 4, 55, 5)).toEqual({ col: 1, row: 0 })
    expect(pickerCellFromPoint(rect, 8, 4, 5, 105)).toEqual({ col: 0, row: 2 })
  })

  it('clampa dentro das colunas/linhas', () => {
    expect(pickerCellFromPoint(rect, 8, 4, 9999, 9999)).toEqual({ col: 7, row: 3 })
    expect(pickerCellFromPoint(rect, 8, 4, -50, -50)).toEqual({ col: 0, row: 0 })
  })
})
