import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { buildSceneGeometry } from './geometry'
import { diagnoseSceneMesh, repairSceneMesh } from './meshDiagnosis'
import { primitiveMesh } from './primitiveMesh'

test('a closed cube has no findings; open borders and coincident points remain advisory and untouched', () => {
  const cube = primitiveMesh({
    id: 'g',
    kind: 'box',
    from: [0, 0, 0],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  expect(diagnoseSceneMesh(cube)).toEqual([])
  const grid = makeSceneGridGeometry(1)
  grid.vertices.overlap = [...grid.vertices.v_0_0!]
  grid.vertices.nearby = [Number.EPSILON, 0, 0]
  const before = structuredClone(grid)
  const issues = diagnoseSceneMesh(grid)
  expect(issues.find((i) => i.kind === 'open-edges')?.count).toBe(4)
  expect(issues.find((i) => i.kind === 'overlapping-points')?.ids).toEqual(['v_0_0', 'overlap'])
  expect(issues.find((i) => i.kind === 'unused-points')?.ids).toEqual(['overlap', 'nearby'])
  expect(grid).toEqual(before)
})

test('triangulating folded or non-affine painted faces reproduces exactly the current drawing and preserves authorial corners', () => {
  for (const folded of [false, true]) {
    const mesh = makeSceneGridGeometry(1)
    if (folded) mesh.vertices.v_1_1![2] = 0.2
    else mesh.faces.f_0_0!.corners[2]!.uv = [0.4, 0.7]
    mesh.faces.f_0_0!.materialId = 'paint'
    const before = buildSceneGeometry(mesh)
    expect(diagnoseSceneMesh(mesh).find((i) => i.kind === 'prepare-faces')?.ids).toEqual(['f_0_0'])
    const repaired = repairSceneMesh(mesh, 'prepare-faces')
    const after = buildSceneGeometry(repaired)
    expect(after.positions).toEqual(before.positions)
    expect(after.uvs).toEqual(before.uvs)
    expect(after.materialIds).toEqual(before.materialIds)
    expect(after.normals).toEqual(before.normals)
    expect(repaired.vertices).toBe(mesh.vertices)
    for (const face of Object.values(repaired.faces))
      for (const corner of face.corners)
        expect(mesh.faces.f_0_0!.corners.includes(corner)).toBe(true)
    expect(diagnoseSceneMesh(repaired).some((i) => i.kind === 'prepare-faces')).toBe(false)
    expect(repairSceneMesh(repaired, 'prepare-faces')).toBe(repaired)
  }
})

test('duplicate detection respects corner paint, material, winding and cycle rotation; deletion keeps all points and other faces', () => {
  const mesh = makeSceneGridGeometry(1)
  const source = mesh.faces.f_0_0!
  mesh.faces.copy = {
    ...source,
    corners: [...source.corners.slice(2), ...source.corners.slice(0, 2)],
  }
  mesh.faces.reversed = { ...source, corners: [...source.corners].reverse() }
  mesh.faces.otherMaterial = { ...source, materialId: 'other' }
  mesh.faces.otherUv = {
    ...source,
    corners: source.corners.map((c) => ({ ...c, uv: [c.uv[0] + 0.1, c.uv[1]] })),
  }
  const before = structuredClone(mesh)
  const issues = diagnoseSceneMesh(mesh)
  expect(issues.find((i) => i.kind === 'duplicate-faces')?.ids).toEqual(['copy'])
  expect(issues.find((i) => i.kind === 'ambiguous-edges')?.count).toBe(4)
  const repaired = repairSceneMesh(mesh, 'duplicate-faces')
  expect(Object.keys(repaired.faces)).toHaveLength(4)
  expect(repaired.faces.f_0_0).toBe(source)
  expect(repaired.faces.otherUv).toBe(mesh.faces.otherUv)
  expect(repaired.vertices).toBe(mesh.vertices)
  expect(mesh).toEqual(before)
})

test('unused points, empty lines and duplicate lines are independent repairs with exact impact, including special IDs', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = { ...mesh.vertices, ['__proto__']: [0, 0, 0], orphan: [10, 10, 10] }
  mesh.looseEdges = [
    ['v_0_0', '__proto__'],
    ['v_0_0', 'v_1_0'],
    ['v_1_0', 'v_0_0'],
    ['v_0_0', 'v_1_0'],
  ]
  const issues = diagnoseSceneMesh(mesh)
  expect(issues.find((i) => i.kind === 'empty-lines')?.count).toBe(1)
  expect(issues.find((i) => i.kind === 'duplicate-lines')?.count).toBe(2)
  const points = repairSceneMesh(mesh, 'unused-points')
  expect(Object.hasOwn(points.vertices, 'orphan')).toBe(false)
  expect(Object.hasOwn(points.vertices, '__proto__')).toBe(true)
  expect(points.faces).toBe(mesh.faces)
  expect(points.looseEdges).toBe(mesh.looseEdges)
  const lines = repairSceneMesh(mesh, 'duplicate-lines')
  expect(lines.looseEdges).toEqual(mesh.looseEdges.slice(0, 2))
  expect(lines.looseEdges[1]).toBe(mesh.looseEdges[1])
  expect(lines.faces).toBe(mesh.faces)
  const empty = repairSceneMesh(mesh, 'empty-lines')
  expect(empty.looseEdges).toEqual(mesh.looseEdges.slice(1))
  expect(empty.vertices).toBe(mesh.vertices)
  expect(empty.faces).toBe(mesh.faces)
})

test('faces that cannot draw are offered separately from winding conflicts; removal never fills or deletes their points', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices.a = [2, 0, 0]
  mesh.vertices.b = [3, 0, 0]
  mesh.vertices.c = [4, 0, 0]
  mesh.faces.flat = { corners: ['a', 'b', 'c'].map((vertexId) => ({ vertexId, uv: [0, 0] })) }
  mesh.faces.copy = mesh.faces.f_0_0!
  const issues = diagnoseSceneMesh(mesh)
  expect(issues.find((i) => i.kind === 'invalid-faces')?.ids).toEqual(['flat'])
  expect(issues.find((i) => i.kind === 'conflicting-winding')?.count).toBe(4)
  const repaired = repairSceneMesh(mesh, 'invalid-faces')
  expect(Object.hasOwn(repaired.faces, 'flat')).toBe(false)
  expect(repaired.faces.copy).toBe(mesh.faces.copy)
  expect(repaired.vertices).toBe(mesh.vertices)
})
