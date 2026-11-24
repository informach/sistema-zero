import { expect, test } from 'bun:test'
import { automapFixture } from '../../testing/automapFixture'
import { automapImportLayers, bindAutomapImport } from './import'
import { automapSheetIndex } from './native'

test('intercâmbio exige confirmação de camadas distintas e arte com todos os índices originais', async () => {
  const { map, book, sheet } = await automapFixture()
  const source = structuredClone(book)
  const rule = source.rules[0]!
  rule.input[0]!.layer = 'entrada'
  rule.outputs[0]![0]!.layer = 'saida'
  const choices = new Map([
    ['entrada', 'chao'],
    ['saida', 'frente'],
  ])
  const sheets = await automapSheetIndex(map, [sheet])
  expect(automapImportLayers(source, map, sheets)?.map((l) => l.choices.length)).toEqual([2, 2])
  expect(bindAutomapImport(source, map, sheets, new Map())).toBeNull()
  expect(
    bindAutomapImport(
      source,
      map,
      sheets,
      new Map([
        ['entrada', 'chao'],
        ['saida', 'chao'],
      ]),
    ),
  ).toBeNull()
  expect(bindAutomapImport(source, map, sheets, choices)).toEqual(book)
  expect(source.rules[0]!.input[0]!.layer).toBe('entrada')
  const changed = { ...sheet, solid: [true] }
  const replaced = await automapSheetIndex(map, [changed])
  expect(bindAutomapImport(source, map, replaced, choices)).toBeNull()
})
