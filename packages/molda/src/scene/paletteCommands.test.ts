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
  setScenePalette,
  updateScenePaletteColor,
} from './paletteCommands'
import { readSceneDocument } from './readDocument'

const base = () => migrateLegacyModel(makeModel({ parts: [] })).document

test('trocar a paleta conserva extras e guarda as cores personalizadas no documento', () => {
  const source = addScenePaletteColor(base(), '#123456')!.document
  const custom = {
    name: 'Floresta',
    colors: [...resolvePaletteColors(source).slice(0, PALETTE_SIZE)],
  }
  custom.colors[1] = '#abcdef'
  const applied = setScenePalette(source, { paletteId: 'custom', customPalette: custom })
  expect(applied.extraColors).toEqual(['#123456'])
  expect(resolvePaletteColors(applied)[1]).toBe('#abcdef')
  expect(setScenePalette(applied, { paletteId: 'custom', customPalette: custom })).toBe(applied)
  expect(readSceneDocument(sceneToJson(applied)).status).toBe('valid')
  const preset = setScenePalette(applied, { paletteId: 'pastel' })
  expect(preset.customPalette).toBeUndefined()
  expect(preset.extraColors).toEqual(['#123456'])
})

test('paleta de 32 cores preserva a extra pintada em materiais e camadas indexadas', () => {
  const source = addScenePaletteColor(base(), '#123456')!.document
  const document = {
    ...source,
    materials: [
      {
        id: 'material',
        name: 'Teste',
        baseColor: { kind: 'palette' as const, index: 16 },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      },
    ],
    images: [
      {
        id: 'image',
        name: 'Tinta',
        width: 2,
        height: 1,
        encoding: 'indexed' as const,
        layers: [
          {
            id: 'layer',
            name: 'Camada',
            visible: true,
            opacity: 1,
            pixels: Uint8Array.from([16, 1]),
          },
        ],
      },
    ],
  }
  const colors = [
    '',
    ...Array.from({ length: 32 }, (_, i) => `#${i.toString(16).padStart(2, '0')}aabb`),
  ]
  const wide = setScenePalette(document, {
    paletteId: 'custom',
    customPalette: { name: 'Imagem', colors },
  })
  expect(wide.extraColors).toEqual(['#123456'])
  expect(wide.materials[0]?.baseColor).toEqual({ kind: 'palette', index: 33 })
  expect([...wide.images[0]!.layers[0]!.pixels]).toEqual([33, 1])
  expect(readSceneDocument(sceneToJson(wide)).status).toBe('valid')
  const restored = setScenePalette(wide, { paletteId: 'arcade' })
  expect(restored.materials[0]?.baseColor).toEqual({ kind: 'palette', index: 16 })
  expect([...restored.images[0]!.layers[0]!.pixels]).toEqual([16, 1])
})

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
