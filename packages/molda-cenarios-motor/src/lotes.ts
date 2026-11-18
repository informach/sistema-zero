import {
  Box3,
  BoxGeometry,
  type BufferGeometry,
  Color,
  DynamicDrawUsage,
  EdgesGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshStandardMaterial,
  type Object3D,
  Sphere,
  Vector3,
} from 'three'
import { IndiceDeCaixas } from './indice-de-caixas'
import type { ParteDoModelo } from './modelos'

export interface ItemDoLote {
  id: string
  matriz: Matrix4
  cor?: string
}

const auxiliar = new Matrix4()
const corAuxiliar = new Color()
const caixaAuxiliar = new Box3(),
  matrizDoBuffer = new Matrix4()

/**
 * Todas as cópias de um modelo no cenário, desenhadas de uma vez (uma malha instanciada por
 * parte do modelo). É o que deixa o palco leve com milhares de objetos.
 */
export class LoteDoModelo {
  readonly malhas: InstancedMesh[] = []
  ids: string[] = []
  private capacidade = 0
  private indices: IndiceDeCaixas[] = []

  constructor(
    private readonly pai: Object3D,
    private readonly partes: readonly ParteDoModelo[],
  ) {}

  /** Leitura para materialização/exportação; geometria e material continuam no seu dono. */
  fontes(): readonly ParteDoModelo[] {
    return this.partes
  }

  preencher(itens: readonly ItemDoLote[]): void {
    if (itens.length > this.capacidade) this.alocar(itens.length)
    this.ids = itens.map((i) => i.id)
    const temTonalidade = itens.some((i) => i.cor && i.cor.toLowerCase() !== '#ffffff')
    for (let p = 0; p < this.malhas.length; p++) {
      const malha = this.malhas[p]!,
        parte = this.partes[p]!
      const indice = this.indices[p]!,
        novaQuantidade = indice.quantidade !== itens.length,
        caixas: Box3[] = []
      const colorir = Boolean(malha.instanceColor) || temTonalidade
      let inicioM = -1,
        inicioC = -1,
        mudouM = false,
        mudouC = false
      for (let i = 0; i < itens.length; i++) {
        auxiliar.multiplyMatrices(itens[i]!.matriz, parte.matriz)
        const mudou = auxiliar.elements.some(
          (v, n) => Math.fround(v) !== malha.instanceMatrix.array[i * 16 + n],
        )
        if (mudou) {
          malha.setMatrixAt(i, auxiliar)
          mudouM = true
          if (inicioM === -1) inicioM = i
        } else if (inicioM !== -1) {
          malha.instanceMatrix.addUpdateRange(inicioM * 16, (i - inicioM) * 16)
          inicioM = -1
        }
        if (mudou || novaQuantidade) {
          malha.getMatrixAt(i, matrizDoBuffer)
          caixaAuxiliar.copy(parte.geometria.boundingBox!).applyMatrix4(matrizDoBuffer)
          if (novaQuantidade) caixas.push(caixaAuxiliar.clone())
          else indice.atualizar(i, caixaAuxiliar)
        }
        if (colorir) {
          corAuxiliar.set(itens[i]!.cor ?? '#ffffff')
          const cor = malha.instanceColor
          const mudou =
            !cor ||
            Math.fround(corAuxiliar.r) !== cor.array[i * 3] ||
            Math.fround(corAuxiliar.g) !== cor.array[i * 3 + 1] ||
            Math.fround(corAuxiliar.b) !== cor.array[i * 3 + 2]
          if (mudou) {
            malha.setColorAt(i, corAuxiliar)
            if (!cor) {
              const nova = malha.instanceColor!
              nova.setUsage(DynamicDrawUsage)
              nova.onUpload(() => nova.clearUpdateRanges())
            }
            mudouC = true
            if (inicioC === -1) inicioC = i
          } else if (inicioC !== -1) {
            malha.instanceColor!.addUpdateRange(inicioC * 3, (i - inicioC) * 3)
            inicioC = -1
          }
        }
      }
      if (inicioM !== -1)
        malha.instanceMatrix.addUpdateRange(inicioM * 16, (itens.length - inicioM) * 16)
      if (inicioC !== -1)
        malha.instanceColor!.addUpdateRange(inicioC * 3, (itens.length - inicioC) * 3)
      if (mudouM) malha.instanceMatrix.needsUpdate = true
      if (mudouC) malha.instanceColor!.needsUpdate = true
      if (novaQuantidade) indice.definir(caixas)
      malha.count = itens.length
      malha.visible = itens.length > 0
      this.limites(malha, indice)
    }
  }

  atualizar(indice: number, matriz: Matrix4): void {
    if (indice < 0 || indice >= this.ids.length) throw new RangeError('Instância fora do lote')
    for (let p = 0; p < this.malhas.length; p++) {
      const malha = this.malhas[p]!
      auxiliar.multiplyMatrices(matriz, this.partes[p]!.matriz)
      if (
        !auxiliar.elements.some(
          (v, n) => Math.fround(v) !== malha.instanceMatrix.array[indice * 16 + n],
        )
      )
        continue
      malha.setMatrixAt(indice, auxiliar)
      malha.instanceMatrix.addUpdateRange(indice * 16, 16)
      malha.instanceMatrix.needsUpdate = true
      malha.getMatrixAt(indice, matrizDoBuffer)
      caixaAuxiliar.copy(this.partes[p]!.geometria.boundingBox!).applyMatrix4(matrizDoBuffer)
      this.indices[p]!.atualizar(indice, caixaAuxiliar)
      this.limites(malha, this.indices[p]!)
    }
  }

  matrizDaParte(indice: number): Matrix4 {
    return this.partes[indice]!.matriz
  }

  private limites(malha: InstancedMesh, indice: IndiceDeCaixas) {
    malha.boundingBox ??= new Box3()
    malha.boundingSphere ??= new Sphere()
    indice.limites(malha.boundingBox).getBoundingSphere(malha.boundingSphere)
    // Arredondamento de sqrt pode excluir o próprio canto da caixa em distâncias grandes.
    if (malha.boundingSphere.radius > 0) malha.boundingSphere.radius *= 1 + 4 * Number.EPSILON
  }

  private alocar(minimo: number) {
    this.soltar()
    let capacidade = 16
    while (capacidade < minimo) capacidade *= 2
    this.capacidade = capacidade
    for (const parte of this.partes) {
      if (!parte.geometria.boundingBox) parte.geometria.computeBoundingBox()
      const malha = new InstancedMesh(parte.geometria, parte.material, capacidade)
      malha.instanceMatrix.setUsage(DynamicDrawUsage)
      malha.instanceMatrix.onUpload(() => malha.instanceMatrix.clearUpdateRanges())
      malha.castShadow = true
      malha.receiveShadow = true
      malha.userData.lote = this
      malha.count = 0
      this.pai.add(malha)
      this.malhas.push(malha)
      this.indices.push(new IndiceDeCaixas())
    }
  }

  private soltar() {
    for (const malha of this.malhas) {
      this.pai.remove(malha)
      // Geometria e material são do modelo: quem os descarta é ele.
      malha.dispose()
    }
    this.malhas.length = 0
    this.indices = []
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
