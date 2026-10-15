import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { dot, sub } from '../model/vec'
import { duplicateSceneAnimationTargets } from './animationTargets'
import { splitSceneBox } from './boxSolidCut'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import type {
  ModelSceneNode,
  MoldaSceneDocument,
  SceneGeometry,
  SceneMaterial,
  SceneMeshGeometry,
} from './document'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { capSceneMesh } from './meshCutCaps'
import { editMeshFaces } from './meshFaces'
import { cutMeshByPlane, type MeshCutPlane } from './meshPlaneCut'
import { requireClosedSceneMesh, sceneMeshVolume } from './meshSolid'
import { requireNonIntersectingSceneSolid } from './meshSolidIntersections'
import { meshIdAllocator } from './meshTopology'
import { parametricMesh, sceneGeometryMesh } from './parametricGeometry'
import { requireScene, tuple } from './validation'

export function splitSceneSolid(
  mesh: SceneMeshGeometry,
  plane: MeshCutPlane,
  capMaterial: string,
  nextId = newId,
): [SceneMeshGeometry, SceneMeshGeometry] {
  tuple(plane.origin, 3, 'plane.origin')
  tuple(plane.normal, 3, 'plane.normal')
  const magnitude = Math.hypot(...plane.normal)
  requireScene(
    magnitude > 0 && Number.isFinite(magnitude),
    'plane',
    'Escolha um plano de corte válido.',
  )
  const normal = plane.normal.map((n) => n / magnitude) as Vec3
  requireClosedSceneMesh(mesh)
  requireNonIntersectingSceneSolid(mesh)
  const before = sceneMeshVolume(mesh)
  requireScene(before > 0, 'mesh', 'A peça precisa ter volume e faces orientadas para fora.')
  const triangulated = editMeshFaces(
    mesh,
    Object.keys(mesh.faces),
    'triangulate',
    meshIdAllocator(mesh, nextId),
  )
  const cut = cutMeshByPlane(triangulated, { origin: plane.origin, normal }, nextId)
  const halves = ([-1, 1] as const).map((side) => {
    const faces = Object.fromEntries(
      Object.entries(cut.mesh.faces).filter(([id, face]) => {
        const sign = cut.faceSides.get(id)
        if (sign !== 0) return sign === side
        // A face lying on the plane belongs only to the side behind its outward normal.
        const points = face.corners.map((corner) => cut.mesh.vertices[corner.vertexId]!)
        const a = sub(points[1]!, points[0]!),
          b = sub(points[2]!, points[0]!)
        const n: Vec3 = [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ]
        return dot(n, normal) * side < 0
      }),
    )
    requireScene(
      Object.keys(faces).length > 0,
      'cut',
      'O plano precisa atravessar o volume da peça.',
    )
    const used = new Set(
      Object.values(faces).flatMap((face) => face.corners.map((c) => c.vertexId)),
    )
    const open = {
      ...cut.mesh,
      faces,
      vertices: Object.fromEntries(
        Object.entries(cut.mesh.vertices).filter(([id]) => used.has(id)),
      ),
      looseEdges: [],
    }
    const closed = capSceneMesh(open, normal.map((n) => -side * n) as Vec3, capMaterial, nextId)
    requireClosedSceneMesh(closed)
    return closed
  }) as [SceneMeshGeometry, SceneMeshGeometry]
  const volumes = halves.map(sceneMeshVolume)
  requireScene(
    volumes.every((v) => v > before * 1e-12) &&
      Math.abs(volumes[0]! + volumes[1]! - before) <= before * 1e-8,
    'cut',
    'O corte não conservou o volume da peça. Nenhuma alteração foi aplicada.',
  )
  return halves
}

/** One document revision: two solids, isolated cap surfaces, duplicated rigid motion and mirrors. */
export function cutSceneSolid(
  document: MoldaSceneDocument,
  nodeId: string,
  plane: MeshCutPlane,
  nextId = newId,
) {
  const prepared = prepareSceneSolidCut(document, nodeId, nextId)
  return prepared.commit(
    prepared.boxSplit(plane) ?? splitSceneSolid(prepared.mesh, plane, prepared.capId, nextId),
  )
}

/** Capture resources/IDs once. A worker only needs geometry and never copies the document's images. */
export function prepareSceneSolidCut(document: MoldaSceneDocument, nodeId: string, nextId = newId) {
  const selection = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selection)
  const node = selection.index.scene.nodes.get(nodeId)!
  requireScene(node.kind === 'mesh', 'node', 'Escolha uma peça inteira para cortar.')
  requireScene(
    !selection.index.skinsByNode.has(nodeId) &&
      !selection.index.skinJointNodes.has(nodeId) &&
      !selection.index.scene.children.get(nodeId)?.length,
    'node',
    'Esta peça tem vínculos ou peças filhas. Separe esses vínculos antes de cortar.',
  )
  const geometry = selection.index.geometries.get(node.geometryId)!
  const mesh = geometry.kind === 'mesh' ? geometry : parametricMesh(geometry).mesh
  const allocate = allocateSceneId(document, nextId)
  const capId = allocate(),
    secondId = allocate(),
    firstGeometry = allocate(),
    secondGeometry = allocate()
  const cap: SceneMaterial = {
    ...selection.index.materials.get(node.materialId)!,
    id: capId,
    name: `${node.name} · corte`,
  }
  for (const key of SCENE_MATERIAL_IMAGE_KEYS) delete cap[key]
  return {
    mesh,
    capId,
    boxSplit: (plane: MeshCutPlane) =>
      geometry.kind === 'box' ? splitSceneBox(geometry, plane, capId) : null,
    commit: (halves: [SceneGeometry, SceneGeometry]) => {
      const occupied = new Set(
        document.nodes.filter((entry) => entry.id !== nodeId).map((entry) => entry.name),
      )
      let count = 0
      const pieces = halves.map((geometry, i): ModelSceneNode => {
        const mesh = sceneGeometryMesh(geometry)
        let name: string
        do {
          name = `${node.name.slice(0, 36)} (${++count})`
        } while (occupied.has(name))
        occupied.add(name)
        const min: Vec3 = [Infinity, Infinity, Infinity]
        const max: Vec3 = [-Infinity, -Infinity, -Infinity]
        for (const point of Object.values(mesh.vertices))
          for (const axis of [0, 1, 2] as const) {
            min[axis] = Math.min(min[axis], point[axis])
            max[axis] = Math.max(max[axis], point[axis])
          }
        return {
          ...node,
          id: i === 0 ? nodeId : secondId,
          geometryId: i === 0 ? firstGeometry : secondGeometry,
          name,
          pivot: [min[0]! / 2 + max[0]! / 2, min[1]!, min[2]! / 2 + max[2]! / 2],
        }
      })
      return finishSceneCommand({
        ...document,
        ...duplicateSceneAnimationTargets(document, new Map([[nodeId, secondId]])),
        nodes: document.nodes.flatMap((entry) => (entry.id === nodeId ? pieces : [entry])),
        geometries: [
          ...document.geometries.filter(
            (entry) =>
              entry.id !== geometry.id ||
              document.nodes.some(
                (other) =>
                  other.id !== nodeId && other.kind === 'mesh' && other.geometryId === geometry.id,
              ),
          ),
          ...halves.map((mesh, i) => ({ ...mesh, id: i === 0 ? firstGeometry : secondGeometry })),
        ],
        materials: [...document.materials, cap],
        mirrors: [
          ...document.mirrors,
          ...document.mirrors
            .filter((mirror) => mirror.sourceId === nodeId)
            .map((mirror) => ({ ...mirror, id: allocate(), sourceId: secondId })),
        ],
      })
    },
  }
}
