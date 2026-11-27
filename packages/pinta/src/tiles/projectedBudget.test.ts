import { expect, test } from 'bun:test'
import {
  PINTA_HEX_EMPTY_CELL,
  PINTA_HEX_REGION_MAX_CHUNKS,
  type PintaHexRegionCells,
  parsePintaHexRegionLayerLocations,
} from '@sistemazero/core/creations'
import { isTilesetKind } from '../core/project'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { nativeNineGallery } from '../testing/nativeNineFixtures'
import { createProjectedMap, editProjectedMapCells } from './projectedMap'
import { editHexRegionCells } from './regionCells'

const bounds = { col: 0, row: 0, cols: 1056, rows: 1024 }
function fullGrid(): PintaHexRegionCells {
  const cells = new Uint32Array(1024).fill(PINTA_HEX_EMPTY_CELL)
  cells[0] = 0
  // Immutable shared input buffers keep this quota proof small; admission still charges each chunk.
  return {
    kind: 'hex-regions',
    version: 1,
    side: 32,
    chunks: Array.from({ length: PINTA_HEX_REGION_MAX_CHUNKS }, (_, i) => ({
      col: i % 32,
      row: Math.floor(i / 32),
      cells,
    })),
  }
}
test('o gravador hexagonal conserva o teto de quatro MiB do codec, mesmo com orçamento explícito maior', () => {
  const grid = fullGrid()
  expect(parsePintaHexRegionLayerLocations([grid], bounds, true)).not.toBeNull()
  const result = editHexRegionCells(grid, bounds, [{ col: 1024, row: 0, cell: 1 }])
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toBe('cell-budget')
  expect(grid.chunks).toHaveLength(PINTA_HEX_REGION_MAX_CHUNKS)
  const override = editHexRegionCells(
    { kind: 'hex-regions', version: 1, side: 32, chunks: [] },
    bounds,
    [],
    PINTA_HEX_REGION_MAX_CHUNKS + 1,
  )
  expect(override.ok).toBe(false)
})
test('o orçamento de quatro MiB soma as camadas antes de aceitar uma pincelada hexagonal', async () => {
  const { sheet } = await nativeNineGallery()
  if (!isTilesetKind(sheet)) throw Error('Folha ausente')
  const seed = createProjectedMap('limite-hex', sheet, 'hexagonal')!
  const layer = seed.layers.find(isProjectedTileLayer)!,
    all = fullGrid().chunks,
    half = all.length / 2
  const left: PintaHexRegionCells = {
    kind: 'hex-regions',
    version: 1,
    side: 32,
    chunks: all.slice(0, half),
  }
  const right: PintaHexRegionCells = { ...left, chunks: all.slice(half) }
  expect(parsePintaHexRegionLayerLocations([left, right], bounds, true)).not.toBeNull()
  const map = {
    ...seed,
    origin: { col: 0, row: 0 },
    cols: bounds.cols,
    rows: bounds.rows,
    layers: [
      { ...layer, cells: left },
      { ...layer, id: 'segunda', cells: right },
    ],
  }
  const result = editProjectedMapCells(map, layer.id, [{ col: 1024, row: 0, cell: 1 }])
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toBe('cell-budget')
  expect(map.layers[0]!.cells).toBe(left)
  expect(map.layers[1]!.cells).toBe(right)
})
