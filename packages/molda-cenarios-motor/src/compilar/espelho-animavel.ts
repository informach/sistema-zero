import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  type Box3,
  type BufferGeometry,
  type KeyframeTrack,
  Matrix4,
  type Object3D,
  Skeleton,
  type SkinnedMesh,
  Vector3,
} from 'three'
import { matrizDoEspelho } from '../representacoes'

/** Muda a base de coordenadas de toda a animação. Não deixa escala negativa
 * nos nós das peles, nem transforma a pose inicial em vértices estáticos. */
export class EspelhoAnimavel {
  readonly sinais: Vector3
  readonly base: Matrix4
  readonly matriz: Matrix4
  readonly deslocamento: Vector3
  readonly determinante: number
  constructor(caixa: Box3, espelho: InstanciaDeCenario['espelho']) {
    this.sinais = new Vector3(espelho?.x ? -1 : 1, espelho?.y ? -1 : 1, espelho?.z ? -1 : 1)
    this.base = new Matrix4().makeScale(this.sinais.x, this.sinais.y, this.sinais.z)
    this.matriz = matrizDoEspelho(caixa, espelho)
    this.deslocamento = new Vector3().setFromMatrixPosition(this.matriz)
    this.determinante = this.sinais.x * this.sinais.y * this.sinais.z
  }
  no(no: Object3D) {
    if (!no.matrixAutoUpdate) {
      no.matrix.premultiply(this.base).multiply(this.base)
      no.matrix.decompose(no.position, no.quaternion, no.scale)
    } else {
      no.position.multiply(this.sinais)
      no.quaternion.set(
        no.quaternion.x * this.determinante * this.sinais.x,
        no.quaternion.y * this.determinante * this.sinais.y,
        no.quaternion.z * this.determinante * this.sinais.z,
        no.quaternion.w,
      )
      no.updateMatrix()
    }
  }
  geometria(g: BufferGeometry) {
    for (const nome of ['position', 'normal', 'tangent']) {
      const principal = g.getAttribute(nome),
        atributos = [
          ...(principal ? [principal] : []),
          ...(Object.entries(g.morphAttributes).find(([canal]) => canal === nome)?.[1] ?? []),
        ]
      for (const a of atributos) {
        if (!a) continue
        for (let i = 0; i < a.count; i++) {
          a.setXYZ(
            i,
            a.getX(i) * this.sinais.x,
            a.getY(i) * this.sinais.y,
            a.getZ(i) * this.sinais.z,
          )
          if (a.itemSize === 4 && nome === 'tangent') a.setW(i, a.getW(i) * this.determinante)
        }
      }
    }
    if (this.determinante < 0) {
      const indice = g.index
      if (!indice) throw Error('A divisão precisa gerar índices antes do reflexo animável.')
      for (let i = 0; i < indice.count; i += 3) {
        const b = indice.getX(i + 1)
        indice.setX(i + 1, indice.getX(i + 2))
        indice.setX(i + 2, b)
      }
    }
    g.computeBoundingBox()
    g.computeBoundingSphere()
  }
  esqueleto(malha: SkinnedMesh) {
    if (malha.bindMode !== 'attached')
      throw Error('A pele precisa usar o bind glTF anexado antes do reflexo.')
    return new Skeleton(
      malha.skeleton.bones,
      malha.skeleton.boneInverses.map((m) =>
        m.clone().multiply(malha.bindMatrix).premultiply(this.base).multiply(this.base),
      ),
    )
  }
  canal(track: KeyframeTrack, propriedade: string) {
    if (propriedade !== 'position' && propriedade !== 'quaternion') return
    const tamanho = propriedade === 'position' ? 3 : 4,
      fator = tamanho === 4 ? this.determinante : 1,
      fatores = [this.sinais.x * fator, this.sinais.y * fator, this.sinais.z * fator]
    for (let i = 0; i < track.values.length; i += tamanho)
      for (let j = 0; j < 3; j++) track.values[i + j]! *= fatores[j]!
  }
}
