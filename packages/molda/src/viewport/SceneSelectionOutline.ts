import {
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  Group,
  Mesh,
  SkinnedMesh,
  Vector3,
} from 'three'
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import type { Vec3 } from '../core/model'
import { guideLine } from './sceneGuideDrawing'
import type { SceneRenderResource } from './sceneRenderResource'

/** Visible geometric edges, with no triangulation diagonals or bounds spanning empty space. */
export class SceneSelectionOutline {
  readonly root = new Group()
  private readonly entries = new Map<
    string,
    { source: BufferGeometry; line: LineSegments2; pose: unknown }
  >()
  constructor() {
    this.root.name = 'molda-selection-outline'
  }
  update(resource: SceneRenderResource, selected: ReadonlySet<string>, pose: unknown) {
    const kept = new Set<string>()
    for (const object of resource.root.children) {
      const instance = resource.instanceFor(object)
      if (
        !(object instanceof Mesh) ||
        !object.visible ||
        !instance ||
        !selected.has(instance.sourceNodeId)
      )
        continue
      kept.add(instance.id)
      let entry = this.entries.get(instance.id)
      if (
        !entry ||
        entry.source !== object.geometry ||
        (object instanceof SkinnedMesh && entry.pose !== pose)
      ) {
        if (entry) {
          entry.line.removeFromParent()
          entry.line.geometry.dispose()
          entry.line.material.dispose()
        }
        let source = object.geometry
        if (object instanceof SkinnedMesh) {
          const count = source.getAttribute('position').count,
            points = new Float32Array(count * 3),
            point = new Vector3()
          for (let i = 0; i < count; i++) {
            object.getVertexPosition(i, point)
            points.set(point.toArray(), i * 3)
          }
          source = new BufferGeometry().setAttribute('position', new BufferAttribute(points, 3))
          if (object.geometry.index) source.setIndex(object.geometry.index.clone())
        }
        const edges = new EdgesGeometry(source, 1),
          positions = edges.getAttribute('position')
        const segments: Array<[Vec3, Vec3]> = []
        for (let i = 0; i < positions.count; i += 2)
          segments.push([
            [positions.getX(i), positions.getY(i), positions.getZ(i)],
            [positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1)],
          ])
        const line = guideLine(segments, 0xffc21a, 3)
        line.matrixAutoUpdate = false
        edges.dispose()
        if (source !== object.geometry) source.dispose()
        entry = { source: object.geometry, line, pose }
        this.entries.set(instance.id, entry)
        this.root.add(line)
      }
      entry.line.matrix.copy(object.matrixWorld)
      entry.line.matrixWorldNeedsUpdate = true
    }
    for (const [id, entry] of this.entries)
      if (!kept.has(id)) {
        entry.line.removeFromParent()
        entry.line.geometry.dispose()
        entry.line.material.dispose()
        this.entries.delete(id)
      }
    this.root.visible = kept.size > 0
  }
  dispose() {
    for (const entry of this.entries.values()) {
      entry.line.geometry.dispose()
      entry.line.material.dispose()
    }
    this.entries.clear()
    this.root.clear()
  }
}
