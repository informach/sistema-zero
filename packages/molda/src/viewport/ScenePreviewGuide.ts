import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneInstances } from '../scene/evaluate'
import { buildSceneGeometry } from '../scene/geometry'
import { selectSceneSubtrees } from '../scene/graph'
import { type AffineMatrix, affineMultiply, transformPoint } from '../scene/matrix'
import type { MeshCutPlane } from '../scene/meshPlaneCut'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import { compileSceneSkinGeometry, deformSceneSkin } from '../scene/skinPose'
import { guideLine, guidePoints } from './sceneGuideDrawing'

export interface ScenePreviewGuideState {
  rig?: { points: readonly Vec3[]; active: number | null }
  points?: readonly Vec3[]
  snapPoints?: readonly Vec3[]
  path?: readonly Vec3[]
  cut?: {
    midpoints: readonly Vec3[]
    segments: readonly (readonly [Vec3, Vec3])[]
    provisional: readonly (readonly [Vec3, Vec3])[]
  }
  hover?: Vec3
  plane?: MeshCutPlane
  size: number
  ghost?: {
    document: MoldaSceneDocument
    ids: readonly string[]
    pose?: SceneAnimationPose
    wireframe?: boolean
    color?: number
    opacity?: number
    depthTest?: boolean
    worldDelta?: AffineMatrix
    label?: string
  }
}

/** Disposable pink construction guides, excluded from picking, photographs and saved documents. */
export class ScenePreviewGuide {
  readonly root = new Group()
  readonly ghostLabelPoints: Vec3[] = []
  private source: ScenePreviewGuideState | null = null
  private midpoints: Points | null = null
  private snapPoints: Points | null = null
  private cutLines: Array<{ line: LineSegments2; provisional: boolean }> = []
  updateSnapVisibility(visible: (point: Vec3) => boolean) {
    if (!this.snapPoints || !this.source?.snapPoints) return
    const positions = this.snapPoints.geometry.getAttribute('position')
    let count = 0
    for (const point of this.source.snapPoints)
      if (visible(point)) positions.setXYZ(count++, ...point)
    positions.needsUpdate = true
    this.snapPoints.geometry.setDrawRange(0, count)
  }
  updateCutVisibility(
    visible: (point: Vec3) => boolean,
    visibleSegments?: (
      segments: readonly (readonly [Vec3, Vec3])[],
    ) => readonly (readonly [Vec3, Vec3])[],
  ) {
    if (!this.source?.cut) return
    if (this.midpoints) {
      const positions = this.midpoints.geometry.getAttribute('position')
      let count = 0
      for (const point of this.source.cut.midpoints)
        if (visible(point)) positions.setXYZ(count++, ...point)
      positions.needsUpdate = true
      this.midpoints.geometry.setDrawRange(0, count)
    }
    if (!visibleSegments) return
    const confirmed = visibleSegments(this.source.cut.segments)
    const provisional = visibleSegments(this.source.cut.provisional)
    for (const entry of this.cutLines) {
      const segments = entry.provisional ? provisional : confirmed
      entry.line.visible = !!segments.length
      if (!segments.length) continue
      const values = Float32Array.from(segments.flatMap(([a, b]) => [...a, ...b]))
      const buffer = entry.line.geometry.getAttribute('instanceStart')
      if (!('data' in buffer) || buffer.data.array.length < values.length) {
        entry.line.geometry.dispose()
        entry.line.geometry = new LineSegmentsGeometry().setPositions(values)
      } else {
        buffer.data.array.set(values)
        buffer.data.needsUpdate = true
      }
      entry.line.geometry.instanceCount = segments.length
      entry.line.frustumCulled = false
    }
  }
  update(state: ScenePreviewGuideState | null) {
    if (state === this.source) return
    this.dispose()
    this.source = state
    if (!state) return
    const size = Math.max(state.size, 0.2)
    if (state.rig?.points.length) {
      const points = state.rig.points
      const segments = points.slice(1).map((point, i) => [points[i]!, point] as const)
      if (segments.length) {
        this.root.add(
          guideLine(segments, 0xffffff, 7, false),
          guideLine(segments, 0x8b3fd9, 4, false),
        )
      }
      const markers = guidePoints(points, 16, 0xffffff, 0x8b3fd9, 3)
      markers.frustumCulled = false
      this.root.add(markers)
      const active = state.rig.active
      if (active !== null && points[active])
        this.root.add(guidePoints([points[active]!], 24, 0x8b3fd9, 0xffffff, 3))
    }
    if (state.snapPoints?.length) {
      this.snapPoints = guidePoints(state.snapPoints, 14, 0xffffff, 0x8b3fd9, 2)
      // Camera-dependent filtering rewrites the buffer; an old bounding sphere is not valid.
      this.snapPoints.frustumCulled = false
      this.root.add(this.snapPoints)
    }
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
    if (state.cut) {
      if (state.cut.midpoints.length) {
        this.midpoints = guidePoints(state.cut.midpoints, 8, 0xffffff, 0xe8336f, 1.5)
        this.root.add(this.midpoints)
      }
      if (state.points?.length) this.root.add(guidePoints(state.points, 16, 0xe8336f, 0xffffff, 3))
      if (state.hover) this.root.add(guidePoints([state.hover], 22, 0xffffff, 0xe8336f, 3))
      if (state.cut.segments.length) {
        const border = guideLine(state.cut.segments, 0xffffff, 8, false)
        const inner = guideLine(state.cut.segments, 0xe8336f, 4, false)
        inner.renderOrder = 21
        this.cutLines.push(
          { line: border, provisional: false },
          { line: inner, provisional: false },
        )
        this.root.add(border, inner)
      }
      if (state.cut.provisional.length) {
        const line = guideLine(state.cut.provisional, 0xffffff, 3, false)
        line.material.opacity = 0.9
        this.cutLines.push({ line, provisional: true })
        this.root.add(line)
      }
    } else {
      for (const point of state.points ?? [])
        add(new SphereGeometry(size * 0.025, 12, 8), 0.95).position.set(...point)
      if (state.hover)
        add(new SphereGeometry(size * 0.035, 12, 8), 0.8).position.set(...state.hover)
    }
    if (state.path && state.path.length >= 2) {
      const line = new Line(
        new BufferGeometry().setFromPoints(state.path.map((point) => new Vector3(...point))),
        new LineBasicMaterial({ color: 0xe84297, depthTest: false }),
      )
      line.renderOrder = 11
      this.root.add(line)
    }
    if (state.hover && state.path?.length) {
      const last = state.path.at(-1)!
      const line = new Line(
        new BufferGeometry().setFromPoints([new Vector3(...last), new Vector3(...state.hover)]),
        new LineBasicMaterial({ color: 0xffffff, depthTest: false }),
      )
      line.renderOrder = 10
      this.root.add(line)
    }
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
        const world = state.ghost.worldDelta
          ? affineMultiply(state.ghost.worldDelta, instance.worldMatrix)
          : instance.worldMatrix
        if (state.ghost.label) {
          geometry.computeBoundingBox()
          const bounds = geometry.boundingBox!
          for (const x of [bounds.min.x, bounds.max.x])
            for (const y of [bounds.min.y, bounds.max.y])
              for (const z of [bounds.min.z, bounds.max.z])
                this.ghostLabelPoints.push(transformPoint(world, [x, y, z]))
        }
        const wire = () => {
          const edges = new EdgesGeometry(geometry),
            positions = edges.getAttribute('position')
          const segments: [Vec3, Vec3][] = []
          for (let i = 0; i < positions.count; i += 2)
            segments.push([
              [positions.getX(i), positions.getY(i), positions.getZ(i)],
              [positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1)],
            ])
          const line = guideLine(segments, state.ghost!.color ?? 0x8d96a3, 2)
          line.material.opacity = state.ghost!.opacity ?? 0.35
          line.material.depthTest = state.ghost!.depthTest ?? true
          edges.dispose()
          return line
        }
        const mesh = state.ghost.wireframe ? wire() : add(geometry, state.ghost.opacity ?? 0.22)
        if (state.ghost.wireframe) {
          geometry.dispose()
          this.root.add(mesh)
        }
        mesh.matrixAutoUpdate = false
        mesh.matrix.fromArray(world)
      }
    }
  }
  dispose() {
    for (const child of this.root.children)
      if (child instanceof Mesh || child instanceof Line || child instanceof Points) {
        child.geometry.dispose()
        for (const material of Array.isArray(child.material) ? child.material : [child.material])
          material.dispose()
      }
    this.root.clear()
    this.midpoints = null
    this.snapPoints = null
    this.cutLines = []
    this.ghostLabelPoints.length = 0
    this.source = null
  }
}
