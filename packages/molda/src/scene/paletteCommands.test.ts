import { expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { PALETTE_SIZE } from '../core/palette'
import { resolvePaletteColors } from '../core/sanitize'
import { makeModel } from '../testing/fixtures'
import { sceneToJson } from './documentJson'
import { migrateLegacyModel } from './migrateLegacy'
import {
  addScenePaletteColor,
  dropLastScenePaletteColor,
  updateScenePaletteColor,
} from './paletteCommands'
import { readSceneDocument } from './readDocument'

const base = () => migrateLegacyModel(makeModel({ parts: [] })).document

test('cor que já existe reaproveita o índice; cor nova vira extra no fim, sem mexer nas outras', () => {
  const document = base()
  const colors = resolvePaletteColors(document)
  const existing = addScenePaletteColor(document, colors[3]!.toUpperCase())!
  expect(existing).toEqual({ document, index: 3 })
  const added = addScenePaletteColor(document, '#123abc')!
  expect(added.index).toBe(colors.length)
  expect(resolvePaletteColors(added.document).slice(0, colors.length)).toEqual([...colors])
  expect(resolvePaletteColors(added.document)[added.index]).toBe('#123abc')
  expect(readSceneDocument(sceneToJson(added.document)).status).toBe('valid')
  expect(addScenePaletteColor(added.document, '#123ABC')).toEqual({
    document: added.document,
    index: added.index,
  })
  expect(() => addScenePaletteColor(document, 'azul')).toThrow('Escolha uma cor válida.')
})

test('com as 48 extras ocupadas, não cabe mais nenhuma', () => {
  let document = base()
  for (let i = 0; i < MOLDA_LIMITS.maxExtraColors; i++)
    document = addScenePaletteColor(document, `#00${(0x1000 + i).toString(16).slice(-4)}`)!.document
  expect(document.extraColors).toHaveLength(MOLDA_LIMITS.maxExtraColors)
  expect(addScenePaletteColor(document, '#fedcba')).toBeNull()
})

test('trocar uma extra muda só ela, no lugar; cor repetida, fixa ou fora das extras não troca', () => {
  const first = addScenePaletteColor(base(), '#111111')!
  const second = addScenePaletteColor(first.document, '#222222')!
  const changed = updateScenePaletteColor(second.document, first.index, '#333333')
  expect(changed.extraColors).toEqual(['#333333', '#222222'])
  expect(updateScenePaletteColor(changed, first.index, '#333333')).toBe(changed)
  expect(updateScenePaletteColor(changed, first.index, '#222222')).toBe(changed)
  const fixed = resolvePaletteColors(changed)[2]!
  expect(updateScenePaletteColor(changed, first.index, fixed)).toBe(changed)
  expect(updateScenePaletteColor(changed, 2, '#444444')).toBe(changed)
  expect(updateScenePaletteColor(changed, PALETTE_SIZE + 5, '#444444')).toBe(changed)
})

test('só a última extra sai, e a lista vazia some do documento', () => {
  const one = addScenePaletteColor(base(), '#111111')!
  const two = addScenePaletteColor(one.document, '#222222')!
  expect(dropLastScenePaletteColor(two.document, one.index)).toBe(two.document)
  expect(dropLastScenePaletteColor(two.document, two.index).extraColors).toEqual(['#111111'])
  expect('extraColors' in dropLastScenePaletteColor(one.document, one.index)).toBe(false)
})
