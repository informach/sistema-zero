import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Points,
  PointsMaterial,
  type Raycaster,
} from 'three'
import type { SceneMeshGeometry } from '../scene/document'
import {
  meshComponentEdges,
  type SceneComponentMode,
  type SceneComponentSelection,
} from '../scene/meshComponents'
import { requireScene } from '../scene/validation'
import type { SceneRenderResource } from './sceneRenderResource'

/** Session-only overlays own their attributes; disposing them cannot evict the model's GPU data. */
export class SceneComponentOverlay {
  readonly root = new Group()
  private readonly wireMaterial = new LineBasicMaterial({
    color: 0x1d6fd6,
    transparent: true,
    opacity: 0.8,
  })
  private readonly fillMaterial = new MeshBasicMaterial({
    color: 0x2389da,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    forceSinglePass: true,
  })
  private readonly backMaterial = new MeshBasicMaterial({
    color: 0x9b4141,
    side: BackSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  private readonly pickMaterial = new MeshBasicMaterial({ side: DoubleSide })
  private readonly pointMaterial = new PointsMaterial({
    color: 0x566781,
    size: 6,
    sizeAttenuation: false,
  })
  private readonly chosenPointMaterial = new PointsMaterial({
    color: 0x2389da,
    size: 11,
    sizeAttenuation: false,
    depthWrite: false,
  })
  private readonly chosenEdgeMaterial = new LineBasicMaterial({
    color: 0x2389da,
    depthWrite: false,
  })
  private points: BufferGeometry | null = null
  private wire: BufferGeometry | null = null
  private fill: BufferGeometry | null = null
  private back: BufferGeometry | null = null
  private source: BufferGeometry | null = null
  private selected = ''
  private mode: SceneComponentMode | null = null
  private readonly instances = new Map<string, Group>()
  private disposed = false

  update(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry | null,
    selection: SceneComponentSelection | null,
  ) {
    if (this.disposed) return
    const instances = resource.root.children.filter(
      (object) =>
        object.visible && resource.instanceFor(object)?.sourceNodeId === selection?.nodeId,
    )
    const source = instances.find((object) => object instanceof Mesh)
    if (!mesh || !selection || !(source instanceof Mesh)) {
      this.clear()
      return
    }
    const selected = JSON.stringify([selection.mode, [...new Set(selection.ids)].sort()])
    if (this.source !== source.geometry) {
      this.clear()
      this.source = source.geometry
      const positions = source.geometry.getAttribute('position')
      const backPositions = new Float32Array(positions.count * 3)
      for (let i = 0; i < positions.count; i++)
        backPositions.set([positions.getX(i), positions.getY(i), positions.getZ(i)], i * 3)
      this.back = new BufferGeometry().setAttribute(
        'position',
        new BufferAttribute(backPositions, 3),
      )
      const edges = meshComponentEdges(mesh)
      const wirePositions = new Float32Array(edges.size * 6)
      let offset = 0
      for (const edge of edges.values())
        for (const id of edge) {
          const point = mesh.vertices[id]
          if (!point) throw new Error('Vértice ausente no contorno.')
          wirePositions.set(point, offset)
          offset += 3
        }
      if (!wirePositions.every(Number.isFinite)) {
        this.clear()
        requireScene(
          false,
          'geometry',
          'O contorno excede a precisão de desenho. Seus pontos continuam guardados.',
        )
      }
      this.wire = new BufferGeometry().setAttribute(
        'position',
        new BufferAttribute(wirePositions, 3),
      )
    }
    if (selection.mode === 'vertex' && !this.points) {
      const positions = new Float32Array(Object.keys(mesh.vertices).length * 3)
      let offset = 0
      for (const point of Object.values(mesh.vertices)) {
        positions.set(point, offset)
        offset += 3
      }
      if (!positions.every(Number.isFinite)) {
        this.clear()
        requireScene(
          false,
          'geometry',
          'Os pontos excedem a precisão de desenho. Suas posições continuam guardadas.',
        )
      }
      this.points = new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3))
    }
    if (!this.fill || selected !== this.selected) {
      const chosen = new Set(selection.ids)
      const positions = source.geometry.getAttribute('position')
      const kept: number[] = []
      if (selection.mode === 'edge') {
        for (const [id, edge] of meshComponentEdges(mesh)) {
          if (!chosen.has(id)) continue
          for (const vertex of edge) {
            const point = mesh.vertices[vertex]
            if (point) kept.push(...point)
          }
        }
      } else if (selection.mode === 'vertex') {
        for (const id of chosen) {
          const point = Object.hasOwn(mesh.vertices, id) ? mesh.vertices[id] : null
          if (point) kept.push(...point)
        }
      } else
        for (let triangle = 0; triangle < positions.count / 3; triangle++) {
          const id = resource.faceFor(source, triangle)
          if (!id || !chosen.has(id)) continue
          for (let vertex = triangle * 3; vertex < triangle * 3 + 3; vertex++)
            kept.push(positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex))
        }
      this.fill?.dispose()
      this.fill = new BufferGeometry().setAttribute(
        'position',
        new BufferAttribute(Float32Array.from(kept), 3),
      )
      this.selected = selected
      // The highlight changes primitive type with the mode; all instances share its owned data.
      if (this.mode !== selection.mode) {
        this.root.clear()
        this.instances.clear()
      } else
        for (const group of this.instances.values()) {
          const fill = group.children[1]
          if (fill instanceof Mesh || fill instanceof LineSegments || fill instanceof Points)
            fill.geometry = this.fill
        }
      this.mode = selection.mode
    }
    const active = new Set<string>()
    for (const object of instances) {
      const instance = resource.instanceFor(object)
      if (!instance || !this.wire || !this.fill || !this.back) continue
      active.add(instance.id)
      let group = this.instances.get(instance.id)
      if (!group) {
        group = new Group()
        group.matrixAutoUpdate = false
        group.add(
          new LineSegments(this.wire, this.wireMaterial),
          selection.mode === 'face'
            ? new Mesh(this.fill, this.fillMaterial)
            : selection.mode === 'edge'
              ? new LineSegments(this.fill, this.chosenEdgeMaterial)
              : new Points(this.fill, this.chosenPointMaterial),
          new Mesh(this.back, this.backMaterial),
        )
        if (selection.mode === 'vertex' && this.points)
          group.add(new Points(this.points, this.pointMaterial))
        this.instances.set(instance.id, group)
        this.root.add(group)
      }
      group.matrix.fromArray(instance.worldMatrix)
      group.matrixWorldNeedsUpdate = true
    }
    for (const [id, group] of this.instances)
      if (!active.has(id)) {
        this.root.remove(group)
        this.instances.delete(id)
      }
    this.root.updateMatrixWorld(true)
  }

  /** Double-sided raycast proxies are never rendered and never change authorial materials. */
  pick(
    ray: Raycaster,
    resource: SceneRenderResource,
    nodeId: string,
    through = false,
  ): string | null {
    if (this.disposed) return null
    const originals = new Map<Object3D, Object3D>()
    const targets = resource.root.children
      .filter((object) => object.visible)
      .filter((object) => !through || resource.instanceFor(object)?.sourceNodeId === nodeId)
      .map((object) => {
        const instance = resource.instanceFor(object)
        if (!(object instanceof Mesh) || instance?.sourceNodeId !== nodeId || instance.locked)
          return object
        const proxy = new Mesh(object.geometry, this.pickMaterial)
        proxy.matrixAutoUpdate = false
        proxy.matrixWorld.copy(object.matrixWorld)
        originals.set(proxy, object)
        return proxy
      })
    const hit = ray.intersectObjects(targets, false)[0]
    if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null
    const original = originals.get(hit.object)
    return original ? resource.faceFor(original, hit.faceIndex) : null
  }

  setThrough(through: boolean) {
    if (this.disposed) return
    for (const material of [this.fillMaterial, this.chosenPointMaterial, this.chosenEdgeMaterial]) {
      if (material.depthTest === !through) continue
      material.depthTest = !through
      material.needsUpdate = true
    }
  }

  private clear() {
    this.root.clear()
    this.instances.clear()
    this.wire?.dispose()
    this.fill?.dispose()
    this.back?.dispose()
    this.points?.dispose()
    this.points = null
    this.wire = this.fill = this.back = this.source = null
    this.selected = ''
    this.mode = null
  }
  dispose() {
    if (this.disposed) return
    this.clear()
    this.wireMaterial.dispose()
    this.fillMaterial.dispose()
    this.backMaterial.dispose()
    this.pickMaterial.dispose()
    this.pointMaterial.dispose()
    this.chosenPointMaterial.dispose()
    this.chosenEdgeMaterial.dispose()
    this.disposed = true
  }
}
