import { describe, expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import { booleanSceneSolids } from './booleanSolids'
import { addSceneBox, transformSceneNodes } from './commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { sceneToJson } from './documentJson'
import { identityMatrix } from './matrix'
import { sceneMeshVolume } from './meshSolid'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

function pair() {
  let next = 0
  const id = () => `boolean-${++next}`
  let document = migrateLegacyModel(makeModel()).document
  document = addSceneBox(document, 'Base', id)
  const base = document.nodes.at(-1)!.id
  document = addSceneBox(document, 'Cortador', id)
  const tool = document.nodes.at(-1)!.id
  const translation = identityMatrix()
  translation[12] = 1
  document = transformSceneNodes(document, [tool], translation)
  return { document, base, tool, id }
}

function resultMesh(document: MoldaSceneDocument, base: string) {
  const node = document.nodes.find((node) => node.id === base)
  if (node?.kind !== 'mesh') throw new Error('Base ausente')
  return document.geometries.find(
    (geometry) => geometry.id === node.geometryId,
  ) as SceneMeshGeometry
}

describe('booleanos sólidos', () => {
  for (const [operation, volume] of [
    ['union', 12],
    ['intersection', 4],
    ['difference', 4],
  ] as const) {
    test(`${operation} gera volume editável e documento válido`, async () => {
      const { document, base, tool, id } = pair()
      const result = await booleanSceneSolids(document, [base, tool], operation, id)
      expect(result.nodes.some((node) => node.id === tool)).toBe(false)
      expect(sceneMeshVolume(resultMesh(result, base))).toBeCloseTo(volume, 3)
      expect(
        Object.values(resultMesh(result, base).faces).every((face) =>
          face.corners.every((corner) => corner.uv.every(Number.isFinite)),
        ),
      ).toBe(true)
      if (operation === 'difference') {
        const cutter = document.nodes.find((node) => node.id === tool)
        if (cutter?.kind !== 'mesh') throw new Error('Cortador ausente')
        expect(
          Object.values(resultMesh(result, base).faces).some(
            (face) => face.materialId === cutter.materialId,
          ),
        ).toBe(true)
      }
      expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
      expect(document.nodes.some((node) => node.id === tool)).toBe(true)
    })
  }

  test('respeita a orientação de uma segunda peça espelhada', async () => {
    const { document, base, tool, id } = pair()
    const mirror = identityMatrix()
    mirror[0] = -1
    const flipped = transformSceneNodes(document, [tool], mirror)
    const result = await booleanSceneSolids(flipped, [base, tool], 'difference', id)
    expect(sceneMeshVolume(resultMesh(result, base))).toBeCloseTo(4, 3)
  })

  test('combina uma peça girada sem perder o fechamento da malha', async () => {
    const { document, base, tool, id } = pair()
    const rotation = identityMatrix()
    const angle = Math.PI / 6
    rotation[0] = Math.cos(angle)
    rotation[2] = -Math.sin(angle)
    rotation[8] = Math.sin(angle)
    rotation[10] = Math.cos(angle)
    const rotated = transformSceneNodes(document, [tool], rotation)
    const result = await booleanSceneSolids(rotated, [base, tool], 'union', id)
    expect(sceneMeshVolume(resultMesh(result, base))).toBeGreaterThan(8)
  })

  test('combina uma forma curva sem abrir a malha', async () => {
    const { document, base, tool, id } = pair()
    const cutter = document.nodes.find((node) => node.id === tool)
    if (cutter?.kind !== 'mesh') throw new Error('Cortador ausente')
    const curved: MoldaSceneDocument = {
      ...document,
      geometries: document.geometries.map((geometry) =>
        geometry.id === cutter.geometryId && geometry.kind === 'box'
          ? { ...geometry, kind: 'cylinder' as const, tessellation: { around: 16 } }
          : geometry,
      ),
    }
    const result = await booleanSceneSolids(curved, [base, tool], 'difference', id)
    expect(sceneMeshVolume(resultMesh(result, base))).toBeGreaterThan(0)
    expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
  })

  test('diferença cria uma cavidade fechada quando o cortador está dentro da base', async () => {
    const { document, base, tool, id } = pair()
    const center = identityMatrix()
    center[12] = -1
    const centered = transformSceneNodes(document, [tool], center)
    const shrink = identityMatrix()
    shrink[0] = shrink[5] = shrink[10] = 0.5
    const nested = transformSceneNodes(centered, [tool], shrink)
    const result = await booleanSceneSolids(nested, [base, tool], 'difference', id)
    expect(sceneMeshVolume(resultMesh(result, base))).toBeCloseTo(7, 3)
    expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
  })

  test('união preserva duas regiões separadas e diferença mantém a base', async () => {
    const { document, base, tool, id } = pair()
    const away = identityMatrix()
    away[12] = 5
    const separated = transformSceneNodes(document, [tool], away)
    const union = await booleanSceneSolids(separated, [base, tool], 'union', id)
    expect(sceneMeshVolume(resultMesh(union, base))).toBeCloseTo(16, 3)
    expect(readSceneDocument(sceneToJson(union)).status).toBe('valid')
    const difference = await booleanSceneSolids(separated, [base, tool], 'difference', id)
    expect(sceneMeshVolume(resultMesh(difference, base))).toBeCloseTo(8, 3)
    expect(readSceneDocument(sceneToJson(difference)).status).toBe('valid')
  })

  test('interseção sem volume recusa a confirmação', async () => {
    const { document, base, tool, id } = pair()
    const away = identityMatrix()
    away[12] = 5
    const separated = transformSceneNodes(document, [tool], away)
    await expect(booleanSceneSolids(separated, [base, tool], 'intersection', id)).rejects.toThrow(
      'não produzem um volume',
    )
    expect(separated.nodes.some((node) => node.id === tool)).toBe(true)
  })

  test('recusa malha aberta e peça bloqueada sem mudar a origem', async () => {
    const { document, base, tool, id } = pair()
    const first = document.nodes.find((node) => node.id === base)!
    if (first.kind !== 'mesh') throw new Error('Base ausente')
    const box = document.geometries.find((geometry) => geometry.id === first.geometryId)!
    if (box.kind !== 'box') throw new Error('Caixa ausente')
    const open = structuredClone(document)
    const shape = open.geometries.find((geometry) => geometry.id === first.geometryId)!
    if (shape.kind !== 'box') throw new Error('Caixa ausente')
    shape.from[0] = shape.to[0]
    await expect(booleanSceneSolids(open, [base, tool], 'union', id)).rejects.toThrow()
    const locked = structuredClone(document)
    locked.nodes.find((node) => node.id === tool)!.locked = true
    await expect(booleanSceneSolids(locked, [base, tool], 'union', id)).rejects.toThrow('Destrave')
    expect(document.geometries.find((geometry) => geometry.id === box.id)).toBe(box)
  })

  test('confirmação entra como uma ação no histórico', async () => {
    const { document, base, tool, id } = pair()
    const preview = await booleanSceneSolids(document, [base, tool], 'difference', id)
    const editor = createDocumentEditorStore({
      asset: document,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    try {
      expect(editor.getState().asset.nodes).toEqual(document.nodes)
      editor.getState().commit(preview)
      editor.getState().undo()
      expect(editor.getState().asset.nodes).toEqual(document.nodes)
      editor.getState().redo()
      expect(editor.getState().asset.nodes).toEqual(preview.nodes)
    } finally {
      editor.getState().dispose()
    }
  })
})
