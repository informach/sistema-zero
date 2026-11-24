import { expect, test } from 'bun:test'
import {
  Bone,
  BoxGeometry,
  Float32BufferAttribute,
  Int16BufferAttribute,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
} from 'three'
import { geometriaDaPoseInicial } from '../src/modelo-estatico'

test('morphs da pose inicial são incorporados sem alterar a raiz animável nem seus buffers', () => {
  const original = new BoxGeometry(2, 2, 2)
  const delta = new Float32Array(original.getAttribute('position').count * 3)
  for (let i = 0; i < delta.length; i += 3) delta[i + 1] = 4
  original.morphAttributes.position = [new Float32BufferAttribute(delta, 3)]
  original.morphTargetsRelative = true
  const malha = new Mesh(original, new MeshStandardMaterial())
  malha.morphTargetInfluences![0] = 0.5
  const posicoes = original.getAttribute('position').array.slice()
  const g = geometriaDaPoseInicial(malha)
  expect(g).not.toBe(original)
  expect(g.morphAttributes).toEqual({})
  for (const i of [0, 6, 15])
    expect(new Vector3().fromBufferAttribute(g.getAttribute('position'), i)).toEqual(
      malha.getVertexPosition(i, new Vector3()),
    )
  expect(original.getAttribute('position').array).toEqual(posicoes)
  expect(original.morphAttributes.position).toHaveLength(1)
  expect(malha.morphTargetInfluences).toEqual([0.5])
  g.dispose()
  original.dispose()
  malha.material.dispose()
})

test('pele preserva a pose e normais, incluindo translação do osso sem deslocar a normal', () => {
  const original = new BoxGeometry(2, 2, 2),
    material = new MeshStandardMaterial()
  const n = original.getAttribute('position').count
  original.setAttribute(
    'position',
    new Int16BufferAttribute(
      Int16Array.from(original.getAttribute('position').array, (v) => v * 32767),
      3,
      true,
    ),
  )
  original.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(n * 4), 4))
  const pesos = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) pesos[i * 4] = 1
  original.setAttribute('skinWeight', new Float32BufferAttribute(pesos, 4))
  const malha = new SkinnedMesh(original, material),
    osso = new Bone()
  malha.add(osso)
  malha.updateMatrixWorld(true)
  malha.bind(new Skeleton([osso], [new Matrix4()]))
  osso.position.set(4, 3, 2)
  osso.rotation.z = Math.PI / 2
  malha.updateMatrixWorld(true)
  const g = geometriaDaPoseInicial(malha)
  const giro = new Matrix4().makeRotationZ(Math.PI / 2)
  for (const i of [0, 6, 15]) {
    expect(
      new Vector3()
        .fromBufferAttribute(g.getAttribute('position'), i)
        .distanceTo(malha.getVertexPosition(i, new Vector3())),
    ).toBeLessThan(0.00001)
    const normal = new Vector3()
      .fromBufferAttribute(original.getAttribute('normal'), i)
      .transformDirection(giro)
    expect(
      new Vector3().fromBufferAttribute(g.getAttribute('normal'), i).distanceTo(normal),
    ).toBeLessThan(0.00001)
  }
  expect(g.getAttribute('skinWeight')).toBeUndefined()
  expect(original.getAttribute('skinWeight')).toBeDefined()
  g.dispose()
  original.dispose()
  material.dispose()
})

test('malha estática sem deformações mantém o compartilhamento original', () => {
  const g = new BoxGeometry(),
    m = new Mesh(g, new MeshStandardMaterial())
  expect(geometriaDaPoseInicial(m)).toBe(g)
  g.dispose()
  m.material.dispose()
})
