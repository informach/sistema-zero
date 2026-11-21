import type { ModeloDoCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Group, type Material, type Mesh, type Object3D } from 'three'
import { conferirConteudoDoModelo, lerGlb, type ModeloCarregado } from './modelos'

export interface PontoDaPrevia {
  x: number
  /** Onde a base do modelo encosta: chão, andar ou superfície. */
  y: number
  z: number
}

/**
 * A cópia translúcida do modelo que está sendo arrastado da gaveta: aparece onde ele vai pousar,
 * com a mesma regra de pouso do soltar, e some ao soltar ou ao sair do palco. Lê o arquivo pelo
 * mesmo caminho do palco (com a conferência do hash) e nunca entra no documento.
 */
export class PreviaDeArrasto {
  readonly grupo = new Group()
  private digest: string | null = null
  private carregado: ModeloCarregado | null = null
  private materiais: Material[] = []
  private controle: AbortController | null = null
  private ponto: PontoDaPrevia | null = null

  constructor(
    private readonly carregar: (
      modelo: ModeloDoCenario,
      sinal: AbortSignal,
    ) => Promise<ArrayBuffer>,
    private readonly pedirQuadro: () => void,
  ) {
    this.grupo.name = 'previa-de-arrasto'
    this.grupo.visible = false
  }

  mostrar(modelo: ModeloDoCenario, ponto: PontoDaPrevia | null): void {
    this.ponto = ponto
    if (modelo.digest !== this.digest) this.trocar(modelo)
    this.posicionar()
  }

  esconder(): void {
    this.ponto = null
    this.posicionar()
  }

  /** Esquece o modelo de agora (outro arraste começa do zero). */
  soltar(): void {
    this.controle?.abort()
    this.controle = null
    this.digest = null
    this.ponto = null
    this.limpar()
    this.pedirQuadro()
  }

  descartar(): void {
    this.soltar()
    this.grupo.removeFromParent()
  }

  private trocar(modelo: ModeloDoCenario) {
    this.controle?.abort()
    this.limpar()
    this.digest = modelo.digest
    const controle = new AbortController()
    this.controle = controle
    this.carregar(modelo, controle.signal)
      .then((bytes) => conferirConteudoDoModelo(bytes, modelo.digest))
      .then((bytes) => {
        controle.signal.throwIfAborted()
        return lerGlb(bytes)
      })
      .then((carregado) => {
        if (controle.signal.aborted || this.digest !== modelo.digest) {
          carregado.descartar()
          return
        }
        this.carregado = carregado
        const copia = carregado.raiz.clone(true)
        copia.traverse((o: Object3D) => {
          const malha = o as Mesh
          if (!malha.isMesh) return
          const trocar = (m: Material) => {
            const translucido = m.clone()
            translucido.transparent = true
            translucido.opacity = Math.min(translucido.opacity, 0.55)
            translucido.depthWrite = false
            this.materiais.push(translucido)
            return translucido
          }
          malha.material = Array.isArray(malha.material)
            ? malha.material.map(trocar)
            : trocar(malha.material)
          malha.castShadow = false
          malha.receiveShadow = false
          malha.raycast = () => {}
        })
        // A base do modelo no ponto: a mesma conta do "pôr" (a altura menos o mínimo do volume).
        copia.position.y = -carregado.caixa.min.y
        this.grupo.add(copia)
        this.posicionar()
      })
      .catch(() => {
        // Sem prévia: o soltar continua funcionando e o palco avisa se o modelo não abrir.
      })
  }

  private posicionar() {
    const ponto = this.ponto
    this.grupo.visible = !!ponto && !!this.carregado
    if (ponto) this.grupo.position.set(ponto.x, ponto.y, ponto.z)
    this.pedirQuadro()
  }

  private limpar() {
    for (const filho of [...this.grupo.children]) this.grupo.remove(filho)
    for (const m of this.materiais) m.dispose()
    this.materiais = []
    this.carregado?.descartar()
    this.carregado = null
    this.grupo.visible = false
  }
}
