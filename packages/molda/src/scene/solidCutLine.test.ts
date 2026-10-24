import { expect, test } from 'bun:test'
import { makeSceneKnifeLoop } from '../testing/sceneKnifeLoop'
import { cutMeshByPlane } from './meshPlaneCut'
import { requireClosedSceneMesh, sceneMeshVolume } from './meshSolid'
import { indexMeshEdges } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { cutSceneSolid, splitSceneSolid } from './solidCut'
import { sceneSolidCutLinePlane } from './solidCutLine'

test('an internal flat line previews a volume cut and creates two independent closed pieces', () => {
  const { document, nodeId, mesh, seed } = makeSceneKnifeLoop()
  const plane = sceneSolidCutLinePlane(mesh, [seed])
  expect(plane.origin[0]).toBe(0)
  expect(Math.abs(plane.normal[0])).toBe(1)
  const next = cutSceneSolid(document, nodeId, plane)
  expect(next.nodes).toHaveLength(document.nodes.length + 1)
  expect(next.nodes.map((node) => node.name)).toEqual(['corpo (1)', 'corpo (2)'])
  const pieces = next.nodes.map((node) => {
    if (node.kind !== 'mesh') throw new Error('Missing mesh')
    const geometry = next.geometries.find((entry) => entry.id === node.geometryId)
    if (geometry?.kind !== 'mesh') throw new Error('Missing geometry')
    requireClosedSceneMesh(geometry)
    return geometry
  })
  expect(pieces[0]!.id).not.toBe(pieces[1]!.id)
  expect(pieces.reduce((sum, piece) => sum + sceneMeshVolume(piece), 0)).toBeCloseTo(
    sceneMeshVolume(mesh),
    8,
  )
})

test('a corner line cannot silently choose one of two cut directions', () => {
  const { mesh } = makeSceneKnifeLoop()
  const corner = [...indexMeshEdges(mesh).edges].find(([, incident]) => {
    if (incident.length !== 2) return false
    const [a, b] = incident[0] ? [mesh.vertices[incident[0].a]!, mesh.vertices[incident[0].b]!] : []
    return a?.[0] === -1 && b?.[0] === -1
  })![0]
  expect(() => sceneSolidCutLinePlane(mesh, [corner])).toThrow(/dobra/)
  expect(() => sceneSolidCutLinePlane(mesh, ['missing'])).toThrow(/linha interna/)
})

test('a closed planar loop defines its own cut plane regardless of edge order', () => {
  const { document, nodeId, mesh, loop } = makeSceneKnifeLoop()
  const plane = sceneSolidCutLinePlane(mesh, [...loop].reverse())
  expect(Math.hypot(...plane.normal)).toBeCloseTo(1)
  const pieces = cutSceneSolid(document, nodeId, plane)
  expect(pieces.nodes).toHaveLength(2)
  expect(() => sceneSolidCutLinePlane(mesh, loop.slice(0, -1))).toThrow(/loop fechado/)
  expect(() => sceneSolidCutLinePlane(mesh, [...loop, 'missing'])).toThrow(/loop de linhas/)
  const vertexId = indexMeshEdges(mesh).edges.get(loop[0]!)![0]!.a
  const point = mesh.vertices[vertexId]!
  const warped = {
    ...mesh,
    vertices: {
      ...mesh.vertices,
      [vertexId]: point.map((value, axis) => value + plane.normal[axis]! * 0.1) as typeof point,
    },
  }
  expect(() => sceneSolidCutLinePlane(warped, loop)).toThrow(/mesmo plano/)
  const slightlyWarped = {
    ...mesh,
    vertices: {
      ...mesh.vertices,
      [vertexId]: point.map((value, axis) => value + plane.normal[axis]! * 1e-11) as typeof point,
    },
  }
  expect(() => sceneSolidCutLinePlane(slightlyWarped, loop)).toThrow(/mesmo plano/)
})

test('a sixteen-line loop around a tapered piece cuts across its volume', () => {
  const original = primitiveMesh({
    id: 'taper',
    kind: 'cylinder',
    from: [-1, -1, -1],
    to: [1, 1, 1],
    tessellation: { around: 16 },
    surfaces: {},
  }).mesh
  const divided = cutMeshByPlane(original, {
    origin: [0, 0, 0],
    normal: [0, 1, 0],
  })
  const mesh = {
    ...divided.mesh,
    vertices: Object.fromEntries(
      Object.entries(divided.mesh.vertices).map(([id, point]) => [
        id,
        id.startsWith('ring:top:')
          ? ([point[0] * 0.4, point[1], point[2] * 0.4] as typeof point)
          : point,
      ]),
    ),
  }
  requireClosedSceneMesh(mesh)
  const { edgeIds } = divided
  expect(edgeIds).toHaveLength(16)
  const plane = sceneSolidCutLinePlane(mesh, [...edgeIds].reverse())
  expect(Math.abs(plane.normal[1])).toBeCloseTo(1)
  expect(plane.origin[1]).toBe(0)
  const pieces = splitSceneSolid(mesh, plane, 'cap')
  for (const piece of pieces) requireClosedSceneMesh(piece)
  expect(pieces.reduce((sum, piece) => sum + sceneMeshVolume(piece), 0)).toBeCloseTo(
    sceneMeshVolume(mesh),
    8,
  )
  expect(() => sceneSolidCutLinePlane(mesh, edgeIds.slice(0, -1))).toThrow(/loop fechado/)
})
