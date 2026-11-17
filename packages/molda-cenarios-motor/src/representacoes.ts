import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, Matrix4, type Object3D, Vector3 } from 'three'
import { transformarGeometriaEstatica } from './geometria-instanciada'
import { LoteDoModelo } from './lotes'
import type { ModeloCarregado, ParteDoModelo } from './modelos'

/** Variantes visuais locais compartilham o GLB e os materiais, com descarte por uso. */
export class RepresentacoesDoModelo {
  private readonly base: LoteDoModelo
  private readonly variantes = new Map<
    string,
    { lote: LoteDoModelo; geometrias: BufferGeometry[] }
  >()
  constructor(
    private readonly pai: Object3D,
    private readonly modelo: ModeloCarregado,
  ) {
    this.base = new LoteDoModelo(pai, modelo.partes)
  }
  obter(espelho?: InstanciaDeCenario['espelho']): LoteDoModelo {
    const chave = `${espelho?.x ? 1 : 0}${espelho?.y ? 1 : 0}${espelho?.z ? 1 : 0}`
    if (chave === '000') return this.base
    const guardada = this.variantes.get(chave)
    if (guardada) return guardada.lote
    const centro = this.modelo.caixa.getCenter(new Vector3())
    const reflexao = new Matrix4()
      .makeTranslation(centro.x, centro.y, centro.z)
      .multiply(
        new Matrix4().makeScale(espelho?.x ? -1 : 1, espelho?.y ? -1 : 1, espelho?.z ? -1 : 1),
      )
      .multiply(new Matrix4().makeTranslation(-centro.x, -centro.y, -centro.z))
    const geometrias: BufferGeometry[] = [],
      partes: ParteDoModelo[] = []
    try {
      for (const p of this.modelo.partes) {
        const geometria = transformarGeometriaEstatica(
          p.geometria,
          new Matrix4().multiplyMatrices(reflexao, p.matriz),
        )
        geometrias.push(geometria)
        partes.push({ geometria, material: p.material, matriz: new Matrix4() })
      }
      const lote = new LoteDoModelo(this.pai, partes)
      this.variantes.set(chave, { lote, geometrias })
      return lote
    } catch (e) {
      for (const g of geometrias) g.dispose()
      throw e
    }
  }
  *lotes(): IterableIterator<LoteDoModelo> {
    yield this.base
    for (const v of this.variantes.values()) yield v.lote
  }
  manter(usadas: ReadonlySet<LoteDoModelo>) {
    for (const [chave, v] of this.variantes)
      if (!usadas.has(v.lote)) {
        v.lote.descartar()
        for (const g of v.geometrias) g.dispose()
        this.variantes.delete(chave)
      }
  }
  descartar() {
    this.base.descartar()
    this.manter(new Set())
  }
}
