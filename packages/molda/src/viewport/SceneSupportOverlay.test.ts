import { expect, test } from 'bun:test'
import {
  BufferAttribute,
  LineSegments,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  Vector3,
} from 'three'
import { indexSceneDocument } from '../scene/documentIndex'
import { SCENE_LIMITS } from '../scene/limits'
import { createSceneSkin } from '../scene/skinCommands'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneSupportOverlay } from './SceneSupportOverlay'
import { prepareSceneSupports, type SceneSupportPoint } from './sceneSupports'

test('support snapshots use authorial affine origins, skip mesh intermediates and retain bound joints during isolation', () => {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    source = createSceneSkin(document, input, () => id),
    before = structuredClone(source),
    index = indexSceneDocument(source),
    all = prepareSceneSupports(index, new Set(['lower']), null)
  expect(all.map((point) => [point.id, point.parent, point.selected])).toEqual([
    ['rig', null, false],
    ['upper', 0, false],
    ['lower', 1, true],
  ])
  for (const point of all)
    expect([...point.position]).toEqual(index.scene.worldMatrices.get(point.id)!.slice(12, 15))
  expect(
    prepareSceneSupports(index, new Set(), new Set(['part-0'])).map((point) => [
      point.id,
      point.parent,
    ]),
  ).toEqual([
    ['upper', null],
    ['lower', 0],
  ])
  expect(
    prepareSceneSupports(indexSceneDocument(document), new Set(), new Set(['part-0'])),
  ).toEqual([])
  const throughMesh = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === 'upper' ? { ...node, parentId: 'part-0' } : node,
    ),
  }
  expect(
    prepareSceneSupports(indexSceneDocument(throughMesh), new Set(), null).map(
      (point) => point.parent,
    ),
  ).toEqual([null, 0, 1])
  const hidden = {
    ...source,
    nodes: source.nodes.map((node) => (node.id === 'upper' ? { ...node, hidden: true } : node)),
  }
  expect(
    prepareSceneSupports(indexSceneDocument(hidden), new Set(), null).map((point) => point.id),
  ).toEqual(['rig'])
  const locked = {
    ...source,
    nodes: source.nodes.map((node) => (node.id === 'rig' ? { ...node, locked: true } : node)),
  }
  expect(
    prepareSceneSupports(indexSceneDocument(locked), new Set(), null).every(
      (point) => point.locked,
    ),
  ).toBe(true)
  all[0]!.position.fill(999)
  expect(source).toEqual(before)
})

test('guides reuse owned attributes across 120 poses, validate before mutation and dispose only their resources once', () => {
  const overlay = new SceneSupportOverlay(),
    { document } = makeSceneSkinFixture(),
    source = structuredClone(document),
    points = prepareSceneSupports(indexSceneDocument(document), new Set(['lower']), null),
    objects = overlay.root.children.map((object) => {
      if (!(object instanceof Points || object instanceof LineSegments))
        throw new Error('Missing guides')
      return object
    }),
    geometries = objects.map((object) => object.geometry),
    attributes = geometries.map((geometry) => {
      const attribute = geometry.getAttribute('position')
      if (!(attribute instanceof BufferAttribute)) throw new Error('Expected owned attribute')
      return attribute
    }),
    arrays = attributes.map((attribute) => attribute.array)
  let geometryDisposals = 0,
    materialDisposals = 0
  for (const object of objects) {
    object.geometry.addEventListener('dispose', () => {
      geometryDisposals++
    })
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials)
      material.addEventListener('dispose', () => {
        materialDisposals++
      })
  }
  try {
    expect(overlay.root.visible).toBe(false)
    overlay.update(points)
    const versions = attributes.map((attribute) => attribute.version)
    overlay.update(points)
    expect(attributes.map((attribute) => attribute.version)).toEqual(versions)
    for (let frame = 0; frame < 120; frame++) {
      const next = points.map((point) => ({
        ...point,
        position: point.position.map((value, axis) =>
          axis === 0 ? value + frame / 10 : value,
        ) as [number, number, number],
      }))
      overlay.update(next)
      expect(objects.map((object) => object.geometry)).toEqual(geometries)
      for (const [i, geometry] of geometries.entries()) {
        expect(geometry.getAttribute('position')).toBe(attributes[i]!)
        expect(geometry.getAttribute('position').array).toBe(arrays[i]!)
      }
    }
    const saved = arrays.map((array) => array.slice())
    expect(() => overlay.update([{ ...points[0]!, position: [Number.MAX_VALUE, 0, 0] }])).toThrow(
      'precisão',
    )
    expect(() => overlay.update([{ ...points[0]!, parent: 0 }])).toThrow('Ligação')
    expect(() => overlay.update(Array(SCENE_LIMITS.nodes + 1).fill(points[0]!))).toThrow(
      'orçamento',
    )
    expect(arrays).toEqual(saved)
    expect(geometryDisposals).toBe(0)
    expect(materialDisposals).toBe(0)
    expect(document).toEqual(source)
  } finally {
    overlay.dispose()
    overlay.dispose()
  }
  expect(geometryDisposals).toBe(3)
  expect(materialDisposals).toBe(3)
  expect(overlay.root.children).toHaveLength(0)
  expect(() => overlay.update(points)).toThrow('liberados')
})

test('screen-space picking has 44px targets in perspective and orthographic views, stable ties and no locked/hidden/offscreen hits', () => {
  for (const camera of [
    new PerspectiveCamera(60, 2, 0.1, 100),
    new OrthographicCamera(-4, 4, 2, -2, 0.1, 100),
  ]) {
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld(true)
    const overlay = new SceneSupportOverlay(),
      point: SceneSupportPoint = {
        id: 'b',
        position: [0, 0, 0],
        parent: null,
        selected: false,
        locked: false,
      },
      screen = { x: 200, y: 100, width: 400, height: 200 }
    try {
      overlay.update([point])
      expect(overlay.pick(camera, { ...screen, x: 222, y: 122 })).toBe('b')
      expect(overlay.pick(camera, { ...screen, x: 222.01 })).toBeNull()
      overlay.update([point, { ...point, id: 'a' }])
      expect(overlay.pick(camera, screen)).toBe('a')
      overlay.update([{ ...point, id: 'a' }, point])
      expect(overlay.pick(camera, screen)).toBe('a')
      overlay.update([point, { ...point, id: 'front', position: [0, 0, 2] }])
      expect(overlay.pick(camera, screen)).toBe('front')
      overlay.update([
        { ...point, locked: true },
        { ...point, id: 'outside', position: [100, 0, 0] },
        { ...point, id: 'behind', position: [0, 0, 11] },
      ])
      expect(overlay.pick(camera, screen)).toBeNull()
      point.position = [1, 0.5, 0]
      overlay.update([point])
      const projected = new Vector3(...point.position).project(camera),
        target = { ...screen, x: (projected.x + 1) * 200, y: (1 - projected.y) * 100 }
      point.position.fill(999)
      expect(overlay.pick(camera, target)).toBe('b')
      expect(overlay.pick(camera, { ...screen, width: 0 })).toBeNull()
      expect(overlay.pick(camera, { ...screen, x: -1 })).toBeNull()
      overlay.hide()
      expect(overlay.pick(camera, target)).toBeNull()
    } finally {
      overlay.dispose()
    }
    expect(overlay.pick(camera, screen)).toBeNull()
  }
})
