import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { addScenePrimitive, setSceneNodeFlag } from './commands'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { migrateLegacyModel } from './migrateLegacy'
import { ensureScenePaintSurface } from './paintSurface'
import { patchScenePieceAppearance } from './pieceAppearance'
import { readSceneDocument } from './readDocument'

const counter = () => {
  let n = 0
  return () => `look${++n}`
}

function twoBoxes() {
  const nextId = counter()
  const base = migrateLegacyModel(makeModel({ parts: [] })).document
  const one = addScenePrimitive(base, 'box', 'porta', nextId)
  const two = addScenePrimitive(one, 'box', 'parede', nextId)
  const [door, wall] = two.nodes
  if (door?.kind !== 'mesh' || wall?.kind !== 'mesh') throw new Error('Peças ausentes.')
  return { document: two, door, wall, nextId }
}

const materialOf = (document: MoldaSceneDocument, nodeId: string) => {
  const node = document.nodes.find((entry) => entry.id === nodeId)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
  return document.materials.find((entry) => entry.id === node.materialId)!
}

const valid = (document: MoldaSceneDocument) =>
  expect(readSceneDocument(sceneToJson(document)).status).toBe('valid')

test('material só da peça: muda no lugar, e nada mudou devolve o mesmo documento', () => {
  const { document, door } = twoBoxes()
  const next = patchScenePieceAppearance(document, door.id, {
    baseColor: { kind: 'palette', index: 3 },
    roughness: 0.2,
    metalness: 1,
  })
  valid(next)
  expect(materialOf(next, door.id)).toMatchObject({
    id: door.materialId,
    baseColor: { kind: 'palette', index: 3 },
    roughness: 0.2,
    metalness: 1,
  })
  expect(next.materials).toHaveLength(document.materials.length)
  expect(next.nodes).toBe(document.nodes)
  expect(next.geometries).toBe(document.geometries)
  expect(next.images).toBe(document.images)
  expect(patchScenePieceAppearance(next, door.id, { roughness: 0.2, metalness: 1 })).toBe(next)
  expect(patchScenePieceAppearance(next, door.id, {})).toBe(next)
})

test('material dividido: pintar a porta de azul não pinta a parede, e nenhum pixel é copiado', () => {
  const { document, door, wall, nextId } = twoBoxes()
  const painted = ensureScenePaintSurface(document, { nodeId: door.id }, nextId)
  if (painted.status !== 'ready') throw new Error('Superfície ausente.')
  const doorMaterial = materialOf(painted.document, door.id)
  const sharing: MoldaSceneDocument = {
    ...painted.document,
    nodes: painted.document.nodes.map((node) =>
      node.id === wall.id ? { ...wall, materialId: doorMaterial.id } : node,
    ),
  }
  const next = patchScenePieceAppearance(
    sharing,
    door.id,
    { baseColor: { kind: 'palette', index: 11 } },
    nextId,
  )
  valid(next)
  const forked = materialOf(next, door.id)
  expect(forked.id).not.toBe(doorMaterial.id)
  expect(forked.baseColor).toEqual({ kind: 'palette', index: 11 })
  expect(forked.colorImageId).toBe(doorMaterial.colorImageId)
  expect(materialOf(next, wall.id)).toEqual(doorMaterial)
  expect(next.images).toBe(sharing.images)
})

test('vale para todos os materiais da peça, inclusive o da face pintada do editor antigo', () => {
  const document = migrateLegacyModel(makeModel()).document
  const next = patchScenePieceAppearance(document, 'body', {
    baseColor: { kind: 'palette', index: 4 },
  })
  for (const id of ['material:body', 'paint:body:py'])
    expect(next.materials.find((entry) => entry.id === id)?.baseColor).toEqual({
      kind: 'palette',
      index: 4,
    })
  expect(next.materials.find((entry) => entry.id === 'material:wing')).toEqual(
    document.materials.find((entry) => entry.id === 'material:wing'),
  )
})

test('face com material dividido em geometria dividida: só esta peça ganha a cópia', () => {
  const { document, door, wall, nextId } = twoBoxes()
  const geometry = document.geometries.find((entry) => entry.id === door.geometryId)!
  if (geometry.kind !== 'box') throw new Error('Caixa ausente.')
  const shared: MoldaSceneDocument = {
    ...document,
    geometries: document.geometries
      .filter((entry) => entry.id !== wall.geometryId)
      .map((entry) =>
        entry.id === geometry.id
          ? {
              ...geometry,
              surfaces: {
                py: { materialId: wall.materialId, uv: { origin: [0, 0], u: [1, 0], v: [0, 1] } },
              },
            }
          : entry,
      ),
    nodes: document.nodes.map((node) =>
      node.id === wall.id ? { ...wall, geometryId: door.geometryId } : node,
    ),
  }
  valid(shared)
  const next = patchScenePieceAppearance(shared, door.id, { metalness: 1 }, nextId)
  valid(next)
  const doorNode = next.nodes.find((entry) => entry.id === door.id)
  const wallNode = next.nodes.find((entry) => entry.id === wall.id)
  if (doorNode?.kind !== 'mesh' || wallNode?.kind !== 'mesh') throw new Error('Peças ausentes.')
  expect(doorNode.geometryId).not.toBe(door.geometryId)
  expect(wallNode.geometryId).toBe(door.geometryId)
  const doorTop = next.geometries.find((entry) => entry.id === doorNode.geometryId)
  if (doorTop?.kind !== 'box') throw new Error('Caixa ausente.')
  const topMaterial = next.materials.find((entry) => entry.id === doorTop.surfaces.py?.materialId)!
  expect(topMaterial.id).not.toBe(wall.materialId)
  expect(topMaterial.metalness).toBe(1)
  expect(materialOf(next, wall.id).metalness).toBe(0)
})

test('recusas: peça travada e cor fora da paleta', () => {
  const { document, door } = twoBoxes()
  expect(() =>
    patchScenePieceAppearance(setSceneNodeFlag(document, [door.id], 'locked', true), door.id, {
      metalness: 1,
    }),
  ).toThrow('Destrave')
  expect(() =>
    patchScenePieceAppearance(document, door.id, { baseColor: { kind: 'palette', index: 999 } }),
  ).toThrow()
  expect(() => patchScenePieceAppearance(document, door.id, { roughness: 2 })).toThrow()
})
