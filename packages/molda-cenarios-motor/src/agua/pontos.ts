import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
} from 'three'
import type { Ponto3 } from '../tipos'

/** Apenas alças de autoria. A água publicada não depende desta representação. */
export class PontosDaAgua {
  readonly grupo = new Group()
  private readonly geometria = new BufferGeometry()
  private readonly linha = new Line(this.geometria, new LineBasicMaterial({ color: 0x28a9dc }))
  private readonly pontos = new Points(
    this.geometria,
    new PointsMaterial({ color: 0xffd875, size: 0.3 }),
  )
  habilitada = false
  constructor() {
    this.grupo.add(this.linha, this.pontos)
    this.grupo.visible = false
  }
  definir(pontos: readonly Ponto3[] | null) {
    if (
      pontos &&
      (pontos.length > 128 || pontos.some((p) => ![p.x, p.y, p.z].every(Number.isFinite)))
    )
      throw Error('Confira os pontos da água (máximo de 128).')
    this.habilitada = pontos !== null
    this.grupo.visible = this.habilitada
    this.geometria.setAttribute(
      'position',
      new Float32BufferAttribute(pontos?.flatMap((p) => [p.x, p.y + 0.05, p.z]) ?? [], 3),
    )
    this.geometria.computeBoundingSphere()
  }
  descartar() {
    this.geometria.dispose()
    this.linha.material.dispose()
    this.pontos.material.dispose()
    this.grupo.clear()
  }
}
