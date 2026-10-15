import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneInstances } from '../scene/evaluate'
import { buildSceneGeometry } from '../scene/geometry'
import { selectSceneSubtrees } from '../scene/graph'
import type { MeshCutPlane } from '../scene/meshPlaneCut'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import { compileSceneSkinGeometry, deformSceneSkin } from '../scene/skinPose'

export interface ScenePreviewGuideState {
  points?: readonly Vec3[]
  plane?: MeshCutPlane
  size: number
  ghost?: { document: MoldaSceneDocument; ids: readonly string[]; pose?: SceneAnimationPose }
}

/** Disposable pink construction guides, excluded from picking, photographs and saved documents. */
export class ScenePreviewGuide {
  readonly root = new Group()
  private source: ScenePreviewGuideState | null = null
  update(state: ScenePreviewGuideState | null) {
    if (state === this.source) return
    this.dispose()
    this.source = state
    if (!state) return
    const size = Math.max(state.size, 0.2)
    const add = (geometry: BufferGeometry, opacity: number) => {
      const mesh = new Mesh(
        geometry,
        new MeshBasicMaterial({
          color: 0xe84297,
          transparent: true,
          opacity,
          depthWrite: false,
          side: DoubleSide,
        }),
      )
      mesh.renderOrder = 10
      this.root.add(mesh)
      return mesh
    }
    for (const point of state.points ?? [])
      add(new SphereGeometry(size * 0.025, 12, 8), 0.95).position.set(...point)
    if (state.plane && state.points?.length === 2) {
      const line = new Line(
        new BufferGeometry().setFromPoints(state.points.map((point) => new Vector3(...point))),
        new LineBasicMaterial({ color: 0xe84297, depthTest: false }),
      )
      line.renderOrder = 11
      this.root.add(line)
    }
    if (state.plane) {
      const plane = add(new PlaneGeometry(size * 1.5, size * 1.5), 0.22)
      plane.position.set(...state.plane.origin)
      plane.quaternion.copy(
        new Quaternion().setFromUnitVectors(
          new Vector3(0, 0, 1),
          new Vector3(...state.plane.normal).normalize(),
        ),
      )
    }
    if (state.ghost) {
      const index = indexSceneDocument(state.ghost.document),
        covered = selectSceneSubtrees(index.scene, state.ghost.ids).covered
      for (const instance of evaluateSceneInstances(
        index,
        state.ghost.pose?.worldMatrices ?? index.scene.worldMatrices,
      )) {
        if (!covered.has(instance.sourceNodeId) || instance.hidden) continue
        let shape = index.geometries.get(instance.geometryId)!
        const binding = index.skinsByNode.get(instance.sourceNodeId)
        if (binding && shape.kind === 'mesh' && state.ghost.pose) {
          const prepared = compileSceneSkinGeometry(binding, shape),
            points = deformSceneSkin(prepared, state.ghost.pose.worldMatrices)
          shape = {
            ...shape,
            vertices: Object.fromEntries(
              prepared.vertexIds.map((id, i) => [
                id,
                [points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!] as Vec3,
              ]),
            ),
          }
        }
        const buffers = buildSceneGeometry(shape)
        const geometry = new BufferGeometry()
        geometry.setAttribute('position', new BufferAttribute(buffers.positions, 3))
        const mesh = add(geometry, 0.22)
        mesh.matrixAutoUpdate = false
        mesh.matrix.fromArray(instance.worldMatrix)
      }
    }
  }
  dispose() {
    for (const child of this.root.children)
      if (child instanceof Mesh || child instanceof Line) {
        child.geometry.dispose()
        for (const material of Array.isArray(child.material) ? child.material : [child.material])
          material.dispose()
      }
    this.root.clear()
    this.source = null
  }
}
