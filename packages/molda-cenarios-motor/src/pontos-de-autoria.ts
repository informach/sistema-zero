import {
  Box3,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  Sphere,
  Vector3,
} from 'three'
import type { Ponto3 } from './tipos'

/** Alças compartilhadas por água e caminhos; não participam da cena publicada. */
export class PontosDeAutoria {
  readonly grupo = new Group()
  private readonly geometria = new BufferGeometry()
  private readonly linha = new Line(this.geometria, new LineBasicMaterial({ color: 0x28a9dc }))
  private readonly pontos = new Points(
    this.geometria,
    new PointsMaterial({ color: 0xffffff, vertexColors: true, size: 0.3 }),
  )
  habilitada = false
  private readonly caixa = new Box3()
  private readonly ponto = new Vector3()
  private readonly cor = new Color()
  constructor(
    private readonly maximo = 128,
    pixels?: number,
  ) {
    if (!Number.isInteger(maximo) || maximo < 2 || maximo > 4096)
      throw Error('O limite de pontos de autoria é inválido.')
    for (const nome of ['position', 'color'])
      this.geometria.setAttribute(
        nome,
        new Float32BufferAttribute((maximo + 1) * 3, 3).setUsage(DynamicDrawUsage),
      )
    this.geometria.boundingSphere = new Sphere()
    this.geometria.setDrawRange(0, 0)
    if (pixels) {
      this.pontos.material.size = pixels
      this.pontos.material.sizeAttenuation = false
    }
    this.grupo.add(this.linha, this.pontos)
    this.grupo.visible = false
  }
  definir(pontos: readonly Ponto3[] | null, fechada = false, selecionado: number | null = null) {
    if (
      pontos &&
      (pontos.length > this.maximo || pontos.some((p) => ![p.x, p.y, p.z].every(Number.isFinite)))
    )
      throw Error(`Confira os pontos de autoria (máximo de ${this.maximo}).`)
    this.habilitada = pontos !== null
    this.grupo.visible = this.habilitada
    const posicao = this.geometria.getAttribute('position'),
      cores = this.geometria.getAttribute('color'),
      quantidade = pontos?.length ?? 0,
      total = quantidade + (fechada && quantidade ? 1 : 0)
    this.caixa.makeEmpty()
    for (let i = 0; i < total; i++) {
      const indice = i % quantidade,
        p = pontos![indice]!
      posicao.setXYZ(i, p.x, p.y + 0.05, p.z)
      this.cor.set(indice === selecionado ? 0xff6e9c : 0xffd875)
      cores.setXYZ(i, this.cor.r, this.cor.g, this.cor.b)
      this.caixa.expandByPoint(this.ponto.set(p.x, p.y + 0.05, p.z))
    }
    posicao.needsUpdate = true
    cores.needsUpdate = true
    this.geometria.setDrawRange(0, total)
    const esfera = this.geometria.boundingSphere!
    if (!total) esfera.makeEmpty()
    else {
      this.caixa.getCenter(esfera.center)
      let r2 = 0
      for (let i = 0; i < total; i++)
        r2 = Math.max(
          r2,
          this.ponto.fromBufferAttribute(posicao, i).distanceToSquared(esfera.center),
        )
      esfera.radius = Math.sqrt(r2)
    }
  }
  descartar() {
    this.geometria.dispose()
    this.linha.material.dispose()
    this.pontos.material.dispose()
    this.grupo.clear()
  }
}
