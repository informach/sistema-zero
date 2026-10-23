import { expect, test } from 'bun:test'
import { getPalette } from '../core/palette'
import { animatedScene } from '../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { appendSceneImport } from './appendImport'
import { addSceneMirror, addScenePrimitive } from './commands'
import { createSceneProject } from './createProject'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { readSceneDocument } from './readDocument'
import { bindSceneSkin } from './skinBinding'

test('an imported model joins the current scene instead of replacing its pieces', () => {
  const current = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Minha cena' }),
    'box',
    'Casa',
  )
  const imported = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Outro modelo' }),
    'box',
    'Árvore',
  )
  const result = appendSceneImport(current, imported, 'Árvore')
  expect(result.nodes.some((node) => node.name === 'Casa')).toBe(true)
  expect(result.nodes.some((node) => node.name === 'Árvore')).toBe(true)
  expect(result.name).toBe('Minha cena')
})

test('repeated imports receive separate groups and resource IDs while preserving both animations', () => {
  const current = animatedScene()
  const imported = animatedScene()
  const once = appendSceneImport(current, imported, 'Primeiro')
  const twice = appendSceneImport(once, imported, 'Segundo')
  expect(twice.nodes.slice(0, current.nodes.length)).toEqual(current.nodes)
  expect(twice.nodes.filter((node) => node.kind === 'group').map((node) => node.name)).toEqual([
    'Primeiro',
    'Segundo',
  ])
  expect(new Set(twice.nodes.map((node) => node.id)).size).toBe(twice.nodes.length)
  expect(new Set(twice.animations?.map((clip) => clip.id)).size).toBe(3)
  const animatedIds = twice.animations?.map((clip) => clip.tracks[0]?.nodeId) ?? []
  expect(new Set(animatedIds).size).toBe(3)
  expect(animatedIds.every((id) => twice.nodes.some((node) => node.id === id))).toBe(true)
  expect(indexSceneDocument(twice).scene.roots).toHaveLength(
    indexSceneDocument(current).scene.roots.length + 2,
  )
  expect(readSceneDocument(sceneToJson(twice)).status).toBe('valid')
})

test('a different source palette keeps imported painted colors without changing the current palette', () => {
  const current = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Paleta atual' }),
    'box',
    'Casa',
  )
  const base = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Paleta importada' }),
    'box',
    'Árvore',
  )
  const imported = {
    ...base,
    paletteId: 'custom' as const,
    customPalette: { name: 'Doces', colors: getPalette('pastel').colors },
    materials: base.materials.map((material) => ({
      ...material,
      baseColor: { kind: 'palette' as const, index: 2 },
      colorImageId: 'paint',
    })),
    images: [
      {
        id: 'paint',
        name: 'Pintura',
        width: 1,
        height: 1,
        encoding: 'indexed' as const,
        layers: [
          { id: 'layer', name: 'Cor', visible: true, opacity: 1, pixels: new Uint8Array([2]) },
        ],
      },
    ],
  }
  const result = appendSceneImport(current, imported, 'Árvore')
  expect(result.paletteId).toBe(current.paletteId)
  expect(result.materials[0]).toBe(current.materials[0])
  expect(result.materials.at(-1)?.baseColor).toEqual({
    kind: 'rgba',
    value: [1, 179 / 255, 186 / 255, 1],
  })
  expect(result.images.at(-1)?.encoding).toBe('rgba')
  expect(result.images.at(-1)?.layers[0]?.pixels).toEqual(new Uint8Array([255, 179, 186, 255]))
  expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
})

test('imported skin bindings keep their joint and vertex references', () => {
  const current = animatedScene()
  const fixture = makeSceneSkinFixture()
  const imported = {
    ...fixture.document,
    skins: [bindSceneSkin(fixture.document, fixture.input)],
  }
  const result = appendSceneImport(current, imported, 'Personagem')
  const skin = result.skins?.[0]
  expect(skin).toBeDefined()
  expect(result.nodes.some((node) => node.id === skin?.nodeId && node.kind === 'mesh')).toBe(true)
  expect(skin?.joints.every((joint) => result.nodes.some((node) => node.id === joint.nodeId))).toBe(
    true,
  )
  expect(indexSceneDocument(result).skins.size).toBe(1)
  expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
})

test('a mirrored imported piece keeps its mirror on the new node', () => {
  const current = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Cena' }),
    'box',
    'Casa',
  )
  const model = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Modelo' }),
    'box',
    'Árvore',
  )
  const imported = addSceneMirror(model, model.nodes[0]!.id, { axis: 'x', offset: 2 })
  const result = appendSceneImport(current, imported, 'Árvore')
  const added = result.nodes.find((node) => node.name === 'Árvore' && node.kind === 'mesh')
  expect(result.mirrors).toHaveLength(1)
  expect(result.mirrors[0]?.sourceId).toBe(added?.id)
  expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
})
