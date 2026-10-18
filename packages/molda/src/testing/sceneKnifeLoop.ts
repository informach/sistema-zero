import { addScenePrimitive, editSceneMesh } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import { meshComponentEdges } from '../scene/meshComponents'
import { cutMeshWithKnife } from '../scene/meshKnife'
import { meshEdgeKey } from '../scene/meshTopology'
import { sceneGeometryMesh } from '../scene/parametricGeometry'
import { setScenePieceCoordinates } from '../scene/pieceCoordinates'

/** The top cut continues diagonally through triangular side faces and an existing bottom edge. */
export function makeSceneKnifeLoop() {
  let document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Loop da faca' }),
    'box',
    'corpo',
  )
  const nodeId = document.nodes[0]!.id
  document = setScenePieceCoordinates(document, nodeId, 'dimensions', [4, 0.6, 2])
  document = setScenePieceCoordinates(document, nodeId, 'position', [0, 0, 0])
  const initial = sceneGeometryMesh(document.geometries[0]!)
  const bottomFront = Object.keys(initial.vertices).find((id) =>
    initial.vertices[id]!.every((n, axis) => n === [1, -1, 1][axis]),
  )!
  const bottomBack = Object.keys(initial.vertices).find((id) =>
    initial.vertices[id]!.every((n, axis) => n === [1, -1, -1][axis]),
  )!
  const edgeAt = (z: number) =>
    [...meshComponentEdges(initial)].find(([, ids]) =>
      ids.every((id) => initial.vertices[id]![1] === 1 && initial.vertices[id]![2] === z),
    )![0]
  const mesh = cutMeshWithKnife(initial, [
    { kind: 'vertex', vertexId: bottomFront },
    { kind: 'edge', edgeId: edgeAt(1), t: 0.5 },
    { kind: 'edge', edgeId: edgeAt(-1), t: 0.5 },
    { kind: 'vertex', vertexId: bottomBack },
  ]).mesh
  const topAt = (z: number) =>
    Object.keys(mesh.vertices).find(
      (id) =>
        mesh.vertices[id]![0] === 0 && mesh.vertices[id]![1] === 1 && mesh.vertices[id]![2] === z,
    )!
  const vertices = [topAt(1), topAt(-1), bottomBack, bottomFront]
  const loop = vertices.map((id, i) => meshEdgeKey(id, vertices[(i + 1) % vertices.length]!))
  document = editSceneMesh(document, nodeId, () => mesh)
  return { document, nodeId, mesh, loop, seed: loop[0]! }
}
