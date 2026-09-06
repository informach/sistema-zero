/**
 * O OVERLAY do "Editar malha": os pontos (vértices) e as arestas da peça em
 * edição, desenhados por cima da superfície (sem teste de profundidade, como as
 * alças), e o PICKING deles com tolerância em PIXELS convertida para o mundo à
 * distância do candidato: 8 px no mouse, 14 no toque. Ordem: ponto > aresta >
 * face, e nada que esteja ATRÁS da superfície tocada (o ponto do outro lado da
 * peça não rouba o toque).
 *
 * O grupo é FILHO do mesh da peça: as posições ficam em coordenadas da caixa menos
 * o pivô (o mesmo espaço da geometria), e o giro/translação da peça vêm de graça.
 */
import {
  BufferGeometry,
  type Camera,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  type Ray,
  Vector3,
} from 'three'
import type { FaceId, MeshFaceKey, MoldaMesh, Vec3 } from '../core/model'
import { isMeshFaceKey, meshEdges } from '../model/mesh'
import type { MeshPick } from '../model/meshSelection'

const VERTEX_COLOR = 0x1d6fd6
const SELECTED_COLOR = 0xff8a00
const EDGE_COLOR = 0x1d6fd6

export const MESH_PICK_TOLERANCE_MOUSE_PX = 8
export const MESH_PICK_TOLERANCE_TOUCH_PX = 14

export class MeshEditOverlay {
  readonly group = new Group()
  private readonly pointsGeometry = new BufferGeometry()
  private readonly selectedGeometry = new BufferGeometry()
  private readonly edgesGeometry = new BufferGeometry()
  private readonly pointsMaterial = new PointsMaterial({
    color: VERTEX_COLOR,
    size: 9,
    sizeAttenuation: false,
    depthTest: false,
    transparent: true,
  })
  private readonly selectedMaterial = new PointsMaterial({
    color: SELECTED_COLOR,
    size: 12,
    sizeAttenuation: false,
    depthTest: false,
    transparent: true,
  })
  private readonly edgesMaterial = new LineBasicMaterial({
    color: EDGE_COLOR,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
  })
  private keys: string[] = []
  private positions: Vec3[] = []
  private edgePairs: Array<[string, string]> = []
  private readonly byKey = new Map<string, Vec3>()

  constructor() {
    const points = new Points(this.pointsGeometry, this.pointsMaterial)
    const selected = new Points(this.selectedGeometry, this.selectedMaterial)
    const edges = new LineSegments(this.edgesGeometry, this.edgesMaterial)
    points.renderOrder = 4
    selected.renderOrder = 5
    edges.renderOrder = 3
    points.frustumCulled = false
    selected.frustumCulled = false
    edges.frustumCulled = false
    this.group.add(edges, points, selected)
  }

  /** Reconstrói os buffers para a malha (em coordenadas da caixa menos o pivô). */
  setMesh(mesh: MoldaMesh, pivot: Vec3, selected: readonly string[]): void {
    this.keys = Object.keys(mesh.vertices)
    this.positions = this.keys.map((key) => {
      const v = mesh.vertices[key] as Vec3
      return [v[0] - pivot[0], v[1] - pivot[1], v[2] - pivot[2]]
    })
    this.byKey.clear()
    for (let index = 0; index < this.keys.length; index += 1) {
      this.byKey.set(this.keys[index] as string, this.positions[index] as Vec3)
    }
    this.pointsGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(this.positions.flat(), 3),
    )
    const selectedSet = new Set(selected)
    const selectedPositions = this.positions.filter((_p, index) =>
      selectedSet.has(this.keys[index] as string),
    )
    this.selectedGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(selectedPositions.flat(), 3),
    )
    this.edgePairs = meshEdges(mesh)
    const edgePositions: number[] = []
    for (const [a, b] of this.edgePairs) {
      const p = this.byKey.get(a)
      const q = this.byKey.get(b)
      if (!p || !q) continue
      edgePositions.push(p[0], p[1], p[2], q[0], q[1], q[2])
    }
    this.edgesGeometry.setAttribute('position', new Float32BufferAttribute(edgePositions, 3))
    for (const geometry of [this.pointsGeometry, this.selectedGeometry, this.edgesGeometry]) {
      geometry.computeBoundingSphere()
    }
  }

  /** Posição no MUNDO de um vértice (o grupo precisa estar com a matriz atualizada). */
  worldPosition(key: string): Vector3 | null {
    const local = this.byKey.get(key)
    if (!local) return null
    return this.group.localToWorld(new Vector3(local[0], local[1], local[2]))
  }

  /**
   * O que o toque escolhe. `surfaceDistance` é a distância do toque na superfície
   * da peça (nada atrás dela conta); `hitFace` é a face do triângulo tocado (o
   * candidato de FACE quando nenhum ponto nem aresta está na folga).
   */
  pick(
    ray: Ray,
    camera: Camera,
    tolerancePx: number,
    viewportHeightPx: number,
    surfaceDistance: number,
    hitFace: FaceId | null,
  ): MeshPick | null {
    const toleranceAt = (point: Vector3): number => {
      if (!(camera instanceof PerspectiveCamera) || viewportHeightPx <= 0) return 0.25
      const distance = point.distanceTo(camera.position)
      const worldPerPx = (2 * distance * Math.tan((camera.fov * Math.PI) / 360)) / viewportHeightPx
      return tolerancePx * worldPerPx
    }
    this.group.updateMatrixWorld(true)
    let bestVertex: { key: string; distance: number } | null = null
    for (let i = 0; i < this.keys.length; i += 1) {
      const world = this.worldPosition(this.keys[i] as string)
      if (!world) continue
      const along = world.clone().sub(ray.origin).dot(ray.direction)
      const tolerance = toleranceAt(world)
      if (along > surfaceDistance + tolerance) continue
      const distance = ray.distanceToPoint(world)
      if (distance > tolerance) continue
      if (!bestVertex || distance < bestVertex.distance) {
        bestVertex = { key: this.keys[i] as string, distance }
      }
    }
    if (bestVertex) return { kind: 'vertex', key: bestVertex.key }
    let bestEdge: { keys: [string, string]; distance: number } | null = null
    const onRay = new Vector3()
    const onSegment = new Vector3()
    for (const pair of this.edgePairs) {
      const a = this.worldPosition(pair[0])
      const b = this.worldPosition(pair[1])
      if (!a || !b) continue
      const distance = Math.sqrt(ray.distanceSqToSegment(a, b, onRay, onSegment))
      const tolerance = toleranceAt(onSegment)
      if (distance > tolerance) continue
      const along = onSegment.clone().sub(ray.origin).dot(ray.direction)
      if (along > surfaceDistance + tolerance) continue
      if (!bestEdge || distance < bestEdge.distance) bestEdge = { keys: pair, distance }
    }
    if (bestEdge) return { kind: 'edge', keys: bestEdge.keys }
    if (hitFace && isMeshFaceKey(hitFace)) return { kind: 'face', key: hitFace as MeshFaceKey }
    return null
  }

  dispose(): void {
    this.group.removeFromParent()
    this.pointsGeometry.dispose()
    this.selectedGeometry.dispose()
    this.edgesGeometry.dispose()
    this.pointsMaterial.dispose()
    this.selectedMaterial.dispose()
    this.edgesMaterial.dispose()
  }
}
