import { expect, test } from 'bun:test'
import { makePintaHexCell } from '@sistemazero/core/creations'
import { isProjectedTileLayer } from '../../core/projectedDocument'
import { nativeNineGallery } from '../../testing/nativeNineFixtures'
import { editProjectedMapCells } from '../projectedMap'
import { type AutomapBook, automapSheetIdentity } from './book'
import { automapCellReader } from './cells'
import { captureAutomapExample, previewAutomapping } from './engine'

test('o mesmo avaliador aplica e captura regras projetadas sem alterar a geometria nem os giros não tocados', async () => {
  const { hex, iso, sheet } = await nativeNineGallery()
  const sheets = new Map([
    [sheet.id, await automapSheetIdentity(sheet as Parameters<typeof automapSheetIdentity>[0])],
  ])
  for (const source of [hex, iso]) {
    const layer = source.layers.find(isProjectedTileLayer)!
    const at = source.origin
    const painted = editProjectedMapCells(source, layer.id, [{ ...at, cell: 0 }])
    if (!painted.ok) throw Error('Pincel recusado')
    const input = captureAutomapExample(
      painted.map,
      { ...at, cols: 1, rows: 1 },
      [layer.id],
      sheets,
    )!
    expect(input).not.toBeNull()
    const book: AutomapBook = {
      format: 'pinta-regras',
      version: 1,
      seed: 1,
      rules: [
        {
          id: 'regra',
          name: 'Mudar',
          width: 1,
          height: 1,
          input,
          outputs: [[{ ...input[0]!, cells: [-1] }]],
        },
      ],
    }
    const result = previewAutomapping(painted.map, book, sheets, { ...at, cols: 1, rows: 1 })
    if (!result.ok) throw Error(result.reason)
    expect(result.changes).toBe(1)
    expect(automapCellReader(result.map, layer.id)?.at(at.col, at.row)).toBe(-1)
    expect(result.map.projection).toBe(source.projection)
    expect(result.map.automapping).toBe(source.automapping)
  }
  const layer = hex.layers.find(isProjectedTileLayer)!
  const rotated = editProjectedMapCells(hex, layer.id, [
    { ...hex.origin, cell: makePintaHexCell(0, { rotation: 120 })! },
  ])
  if (!rotated.ok) throw Error('Giro recusado')
  // Rulebook 1 cannot express hex rotations. Refuse an example instead of silently flattening it.
  expect(
    captureAutomapExample(rotated.map, { ...hex.origin, cols: 1, rows: 1 }, [layer.id], sheets),
  ).toBeNull()
})
