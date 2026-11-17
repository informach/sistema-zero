import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  type BufferGeometry,
  Matrix4,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
  Vector3,
} from 'three'
import { transformarGeometriaEstatica } from './geometria-instanciada'
import { LoteDoModelo } from './lotes'
import type { ModeloCarregado, ParteDoModelo } from './modelos'
import { geometriaParaTextura, materialDaTextura } from './projecao-textura'

/** Variantes visuais locais compartilham o GLB e os materiais, com descarte por uso. */
export class RepresentacoesDoModelo {
  private readonly base: LoteDoModelo
  private readonly variantes = new Map<
    string,
    { lote: LoteDoModelo; geometrias: BufferGeometry[]; projecao?: string; materiais?: string[] }
  >()
  private readonly projetadas = new Map<string, BufferGeometry[]>()
  private readonly materiais = new Map<string, MeshStandardMaterial>()
  constructor(
    private readonly pai: Object3D,
    private readonly modelo: ModeloCarregado,
  ) {
    this.base = new LoteDoModelo(pai, modelo.partes)
  }
  obter(
    espelho?: InstanciaDeCenario['espelho'],
    acabamento?: { textura: Texture; repeticaoMetros: number },
  ): LoteDoModelo {
    const reflexo = `${espelho?.x ? 1 : 0}${espelho?.y ? 1 : 0}${espelho?.z ? 1 : 0}`
    const chave = acabamento
      ? `${reflexo}:${acabamento.textura.uuid}:${acabamento.repeticaoMetros}`
      : reflexo
    if (!acabamento && chave === '000') return this.base
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
    const chavesDeMateriais: string[] = []
    try {
      let projetadas = acabamento ? this.projetadas.get(reflexo) : undefined
      if (acabamento && !projetadas) {
        const novas: BufferGeometry[] = []
        try {
          for (const p of this.modelo.partes)
            novas.push(
              geometriaParaTextura(p.geometria, new Matrix4().multiplyMatrices(reflexao, p.matriz)),
            )
          projetadas = novas
          this.projetadas.set(reflexo, novas)
        } catch (erro) {
          for (const g of novas) g.dispose()
          throw erro
        }
      }
      for (let i = 0; i < this.modelo.partes.length; i++) {
        const p = this.modelo.partes[i]!
        if (acabamento && projetadas) {
          const id = `${acabamento.textura.uuid}:${acabamento.repeticaoMetros}:${p.material.side}`
          let material = this.materiais.get(id)
          if (!material) {
            material = materialDaTextura(
              acabamento.textura,
              acabamento.repeticaoMetros,
              p.material.side,
            )
            this.materiais.set(id, material)
          }
          chavesDeMateriais.push(id)
          partes.push({ geometria: projetadas[i]!, material, matriz: new Matrix4() })
        } else {
          const geometria = transformarGeometriaEstatica(
            p.geometria,
            new Matrix4().multiplyMatrices(reflexao, p.matriz),
          )
          geometrias.push(geometria)
          partes.push({ geometria, material: p.material, matriz: new Matrix4() })
        }
      }
      const lote = new LoteDoModelo(this.pai, partes)
      this.variantes.set(chave, {
        lote,
        geometrias,
        ...(acabamento ? { projecao: reflexo, materiais: chavesDeMateriais } : {}),
      })
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
    const projecoes = new Set(
      [...this.variantes.values()].flatMap((v) => (v.projecao ? [v.projecao] : [])),
    )
    for (const [chave, geometrias] of this.projetadas)
      if (!projecoes.has(chave)) {
        for (const g of geometrias) g.dispose()
        this.projetadas.delete(chave)
      }
    const materiais = new Set([...this.variantes.values()].flatMap((v) => v.materiais ?? []))
    for (const [chave, material] of this.materiais)
      if (!materiais.has(chave)) {
        material.dispose()
        this.materiais.delete(chave)
      }
  }
  descartar() {
    this.base.descartar()
    this.manter(new Set())
  }
}
