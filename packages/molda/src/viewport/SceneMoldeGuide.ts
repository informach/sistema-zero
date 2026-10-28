import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import type { Vec3 } from '../core/model'

/**
 * O molde pedido pelo host (28/10/2026, o Arquipélago): a caixa do objeto em contorno e a FRENTE
 * (a face +z, onde o avatar usa o objeto) em rosa. É ajudante de tela, como o chão quadriculado:
 * fica fora do toque (só as peças são tocadas), da foto da galeria e do arquivo exportado.
 */
export interface SceneMoldeGuideState {
  min: Vec3
  max: Vec3
}

/** O rosa da marca da frente (o mesmo da planificação do Pinta). */
export const MOLDE_FRONT_COLOR = 0xff5fa2
const BOX_COLOR = 0x7c879c

export class SceneMoldeGuide {
  readonly root = new Group()
  private state: SceneMoldeGuideState | null = null

  constructor() {
    this.root.name = 'molda-molde-guide'
    this.root.visible = false
  }

  update(state: SceneMoldeGuideState | null): void {
    const same =
      state &&
      this.state &&
      state.min.every((v, i) => v === this.state?.min[i]) &&
      state.max.every((v, i) => v === this.state?.max[i])
    if (same || (!state && !this.state)) return
    this.clear()
    this.state = state
    this.root.visible = state !== null
    if (!state) return
    const [x0, y0, z0] = state.min
    const [x1, y1, z1] = state.max
    const width = x1 - x0
    const height = y1 - y0
    const depth = z1 - z0
    const center: Vec3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]
    // A caixa: as doze arestas, visíveis por trás das peças (é um guia, não uma parede).
    const edges = new LineSegments(
      new EdgesGeometry(new BoxGeometry(width, height, depth)),
      new LineBasicMaterial({
        color: BOX_COLOR,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      }),
    )
    edges.position.set(...center)
    edges.renderOrder = 10
    edges.name = 'molda-molde-box'
    // A frente: um véu rosa e o contorno rosa, um tiquinho para fora da face +z.
    const z = z1 + Math.max(depth, 1) * 0.002
    const veil = new Mesh(
      new PlaneGeometry(width, height),
      new MeshBasicMaterial({
        color: MOLDE_FRONT_COLOR,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: DoubleSide,
      }),
    )
    veil.position.set(center[0], center[1], z)
    veil.renderOrder = 11
    veil.name = 'molda-molde-front'
    const outline = new LineLoop(
      new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3),
      ),
      new LineBasicMaterial({ color: MOLDE_FRONT_COLOR, depthTest: false }),
    )
    outline.renderOrder = 12
    outline.name = 'molda-molde-front-outline'
    this.root.add(edges, veil, outline)
  }

  private clear(): void {
    for (const child of this.root.children) {
      const object = child as Mesh | LineSegments | LineLoop
      object.geometry.dispose()
      const material = object.material
      if (Array.isArray(material)) for (const m of material) m.dispose()
      else material.dispose()
    }
    this.root.clear()
  }

  dispose(): void {
    this.clear()
    this.state = null
  }
}
