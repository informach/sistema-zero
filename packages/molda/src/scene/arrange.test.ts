import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { arrangeSceneNodes } from './arrange'
import { addScenePrimitive, groupSceneNodes } from './commands'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { quaternionFromEulerXYZ, transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import { createSceneSkin } from './skinCommands'
import { compileSceneSkinGeometry, deformSceneSkin } from './skinPose'

function fixture() {
  let document = migrateLegacyModel(makeModel({ parts: [] })).document
  for (let i = 0; i < 3; i++) document = addScenePrimitive(document, 'box', `Peça ${i}`)
  document = {
    ...document,
    nodes: document.nodes.map((node, i) => ({
      ...node,
      transform: {
        kind: 'trs',
        translation: [i === 0 ? 0 : i === 1 ? 5 : 20, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [i + 1, 1, 1],
      },
    })),
  }
  return { document, ids: document.nodes.map((node) => node.id) }
}
const origins = (source: MoldaSceneDocument, ids: readonly string[]) => {
  const index = indexSceneDocument(source)
  return ids.map((id) => transformPoint(index.scene.worldMatrices.get(id)!, [0, 0, 0]))
}

test('world alignment and spacing preserve geometry, pixels, pivots, animation and native TRS', () => {
  const { document, ids } = fixture()
  const original = structuredClone(document)
  for (const [operation, expected] of [
    ['minimum', [0, 1, 2]],
    ['center', [11, 11, 11]],
    ['maximum', [22, 21, 20]],
    ['centers', [0, 10, 20]],
    ['gaps', [0, 9, 20]],
  ] as const) {
    const next = arrangeSceneNodes(document, ids, 'x', operation)
    expect(origins(next, ids).map((point) => point[0])).toEqual([...expected])
    expect(next.geometries).toBe(document.geometries)
    expect(next.images).toBe(document.images)
    expect(next.animations).toBe(document.animations)
    next.nodes.forEach((node, i) => {
      expect(node.pivot).toEqual(document.nodes[i]!.pivot)
      expect(node.transform.kind).toBe('trs')
    })
  }
  expect(document).toEqual(original)
})

test('selected parent and child move exactly once while children retain their local transforms', () => {
  const { document, ids } = fixture()
  const grouped = groupSceneNodes(document, ids.slice(0, 2), { name: 'Grupo' })
  const group = grouped.nodes.find((node) => node.kind === 'group')!
  const next = arrangeSceneNodes(grouped, [group.id, ids[0]!, ids[2]!], 'x', 'maximum')
  expect(origins(next, ids).map((point) => point[0])).toEqual([16, 21, 20])
  expect(next.nodes.find((node) => node.id === ids[0])).toBe(
    grouped.nodes.find((node) => node.id === ids[0]),
  )
  expect(next.nodes.find((node) => node.id === ids[1])).toBe(
    grouped.nodes.find((node) => node.id === ids[1]),
  )
})

test('rotated scaled parents receive a local displacement derived from the same world direction', () => {
  const { document, ids } = fixture()
  const nested: MoldaSceneDocument = {
    ...document,
    nodes: [
      {
        id: 'parent',
        name: 'Grupo',
        kind: 'group',
        parentId: null,
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: quaternionFromEulerXYZ([0, 0, 90]),
          scale: [2, 3, 1],
        },
      },
      ...document.nodes.map((node, i) => (i === 1 ? { ...node, parentId: 'parent' } : node)),
    ],
  }
  const next = arrangeSceneNodes(nested, ids, 'x', 'maximum')
  const before = origins(nested, ids),
    after = origins(next, ids)
  after.forEach((point, i) => {
    expect(point[0]).toBeCloseTo([22, 20, 20][i]!, 10)
  })
  expect(after[1]![1]).toBeCloseTo(before[1]![1], 10)
  expect(next.nodes[0]).toBe(nested.nodes[0])
})

test('locks, insufficient independent roots and insufficient room reject the complete arrangement', () => {
  const { document, ids } = fixture()
  const locked = {
    ...document,
    nodes: document.nodes.map((node, i) => ({ ...node, locked: i === 1 })),
  }
  expect(() => arrangeSceneNodes(locked, ids, 'x', 'center')).toThrow('Destrave')
  expect(() => arrangeSceneNodes(document, ids.slice(0, 2), 'x', 'gaps')).toThrow('três')
  expect(() => arrangeSceneNodes(document, ids, 'y', 'gaps')).toThrow('Afaste')
  expect(origins(document, ids).map((point) => point[0])).toEqual([0, 5, 20])
})

test('a rig aligns its deformed form as one unit; a mesh or bone alone cannot leave its binding behind', () => {
  const fixture = makeSceneSkinFixture(),
    { id, ...input } = fixture.input
  let source = addScenePrimitive(
    createSceneSkin(fixture.document, input, () => id),
    'box',
    'Destino',
  )
  const boxId = source.nodes.at(-1)!.id
  source = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === 'upper'
        ? {
            ...node,
            transform: {
              kind: 'trs' as const,
              translation: [2, 1, 0] as [number, number, number],
              rotation: quaternionFromEulerXYZ([0, 0, 35]),
              scale: [1, 1, 1] as [number, number, number],
            },
          }
        : node.id === boxId
          ? {
              ...node,
              transform: {
                kind: 'trs' as const,
                translation: [20, 0, 0] as [number, number, number],
                rotation: [0, 0, 0, 1] as [number, number, number, number],
                scale: [1, 1, 1] as [number, number, number],
              },
            }
          : node,
    ),
  }
  const points = (document: MoldaSceneDocument) => {
    const index = indexSceneDocument(document),
      skin = document.skins![0]!,
      node = index.scene.nodes.get(skin.nodeId)!
    if (node.kind !== 'mesh') throw Error('fixture')
    const geometry = index.geometries.get(node.geometryId)!
    if (geometry.kind !== 'mesh') throw Error('fixture')
    const deformed = deformSceneSkin(
      compileSceneSkinGeometry(skin, geometry),
      index.scene.worldMatrices,
    )
    const vertices = Array.from({ length: deformed.length / 3 }, (_, i) =>
      transformPoint(index.scene.worldMatrices.get(node.id)!, [
        deformed[i * 3]!,
        deformed[i * 3 + 1]!,
        deformed[i * 3 + 2]!,
      ]),
    )
    vertices.push(transformPoint(index.scene.worldMatrices.get('lower')!, [0, 0, 0]))
    return vertices
  }
  const before = points(source)
  const next = arrangeSceneNodes(source, ['rig', boxId], 'x', 'maximum')
  const after = points(next),
    delta = after[0]![0] - before[0]![0]
  expect(Math.max(...after.map((point) => point[0]))).toBeCloseTo(21, 10)
  after.forEach((point, i) => {
    expect(point[0] - before[i]![0]).toBeCloseTo(delta, 10)
    expect(point[1]).toBeCloseTo(before[i]![1], 10)
    expect(point[2]).toBeCloseTo(before[i]![2], 10)
  })
  expect(next.skins).toBe(source.skins)
  expect(next.geometries).toBe(source.geometries)
  expect(() => arrangeSceneNodes(source, ['part-0', boxId], 'x', 'maximum')).toThrow(
    'todos os seus ossos',
  )
  expect(() => arrangeSceneNodes(source, ['upper', boxId], 'x', 'maximum')).toThrow(
    'todos os seus ossos',
  )
})
