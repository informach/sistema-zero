import { addScenePrimitive, convertSceneNodesToMesh, editSceneMesh } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'

/** A visible bent quad renders normally but needs explicit preparation for a paint sheet. */
export function sceneBentPaint() {
  const box = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Pintura em face inclinada' }),
    'box',
    'corpo',
  )
  const nodeId = box.nodes.at(-1)!.id
  const document = editSceneMesh(convertSceneNodesToMesh(box, [nodeId]), nodeId, (mesh) => {
    const point = mesh.vertices.v_111!
    return {
      ...mesh,
      vertices: { ...mesh.vertices, v_111: [point[0] + 0.3, point[1] + 0.5, point[2] + 0.4] },
    }
  })
  return { document, nodeId }
}
