import {
  type CenaCompilada,
  LIMITES_DA_EXPORTACAO,
} from '@sistemazero/molda-cenarios-core/compilar'
import { BufferAttribute, type BufferGeometry, Matrix4 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ParteDoModelo } from '../modelos'
import { conferirGeometriaEstatica, dividirParteEstatica } from './geometria'

const ORIGEM = 'mcnOrigemDaJuncao'
const bytesDaGeometria = (g: BufferGeometry) =>
  Object.values(g.attributes).reduce((s, a) => s + a.count * a.itemSize * 4, 0) +
  (g.index?.count ?? 0) * 4
export interface ParteDoLoteEstatico {
  geometria: BufferGeometry
  faixas: NonNullable<CenaCompilada['nos'][number]['faixas']>
}
export const bytesDaParteParaJuncao = (g: BufferGeometry) =>
  bytesDaGeometria(g) + g.getAttribute('position').count * 4

/** Layout distinto exige outro lote; não elimina canais para forçar uma junção. */
export function layoutDaParteEstatica(g: BufferGeometry) {
  conferirGeometriaEstatica(g)
  return JSON.stringify(
    Object.entries(g.attributes)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([nome, a]) => [nome, a.itemSize]),
  )
}

/** Um material/região/layout. Conserva origem por vértice somente durante o
 * remapeamento, transformando-a em faixas portáteis antes de gravar o GLB. */
export class LoteEstaticoCompilado {
  private readonly entradas: BufferGeometry[] = []
  private readonly entidades: (string | null)[] = []
  private readonly indices = new Map<string | null, number>()
  private layout: string | undefined
  private bytes = 0
  private finalizado = false
  private descartado = false
  get bytesDeEntrada() {
    return this.bytes
  }
  constructor(private readonly orcamento = LIMITES_DA_EXPORTACAO.malha.bytesDaSaida) {}
  adicionar(fonte: Pick<ParteDoModelo, 'geometria' | 'matriz'>, entidade: string | null) {
    if (this.finalizado || this.descartado) throw Error('O lote estático já foi encerrado.')
    const layout = layoutDaParteEstatica(fonte.geometria)
    if (this.layout !== undefined && this.layout !== layout)
      throw Error('Separe layouts de atributos diferentes antes de juntar.')
    if (
      fonte.geometria.hasAttribute(ORIGEM) ||
      Object.keys(fonte.geometria.attributes).length >= LIMITES_DA_EXPORTACAO.malha.atributos
    )
      throw Error(
        'A junção não dispõe de um canal transitório de origem; exporte este layout sem juntar.',
      )
    if (!this.indices.has(entidade)) {
      if (this.entidades.length >= 32768) throw Error('O lote estático contém entidades demais.')
      this.indices.set(entidade, this.entidades.length)
      this.entidades.push(entidade)
    }
    const previsto = bytesDaParteParaJuncao(fonte.geometria)
    if ((this.bytes + previsto) * 3 > this.orcamento)
      throw Error('A junção excede o orçamento de geometria. Divida a região.')
    const partes = dividirParteEstatica(
      fonte,
      new Matrix4(),
      Math.floor(this.orcamento / 3) - this.bytes,
    )
    try {
      for (const g of partes) {
        g.setAttribute(
          ORIGEM,
          new BufferAttribute(
            new Float32Array(g.getAttribute('position').count).fill(this.indices.get(entidade)!),
            1,
          ),
        )
        this.bytes += bytesDaGeometria(g)
      }
      if (this.bytes * 3 > this.orcamento)
        throw Error('A junção materializada excede o orçamento de geometria.')
      this.layout = layout
      this.entradas.push(...partes)
    } catch (erro) {
      for (const g of partes) g.dispose()
      throw erro
    }
  }
  finalizar(): ParteDoLoteEstatico[] {
    if (this.finalizado || this.descartado) throw Error('O lote estático já foi encerrado.')
    this.finalizado = true
    if (!this.entradas.length) return []
    const unida = mergeGeometries(this.entradas, false),
      saida: ParteDoLoteEstatico[] = []
    if (!unida) throw Error('Não foi possível juntar o layout estático sem perder atributos.')
    try {
      const partes = dividirParteEstatica(
        { geometria: unida, matriz: new Matrix4() },
        new Matrix4(),
        this.orcamento - this.bytes * 2,
      )
      for (const geometria of partes) saida.push({ geometria, faixas: [] })
      for (const p of saida) {
        const origem = p.geometria.getAttribute(ORIGEM),
          indices = p.geometria.index!,
          n = indices.count / 3
        for (let i = 0; i < n; i++) {
          const id = origem.getX(indices.getX(i * 3))
          if (
            !Number.isInteger(id) ||
            id < 0 ||
            id >= this.entidades.length ||
            [1, 2].some((j) => origem.getX(indices.getX(i * 3 + j)) !== id)
          )
            throw Error('Uma face perdeu a identidade durante a junção estática.')
          const entidade = this.entidades[id]!,
            anterior = p.faixas.at(-1)
          if (anterior && anterior.entidade === entidade) anterior.triangulos++
          else p.faixas.push({ malha: 'lote', entidade, primeiroTriangulo: i, triangulos: 1 })
        }
        p.geometria.deleteAttribute(ORIGEM)
      }
      return saida
    } catch (erro) {
      for (const p of saida) p.geometria.dispose()
      throw erro
    } finally {
      unida.dispose()
    }
  }
  descartar() {
    if (this.descartado) return
    this.descartado = true
    for (const g of this.entradas) g.dispose()
    this.entradas.length = 0
    this.indices.clear()
    this.entidades.length = 0
  }
}
