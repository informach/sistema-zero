import { newId } from '../core/id'
import { allocateSceneId, requireEditableScene, sceneCommandSelection } from './commandContext'
import { editSceneMesh } from './commands'
import type { MoldaSceneDocument, SceneMaterial, SceneMeshGeometry } from './document'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { indexMeshEdges, meshIdAllocator } from './meshTopology'
import { requireScene } from './validation'

/** A canonical oriented polygon key, independent of its first corner or vertex IDs. */
function faceKey(mesh: SceneMeshGeometry, faceId: string, reverse = false) {
  const face = mesh.faces[faceId]!
  const points = face.corners.map((corner) => JSON.stringify(mesh.vertices[corner.vertexId]))
  if (reverse) points.reverse()
  return points.reduce(
    (best, _, index) => {
      const key = JSON.stringify([...points.slice(index), ...points.slice(0, index)])
      return best === null || key < best ? key : best
    },
    null as string | null,
  )!
}

export function unbackedMeshFaces(mesh: SceneMeshGeometry) {
  const ids = Object.keys(mesh.faces)
  const oriented = new Set(ids.map((id) => faceKey(mesh, id)))
  return ids.filter((id) => !oriented.has(faceKey(mesh, id, true)))
}

/** Only an open, unbacked sheet can expose a transparent interior. */
export function hasScenePaintableInteriorGap(document: MoldaSceneDocument, nodeId: string) {
  const node = document.nodes.find((entry) => entry.id === nodeId)
  if (node?.kind !== 'mesh') return false
  const mesh = document.geometries.find((entry) => entry.id === node.geometryId)
  if (mesh?.kind !== 'mesh') return false
  return (
    [...indexMeshEdges(mesh).edges.values()].some((edges) => edges.length === 1) &&
    unbackedMeshFaces(mesh).length > 0
  )
}

/** Add real reverse faces with their own material, UV and future paint image. */
export function addScenePaintableInterior(
  document: MoldaSceneDocument,
  nodeId: string,
  nextId: () => string = newId,
): MoldaSceneDocument {
  const selected = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para criar o lado interno.')
  const mesh = selected.index.geometries.get(node.geometryId)
  requireScene(mesh?.kind === 'mesh', 'geometry', 'Converta a peça em malha primeiro.')
  requireScene(!mesh.symmetry, 'geometry', 'Desative a simetria antes de criar o lado interno.')
  requireScene(
    !selected.index.skinsByNode.has(nodeId),
    'node',
    'Desvincule os ossos antes de criar o lado interno.',
  )
  if (!hasScenePaintableInteriorGap(document, nodeId)) return document
  const missing = unbackedMeshFaces(mesh)
  const allocate = allocateSceneId(document, nextId)
  const frontIds = new Map<string, string>()
  const backIds = new Map<string, string>()
  const materials: SceneMaterial[] = [...document.materials]
  for (const faceId of missing) {
    const materialId = mesh.faces[faceId]!.materialId ?? node.materialId
    if (backIds.has(materialId)) continue
    const source = selected.index.materials.get(materialId)!
    if (source.doubleSided) {
      const front = { ...source, id: allocate(), doubleSided: false }
      frontIds.set(materialId, front.id)
      materials.push(front)
    }
    const back: SceneMaterial = {
      ...source,
      id: allocate(),
      name: `${source.name.slice(0, 118)} interior`,
      doubleSided: false,
    }
    for (const key of SCENE_MATERIAL_IMAGE_KEYS) delete back[key]
    delete back.alphaMask
    backIds.set(materialId, back.id)
    materials.push(back)
  }
  return editSceneMesh(
    { ...document, materials },
    nodeId,
    (source) => {
      const allocateMesh = meshIdAllocator(source, nextId)
      const innerVertices = new Map<string, string>()
      const vertices = { ...source.vertices }
      const faces = { ...source.faces }
      for (const faceId of missing) {
        const face = source.faces[faceId]!
        const materialId = face.materialId ?? node.materialId
        const frontId = frontIds.get(materialId)
        if (frontId) faces[faceId] = { ...face, materialId: frontId }
        const corners = [...face.corners].reverse().map((corner) => {
          let vertexId = innerVertices.get(corner.vertexId)
          if (!vertexId) {
            vertexId = allocateMesh()
            innerVertices.set(corner.vertexId, vertexId)
            vertices[vertexId] = source.vertices[corner.vertexId]!
          }
          return { vertexId, uv: [...corner.uv] as [number, number] }
        })
        faces[allocateMesh()] = { corners, materialId: backIds.get(materialId)! }
      }
      return { ...source, vertices, faces }
    },
    nextId,
    { bakeSymmetry: true },
  )
}
