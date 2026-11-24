import { expect, test } from 'bun:test'
import {
  BufferAttribute,
  BufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
} from 'three'
import { preencherInstancias } from '../src/mundo/faisca/instancias'

test('peça com morph estático conserva a pose nas instâncias, sem faltar o buffer usado pelo renderer', () => {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
  )
  geo.morphAttributes.position = [
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 2, 0]), 3),
  ]
  const material = new MeshStandardMaterial(),
    original = new Mesh(geo, material)
  original.morphTargetInfluences![0] = 0.4
  const instancias = new InstancedMesh(geo, material, 2)
  preencherInstancias(instancias, original, [new Matrix4(), new Matrix4().makeTranslation(3, 0, 0)])
  expect(instancias.morphTexture).not.toBeNull()
  const copia = new Mesh(geo, material)
  instancias.getMorphAt(1, copia)
  expect(copia.morphTargetInfluences![0]).toBeCloseTo(0.4)
  instancias.dispose()
  geo.dispose()
  material.dispose()
})
