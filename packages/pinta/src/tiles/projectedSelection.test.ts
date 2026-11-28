import { expect, test } from 'bun:test'
import { makePintaHexCell, PINTA_HEX_EMPTY_CELL } from '@sistemazero/core/creations'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { PROJECTED_HEX, projectedFixture } from '../testing/nativeNineFixtures'
import { editProjectedMapCells } from './projectedMap'
import { copyProjectedSelection, pasteProjectedSelection } from './projectedSelection'

test('copiar e colar conserva vazios, giros e espelhos hexagonais e recusa uma folha diferente', () => {
  const map = projectedFixture(PROJECTED_HEX)
  const layer = map.layers.find(isProjectedTileLayer)!
  const at = { ...map.origin }
  const value = makePintaHexCell(0, { rotation: 120, flipY: true })!
  const edited = editProjectedMapCells(map, layer.id, [
    { ...at, cell: value },
    { col: at.col + 1, row: at.row, cell: PINTA_HEX_EMPTY_CELL },
  ])
  if (!edited.ok) throw Error('Edição recusada')
  const clip = copyProjectedSelection(edited.map, layer.id, { ...at, cols: 2, rows: 1 })!
  expect(clip.cells).toEqual([value, PINTA_HEX_EMPTY_CELL])
  const pasted = pasteProjectedSelection(edited.map, layer.id, clip, {
    col: at.col,
    row: at.row + 1,
  })
  if (!pasted.ok) throw Error('Colagem recusada')
  expect(
    copyProjectedSelection(pasted.map, layer.id, { col: at.col, row: at.row + 1, cols: 2, rows: 1 })
      ?.cells,
  ).toEqual(clip.cells)
  expect(pasted.map.automapping).toBe(map.automapping)
  expect(pasteProjectedSelection(map, layer.id, { ...clip, sheet: 'outra-folha' }, at).ok).toBe(
    false,
  )
  expect(pasteProjectedSelection(map, layer.id, { ...clip, cols: 65537 }, at).ok).toBe(false)
  expect(copyProjectedSelection(map, layer.id, { ...at, cols: 65537, rows: 1 })).toBeNull()
})
