import { expect, test } from 'bun:test'
import {
  AnimationMixer,
  Box3,
  DataTexture,
  Matrix4,
  type MeshStandardMaterial,
  RGBAFormat,
  type SkinnedMesh,
  Uint8BufferAttribute,
  Vector3,
} from 'three'
import { projetarTexturaAnimavel } from '../src/compilar/projecao-animavel'
import { normalizarRaizAnimavel } from '../src/compilar/raiz-animavel'
import { geometriaDaPoseInicial } from '../src/modelo-estatico'
import { geometriaParaTextura, materializarUvDaTextura } from '../src/projecao-textura'
import { matrizDoEspelho } from '../src/representacoes'
import { modeloAnimavelDeEnsaio } from './fixtures/modelo-animavel'

test('UV do ator usa a mesma projeção métrica do palco sem assar pele ou morph', () => {
  const o = modeloAnimavelDeEnsaio(9),
    caixa = new Box3().setFromObject(o.raiz),
    espelho = { x: true, y: false, z: false },
    reflexo = matrizDoEspelho(caixa, espelho),
    escala = new Vector3(2, 1, 3),
    metros = 0.7,
    textura = new DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1, RGBAFormat),
    pose = geometriaDaPoseInicial(o.malha),
    referencia = geometriaParaTextura(
      pose,
      new Matrix4().multiplyMatrices(reflexo, o.malha.matrixWorld),
    ),
    r = normalizarRaizAnimavel(o.raiz, [o.clip], {
      caixa,
      espelho,
      textura: { mapa: textura, repeticaoMetros: metros, escala },
    }),
    a = new AnimationMixer(o.raiz),
    b = new AnimationMixer(r.raiz),
    partes: SkinnedMesh[] = []
  materializarUvDaTextura(referencia, escala, metros)
  r.raiz.traverse((n) => {
    if ((n as SkinnedMesh).isSkinnedMesh) partes.push(n as SkinnedMesh)
  })
  try {
    expect(partes).toHaveLength(1)
    const g = partes[0]!.geometry,
      ids = g.getAttribute('indiceOriginal'),
      refs = referencia.getAttribute('indiceOriginal'),
      uv = g.getAttribute('uv'),
      esperado = referencia.getAttribute('uv')
    let erroUv = 0,
      erroPose = 0
    for (let i = 0; i < ids.count; i++) {
      const id = ids.getX(i),
        j = Array.from({ length: refs.count }, (_, n) => n).find((j) => refs.getX(j) === id)!
      erroUv = Math.max(
        erroUv,
        Math.abs(uv.getX(i) - esperado.getX(j)),
        Math.abs(uv.getY(i) - esperado.getY(j)),
      )
    }
    expect(erroUv).toBeLessThan(1e-6)
    expect(g.getAttribute('skinIndex')).toBeDefined()
    expect(g.morphAttributes.position).toHaveLength(1)
    expect((partes[0]!.material as MeshStandardMaterial).map).toBe(textura)
    a.clipAction(o.clip).play()
    b.clipAction(r.animacoes[0]!).play()
    a.setTime(0.5)
    b.setTime(0.5)
    o.raiz.updateMatrixWorld(true)
    r.raiz.updateMatrixWorld(true)
    for (let i = 0; i < ids.count; i++) {
      const p = o.malha
          .getVertexPosition(ids.getX(i), new Vector3())
          .applyMatrix4(o.malha.matrixWorld)
          .applyMatrix4(reflexo),
        q = partes[0]!.getVertexPosition(i, new Vector3()).applyMatrix4(partes[0]!.matrixWorld)
      erroPose = Math.max(erroPose, p.distanceTo(q))
    }
    expect(erroPose).toBeLessThan(1e-5)
    expect(o.g.getAttribute('uv')).toBeUndefined()
  } finally {
    a.stopAllAction()
    a.uncacheRoot(o.raiz)
    b.stopAllAction()
    b.uncacheRoot(r.raiz)
    r.descartar()
    pose.dispose()
    referencia.dispose()
    textura.dispose()
    o.g.dispose()
    o.material.dispose()
    o.malha.skeleton.dispose()
  }
})

test('face colapsada pela pose continua exportada para poder voltar a abrir', () => {
  const o = modeloAnimavelDeEnsaio(3)
  o.g.setIndex([0, 1, 2])
  const morph = o.g.morphAttributes.position![0]!,
    p = o.g.getAttribute('position')
  for (let i = 0; i < p.count; i++) morph.setXYZ(i, -p.getX(i), 0, 0)
  o.malha.morphTargetInfluences![0] = 1
  const r = projetarTexturaAnimavel(o.malha, new Matrix4(), new Vector3(1, 1, 1), 1)
  try {
    expect(r.getAttribute('position').count).toBe(3)
    expect(r.getAttribute('position').array).toEqual(p.array)
    expect(r.morphAttributes.position![0]!.array).toEqual(morph.array)
    expect(Array.from(r.getAttribute('uv').array).every(Number.isFinite)).toBe(true)
    expect(o.g.index!.count).toBe(3)
  } finally {
    r.dispose()
    o.g.dispose()
    o.material.dispose()
    o.malha.skeleton.dispose()
  }
})

test('projeção recusa expansão excessiva antes de desindexar', () => {
  const o = modeloAnimavelDeEnsaio(3)
  o.g.setIndex(new Uint8BufferAttribute(new Uint8Array(9_000_000), 1))
  try {
    expect(() => projetarTexturaAnimavel(o.malha, new Matrix4(), new Vector3(1, 1, 1), 1)).toThrow(
      /orçamento/,
    )
  } finally {
    o.g.dispose()
    o.material.dispose()
    o.malha.skeleton.dispose()
  }
})
