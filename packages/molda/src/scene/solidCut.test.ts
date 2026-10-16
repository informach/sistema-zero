import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeModel } from '../testing/fixtures'
import { createSceneAnimation, setSceneAnimationKey } from './animationCommands'
import { addScenePrimitive, setSceneNodeFlag } from './commands'
import type { ScenePrimitiveGeometry } from './document'
import { sceneToJson } from './documentJson'
import { quaternionFromEulerXYZ } from './matrix'
import { requireClosedSceneMesh, sceneMeshVolume } from './meshSolid'
import { migrateLegacyModel } from './migrateLegacy'
import { primitiveMesh } from './primitiveMesh'
import { readSceneDocument } from './readDocument'
import { readSceneGeometry } from './readGeometry'
import { prepareSceneAnimation } from './sampleAnimation'
import { cutSceneSolid, splitSceneSolid } from './solidCut'

const ids = () => {
  let n = 0
  return () => `cut-${++n}`
}
const primitive = (kind: ScenePrimitiveGeometry['kind'], scale = 1) =>
  primitiveMesh({
    id: 'g',
    kind,
    from: [-scale, -scale, -scale],
    to: [scale, scale, scale],
    surfaces: {},
  }).mesh

test('every native solid yields two closed solids with conserved volume at axis and oblique cuts', () => {
  for (const kind of ['box', 'wedge', 'cylinder', 'sphere'] as const) {
    for (const normal of [
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 2, 3],
    ] satisfies Vec3[]) {
      const mesh = primitive(kind)
      const snapshot = structuredClone(mesh)
      const halves = splitSceneSolid(mesh, { origin: [0, -0.1, 0], normal }, 'cap', ids())
      for (const half of halves) {
        expect(() => requireClosedSceneMesh(half)).not.toThrow()
        expect(readSceneGeometry(half)).toEqual(half)
        expect(sceneMeshVolume(half)).toBeGreaterThan(0)
        expect(Object.values(half.faces).some((face) => face.materialId === 'cap')).toBe(true)
      }
      expect(halves.reduce((sum, half) => sum + sceneMeshVolume(half), 0)).toBeCloseTo(
        sceneMeshVolume(mesh),
        10,
      )
      expect(mesh).toEqual(snapshot)
    }
  }
})

test('exact vertex and edge cuts retain manifold boundaries across scales', () => {
  for (const scale of [1e-10, 1, 1e10]) {
    for (const normal of [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ] satisfies Vec3[]) {
      const halves = splitSceneSolid(
        primitive('box', scale),
        { origin: [0, 0, 0], normal },
        'cap',
        ids(),
      )
      for (const half of halves) {
        expect(() => requireClosedSceneMesh(half)).not.toThrow()
        expect(sceneMeshVolume(half) / scale ** 3).toBeCloseTo(4, 10)
      }
    }
  }
})

test('a cut is atomic, keeps exterior UVs and existing rigid motion on both children', () => {
  let document = addScenePrimitive(
    migrateLegacyModel(makeModel({ parts: [] })).document,
    'box',
    'Corpo',
  )
  const id = document.nodes[0]!.id
  document = createSceneAnimation(document, 'Giro')
  const clip = document.animations![0]!.id
  for (const [time, angle] of [
    [0, 0],
    [1, 90],
    [2, 180],
  ])
    document = setSceneAnimationKey(document, clip, {
      nodeId: id,
      channel: 'rotation',
      key: { time: time!, value: quaternionFromEulerXYZ([0, angle!, 0]), interpolation: 'smooth' },
    })
  const snapshot = structuredClone(document)
  const next = cutSceneSolid(document, id, { origin: [0, 0, 0], normal: [1, 0, 0] }, ids())
  expect(next.nodes.map((node) => node.name)).toEqual(['Corpo (1)', 'Corpo (2)'])
  expect(next.nodes[0]!.id).toBe(id)
  expect(next.nodes.map((node) => node.pivot)).toEqual([
    [-0.5, -1, 0],
    [0.5, -1, 0],
  ])
  expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
  const before = prepareSceneAnimation(document, clip),
    after = prepareSceneAnimation(next, clip)
  for (let time = 0; time <= 2; time += 0.125)
    for (const node of next.nodes)
      expect(after.sample(time, false).worldMatrices.get(node.id)).toEqual(
        before.sample(time, false).worldMatrices.get(id),
      )
  expect(document).toEqual(snapshot)
  expect(() =>
    cutSceneSolid(setSceneNodeFlag(document, [id], 'locked', true), id, {
      origin: [0, 0, 0],
      normal: [1, 0, 0],
    }),
  ).toThrow('Destrave')
})

test('open, inverted, tangent and missed solids are refused without mutation', () => {
  const mesh = primitive('box')
  const snapshot = structuredClone(mesh)
  const open = { ...mesh, faces: Object.fromEntries(Object.entries(mesh.faces).slice(1)) }
  const inverted = {
    ...mesh,
    faces: Object.fromEntries(
      Object.entries(mesh.faces).map(([id, face]) => [
        id,
        { ...face, corners: [...face.corners].reverse() },
      ]),
    ),
  }
  for (const invalid of [open, inverted])
    expect(() =>
      splitSceneSolid(invalid, { origin: [0, 0, 0], normal: [1, 0, 0] }, 'cap', ids()),
    ).toThrow()
  for (const x of [1, 2])
    expect(() =>
      splitSceneSolid(mesh, { origin: [x, 0, 0], normal: [1, 0, 0] }, 'cap', ids()),
    ).toThrow()
  expect(mesh).toEqual(snapshot)
})
