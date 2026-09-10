import type { SceneMeshGeometry } from '../scene/document'

/** Planar, connected native mesh with per-face UV; shared by tests and CPU benchmarks. */
export function makeSceneGridGeometry(size: number, id = 'surface'): SceneMeshGeometry {
  const mesh: SceneMeshGeometry = { id, kind: 'mesh', vertices: {}, faces: {}, looseEdges: [] }
  for (let y = 0; y <= size; y++)
    for (let x = 0; x <= size; x++) mesh.vertices[`v_${x}_${y}`] = [x / 4, y / 4, 0]
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      mesh.faces[`f_${x}_${y}`] = {
        corners: [
          { vertexId: `v_${x}_${y}`, uv: [0, 0] },
          { vertexId: `v_${x + 1}_${y}`, uv: [1, 0] },
          { vertexId: `v_${x + 1}_${y + 1}`, uv: [1, 1] },
          { vertexId: `v_${x}_${y + 1}`, uv: [0, 1] },
        ],
      }
  return mesh
}
