import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { makeSceneWheelSelection } from '../testing/sceneWheelSelection'
import { buildSceneGeometry } from './geometry'
import { extrudeMeshFaces } from './meshExtrude'
import { insetMeshFaces } from './meshInset'
import { indexMeshEdges } from './meshTopology'

function ids() {
  let i = 0
  return () => `inset-${++i}`
}

function closed(mesh: ReturnType<typeof makeSceneWheelSelection>['mesh']) {
  const edges = indexMeshEdges(mesh).edges
  for (const incident of edges.values()) {
    expect(incident).toHaveLength(2)
    expect(incident[0]!.a).toBe(incident[1]!.b)
    expect(incident[0]!.b).toBe(incident[1]!.a)
  }
  const used = new Set(
    Object.values(mesh.faces).flatMap((face) => face.corners.map((c) => c.vertexId)),
  )
  expect(used.size).toBe(Object.keys(mesh.vertices).length)
  expect(Object.keys(mesh.vertices).length - edges.size + Object.keys(mesh.faces).length).toBe(2)
  expect(buildSceneGeometry(mesh).issues).toEqual([])
}

test('inset of a triangulated wheel cap creates one border with eight bands and keeps its shared center', () => {
  const { mesh } = makeSceneWheelSelection()
  const original = structuredClone(mesh)
  const cap = Object.keys(mesh.faces).filter((id) => id.startsWith('top:'))
  const result = insetMeshFaces(mesh, cap, 0.25, ids())
  expect(Object.keys(result.faces)).toHaveLength(32)
  expect(Object.keys(result.vertices)).toHaveLength(26)
  const inner = new Set(cap.flatMap((id) => result.faces[id]!.corners.map((c) => c.vertexId)))
  expect(inner.size).toBe(9)
  expect(inner.has('center:top')).toBe(true)
  for (const axis of [0, 1, 2] as const)
    expect(result.vertices['center:top']![axis]).toBeCloseTo(mesh.vertices['center:top']![axis], 12)
  for (const id of cap) {
    for (const [i, corner] of result.faces[id]!.corners.entries()) {
      const before = mesh.vertices[mesh.faces[id]!.corners[i]!.vertexId]!
      const after = result.vertices[corner.vertexId]!
      expect(after[0]).toBeCloseTo(before[0] * 0.75, 12)
      expect(after[1]).toBe(1)
      expect(after[2]).toBeCloseTo(before[2] * 0.75, 12)
      expect(corner.uv[0]).toBeCloseTo((after[0] + 1) / 2, 12)
      expect(corner.uv[1]).toBeCloseTo((after[2] + 1) / 2, 12)
    }
  }
  for (const [id, face] of Object.entries(mesh.faces))
    if (!cap.includes(id)) expect(result.faces[id]).toBe(face)
  const edges = indexMeshEdges(result).edges
  for (const incident of edges.values()) {
    expect(incident).toHaveLength(2)
    expect(incident[0]!.a).toBe(incident[1]!.b)
    expect(incident[0]!.b).toBe(incident[1]!.a)
  }
  expect(Object.keys(result.vertices).length - edges.size + Object.keys(result.faces).length).toBe(
    2,
  )
  expect(buildSceneGeometry(result).issues).toEqual([])
  expect(mesh).toEqual(original)
})

test('the inset center extrudes as one closed cap without internal walls or leftover points', () => {
  const { mesh } = makeSceneWheelSelection()
  const cap = Object.keys(mesh.faces).filter((id) => id.startsWith('top:'))
  const generate = ids()
  const inset = insetMeshFaces(mesh, cap, 0.25, generate)
  closed(inset)
  const pulled = extrudeMeshFaces(inset, cap, 0.5, generate)
  expect(Object.keys(pulled.faces)).toHaveLength(40)
  for (const id of cap)
    for (const corner of pulled.faces[id]!.corners)
      expect(pulled.vertices[corner.vertexId]![1]).toBe(1.5)
  closed(pulled)
})

test('separate caps have independent borders, and a partial cap does not expand into unselected faces', () => {
  const { mesh } = makeSceneWheelSelection()
  const cap = Object.keys(mesh.faces).filter(
    (id) => id.startsWith('top:') || id.startsWith('bottom:'),
  )
  const both = insetMeshFaces(mesh, cap, 0.2, ids())
  expect(Object.keys(both.faces)).toHaveLength(40)
  expect(Object.keys(both.vertices)).toHaveLength(34)
  closed(both)
  const partial = insetMeshFaces(mesh, ['top:0', 'top:1'], 0.2, ids())
  expect(Object.keys(partial.faces)).toHaveLength(28)
  for (const id of Object.keys(mesh.faces))
    if (!['top:0', 'top:1'].includes(id)) expect(partial.faces[id]).toBe(mesh.faces[id])
  closed(partial)
})

test('an internal point attached to a loose line stays fixed and is copied for the inset cap', () => {
  const { mesh } = makeSceneWheelSelection()
  mesh.looseEdges = [['center:top', 'center:bottom']]
  const cap = Object.keys(mesh.faces).filter((id) => id.startsWith('top:'))
  const result = insetMeshFaces(mesh, cap, 0.25, ids())
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(result.vertices['center:top']).toBe(mesh.vertices['center:top'])
  expect(Object.keys(result.vertices)).toHaveLength(27)
  expect(new Set(cap.map((id) => result.faces[id]!.corners[0]!.vertexId)).size).toBe(1)
  expect(result.faces['top:0']!.corners[0]!.vertexId).not.toBe('center:top')
})

test('unsafe seams and overlapping topology reject the whole inset without changing its source', () => {
  const { mesh } = makeSceneWheelSelection()
  const cap = Object.keys(mesh.faces).filter((id) => id.startsWith('top:'))
  const seam = structuredClone(mesh)
  seam.faces['top:0']!.corners[0]!.uv = [0.2, 0.3]
  const original = structuredClone(seam)
  expect(() => insetMeshFaces(seam, cap, 0.25, ids())).toThrow('pintura')
  expect(seam).toEqual(original)
  const overlap = { ...mesh, faces: { ...mesh.faces, extra: mesh.faces['top:0']! } }
  expect(() => insetMeshFaces(overlap, cap, 0.25, ids())).toThrow('sobrepostas')
  expect(() => insetMeshFaces(mesh, cap, 0.25, () => 'center:top')).toThrow('uso')
})

test('regions with holes reject without filling the hole, and reversed edges reject without changing winding', () => {
  const grid = makeSceneGridGeometry(3)
  const before = structuredClone(grid)
  expect(() =>
    insetMeshFaces(
      grid,
      Object.keys(grid.faces).filter((id) => id !== 'f_1_1'),
      0.2,
      ids(),
    ),
  ).toThrow('buraco')
  expect(grid).toEqual(before)
  const { mesh } = makeSceneWheelSelection()
  const cap = Object.keys(mesh.faces).filter((id) => id.startsWith('top:'))
  const reversed = structuredClone(mesh)
  reversed.faces['top:0']!.corners.reverse()
  expect(() => insetMeshFaces(reversed, cap, 0.2, ids())).toThrow('viradas')
})
