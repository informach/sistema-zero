import { describe, expect, test } from 'bun:test'
import {
  LineDashedMaterial,
  LineSegments,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from 'three'
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
  const pickAt = (
    world: Vector3,
    face: 'f_pz' | null = 'f_pz',
    mode: 'vertex' | 'edge' | 'face' = 'vertex',
  ) => {
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
      mode,
    )
  }
  return { overlay, pickAt, camera, raycaster }
}

describe('overlay da malha: picking com tolerância em pixels', () => {
  test('orthographic vertex tolerance follows zoom in screen pixels, not a fixed world radius', () => {
    const { overlay } = setup()
    const camera = new OrthographicCamera(-6, 6, 6, -6, 0.1, 100)
    camera.position.set(1, 1, 12)
    camera.lookAt(1, 1, 1)
    camera.updateMatrixWorld(true)
    const raycaster = new Raycaster()
    const pick = (zoom: number) => {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
      const point = new Vector3(2.1, 2, 2).project(camera)
      raycaster.setFromCamera(new Vector2(point.x, point.y), camera)
      return overlay.pick(raycaster.ray, camera, 8, 600, 10, 'f_pz', 'vertex')
    }
    expect(pick(1)).toEqual({ kind: 'vertex', key: 'v_111' })
    expect(pick(2)).toBeNull()
    overlay.dispose()
  })

  test('perto de um canto escolhe o PONTO; no meio de uma aresta a ARESTA; no miolo a FACE', () => {
    const { pickAt } = setup()
    // O canto (2, 2, 2) com um desvio de ~2 px (0,02 unidades a 10 de distância ≈ 1,4 px).
    expect(pickAt(new Vector3(1.98, 1.98, 2))).toEqual({ kind: 'vertex', key: 'v_111' })
    const edge = pickAt(new Vector3(1, 1.99, 2), 'f_pz', 'edge')
    expect(edge?.kind).toBe('edge')
    if (edge?.kind === 'edge') expect([...edge.keys].sort()).toEqual(['v_011', 'v_111'])
    expect(pickAt(new Vector3(1, 1, 2), 'f_pz', 'face')).toEqual({
      kind: 'face',
      key: 'f_pz',
    })
  })

  test('nada atrás da superfície: o canto do fundo não rouba o toque na face da frente', () => {
    const { pickAt } = setup()
    // (2, 2, 2) está na frente; o raio que passa por ele também passa perto de (2, 2, 0)?
    // Não: a câmera olha de frente, então o ponto do fundo fica exatamente atrás e e só
    // o da frente conta. Um raio pela quina de trás, vindo de frente, acerta a face antes.
    const pick = pickAt(new Vector3(2, 2, 2))
    expect(pick).toEqual({ kind: 'vertex', key: 'v_111' })
    // Sem face tocada e longe de tudo: nada.
    expect(pickAt(new Vector3(1, 1, 2), null, 'face')).toBeNull()
  })

  test('a posição no mundo dos vértices segue o pai (o mesh da peça)', () => {
    const { overlay } = setup()
    const world = overlay.worldPosition('v_111')
    expect(world?.toArray()).toEqual([2, 2, 2])
    expect(overlay.worldPosition('v_zzz')).toBeNull()
  })

  test('aresta de construção é selecionável e desenhada tracejada', () => {
    const { overlay, pickAt } = setup()
    overlay.setMesh(
      {
        vertices: { v_a: [0, 0, 2], v_b: [2, 0, 2] },
        faces: {},
        looseEdges: [['v_a', 'v_b']],
      },
      [1, 1, 1],
      [],
    )
    expect(pickAt(new Vector3(1, 0, 2), null, 'edge')).toEqual({
      kind: 'edge',
      keys: ['v_a', 'v_b'],
    })
    const dashed = overlay.group.children.find(
      (child) => child instanceof LineSegments && child.material instanceof LineDashedMaterial,
    )
    expect(dashed).toBeDefined()
  })
})

test('o canto de TRÁS, exatamente atrás da face da frente tocada, não rouba o toque', () => {
  const { overlay, camera, raycaster } = setup()
  // O raio passa pelo canto de trás (2, 2, 0); a superfície tocada é a face da frente
  // (z = 2), então o que fica além dela não conta, mesmo estando a 0 px do raio.
  const back = new Vector3(2, 2, 0)
  const projected = back.clone().project(camera)
  raycaster.setFromCamera(new Vector2(projected.x, projected.y), camera)
  const ray = raycaster.ray
  const surfaceDistance = (2 - ray.origin.z) / ray.direction.z
  const pick = overlay.pick(ray, camera, 8, 600, surfaceDistance, 'f_pz', 'face')
  expect(pick).not.toEqual({ kind: 'vertex', key: 'v_110' })
  expect(pick).toEqual({ kind: 'face', key: 'f_pz' })
  // Sem superfície nenhuma tocada (a silhueta), a folga em pixels continua valendo.
  const corner = new Vector3(2.05, 2.05, 2)
  const p2 = corner.clone().project(camera)
  raycaster.setFromCamera(new Vector2(p2.x, p2.y), camera)
  expect(
    overlay.pick(raycaster.ray, camera, 8, 600, Number.POSITIVE_INFINITY, null, 'vertex'),
  ).toEqual({ kind: 'vertex', key: 'v_111' })
})
