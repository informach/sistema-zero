import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from './document'
import type { indexSceneDocument } from './documentIndex'
import type { AffineMatrix } from './matrix'
import { sceneGeometryMesh } from './parametricGeometry'
import type { SceneSkinBinding } from './skin'
import { compileSceneSkinGeometry, deformSceneSkin, type PreparedSceneSkin } from './skinPose'

type Index = ReturnType<typeof indexSceneDocument>
type Worlds = ReadonlyMap<string, Readonly<AffineMatrix>>
const prepared = new WeakMap<SceneSkinBinding, WeakMap<SceneMeshGeometry, PreparedSceneSkin>>()
const posed = new WeakMap<
  Worlds,
  Map<
    string,
    {
      geometry: SceneMeshGeometry
      skin: SceneSkinBinding
      mesh: SceneMeshGeometry
    }
  >
>()

/** Visible points in mesh-local coordinates. Base topology/UVs and bindings stay authorial. */
export function sceneVisibleMesh(
  index: Index,
  nodeId: string,
  worlds: Worlds = index.scene.worldMatrices,
): SceneMeshGeometry | null {
  const node = index.scene.nodes.get(nodeId)
  const geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null
  if (!geometry) return null
  const skin = index.skinsByNode.get(nodeId)
  if (!skin || geometry.kind !== 'mesh') return sceneGeometryMesh(geometry)
  let byNode = posed.get(worlds)
  const cached = byNode?.get(nodeId)
  if (cached?.geometry === geometry && cached.skin === skin) return cached.mesh
  let byGeometry = prepared.get(skin)
  if (!byGeometry) {
    byGeometry = new WeakMap()
    prepared.set(skin, byGeometry)
  }
  let binding = byGeometry.get(geometry)
  if (!binding) {
    binding = compileSceneSkinGeometry(skin, geometry)
    byGeometry.set(geometry, binding)
  }
  const positions = deformSceneSkin(binding, worlds)
  const vertices: Record<string, Vec3> = {}
  for (const [i, id] of binding.vertexIds.entries())
    vertices[id] = [positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!]
  const mesh: SceneMeshGeometry = { ...geometry, vertices }
  if (!byNode) {
    byNode = new Map()
    posed.set(worlds, byNode)
  }
  byNode.set(nodeId, { geometry, skin, mesh })
  return mesh
}
