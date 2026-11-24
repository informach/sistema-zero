import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three'
import type { FonteDeColisao } from '../teste/colisoes'

export interface EstadoDasColisoesVisiveis {
  fontes: number
  triangulos: number
  erro: string | null
}

const MAX_TRIANGULOS = 200_000
const CANTOS_DAS_ARESTAS = [0, 1, 1, 2, 2, 0] as const
/** Desenha os mesmos triângulos do Testar; não cria outro mundo físico. */
export class ColisoesVisiveis {
  readonly grupo = new Group()
  private geometria = new BufferGeometry()
  private readonly material = new LineBasicMaterial({
    color: '#32bbd0',
    depthTest: false,
    transparent: true,
    opacity: 0.6,
  })
  private readonly linhas = new LineSegments(this.geometria, this.material)
  private readonly ponto = new Vector3()
  private destruido = false
  private capacidade = 0
  private atributo: BufferAttribute | null = null
  constructor() {
    this.geometria.setDrawRange(0, 0)
    this.linhas.visible = false
    this.linhas.frustumCulled = false
    this.linhas.renderOrder = 996
    this.grupo.add(this.linhas)
  }
  definir(fontes: readonly FonteDeColisao[]): EstadoDasColisoesVisiveis {
    if (this.destruido) return { fontes: 0, triangulos: 0, erro: null }
    try {
      let triangulos = 0
      const faixas = []
      for (const f of fontes) {
        const p = f.geometria.getAttribute('position')
        if (!p?.count || Math.abs(f.matriz.determinant()) < 1e-14) continue
        const total = (f.geometria.index?.count ?? p.count) / 3,
          range = f.geometria.drawRange,
          de = Math.max(0, range.start / 3),
          quantidade = Math.max(
            0,
            Math.floor(Math.min(total, (range.start + range.count) / 3) - de),
          )
        if (!Number.isFinite(quantidade) || triangulos + quantidade > MAX_TRIANGULOS)
          throw Error('A inspeção excede 200 mil triângulos. Reduza a região de colisões visíveis.')
        if (quantidade === 0) continue
        triangulos += quantidade
        faixas.push({ f, de: Math.floor(de) * 3, quantidade })
      }
      const n = triangulos * 6
      if (n > this.capacidade) {
        const geometria = new BufferGeometry()
        this.capacidade = Math.min(MAX_TRIANGULOS * 6, Math.max(64, 2 ** Math.ceil(Math.log2(n))))
        this.atributo = new BufferAttribute(new Float32Array(this.capacidade * 3), 3)
        geometria.setAttribute('position', this.atributo)
        this.geometria.dispose()
        this.geometria = geometria
        this.linhas.geometry = geometria
      }
      let i = 0
      for (const { f, de, quantidade } of faixas) {
        const p = f.geometria.getAttribute('position'),
          indice = f.geometria.index
        for (let t = de; t < de + quantidade * 3; t += 3)
          for (const canto of CANTOS_DAS_ARESTAS) {
            const v = indice ? indice.getX(t + canto) : t + canto
            this.ponto.fromBufferAttribute(p, v).applyMatrix4(f.matriz)
            if (
              !Number.isFinite(this.ponto.x) ||
              !Number.isFinite(this.ponto.y) ||
              !Number.isFinite(this.ponto.z)
            )
              throw Error('Uma fonte de colisão contém coordenadas inválidas.')
            this.atributo!.setXYZ(i++, this.ponto.x, this.ponto.y, this.ponto.z)
          }
      }
      this.geometria.setDrawRange(0, n)
      this.linhas.visible = n > 0
      if (this.atributo) this.atributo.needsUpdate = true
      return { fontes: faixas.length, triangulos, erro: null }
    } catch (e) {
      this.limpar()
      return {
        fontes: 0,
        triangulos: 0,
        erro: e instanceof Error ? e.message : 'Não consegui inspecionar as colisões.',
      }
    }
  }
  limpar() {
    this.linhas.visible = false
    if (!this.destruido && this.capacidade === 0 && this.geometria.drawRange.count === 0) return
    this.geometria.dispose()
    this.geometria.deleteAttribute('position')
    this.atributo = null
    this.capacidade = 0
    if (!this.destruido) {
      this.geometria = new BufferGeometry()
      this.geometria.setDrawRange(0, 0)
      this.linhas.geometry = this.geometria
    }
  }
  descartar() {
    if (this.destruido) return
    this.destruido = true
    this.limpar()
    this.material.dispose()
    this.grupo.clear()
  }
}
