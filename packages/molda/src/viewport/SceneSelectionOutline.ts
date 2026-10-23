import { type BufferGeometry, Group, Mesh, SkinnedMesh } from 'three'
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { guideLine } from './sceneGuideDrawing'
import type { SceneRenderResource } from './sceneRenderResource'
import type { SceneEdgeSegments } from './sceneVisibleEdges'

/** Visible geometric edges, with no triangulation diagonals or bounds spanning empty space. */
export class SceneSelectionOutline {
  readonly root = new Group()
  private readonly entries = new Map<
    string,
    { source: BufferGeometry; line: LineSegments2; pose: unknown; edges: SceneEdgeSegments }
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
      const edges = resource.edgePositionsFor(object)
      if (
        !entry ||
        entry.source !== object.geometry ||
        entry.edges !== edges ||
        (object instanceof SkinnedMesh && entry.pose !== pose)
      ) {
        if (entry) {
          entry.line.removeFromParent()
          entry.line.geometry.dispose()
          entry.line.material.dispose()
        }
        const line = guideLine(edges, 0xffc21a, 3)
        line.material.polygonOffset = true
        line.material.polygonOffsetFactor = -3
        line.material.polygonOffsetUnits = -3
        line.matrixAutoUpdate = false
        entry = { source: object.geometry, line, pose, edges }
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
