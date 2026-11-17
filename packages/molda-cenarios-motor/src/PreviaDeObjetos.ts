import type {
  DocumentoDeCenario,
  FonteDeAlturas,
  InstanciaDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import { Group, type Material, Matrix4, type Texture } from 'three'
import type { ItemDoLote, LoteDoModelo } from './lotes'
import { matrizDoObjeto } from './matematica'
import type { ModeloCarregado } from './modelos'
import { RepresentacoesDoModelo } from './representacoes'

interface ModeloDePrevia {
  representacoes: RepresentacoesDoModelo
  materiais: Material[]
}

/** Compartilha só geometrias/texturas de origem. Materiais e instâncias temporários têm dono próprio. */
export class PreviaDeObjetos {
  readonly grupo = new Group()
  private readonly modelos = new Map<ModeloCarregado, ModeloDePrevia>()
  private readonly translucidos = new WeakSet<Material>()

  private translucido(material: Material) {
    if (this.translucidos.has(material)) return
    this.translucidos.add(material)
    material.opacity = Math.min(material.opacity, 0.55)
    material.transparent = true
    material.depthWrite = false
    material.needsUpdate = true
  }

  desenhar(
    doc: DocumentoDeCenario,
    objetos: readonly InstanciaDeCenario[],
    fonte: FonteDeAlturas | undefined,
    modeloDe: (id: string) => ModeloCarregado | null,
    texturaDe: (id: string) => Texture | null,
  ) {
    const lotes = new Map<LoteDoModelo, ItemDoLote[]>()
    for (const o of objetos) {
      const modelo = modeloDe(o.modelo)
      if (!modelo) throw new Error(`Aguarde o modelo ${o.nome}`)
      let previa = this.modelos.get(modelo)
      if (!previa) {
        const materiais = modelo.partes.map((p) => p.material.clone())
        for (const m of materiais) this.translucido(m)
        previa = {
          materiais,
          representacoes: new RepresentacoesDoModelo(this.grupo, {
            ...modelo,
            partes: modelo.partes.map((p, i) => ({ ...p, material: materiais[i]! })),
          }),
        }
        this.modelos.set(modelo, previa)
      }
      const acabamento = o.aparencia?.textura
      const textura = acabamento ? texturaDe(acabamento.id) : null
      if (acabamento && !textura) throw new Error(`Aguarde a textura de ${o.nome}`)
      const lote = previa.representacoes.obter(
        o.espelho,
        acabamento && textura
          ? { textura, repeticaoMetros: acabamento.repeticaoMetros }
          : undefined,
      )
      const itens = lotes.get(lote) ?? []
      itens.push({
        id: o.id,
        matriz: matrizDoObjeto(doc, o, new Matrix4(), fonte),
        cor: o.aparencia?.cor,
      })
      lotes.set(lote, itens)
    }
    for (const previa of this.modelos.values())
      for (const lote of previa.representacoes.lotes()) {
        lote.preencher(lotes.get(lote) ?? [])
        for (const malha of lote.malhas) {
          malha.castShadow = false
          malha.receiveShadow = false
          for (const material of Array.isArray(malha.material) ? malha.material : [malha.material])
            this.translucido(material)
        }
      }
  }

  esvaziar() {
    for (const previa of this.modelos.values())
      for (const lote of previa.representacoes.lotes()) lote.preencher([])
  }

  limpar() {
    for (const previa of this.modelos.values()) {
      previa.representacoes.descartar()
      for (const material of previa.materiais) material.dispose()
    }
    this.modelos.clear()
    this.grupo.clear()
  }

  descartar() {
    this.limpar()
    this.grupo.removeFromParent()
  }
}
