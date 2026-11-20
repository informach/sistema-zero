import { Box3, BufferGeometry, DoubleSide, Line3, type Matrix4, Ray, Vector3 } from 'three'
import { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh'
import { IndiceDeCaixas } from '../indice-de-caixas'

export interface FonteDeColisao {
  objeto?: string
  geometria: BufferGeometry
  matriz: Matrix4
}
/** Referências transitórias em coordenadas globais: o predicado só lê e não as retém. */
export interface TrianguloDaConsulta {
  readonly objeto?: string
  readonly a: Readonly<Pick<Vector3, 'x' | 'y' | 'z'>>
  readonly b: Readonly<Pick<Vector3, 'x' | 'y' | 'z'>>
  readonly c: Readonly<Pick<Vector3, 'x' | 'y' | 'z'>>
}
interface Entrada {
  objeto?: string
  arvore: MeshBVH
  matriz: Matrix4
  inversa: Matrix4
  caixa: Box3
}

/** Árvores por geometria, caixas por instância; os triângulos finais são medidos no mundo. */
export class MundoDoTeste {
  readonly limiteInferior: number | null
  private readonly geometrias = new Map<
    BufferGeometry,
    { copia: BufferGeometry; arvore: MeshBVH }
  >()
  private readonly indice = new IndiceDeCaixas()
  private readonly entradas: Entrada[] = []
  private readonly segmento = new Line3()
  private readonly caixa = new Box3()
  private readonly caixaLocal = new Box3()
  private readonly triangulo = new ExtendedTriangle()
  private readonly naFace = new Vector3()
  private readonly naCapsula = new Vector3()
  private readonly normal = new Vector3()
  private readonly normalMaisProfunda = new Vector3()
  private readonly raio = new Ray()
  private readonly ponto = new Vector3()
  private descartado = false
  get arvores() {
    return this.geometrias.size
  }

  constructor(fontes: readonly FonteDeColisao[]) {
    try {
      for (const f of fontes) {
        if (
          !f.geometria.getAttribute('position')?.count ||
          f.geometria.drawRange.count === 0 ||
          Math.abs(f.matriz.determinant()) < 1e-14
        )
          continue
        let entrada = this.geometrias.get(f.geometria)
        if (!entrada) {
          const copia = new BufferGeometry().setAttribute(
            'position',
            f.geometria.getAttribute('position').clone(),
          )
          if (f.geometria.index) copia.setIndex(f.geometria.index.clone())
          copia.setDrawRange(f.geometria.drawRange.start, f.geometria.drawRange.count)
          // Sem grupos de material: a colisão cobre exatamente o drawRange uma única vez.
          try {
            entrada = { copia, arvore: new MeshBVH(copia, { indirect: true, maxLeafTris: 10 }) }
          } catch (e) {
            copia.dispose()
            throw e
          }
          this.geometrias.set(f.geometria, entrada)
        }
        if (!entrada.copia.boundingBox) entrada.copia.computeBoundingBox()
        this.entradas.push({
          objeto: f.objeto,
          arvore: entrada.arvore,
          matriz: f.matriz.clone(),
          inversa: f.matriz.clone().invert(),
          caixa: entrada.copia.boundingBox!.clone().applyMatrix4(f.matriz),
        })
      }
      this.indice.definir(this.entradas.map((e) => e.caixa))
      const volume = this.indice.limites(new Box3())
      this.limiteInferior = volume.isEmpty() ? null : volume.min.y
    } catch (e) {
      this.descartar()
      throw e
    }
  }

  resolver(pes: Vector3, altura: number, raio: number) {
    if (this.descartado) throw new Error('A colisão do ensaio já foi encerrada')
    const posicao = pes.clone(),
      normais: Vector3[] = []
    let candidatos = 0
    const margem = 1e-5
    for (let rodada = 0; rodada < 6; rodada++) {
      this.segmento.start.copy(posicao).y += raio
      this.segmento.end.copy(posicao).y += altura - raio
      this.caixa
        .setFromPoints([this.segmento.start, this.segmento.end])
        .expandByScalar(raio + margem)
      let maior = 0
      for (const i of this.indice.sobrepor(this.caixa)) {
        candidatos++
        const e = this.entradas[i]!
        // AABB transformada é conservadora também sob shear e escala não uniforme.
        this.caixaLocal.copy(this.caixa).applyMatrix4(e.inversa)
        e.arvore.shapecast({
          intersectsBounds: (caixa) => caixa.intersectsBox(this.caixaLocal),
          intersectsTriangle: (t) => {
            this.triangulo.copy(t)
            this.triangulo.a.applyMatrix4(e.matriz)
            this.triangulo.b.applyMatrix4(e.matriz)
            this.triangulo.c.applyMatrix4(e.matriz)
            this.triangulo.needsUpdate = true
            const distancia = this.triangulo.closestPointToSegment(
              this.segmento,
              this.naFace,
              this.naCapsula,
            )
            if (distancia >= raio + margem) return false
            if (distancia > 1e-8)
              this.normal.subVectors(this.naCapsula, this.naFace).multiplyScalar(1 / distancia)
            else {
              this.triangulo.getNormal(this.normal)
              this.segmento.getCenter(this.naCapsula)
              if (this.normal.dot(this.naCapsula.sub(this.triangulo.a)) < 0) this.normal.negate()
            }
            if (this.normal.lengthSq() < 0.9) return false
            const correcao = raio + margem - distancia
            // Measure every constraint at the SAME pose. An internal diagonal can
            // otherwise push sideways before its coplanar face resolves the ceiling.
            if (correcao > maior) {
              maior = correcao
              this.normalMaisProfunda.copy(this.normal)
            }
            return false
          },
        })
      }
      if (maior > 0) {
        posicao.addScaledVector(this.normalMaisProfunda, maior)
        if (normais.length < 32 && !normais.some((n) => n.dot(this.normalMaisProfunda) > 0.999))
          normais.push(this.normalMaisProfunda.clone())
      }
      if (maior < margem * 2) break
    }
    return { posicao, normais, candidatos }
  }

  /** Triângulos reais em mundo, limitados por região e orçamento, reutilizando as árvores. */
  triangulosNaCaixa(
    caixa: Box3,
    maximo = 20_000,
    incluir?: (instancia: number, triangulo: number, contexto: TrianguloDaConsulta) => boolean,
  ): Float64Array {
    if (this.descartado) throw new Error('A consulta de superfícies já foi encerrada')
    if (!Number.isSafeInteger(maximo) || maximo < 1 || maximo > 100_000)
      throw new Error('O orçamento da consulta de triângulos é inválido')
    if (caixa.isEmpty()) return new Float64Array()
    if (![...caixa.min, ...caixa.max].every(Number.isFinite))
      throw new Error('A região de consulta de triângulos é inválida')
    const posicoes: number[] = []
    let visitas = 0
    for (const i of this.indice.sobrepor(caixa)) {
      const entrada = this.entradas[i]!,
        local = caixa.clone().applyMatrix4(entrada.inversa)
      const contexto: TrianguloDaConsulta = {
        objeto: entrada.objeto,
        a: this.triangulo.a,
        b: this.triangulo.b,
        c: this.triangulo.c,
      }
      entrada.arvore.shapecast({
        intersectsBounds: (b) => b.intersectsBox(local),
        intersectsTriangle: (t, triangulo) => {
          if (++visitas > maximo)
            throw new Error('A região contém triângulos demais para preparar os apoios')
          this.triangulo.copy(t)
          this.triangulo.a.applyMatrix4(entrada.matriz)
          this.triangulo.b.applyMatrix4(entrada.matriz)
          this.triangulo.c.applyMatrix4(entrada.matriz)
          this.caixa.setFromPoints([this.triangulo.a, this.triangulo.b, this.triangulo.c])
          if (!this.caixa.intersectsBox(caixa)) return false
          // Identidade estável da instância/BVH: setores vizinhos podem compartilhar
          // triângulos sem duplicá-los ou comparar coordenadas arredondadas.
          if (incluir && !incluir(i, triangulo, contexto)) return false
          for (const p of [this.triangulo.a, this.triangulo.b, this.triangulo.c])
            posicoes.push(p.x, p.y, p.z)
          return false
        },
      })
    }
    return Float64Array.from(posicoes)
  }

  /** Primeiro contato no segmento, usado para chegada ao solo e oclusão da câmera. */
  rastrear(
    de: Vector3,
    ate: Vector3,
  ): { ponto: Vector3; normal: Vector3; distancia: number } | null {
    if (this.descartado) return null
    const tamanho = de.distanceTo(ate)
    if (tamanho < 1e-9) return null
    this.raio.set(de, ate.clone().sub(de).normalize())
    let resposta: { ponto: Vector3; normal: Vector3; distancia: number } | null = null
    for (const i of this.indice.consultar(this.raio)) {
      const e = this.entradas[i]!,
        local = this.raio.clone().applyMatrix4(e.inversa)
      const hit = e.arvore.raycastFirst(local, DoubleSide)
      if (!hit?.face) continue
      this.ponto.copy(hit.point).applyMatrix4(e.matriz)
      const distancia = de.distanceTo(this.ponto)
      if (distancia > tamanho || (resposta && distancia >= resposta.distancia)) continue
      const a = new Vector3()
        .fromBufferAttribute(e.arvore.geometry.getAttribute('position'), hit.face.a)
        .applyMatrix4(e.matriz)
      const b = new Vector3()
        .fromBufferAttribute(e.arvore.geometry.getAttribute('position'), hit.face.b)
        .applyMatrix4(e.matriz)
      const c = new Vector3()
        .fromBufferAttribute(e.arvore.geometry.getAttribute('position'), hit.face.c)
        .applyMatrix4(e.matriz)
      const normal = b.sub(a).cross(c.sub(a)).normalize()
      if (normal.dot(this.raio.direction) > 0) normal.negate()
      resposta = { ponto: this.ponto.clone(), normal, distancia }
    }
    return resposta
  }

  descartar() {
    if (this.descartado) return
    this.descartado = true
    for (const g of this.geometrias.values()) g.copia.dispose()
    this.geometrias.clear()
    this.entradas.length = 0
    this.indice.definir([])
  }
}
