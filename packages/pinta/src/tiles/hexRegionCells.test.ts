import { expect, test } from 'bun:test'
import {
  hexRegionCellAt,
  makePintaHexCell,
  PINTA_HEX_EMPTY_CELL,
  type PintaHexRegionCells,
} from '@sistemazero/core/creations'
import { editHexRegionCells } from './regionCells'

const bounds = { col: -32, row: -32, cols: 64, rows: 64 }
const empty = (): PintaHexRegionCells => ({ kind: 'hex-regions', version: 1, side: 32, chunks: [] })

test('a escrita comum conserva casas hexagonais de 32 bits, coordenadas negativas e a revisão anterior', () => {
  const original = empty()
  const cell = makePintaHexCell(3, { flipX: true, rotation: 120 })
  if (cell === null) throw Error('Casa inválida')
  const changed = editHexRegionCells(original, bounds, [{ col: -1, row: -2, cell }])
  if (!changed.ok) throw Error(changed.reason)
  expect(hexRegionCellAt(changed.cells, -1, -2)).toBe(cell)
  expect(changed.cells.chunks[0]?.cells).toBeInstanceOf(Uint32Array)
  expect(original.chunks).toEqual([])
  expect(editHexRegionCells(changed.cells, bounds, [{ col: -1, row: -2, cell }])).toEqual({
    ok: true,
    cells: changed.cells,
  })
  const erased = editHexRegionCells(changed.cells, bounds, [
    { col: -1, row: -2, cell: PINTA_HEX_EMPTY_CELL },
  ])
  expect(erased).toEqual({ ok: true, cells: { ...original } })
  expect(hexRegionCellAt(changed.cells, -1, -2)).toBe(cell)
})

test('uma edição hexadecimal inválida ou acima do orçamento recusa o gesto inteiro', () => {
  const grid = empty()
  const first = { col: 0, row: 0, cell: 2 }
  expect(editHexRegionCells(grid, bounds, [first, { ...first, col: 32 }])).toEqual({
    ok: false,
    reason: 'outside-map',
  })
  expect(editHexRegionCells(grid, bounds, [first, { ...first, cell: 0x1000 }])).toEqual({
    ok: false,
    reason: 'invalid-edit',
  })
  expect(editHexRegionCells(grid, bounds, [first], 0)).toEqual({ ok: false, reason: 'cell-budget' })
  expect(grid.chunks).toEqual([])
})
