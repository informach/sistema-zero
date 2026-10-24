import { newId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { affineDeterminant, affineInverse, affineMultiply, transformPoint } from './matrix'
import { sceneGeometryMesh } from './parametricGeometry'
import { requireScene } from './validation'

/**
 * Blender's Join: the other pieces move into the first one's space as extra faces of one mesh.
 * Nothing is stitched, welded or cut, so overlapping volumes simply stay overlapped.
 */
export function joinSceneMeshes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  nextId: () => string = newId,
): MoldaSceneDocument {
  requireScene(new Set(ids).size === ids.length, 'nodes', 'Escolha peças diferentes.')
  requireScene(ids.length >= 2, 'nodes', 'Escolha duas peças ou mais para unir.')
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  const nodes = ids.map((id) => selected.index.scene.nodes.get(id))
  const [base, ...tools] = nodes
  requireScene(
    nodes.every((node) => node?.kind === 'mesh'),
    'nodes',
    'Só dá para unir peças com forma. Tire grupos e apoios da escolha.',
  )
  if (base?.kind !== 'mesh') return document
  requireScene(
    tools.every((tool) => !selected.index.scene.children.get(tool!.id)?.length),
    'nodes',
    'Uma das peças tem outras dentro dela. Separe-as antes de unir.',
  )
  requireScene(
    !document.mirrors.some((mirror) => ids.includes(mirror.sourceId)),
    'mirrors',
    'Remova os espelhos dessas peças antes de unir.',
  )
  requireScene(
    !ids.some(
      (id) =>
        selected.index.animatedNodes.has(id) ||
        document.skins?.some(
          (skin) => skin.nodeId === id || skin.joints.some((joint) => joint.nodeId === id),
        ),
    ),
    'nodes',
    'Essas peças têm animação ou ossos. Remova o vínculo antes de unir.',
  )
  const meshOf = (geometryId: string) => {
    const geometry = selected.index.geometries.get(geometryId)
    requireScene(geometry, 'geometries', 'A geometria da peça não existe mais.')
    const mesh = sceneGeometryMesh(geometry)
    requireScene(!mesh.symmetry, 'geometry', 'Aplique a simetria antes de unir.')
    return mesh
  }
  const inverse = affineInverse(selected.index.scene.worldMatrices.get(base.id)!)
  requireScene(inverse, 'nodes', 'A primeira peça está achatada. Ajuste seu tamanho.')

  const a = meshOf(base.geometryId)
  const vertices: SceneMeshGeometry['vertices'] = { ...a.vertices }
  const faces: SceneMeshGeometry['faces'] = { ...a.faces }
  const looseEdges = [...a.looseEdges]
  const occupied = new Set([...Object.keys(a.vertices), ...Object.keys(a.faces)])
  const meshes = tools.map((tool) => (tool?.kind === 'mesh' ? meshOf(tool.geometryId) : null))
  for (const mesh of meshes)
    for (const id of [...Object.keys(mesh!.vertices), ...Object.keys(mesh!.faces)]) occupied.add(id)
  let serial = 0
  const meshId = () => {
    let id: string
    do id = `join:${serial++}`
    while (occupied.has(id))
    occupied.add(id)
    return id
  }
  for (const [i, tool] of tools.entries()) {
    if (tool?.kind !== 'mesh') continue
    const b = meshes[i]!
    const relative = affineMultiply(inverse, selected.index.scene.worldMatrices.get(tool.id)!)
    requireScene(
      Math.abs(affineDeterminant(relative)) > 1e-12,
      'nodes',
      `${tool.name} está achatada. Ajuste seu tamanho.`,
    )
    // A mirrored placement turns the faces inside out unless their winding flips with it.
    const flipped = affineDeterminant(relative) < 0
    const vertexIds = new Map<string, string>()
    for (const [id, point] of Object.entries(b.vertices)) {
      const mapped = meshId()
      vertexIds.set(id, mapped)
      vertices[mapped] = transformPoint(relative, point)
    }
    for (const face of Object.values(b.faces))
      faces[meshId()] = {
        ...face,
        materialId: face.materialId ?? tool.materialId,
        corners: (flipped ? [...face.corners].reverse() : face.corners).map((corner) => ({
          vertexId: vertexIds.get(corner.vertexId)!,
          uv: corner.uv,
        })),
      }
    for (const [u, v] of b.looseEdges) looseEdges.push([vertexIds.get(u)!, vertexIds.get(v)!])
  }
  requireScene(
    Object.keys(vertices).length <= MOLDA_LIMITS.maxMeshVertices &&
      Object.keys(faces).length <= MOLDA_LIMITS.maxMeshFaces,
    'geometry',
    'O resultado tem detalhes demais. Simplifique as peças.',
  )
  const geometryId = allocateSceneId(document, nextId)()
  const mesh: SceneMeshGeometry = { id: geometryId, kind: 'mesh', vertices, faces, looseEdges }
  const removed = new Set(tools.map((tool) => tool!.id))
  const nextNodes = document.nodes
    .filter((node) => !removed.has(node.id))
    .map((node) => (node.id === base.id && node.kind === 'mesh' ? { ...node, geometryId } : node))
  const used = new Set(nextNodes.flatMap((node) => (node.kind === 'mesh' ? [node.geometryId] : [])))
  const replaced = new Set(nodes.map((node) => (node?.kind === 'mesh' ? node.geometryId : '')))
  return finishSceneCommand({
    ...document,
    nodes: nextNodes,
    geometries: [
      ...document.geometries.filter(
        (geometry) => !replaced.has(geometry.id) || used.has(geometry.id),
      ),
      mesh,
    ],
  })
}
