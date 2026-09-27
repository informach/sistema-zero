import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { buildSceneGeometry } from './geometry'
import { indexMeshUv } from './meshUv'
import { prepareMeshUvStitch } from './meshUvCorners'
import { meshUvLayout } from './meshUvLayout'
import { editMeshUv } from './meshUvOperations'
import { readSceneGeometry } from './readGeometry'

test('corner moves preserve Double coordinates and all unrelated corner/topology references, with exact no-op and strict selection', () => {
  const mesh = makeSceneGridGeometry(2),
    before = structuredClone(mesh)
  const uv: [number, number] = [0.123456789123456, -1e-300]
  const result = editMeshUv(mesh, ['f_0_0'], { kind: 'corner', faceId: 'f_0_0', corner: 1, uv })
  expect(result.faces.f_0_0!.corners[1]!.uv).toEqual(uv)
  uv[0] = 0
  expect(result.faces.f_0_0!.corners[1]!.uv[0]).toBe(0.123456789123456)
  expect(result.faces.f_0_0!.corners[0]).toBe(mesh.faces.f_0_0!.corners[0])
  expect(result.faces.f_1_0).toBe(mesh.faces.f_1_0)
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(buildSceneGeometry(result).positions).toEqual(buildSceneGeometry(mesh).positions)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(
    editMeshUv(result, ['f_0_0'], {
      kind: 'corner',
      faceId: 'f_0_0',
      corner: 1,
      uv: result.faces.f_0_0!.corners[1]!.uv,
    }),
  ).toBe(result)
  for (const operation of [
    { kind: 'corner' as const, faceId: 'f_1_0', corner: 0, uv: [0, 0] as [number, number] },
    { kind: 'corner' as const, faceId: 'f_0_0', corner: 4, uv: [0, 0] as [number, number] },
    { kind: 'corner' as const, faceId: 'f_0_0', corner: 0.5, uv: [0, 0] as [number, number] },
    { kind: 'corner' as const, faceId: 'f_0_0', corner: 0, uv: [Infinity, 0] as [number, number] },
  ])
    expect(() => editMeshUv(mesh, ['f_0_0'], operation)).toThrow()
  expect(mesh).toEqual(before)
})

test('explicit stitching moves exactly two opposite corner UVs, joins an actual seam and refuses unselected or ambiguous neighbors', () => {
  const grid = makeSceneGridGeometry(2)
  const mesh = { ...grid, faces: { f_0_0: grid.faces.f_0_0!, f_1_0: grid.faces.f_1_0! } }
  const ids = Object.keys(mesh.faces),
    before = structuredClone(mesh)
  expect(indexMeshUv(mesh).islands).toHaveLength(2)
  const plan = prepareMeshUvStitch(mesh, ids, 'f_0_0', 1)
  expect(plan.changedCorners).toBe(2)
  expect(plan.targetFaceId).toBe('f_1_0')
  const result = editMeshUv(mesh, ids, { kind: 'stitch', faceId: 'f_0_0', corner: 1 })
  expect(result.faces.f_0_0).toBe(mesh.faces.f_0_0)
  expect(result.faces.f_1_0!.corners[0]!.uv).toEqual(mesh.faces.f_0_0.corners[1]!.uv)
  expect(result.faces.f_1_0!.corners[3]!.uv).toEqual(mesh.faces.f_0_0.corners[2]!.uv)
  expect(result.faces.f_1_0!.corners[1]).toBe(mesh.faces.f_1_0.corners[1])
  expect(result.faces.f_1_0!.corners[2]).toBe(mesh.faces.f_1_0.corners[2])
  expect(indexMeshUv(result).islands).toHaveLength(1)
  expect(editMeshUv(result, ids, { kind: 'stitch', faceId: 'f_0_0', corner: 1 })).toBe(result)
  expect(prepareMeshUvStitch(mesh, ['f_0_0'], 'f_0_0', 1).blockedReason).toContain(
    'também a face vizinha',
  )
  expect(() => prepareMeshUvStitch(mesh, ['f_0_0'], 'f_0_0', 1).apply()).toThrow()
  expect(prepareMeshUvStitch(mesh, ids, 'f_0_0', 0).blockedReason).not.toBeNull()
  const material = {
    ...mesh,
    faces: { ...mesh.faces, f_1_0: { ...mesh.faces.f_1_0, materialId: 'other' } },
  }
  expect(prepareMeshUvStitch(material, ids, 'f_0_0', 1).blockedReason).toContain(
    'materiais diferentes',
  )
  const nonmanifold = { ...mesh, faces: { ...mesh.faces, duplicate: mesh.faces.f_1_0 } }
  expect(prepareMeshUvStitch(nonmanifold, ids, 'f_0_0', 1).blockedReason).not.toBeNull()
  expect(mesh).toEqual(before)
})

test('frozen UV view maps deltas without snapping or click-offset jumps and rejects only unrepresentable results', () => {
  const mesh = makeSceneGridGeometry(1),
    layout = meshUvLayout(mesh)
  const point: [number, number] = [0.123456789123456, -0.1]
  const back = layout.unmap(layout.map(point))!
  expect(back[0]).toBeCloseTo(point[0], 14)
  expect(back[1]).toBeCloseTo(point[1], 14)
  expect(layout.translate(point, [0, 0])).toEqual(point)
  const moved = layout.translate(point, [0.09, -0.18])!
  expect(moved[0]).toBeCloseTo(point[0] + 0.1, 14)
  expect(moved[1]).toBeCloseTo(point[1] + 0.2, 14)
  expect(layout.translate([1e308, 0], [Number.MAX_VALUE, 0])).toBeNull()
})
