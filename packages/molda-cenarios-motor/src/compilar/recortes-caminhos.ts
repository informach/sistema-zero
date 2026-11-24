import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import { recortarAtributos } from '@sistemazero/molda-cenarios-core/geometria'
import type { FonteDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import {
  BackSide,
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  FrontSide,
  Matrix4,
  Vector3,
} from 'three'
import { lerParteEstatica } from '../curvas/parte-estatica'
import { transformarGeometriaEstatica } from '../geometria-instanciada'
import { IndiceDeCaixas } from '../indice-de-caixas'
import type { ParteDoModelo } from '../modelos'
import type { SuperficieDoObjeto } from '../superficies'
import { conferirGeometriaEstatica } from './geometria'

const TOLERANCIA_COPLANAR = 0.0001 // metros: apenas classifica, nunca desloca uma superfície.

/** glTF não conserva polygonOffset/depthWrite de decals. Remove somente o solo
 * visual sob os triângulos realmente coplanares; o terreno físico não muda. */
export class RecortesDoSoloCompilado {
  private readonly triangulos: Vector3[][] = []
  private readonly indice = new IndiceDeCaixas()
  get quantidade() {
    return this.triangulos.length
  }
  constructor(
    fontes: Iterable<SuperficieDoObjeto>,
    altura: FonteDeAlturas,
    opcoes: { incluirSolidos?: boolean } = {},
  ) {
    const caixas: Box3[] = [],
      pontos = [new Vector3(), new Vector3(), new Vector3()],
      normal = new Vector3(),
      ab = new Vector3(),
      ac = new Vector3(),
      niveis = new Float64Array(3)
    let visitas = 0
    for (const f of fontes) {
      const materiais = Array.isArray(f.material) ? f.material : [f.material],
        decal = materiais.map(
          (m) =>
            (m.polygonOffset && !m.depthWrite) ||
            (opcoes.incluirSolidos &&
              m.depthWrite &&
              !m.transparent &&
              !m.alphaTest &&
              !m.alphaHash &&
              !m.alphaToCoverage),
        )
      if (!decal.some(Boolean)) continue
      if (!decal.every(Boolean))
        throw Error('Separe os materiais de decal antes de compilar o caminho.')
      conferirGeometriaEstatica(f.geometria)
      const p = f.geometria.getAttribute('position'),
        indices = f.geometria.index,
        inicio = f.geometria.drawRange.start,
        fim = Math.min(indices?.count ?? p.count, inicio + f.geometria.drawRange.count)
      if (
        !Number.isSafeInteger(inicio) ||
        !Number.isSafeInteger(fim) ||
        inicio < 0 ||
        inicio % 3 ||
        (fim - inicio) % 3
      )
        throw Error('O decal do caminho não contém triângulos completos.')
      for (let i = inicio; i < fim; i += 3) {
        if (++visitas > LIMITES_DA_EXPORTACAO.malha.verticesDaFonte)
          throw Error(
            'As superfícies coplanares excedem o orçamento de leitura. Divida a região de exportação.',
          )
        for (let j = 0; j < 3; j++)
          pontos[j]!.fromBufferAttribute(p, indices?.getX(i + j) ?? i + j).applyMatrix4(f.matriz)
        if (pontos.some((p) => ![p.x, p.y, p.z].every(Number.isFinite)))
          throw Error('O decal do caminho contém posições inválidas.')
        for (let j = 0; j < 3; j++) niveis[j] = altura(pontos[j]!.x, pontos[j]!.z)
        if (niveis.some((h) => !Number.isFinite(h)))
          throw Error('A altura de referência do decal é inválida.')
        if (pontos.some((p, j) => Math.abs(p.y - niveis[j]!) > TOLERANCIA_COPLANAR)) continue
        normal.crossVectors(
          ab.subVectors(pontos[1]!, pontos[0]!),
          ac.subVectors(pontos[2]!, pontos[0]!),
        )
        if (normal.lengthSq() < 1e-20) continue
        if (
          (materiais[0]!.side === FrontSide && normal.y <= 0) ||
          (materiais[0]!.side === BackSide && normal.y >= 0)
        )
          continue
        if (this.triangulos.length >= 65_536)
          throw Error('Os decals excedem o orçamento de triângulos para recortar o solo visual.')
        this.triangulos.push(pontos.map((p) => p.clone()))
        caixas.push(new Box3().setFromPoints(pontos).expandByScalar(TOLERANCIA_COPLANAR))
      }
    }
    this.indice.definir(caixas)
  }
  recortar(parte: Pick<ParteDoModelo, 'geometria' | 'matriz'>): BufferGeometry {
    conferirGeometriaEstatica(parte.geometria)
    if (!parte.matriz.elements.every(Number.isFinite) || parte.matriz.determinant() === 0)
      throw Error('A transformação do solo visual precisa ser finita e invertível.')
    const volume = new Box3(),
      posicao = parte.geometria.getAttribute('position'),
      ponto = new Vector3()
    for (let i = 0; i < posicao.count; i++)
      volume.expandByPoint(ponto.fromBufferAttribute(posicao, i))
    volume.applyMatrix4(parte.matriz).expandByScalar(TOLERANCIA_COPLANAR)
    if (!this.indice.sobrepor(volume).length) return parte.geometria.clone()
    // O plano do palco é XY com rotação no nó; o relevo já é XZ. Recortar sempre
    // nos eixos horizontais do mundo, conservando origem local para precisão.
    const origem = new Vector3().setFromMatrixPosition(parte.matriz),
      orientacao = parte.matriz.clone().setPosition(0, 0, 0),
      fonte = lerParteEstatica({ geometria: parte.geometria, matriz: orientacao }, new Matrix4())
    let g: BufferGeometry | undefined
    try {
      const malha = fonte.malha,
        p = malha.atributos.position!.valores,
        indices = malha.indices!,
        nomes = Object.keys(malha.atributos),
        componentes = nomes.reduce((s, n) => s + malha.atributos[n]!.itemSize, 0),
        saidas = new Map(nomes.map((n) => [n, [] as number[]])),
        locais = new Map<number, { x: number; z: number }[]>(),
        pontos = [new Vector3(), new Vector3(), new Vector3()],
        caixa = new Box3()
      let trabalho = 0,
        vertices = 0
      for (let i = 0; i < indices.length; i += 3) {
        const ids = [indices[i]!, indices[i + 1]!, indices[i + 2]!]
        for (let j = 0; j < 3; j++)
          pontos[j]!.set(p[ids[j]! * 3]!, p[ids[j]! * 3 + 1]!, p[ids[j]! * 3 + 2]!).add(origem)
        const candidatos = this.indice.sobrepor(
          caixa.setFromPoints(pontos).expandByScalar(TOLERANCIA_COPLANAR),
        )
        trabalho += candidatos.length
        if (trabalho > 2_000_000)
          throw Error('O recorte visual dos caminhos exige trabalho demais neste setor.')
        const atributos = Object.fromEntries(
          nomes.map((nome) => {
            const a = malha.atributos[nome]!
            return [
              nome,
              {
                itemSize: a.itemSize,
                valores: ids.flatMap((id) =>
                  Array.from({ length: a.itemSize }, (_, c) => a.valores[id * a.itemSize + c]!),
                ),
              },
            ]
          }),
        )
        const dados = candidatos.length
          ? recortarAtributos(
              { atributos },
              [],
              candidatos.map((id) => {
                let contorno = locais.get(id)
                if (!contorno) {
                  contorno = this.triangulos[id]!.map((p) => {
                    const v = p.clone().sub(origem)
                    return { x: v.x, z: v.z }
                  })
                  locais.set(id, contorno)
                }
                return contorno
              }),
            )
          : atributos
        vertices += dados.position!.valores.length / 3
        if (
          vertices > 600_000 ||
          vertices * componentes * 4 > LIMITES_DA_EXPORTACAO.malha.bytesDaSaida
        )
          throw Error('O recorte dos caminhos excede o orçamento de geometria do setor.')
        for (const nome of nomes)
          for (const valor of Array.from(dados[nome]!.valores)) saidas.get(nome)!.push(valor)
      }
      g = new BufferGeometry()
      for (const nome of nomes)
        g.setAttribute(
          nome,
          new Float32BufferAttribute(saidas.get(nome)!, malha.atributos[nome]!.itemSize),
        )
      g.computeBoundingBox()
      g.computeBoundingSphere()
      if (!orientacao.equals(new Matrix4()) && g.getAttribute('position').count) {
        const local = transformarGeometriaEstatica(g, orientacao.invert())
        g.dispose()
        g = local
      }
      return g
    } catch (erro) {
      g?.dispose()
      throw erro
    } finally {
      fonte.descartar()
    }
  }
}
