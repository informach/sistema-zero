import { expect, test } from 'bun:test'
import {
  AnimationClip,
  AnimationMixer,
  Box3,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { normalizarRaizAnimavel } from '../src/compilar/raiz-animavel'
import { matrizDoEspelho } from '../src/representacoes'
import { modeloAnimavelDeEnsaio } from './fixtures/modelo-animavel'

for (let flags = 1; flags < 8; flags++)
  test(`reflexo ${flags} conserva os movimentos da pele e morph em torno da caixa real`, () => {
    const original = modeloAnimavelDeEnsaio(9),
      espelho = { x: !!(flags & 1), y: !!(flags & 2), z: !!(flags & 4) }
    original.raiz.position.set(2, 3, -4)
    original.raiz.rotation.y = 0.3
    original.raiz.updateMatrixWorld(true)
    const caixa = new Box3().setFromObject(original.raiz),
      reflexo = matrizDoEspelho(caixa, espelho),
      antes = original.g.getAttribute('position').array.slice(),
      inversas = original.malha.skeleton.boneInverses.map((m) => m.elements.slice()),
      r = normalizarRaizAnimavel(original.raiz, [original.clip], {
        caixa,
        espelho,
        cor: '#ff8060',
      }),
      a = new AnimationMixer(original.raiz),
      b = new AnimationMixer(r.raiz),
      partes: SkinnedMesh[] = []
    r.raiz.traverse((n) => {
      if ((n as SkinnedMesh).isSkinnedMesh) partes.push(n as SkinnedMesh)
    })
    try {
      a.clipAction(original.clip).play()
      b.clipAction(r.animacoes[0]!).play()
      let erro = 0
      for (const tempo of [0, 0.125, 0.5, 0.875]) {
        a.setTime(tempo)
        b.setTime(tempo)
        original.raiz.updateMatrixWorld(true)
        r.raiz.updateMatrixWorld(true)
        for (const parte of partes) {
          expect(parte.parent).toBe(r.raiz)
          expect(parte.matrixWorld.determinant()).toBeGreaterThan(0)
          for (let i = 0; i < parte.geometry.getAttribute('position').count; i++) {
            const origem = parte.geometry.getAttribute('indiceOriginal').getX(i),
              esperado = original.malha
                .getVertexPosition(origem, new Vector3())
                .applyMatrix4(original.malha.matrixWorld)
                .applyMatrix4(reflexo),
              obtido = parte.getVertexPosition(i, new Vector3()).applyMatrix4(parte.matrixWorld)
            erro = Math.max(erro, esperado.distanceTo(obtido))
          }
        }
      }
      expect(erro).toBeLessThan(1e-5)
      expect((partes[0]!.material as MeshStandardMaterial).color.toArray()).toEqual(
        new Color('#ff8060').toArray(),
      )
      expect(original.material.color.getHex()).toBe(0xffffff)
      expect(original.g.getAttribute('position').array).toEqual(antes)
      expect(original.malha.skeleton.boneInverses.flatMap((m) => m.elements)).toEqual(
        inversas.flat(),
      )
    } finally {
      a.stopAllAction()
      a.uncacheRoot(original.raiz)
      b.stopAllAction()
      b.uncacheRoot(r.raiz)
      r.descartar()
      original.g.dispose()
      original.material.dispose()
      original.malha.skeleton.dispose()
    }
  })

test('reflexo de peça rígida animada conserva TRS, winding e normais', () => {
  const g = new BoxGeometry(1, 2, 3),
    material = new MeshStandardMaterial(),
    malha = new Mesh(g, material),
    entrada = new Group()
  malha.name = 'Peca'
  entrada.position.set(4, 1, -2)
  entrada.add(malha)
  entrada.updateMatrixWorld(true)
  const clip = new AnimationClip('Deslocar', 1, [
      new VectorKeyframeTrack(`${malha.uuid}.position`, [0, 1], [0, 0, 0, 2, 3, 1]),
    ]),
    caixa = new Box3().setFromObject(entrada),
    espelho = { x: true, y: false, z: false },
    reflexo = matrizDoEspelho(caixa, espelho),
    r = normalizarRaizAnimavel(entrada, [clip], { caixa, espelho }),
    a = new AnimationMixer(entrada),
    b = new AnimationMixer(r.raiz)
  try {
    a.clipAction(clip).play()
    b.clipAction(r.animacoes[0]!).play()
    a.update(0.5)
    b.update(0.5)
    entrada.updateMatrixWorld(true)
    r.raiz.updateMatrixWorld(true)
    const esperado = new Box3().setFromObject(entrada).applyMatrix4(reflexo),
      obtido = new Box3().setFromObject(r.raiz)
    expect(esperado.min.distanceTo(obtido.min)).toBeLessThan(1e-6)
    expect(esperado.max.distanceTo(obtido.max)).toBeLessThan(1e-6)
    r.raiz.traverse((no) => {
      if (!(no as Mesh).isMesh) return
      const geometry = (no as Mesh).geometry,
        p = geometry.getAttribute('position'),
        n = geometry.getAttribute('normal'),
        indice = geometry.index!
      for (let i = 0; i < indice.count; i += 3) {
        const ia = indice.getX(i),
          ib = indice.getX(i + 1),
          ic = indice.getX(i + 2),
          a = new Vector3().fromBufferAttribute(p, ia),
          face = new Vector3().crossVectors(
            new Vector3().fromBufferAttribute(p, ib).sub(a),
            new Vector3().fromBufferAttribute(p, ic).sub(a),
          )
        expect(face.dot(new Vector3().fromBufferAttribute(n, ia))).toBeGreaterThan(0)
      }
    })
  } finally {
    a.stopAllAction()
    a.uncacheRoot(entrada)
    b.stopAllAction()
    b.uncacheRoot(r.raiz)
    r.descartar()
    g.dispose()
    material.dispose()
  }
})
