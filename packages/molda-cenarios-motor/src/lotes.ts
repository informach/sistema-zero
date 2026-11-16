import {
  type Box3,
  BoxGeometry,
  type BufferGeometry,
  EdgesGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three'
import type { ParteDoModelo } from './modelos'

export interface ItemDoLote {
  id: string
  matriz: Matrix4
}

const auxiliar = new Matrix4()

/**
 * Todas as cópias de um modelo no cenário, desenhadas de uma vez (uma malha instanciada por
 * parte do modelo). É o que deixa o palco leve com milhares de objetos.
 */
export class LoteDoModelo {
  readonly malhas: InstancedMesh[] = []
  ids: string[] = []
  private capacidade = 0

  constructor(
    private readonly pai: Object3D,
    private readonly partes: readonly ParteDoModelo[],
  ) {}

  preencher(itens: readonly ItemDoLote[]): void {
    if (itens.length > this.capacidade) this.alocar(itens.length)
    this.ids = itens.map((i) => i.id)
    for (let p = 0; p < this.malhas.length; p++) {
      const malha = this.malhas[p]!,
        parte = this.partes[p]!
      for (let i = 0; i < itens.length; i++)
        malha.setMatrixAt(i, auxiliar.multiplyMatrices(itens[i]!.matriz, parte.matriz))
      malha.count = itens.length
      malha.visible = itens.length > 0
      this.marcar(malha)
    }
  }

  atualizar(indice: number, matriz: Matrix4): void {
    for (let p = 0; p < this.malhas.length; p++) {
      const malha = this.malhas[p]!
      malha.setMatrixAt(indice, auxiliar.multiplyMatrices(matriz, this.partes[p]!.matriz))
      this.marcar(malha)
    }
  }

  private marcar(malha: InstancedMesh) {
    malha.instanceMatrix.needsUpdate = true
    // O three recalcula sozinho na próxima consulta (desenho ou toque).
    malha.boundingSphere = null
    malha.boundingBox = null
  }

  private alocar(minimo: number) {
    this.soltar()
    let capacidade = 16
    while (capacidade < minimo) capacidade *= 2
    this.capacidade = capacidade
    for (const parte of this.partes) {
      const malha = new InstancedMesh(parte.geometria, parte.material, capacidade)
      malha.castShadow = true
      malha.receiveShadow = true
      malha.userData.lote = this
      malha.count = 0
      this.pai.add(malha)
      this.malhas.push(malha)
    }
  }

  private soltar() {
    for (const malha of this.malhas) {
      this.pai.remove(malha)
      // Geometria e material são do modelo: quem os descarta é ele.
      malha.dispose()
    }
    this.malhas.length = 0
    this.capacidade = 0
  }

  descartar(): void {
    this.soltar()
    this.ids = []
  }
}

/** A caixa translúcida que marca o lugar de um modelo que ainda está chegando. */
export function criarPartesDoFantasma(): { partes: ParteDoModelo[]; descartar(): void } {
  const geometria = new BoxGeometry(1, 1, 1)
  geometria.translate(0, 0.5, 0)
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  return {
    partes: [{ geometria, material, matriz: new Matrix4() }],
    descartar() {
      geometria.dispose()
      material.dispose()
    },
  }
}

const centro = new Vector3()
const tamanho = new Vector3()
const caixaNoLugar = new Matrix4()

/** Os contornos dos objetos escolhidos: a caixa de cada um, por cima de tudo. */
export class Contornos {
  private readonly geometria: BufferGeometry
  private readonly material: LineBasicMaterial
  private readonly linhas: LineSegments[] = []
  private usados = 0

  constructor(
    private readonly pai: Object3D,
    cor: number,
  ) {
    const caixa = new BoxGeometry(1, 1, 1)
    this.geometria = new EdgesGeometry(caixa)
    caixa.dispose()
    this.material = new LineBasicMaterial({ color: cor, depthTest: false, transparent: true })
  }

  comecar(): void {
    this.usados = 0
  }

  /** Desenha a caixa `caixa` (no espaço do modelo) levada ao mundo por `matriz`. */
  por(matriz: Matrix4, caixa: Box3): void {
    let linha = this.linhas[this.usados]
    if (!linha) {
      linha = new LineSegments(this.geometria, this.material)
      linha.matrixAutoUpdate = false
      linha.renderOrder = 999
      linha.frustumCulled = false
      this.pai.add(linha)
      this.linhas.push(linha)
    }
    caixa.getCenter(centro)
    caixa.getSize(tamanho)
    caixaNoLugar.makeScale(tamanho.x, tamanho.y, tamanho.z).setPosition(centro)
    linha.matrix.multiplyMatrices(matriz, caixaNoLugar)
    linha.matrixWorldNeedsUpdate = true
    linha.visible = true
    this.usados++
  }

  terminar(): void {
    for (let i = this.usados; i < this.linhas.length; i++) this.linhas[i]!.visible = false
  }

  definirVisivel(visivel: boolean): void {
    for (let i = 0; i < this.usados; i++) this.linhas[i]!.visible = visivel
  }

  descartar(): void {
    for (const linha of this.linhas) this.pai.remove(linha)
    this.linhas.length = 0
    this.geometria.dispose()
    this.material.dispose()
  }
}
