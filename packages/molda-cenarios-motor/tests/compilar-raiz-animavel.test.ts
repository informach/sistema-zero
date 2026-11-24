import { expect, test } from 'bun:test'
import {
  AnimationClip,
  AnimationMixer,
  type SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { normalizarRaizAnimavel } from '../src/compilar/raiz-animavel'
import { modeloAnimavelDeEnsaio } from './fixtures/modelo-animavel'

test('transformação interna de pele sem representação fiel em glTF não é achatada silenciosamente', () => {
  for (const escala of [new Vector3(2, 1, 0.5), new Vector3(-1, 1, 1)]) {
    const o = modeloAnimavelDeEnsaio(3)
    o.raiz.scale.copy(escala)
    try {
      expect(() => {
        const r = normalizarRaizAnimavel(o.raiz, [o.clip])
        r.descartar()
      }).toThrow(/pele.*uniforme|reflexo interno/)
    } finally {
      o.malha.skeleton.dispose()
      o.g.dispose()
      o.material.dispose()
    }
  }
})

test('escala animada de ancestral da pele precisa continuar uniforme', () => {
  const o = modeloAnimavelDeEnsaio(3),
    clip = new AnimationClip('Escala', 1, [
      new VectorKeyframeTrack(`${o.raiz.uuid}.scale`, [0, 1], [1, 1, 1, 2, 1, 1]),
    ])
  try {
    expect(() => {
      const r = normalizarRaizAnimavel(o.raiz, [clip])
      r.descartar()
    }).toThrow(/escala animada.*uniforme/)
  } finally {
    o.malha.skeleton.dispose()
    o.g.dispose()
    o.material.dispose()
  }
})

test('raiz dividida anima corpo, ossos e morphs como o original, inclusive no segundo pedaço', () => {
  const original = modeloAnimavelDeEnsaio(),
    antes = original.g.getAttribute('position').array.slice(),
    nomes = original.clip.tracks.map((t) => t.name),
    r = normalizarRaizAnimavel(original.raiz, [original.clip]),
    a = new AnimationMixer(original.raiz),
    b = new AnimationMixer(r.raiz),
    partes: SkinnedMesh[] = []
  r.raiz.traverse((n) => {
    if ((n as SkinnedMesh).isSkinnedMesh) partes.push(n as SkinnedMesh)
  })
  try {
    expect(partes).toHaveLength(2)
    expect(partes[0]!.skeleton).toBe(partes[1]!.skeleton)
    expect(partes[0]!.skeleton).not.toBe(original.malha.skeleton)
    expect(r.animacoes[0]!.tracks).toHaveLength(4)
    expect(original.clip.tracks.map((t) => t.name)).toEqual(nomes)
    a.clipAction(original.clip).play()
    b.clipAction(r.animacoes[0]!).play()
    a.update(0.5)
    b.update(0.5)
    original.raiz.updateMatrixWorld(true)
    r.raiz.updateMatrixWorld(true)
    let erro = 0
    for (const parte of partes)
      for (const i of [0, 1, parte.geometry.getAttribute('position').count - 1]) {
        const origem = parte.geometry.getAttribute('indiceOriginal').getX(i),
          esperado = original.malha
            .getVertexPosition(origem, new Vector3())
            .applyMatrix4(original.malha.matrixWorld),
          obtido = parte.getVertexPosition(i, new Vector3()).applyMatrix4(parte.matrixWorld)
        erro = Math.max(erro, esperado.distanceTo(obtido))
      }
    expect(erro).toBeLessThan(0.00001)
    expect(original.g.getAttribute('position').array).toEqual(antes)
    expect(original.raiz.getObjectByName('Corpo')).toBe(original.malha)
  } finally {
    a.stopAllAction()
    a.uncacheRoot(original.raiz)
    b.stopAllAction()
    b.uncacheRoot(r.raiz)
    r.descartar()
    r.descartar()
    original.malha.skeleton.dispose()
    original.g.dispose()
    original.material.dispose()
  }
})
