import { expect, test } from 'bun:test'
import type { PintaRegionCells } from '@sistemazero/core/creations'
import { createTilemapAsset } from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, cellFlags, makeCell } from './cell'
import {
  createRegionCellReader,
  denseToRegionCells,
  editRegionCells,
  REGION_EDIT_LIMIT,
  regionCellsToDense,
} from './regionCells'
import { setCell, tileLayerById } from './tilemapOps'

const bounds = { col: -32, row: -32, cols: 96, rows: 96 }
const empty = (): PintaRegionCells => ({ kind: 'regions', version: 1, side: 32, chunks: [] })
const edit = (col: number, row: number, cell: number) => ({ col, row, cell })
function changed(grid: PintaRegionCells, edits: ReturnType<typeof edit>[], maxChunks?: number) {
  const result = editRegionCells(grid, bounds, edits, maxChunks)
  expect(result.ok).toBe(true)
  if (!result.ok) throw Error(result.reason)
  return result.cells
}

test('a grade genérica conserva o índice 4095 e seus flags sem adotar o teto do editor Pinta', () => {
  const original = empty(),
    value = makeCell(4095, CELL_FLIP_D | CELL_FLIP_H)
  const source = changed(original, [edit(-1, -1, value)])
  expect(createRegionCellReader(source).at(-1, -1)).toBe(value)
  expect(original.chunks).toEqual([])
})

test('lê células negativas e lacunas sem alocar a extensão vazia', () => {
  const source = changed(empty(), [edit(-1, -1, 12), edit(32, 0, 7)])
  const reader = createRegionCellReader(source)
  expect(reader.at(-1, -1)).toBe(12)
  expect(reader.at(32, 0)).toBe(7)
  expect(reader.at(0, 0)).toBe(-1)
  expect(reader.at(-10000, 9999)).toBe(-1)
  expect(reader.at(0.5, 0)).toBe(-1)
  expect(source.chunks).toHaveLength(2)
  let visited = 0
  const found: number[][] = []
  reader.visitOccupied({ col: -10000, row: -10000, cols: 20000, rows: 20000 }, (cell, col, row) => {
    visited++
    found.push([cell, col, row])
  })
  expect(visited).toBe(2)
  expect(found).toEqual([
    [12, -1, -1],
    [7, 32, 0],
  ])
  const clipped: number[] = []
  reader.visitOccupied({ col: 32, row: 0, cols: 1, rows: 1 }, (cell) => clipped.push(cell))
  expect(clipped).toEqual([7])
})

test('um lote conserva flags e copia apenas os chunks alterados para o histórico', () => {
  const original = changed(empty(), [edit(-1, -1, 5), edit(32, 0, 7)])
  const flagged = makeCell(3, CELL_FLIP_H | CELL_FLIP_D)
  const result = changed(original, [edit(-1, -1, flagged), edit(-2, -1, 4)])
  expect(result).not.toBe(original)
  expect(result.chunks[0]).not.toBe(original.chunks[0])
  expect(result.chunks[0]!.cells).not.toBe(original.chunks[0]!.cells)
  expect(result.chunks[1]).toBe(original.chunks[1])
  expect(createRegionCellReader(original).at(-1, -1)).toBe(5)
  expect(createRegionCellReader(result).at(-1, -1)).toBe(flagged)
})

test('última escrita vence e gesto que volta ao valor original não cria histórico', () => {
  const original = changed(empty(), [edit(0, 0, 7)])
  expect(changed(original, [edit(0, 0, 12), edit(0, 0, 7)])).toBe(original)
  expect(changed(original, [edit(32, 0, 12), edit(32, 0, -1)])).toBe(original)
  expect(changed(original, [])).toBe(original)
})

test('apagar o último conteúdo remove o chunk, sem manter regiões vazias', () => {
  const source = changed(empty(), [edit(-1, -1, 2), edit(0, 0, 3)])
  const result = changed(source, [edit(-1, -1, -1)])
  expect(result.chunks).toHaveLength(1)
  expect(result.chunks[0]).toBe(source.chunks[1])
  expect(changed(result, [edit(0, 0, -1)], 0).chunks).toEqual([])
})

test('admissão usa o custo final do gesto, independentemente da ordem de apagar e pintar', () => {
  const source = changed(empty(), [edit(0, 0, 3)])
  const first = changed(source, [edit(32, 0, 8), edit(0, 0, -1)], 1)
  const second = changed(source, [edit(0, 0, -1), edit(32, 0, 8)], 1)
  expect(first).toEqual(second)
  expect(editRegionCells(source, bounds, [edit(32, 0, 8)], 1)).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
  expect(source.chunks).toHaveLength(1)
})

test('recusa atômica não conserva nem a primeira mudança de um lote inválido', () => {
  const source = changed(empty(), [edit(0, 0, 3)])
  for (const invalid of [
    edit(0.5, 0, 3),
    edit(0, 0, -2),
    edit(0, 0, 32768),
    edit(0, 0, Number.NaN),
  ])
    expect(editRegionCells(source, bounds, [edit(0, 0, 8), invalid])).toEqual({
      ok: false,
      reason: 'invalid-edit',
    })
  expect(editRegionCells(source, bounds, [edit(0, 0, 8), edit(64, 0, 3)])).toEqual({
    ok: false,
    reason: 'outside-map',
  })
  expect(createRegionCellReader(source).at(0, 0)).toBe(3)
})

test('limite de trabalho é conferido antes de acessar os pontos do gesto', () => {
  let reads = 0
  const point = {
    get col() {
      reads++
      throw Error('gesto grande não deve ser lido')
    },
    row: 0,
    cell: 0,
  }
  expect(editRegionCells(empty(), bounds, Array(REGION_EDIT_LIMIT + 1).fill(point))).toEqual({
    ok: false,
    reason: 'work-budget',
  })
  expect(reads).toBe(0)
  expect(REGION_EDIT_LIMIT).toBe(256 * 256)
})

test('conversão densa respeita origem parcial e conserva todos os valores e flags', () => {
  const area = { col: -1, row: -1, cols: 34, rows: 34 }
  const dense = new Int16Array(34 * 34).fill(-1)
  dense[0] = makeCell(255, CELL_FLIP_D)
  dense[33] = 32767
  dense[34 * 34 - 1] = 0
  const source = denseToRegionCells(dense, area)!
  expect(source.chunks).toHaveLength(3)
  expect(regionCellsToDense(source, area, 34 * 34)).toEqual(dense)
  expect(dense[0]).toBe(makeCell(255, CELL_FLIP_D))
  expect(denseToRegionCells(dense, area, 2)).toBeNull()
  expect(regionCellsToDense(source, area, 34 * 34 - 1)).toBeNull()
})

test('conversão vazia não materializa chunks e recusa dimensões ou dados inconsistentes', () => {
  const area = { col: 0, row: 0, cols: 8, rows: 8 }
  expect(denseToRegionCells(new Int16Array(64).fill(-1), area)).toEqual(empty())
  expect(denseToRegionCells(new Int16Array(63), area)).toBeNull()
  expect(denseToRegionCells(new Int16Array(64).fill(-2), area)).toBeNull()
  expect(
    regionCellsToDense(empty(), { col: 0, row: 0, cols: 10000, rows: 10000 }, 2097152),
  ).toBeNull()
  const source = changed(empty(), [edit(-1, -1, 7)])
  expect(regionCellsToDense(source, area, 64)).toBeNull()
})

test('gesto espalhado sobre muitas regiões vazias é recusado pelo orçamento ocupado', () => {
  const source = empty()
  const points = Array.from({ length: 2500 }, (_, index) =>
    edit((index % 100) * 32, Math.floor(index / 100) * 32, 2),
  )
  expect(editRegionCells(source, { col: 0, row: 0, cols: 10000, rows: 10000 }, points)).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
  expect(source.chunks).toEqual([])
})

test('sequência determinística de gestos mantém o resultado das operações densas existentes', () => {
  let legacy = createTilemapAsset({ name: 'regressao', tilesetId: 'pecas', cols: 64, rows: 64 })
  const layerId = legacy.layers[0]!.id
  const area = { col: 0, row: 0, cols: 64, rows: 64 }
  let regions = empty(),
    seed = 9
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return seed >>> 0
  }
  const history = [regions]
  for (let gesture = 0; gesture < 30; gesture++) {
    const points = Array.from({ length: 64 }, () => {
      const col = next() % 64,
        row = next() % 64,
        cell = next() % 5 === 0 ? -1 : next() % 32768
      // The oracle is the Pinta editor: references must fit its 256-tile format.
      // Preserve the same deterministic coordinates and all original transform bits.
      return edit(col, row, cell < 0 ? -1 : makeCell(cell % 256, cellFlags(cell)))
    })
    for (const point of points) legacy = setCell(legacy, layerId, point.col, point.row, point.cell)
    const result = editRegionCells(regions, area, points)
    expect(result.ok).toBe(true)
    if (!result.ok) throw Error(result.reason)
    regions = result.cells
    expect(regionCellsToDense(regions, area, 4096)).toEqual(tileLayerById(legacy, layerId)!.cells)
    history.push(regions)
  }
  expect(history[0]!.chunks).toEqual([])
  expect(regionCellsToDense(history[1]!, area, 4096)).not.toEqual(
    regionCellsToDense(history.at(-1)!, area, 4096),
  )
})
