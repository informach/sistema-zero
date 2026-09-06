import { describe, expect, test } from 'bun:test'
import { Object3D, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'
import { boxMesh } from '../model/mesh'
import { MESH_PICK_TOLERANCE_MOUSE_PX, MeshEditOverlay } from './meshEditOverlay'

/**
 * O picking do overlay com um Raycaster REAL do three (sem WebGL): uma caixa
 * 2×2×2 na origem, câmera olhando a face +z de frente, 600 px de altura.
 */
function setup() {
  const overlay = new MeshEditOverlay()
  const mesh = boxMesh([0, 0, 0], [2, 2, 2])
  const pivot: [number, number, number] = [1, 1, 1]
  const parent = new Object3D()
  parent.position.set(pivot[0], pivot[1], pivot[2])
  parent.add(overlay.group)
  overlay.setMesh(mesh, pivot, [])
  parent.updateMatrixWorld(true)
  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(1, 1, 12)
  camera.lookAt(1, 1, 1)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  const raycaster = new Raycaster()
  /** Lança o raio pelo ponto do MUNDO (na face +z, z = 2) e devolve o pick. */
  const pickAt = (world: Vector3, face: 'f_pz' | null = 'f_pz') => {
    const projected = world.clone().project(camera)
    raycaster.setFromCamera(new Vector2(projected.x, projected.y), camera)
    const surfaceDistance = world.distanceTo(camera.position)
    return overlay.pick(
      raycaster.ray,
      camera,
      MESH_PICK_TOLERANCE_MOUSE_PX,
      600,
      surfaceDistance,
      face,
    )
  }
  return { overlay, pickAt }
}

describe('overlay da malha: picking com tolerância em pixels', () => {
  test('perto de um canto escolhe o PONTO; no meio de uma aresta a ARESTA; no miolo a FACE', () => {
    const { pickAt } = setup()
    // O canto (2, 2, 2) com um desvio de ~2 px (0,02 unidades a 10 de distância ≈ 1,4 px).
    expect(pickAt(new Vector3(1.98, 1.98, 2))).toEqual({ kind: 'vertex', key: 'v_111' })
    const edge = pickAt(new Vector3(1, 1.99, 2))
    expect(edge?.kind).toBe('edge')
    if (edge?.kind === 'edge') expect([...edge.keys].sort()).toEqual(['v_011', 'v_111'])
    expect(pickAt(new Vector3(1, 1, 2))).toEqual({ kind: 'face', key: 'f_pz' })
  })

  test('nada atrás da superfície: o canto do fundo não rouba o toque na face da frente', () => {
    const { pickAt } = setup()
    // (2, 2, 2) está na frente; o raio que passa por ele também passa perto de (2, 2, 0)?
    // Não: a câmera olha de frente, então o ponto do fundo fica exatamente atrás — e só
    // o da frente conta. Um raio pela quina de trás, vindo de frente, acerta a face antes.
    const pick = pickAt(new Vector3(2, 2, 2))
    expect(pick).toEqual({ kind: 'vertex', key: 'v_111' })
    // Sem face tocada e longe de tudo: nada.
    expect(pickAt(new Vector3(1, 1, 2), null)).toBeNull()
  })

  test('a posição no mundo dos vértices segue o pai (o mesh da peça)', () => {
    const { overlay } = setup()
    const world = overlay.worldPosition('v_111')
    expect(world?.toArray()).toEqual([2, 2, 2])
    expect(overlay.worldPosition('v_zzz')).toBeNull()
  })
})
