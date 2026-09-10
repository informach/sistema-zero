import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry, Vec2 } from './document'
import { buildSceneGeometry } from './geometry'
import { indexMeshUv, mapMeshUv, meshUvBounds } from './meshUv'
import { meshUvLayout } from './meshUvLayout'
import { editMeshUv, type MeshUvOperation } from './meshUvOperations'
import { readSceneGeometry } from './readGeometry'

function continuous(size = 2) {
  const mesh = makeSceneGridGeometry(size)
  return editMeshUv(mesh, Object.keys(mesh.faces), { kind: 'project', plane: 'xy' })
}

test('UV islands cross only exact opposite corner pairs, not nearby UV, materials or ambiguous edges', () => {
  const grid = makeSceneGridGeometry(2)
  expect(indexMeshUv(grid).islands).toHaveLength(4)
  const mesh = continuous()
  expect(indexMeshUv(mesh).islands).toHaveLength(1)
  expect(indexMeshUv(mesh).seams).toHaveLength(8)
  const split = mapMeshUv(mesh, ['f_0_0'], (uv) => [uv[0] + 1e-14, uv[1]])
  expect(indexMeshUv(split).islands).toHaveLength(2)
  const material = {
    ...mesh,
    faces: { ...mesh.faces, f_0_0: { ...mesh.faces.f_0_0!, materialId: 'other' } },
  }
  expect(indexMeshUv(material).islands).toHaveLength(2)
  const nonmanifold = { ...mesh, faces: { ...mesh.faces, duplicate: mesh.faces.f_0_0! } }
  expect(indexMeshUv(nonmanifold).islands).toHaveLength(3)
  const flipped = {
    ...mesh,
    faces: {
      ...mesh.faces,
      f_0_0: { ...mesh.faces.f_0_0!, corners: [...mesh.faces.f_0_0!.corners].reverse() },
    },
  }
  expect(indexMeshUv(flipped).islands).toHaveLength(2)
})

test('UV transforms preserve topology, material, precision, source identity and unchanged references', () => {
  const mesh = continuous()
  const before = structuredClone(mesh)
  const operation: MeshUvOperation = {
    kind: 'transform',
    offset: [0.123456789123456, -2],
    scale: [1, 1],
    degrees: 360,
  }
  const result = editMeshUv(mesh, ['f_0_0'], operation)
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(result.faces.f_1_1).toBe(mesh.faces.f_1_1)
  expect(result.faces.f_0_0!.corners.map((c) => c.vertexId)).toEqual(
    mesh.faces.f_0_0!.corners.map((c) => c.vertexId),
  )
  expect(result.faces.f_0_0!.corners[0]!.uv).toEqual(operation.offset)
  expect(buildSceneGeometry(result).positions).toEqual(buildSceneGeometry(mesh).positions)
  expect(buildSceneGeometry(result).normals).toEqual(buildSceneGeometry(mesh).normals)
  expect(readSceneGeometry(result)).toEqual(result)
  const identity: MeshUvOperation = { kind: 'transform', offset: [0, 0], scale: [1, 1], degrees: 0 }
  expect(editMeshUv(mesh, Object.keys(mesh.faces), identity)).toBe(mesh)
  const tiny = mapMeshUv(mesh, ['f_0_0'], (uv) => [uv[0] * 1e-300, uv[1] * 1e-300])
  expect(editMeshUv(tiny, ['f_0_0'], identity)).toBe(tiny)
  expect(mesh).toEqual(before)
})

test('quarter turns and flips use the common selection center and do not accumulate trigonometric noise', () => {
  const mesh = continuous()
  const ids = Object.keys(mesh.faces)
  let rotated = mesh
  for (let i = 0; i < 4; i++)
    rotated = editMeshUv(rotated, ids, {
      kind: 'transform',
      offset: [0, 0],
      scale: [1, 1],
      degrees: 90,
    })
  expect(rotated).toEqual(mesh)
  const flip: MeshUvOperation = { kind: 'transform', offset: [0, 0], scale: [-1, 1], degrees: 0 }
  const mirrored = editMeshUv(mesh, ids, flip)
  expect(mirrored.faces.f_0_0!.corners[0]!.uv).toEqual([1, 0])
  expect(editMeshUv(mirrored, ids, flip)).toEqual(mesh)
  expect(
    editMeshUv(mesh, ids, { kind: 'transform', offset: [0, 0], scale: [1, 1], degrees: -90 }),
  ).toEqual(
    editMeshUv(mesh, ids, { kind: 'transform', offset: [0, 0], scale: [1, 1], degrees: 270 }),
  )
  expect(
    editMeshUv(mesh, ids, { kind: 'transform', offset: [0, 0], scale: [1, 1], degrees: 1e-14 }),
  ).not.toBe(mesh)
})

test('axis and individual planar projection preserve proportions without altering 3D geometry', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices.v_1_0 = [4, 0, 0]
  mesh.vertices.v_1_1 = [4, 1, 0]
  mesh.vertices.v_0_1 = [0, 1, 0]
  const ids = Object.keys(mesh.faces)
  const projected = editMeshUv(mesh, ids, { kind: 'project', plane: 'xy' })
  expect(meshUvBounds(projected)).toEqual({ min: [0, 0], max: [1, 0.25] })
  const tilted: SceneMeshGeometry = {
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, p]) => [
        id,
        [p[0] / Math.SQRT2, p[1], p[0] / Math.SQRT2],
      ]),
    ),
  }
  const result = editMeshUv(tilted, ids, { kind: 'project', plane: 'face' })
  const uv = result.faces.f_0_0!.corners.map((c) => c.uv)
  const distance = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])
  expect(distance(uv[0]!, uv[1]!) / distance(uv[1]!, uv[2]!)).toBeCloseTo(4, 12)
  expect(result.vertices).toBe(tilted.vertices)
  const extreme = {
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, p]) => [
        id,
        [p[0] ? 1e308 : -1e308, p[1] ? 1e308 : -1e308, 0] as [number, number, number],
      ]),
    ),
  }
  expect(meshUvBounds(editMeshUv(extreme, ids, { kind: 'project', plane: 'xy' }))).toEqual({
    min: [0, 0],
    max: [1, 1],
  })
})

test('packing is deterministic, keeps relative scale and leaves positive margins without changing topology', () => {
  const grid = makeSceneGridGeometry(3)
  const mesh = mapMeshUv(grid, Object.keys(grid.faces), (uv, id) => {
    const index = Object.keys(grid.faces).indexOf(id) + 1
    return [uv[0] * index + 20, uv[1] * index * 0.5 - 30]
  })
  const before = structuredClone(mesh)
  const ids = Object.keys(mesh.faces)
  const packed = editMeshUv(mesh, ids, { kind: 'pack', padding: 0.01 })
  expect(editMeshUv(mesh, [...ids].reverse(), { kind: 'pack', padding: 0.01 })).toEqual(packed)
  expect(packed.vertices).toBe(mesh.vertices)
  let density: number | undefined
  const boxes = ids.map((id, i) => {
    const bounds = meshUvBounds(packed, [id])
    const width = bounds.max[0] - bounds.min[0]
    const height = bounds.max[1] - bounds.min[1]
    expect(width / height).toBeCloseTo(2, 12)
    if (density === undefined) density = width / (i + 1)
    else expect(width / (i + 1)).toBeCloseTo(density, 12)
    for (const a of [0, 1] as const) {
      expect(bounds.min[a]).toBeGreaterThanOrEqual(0.01 - 1e-12)
      expect(bounds.max[a]).toBeLessThanOrEqual(0.99 + 1e-12)
    }
    return bounds
  })
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!,
        b = boxes[j]!
      expect(
        [0, 1].some(
          (axis) =>
            a.max[axis]! + 0.01 <= b.min[axis]! + 1e-12 ||
            b.max[axis]! + 0.01 <= a.min[axis]! + 1e-12,
        ),
      ).toBe(true)
    }
  expect(readSceneGeometry(packed)).toEqual(packed)
  expect(mesh).toEqual(before)
})

test('UV operation failures are atomic; packing refuses partial islands and impossible margins', () => {
  const mesh = continuous(4)
  const before = structuredClone(mesh)
  expect(() => editMeshUv(mesh, ['f_0_0'], { kind: 'pack', padding: 0.02 })).toThrow(
    'ilhas inteiras',
  )
  expect(() =>
    editMeshUv(makeSceneGridGeometry(5), Object.keys(mesh.faces), { kind: 'pack', padding: 0.25 }),
  ).toThrow('margem')
  expect(() => editMeshUv(mesh, ['missing'], { kind: 'project', plane: 'xy' })).toThrow(
    'face mudou',
  )
  expect(() =>
    editMeshUv(mesh, ['f_0_0'], { kind: 'transform', offset: [NaN, 0], scale: [1, 1], degrees: 0 }),
  ).toThrow()
  expect(() =>
    editMeshUv(mesh, ['f_0_0'], { kind: 'pack', padding: 0.1, unknown: true } as MeshUvOperation),
  ).toThrow('Campo desconhecido')
  expect(() => mapMeshUv(mesh, ['f_0_0'], () => [Infinity, 0])).toThrow('ultrapassa')
  const huge = mapMeshUv(mesh, ['f_0_0'], (uv) => [1e308 + uv[0] * 1e308, 0])
  expect(() =>
    editMeshUv(huge, ['f_0_0'], {
      kind: 'transform',
      offset: [1e308, 0],
      scale: [1, 1],
      degrees: 0,
    }),
  ).toThrow('ultrapassa')
  expect(mesh).toEqual(before)
})

test('UV special IDs are owned properties; finite layout includes out-of-tile values and cycles overlaps', () => {
  const grid = makeSceneGridGeometry(1)
  const mesh = {
    ...grid,
    faces: { ['__proto__']: grid.faces.f_0_0!, constructor: grid.faces.f_0_0! },
  }
  const result = editMeshUv(mesh, ['__proto__'], {
    kind: 'transform',
    offset: [0.125, -3],
    scale: [1, 1],
    degrees: 0,
  })
  expect(Object.entries(result.faces).find(([id]) => id === 'constructor')?.[1]).toBe(
    mesh.faces.constructor,
  )
  expect(Object.hasOwn(result.faces, '__proto__')).toBe(true)
  expect(readSceneGeometry(result)).toEqual(result)
  const layout = meshUvLayout(mesh)
  expect(layout.pick([0.5, 0.5], undefined)).toBe('__proto__')
  expect(layout.pick([0.5, 0.5], '__proto__')).toBe('constructor')
  expect(layout.pick([0, 0], undefined)).toBeNull()
  const extreme = mapMeshUv(grid, ['f_0_0'], (uv) => [
    uv[0] ? 1e308 : -1e308,
    uv[1] ? 1e308 : -1e308,
  ])
  const outside = meshUvLayout(extreme)
  expect(
    outside.faces.every((f) =>
      f.points.every((p) => p.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)),
    ),
  ).toBe(true)
})

test('large UV island traversal and packing stay within the model budget without recursive walks or spread overflow', () => {
  const mesh = continuous(96)
  const index = indexMeshUv(mesh)
  expect(index.islands).toHaveLength(1)
  expect(index.islands[0]).toHaveLength(9216)
  const result = editMeshUv(mesh, Object.keys(mesh.faces), { kind: 'pack', padding: 0.02 })
  expect(result.vertices).toBe(mesh.vertices)
  expect(meshUvBounds(result).min).toEqual([0.02, 0.02])
  expect(meshUvLayout(result).faces).toHaveLength(9216)
})
