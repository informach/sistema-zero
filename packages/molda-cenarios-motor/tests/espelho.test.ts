import { expect, test } from 'bun:test'
import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Uint16BufferAttribute,
  Vector3,
} from 'three'
import { transformarGeometriaEstatica } from '../src/geometria-instanciada'
import type { ModeloCarregado } from '../src/modelos'
import { RepresentacoesDoModelo } from '../src/representacoes'

test('reflexão indexada conserva a frente das faces, normais e tangente sem tocar na origem', () => {
  const g = new BoxGeometry(2, 2, 2)
  g.computeTangents()
  const indice = Array.from(g.index!.array),
    posicoes = Array.from(g.getAttribute('position').array)
  const refletida = transformarGeometriaEstatica(g, new Matrix4().makeScale(-1, 1, 1))
  const m = new MeshStandardMaterial(),
    mesh = new Mesh(refletida, m)
  mesh.updateMatrixWorld(true)
  const hit = new Raycaster(new Vector3(0.4, 4, 0.3), new Vector3(0, -1, 0)).intersectObject(
    mesh,
  )[0]
  expect(hit?.point.y).toBeCloseTo(1)
  expect(hit?.face?.normal.y).toBeCloseTo(1)
  expect(refletida.getAttribute('tangent').getW(0)).toBe(-g.getAttribute('tangent').getW(0))
  expect(Array.from(g.index!.array)).toEqual(indice)
  expect(Array.from(g.getAttribute('position').array)).toEqual(posicoes)
  refletida.dispose()
  g.dispose()
  m.dispose()
})

test('reflexão sem índice mantém UVs intercaladas e acessores compartilhados correspondentes', () => {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  const buffer = new InterleavedBuffer(new Float32Array([0, 0, 1, 0, 0, 1]), 2)
  const uv = new InterleavedBufferAttribute(buffer, 2, 0)
  g.setAttribute('uv', uv)
  g.setAttribute('uv1', uv)
  const refletida = transformarGeometriaEstatica(g, new Matrix4().makeScale(-1, 1, 1))
  for (const nome of ['uv', 'uv1'])
    expect(Array.from(refletida.getAttribute(nome).array)).toEqual([0, 0, 0, 1, 1, 0])
  expect(Array.from(buffer.array)).toEqual([0, 0, 1, 0, 0, 1])
  expect(Array.from(refletida.getAttribute('position').array)).toEqual([0, 0, 0, 0, 1, 0, -1, 0, 0])
  refletida.dispose()
  g.dispose()
})

test('posição quantizada é materializada em float antes de receber translação e reflexão', () => {
  const g = new BufferGeometry()
  g.setAttribute(
    'position',
    new Uint16BufferAttribute([0, 0, 0, 65535, 0, 0, 0, 65535, 0], 3, true),
  )
  const r = transformarGeometriaEstatica(
    g,
    new Matrix4().makeTranslation(10, 2, 0).multiply(new Matrix4().makeScale(-1, 1, 1)),
  )
  expect(r.getAttribute('position').array).toBeInstanceOf(Float32Array)
  expect(r.boundingBox!.min.x).toBe(9)
  expect(r.boundingBox!.max.x).toBe(10)
  expect(r.boundingBox!.max.y).toBe(3)
  expect(g.getAttribute('position').getX(1)).toBe(1)
  g.dispose()
  r.dispose()
})

test('variantes compartilham somente materiais, mantêm o pivô e descartam recursos ao sair de uso', () => {
  const g = new BoxGeometry(2, 3, 4).translate(3, 1, -2),
    material = new MeshStandardMaterial(),
    pai = new Group()
  g.computeBoundingBox()
  const caixa = g.boundingBox!.clone()
  const modelo: ModeloCarregado = {
    partes: [{ geometria: g, material, matriz: new Matrix4() }],
    caixa,
    triangulos: 12,
    raiz: new Group(),
    descartar() {
      g.dispose()
      material.dispose()
    },
  }
  let descarteDaOrigem = 0,
    descarteDoMaterial = 0
  g.addEventListener('dispose', () => descarteDaOrigem++)
  material.addEventListener('dispose', () => descarteDoMaterial++)
  const variantes = new RepresentacoesDoModelo(pai, modelo)
  const v = variantes.obter({ x: true, y: false, z: false })
  expect(variantes.obter({ x: true, y: false, z: false })).toBe(v)
  v.preencher([{ id: 'o', matriz: new Matrix4().makeTranslation(2, 3, 4) }])
  const refletida = v.malhas[0]!.geometry
  expect(refletida.boundingBox).toEqual(caixa)
  expect(v.malhas[0]!.material).toBe(material)
  let descartes = 0
  refletida.addEventListener('dispose', () => descartes++)
  variantes.manter(new Set([v]))
  expect(descartes).toBe(0)
  variantes.manter(new Set())
  expect(pai.children).toHaveLength(0)
  expect(descartes).toBe(1)
  expect(descarteDaOrigem).toBe(0)
  expect(descarteDoMaterial).toBe(0)
  variantes.descartar()
  variantes.descartar()
  expect(descartes).toBe(1)
  modelo.descartar()
  expect(descarteDaOrigem).toBe(1)
  expect(descarteDoMaterial).toBe(1)
})

test('espelho de nós refletidos do GLB continua com matrizes de instância positivas', () => {
  const g = new BoxGeometry(1, 2, 3),
    material = new MeshStandardMaterial(),
    pai = new Group()
  const modelo: ModeloCarregado = {
    partes: [{ geometria: g, material, matriz: new Matrix4().makeTranslation(4, 0, 0) }],
    caixa: new Box3(new Vector3(3.5, -1, -1.5), new Vector3(4.5, 1, 1.5)),
    raiz: new Group(),
    triangulos: 12,
    descartar() {
      g.dispose()
      material.dispose()
    },
  }
  const variantes = new RepresentacoesDoModelo(pai, modelo),
    v = variantes.obter({ x: true, y: true, z: true })
  v.preencher([{ id: 'o', matriz: new Matrix4().makeScale(2, 3, 4) }])
  const matriz = new Matrix4()
  v.malhas[0]!.getMatrixAt(0, matriz)
  expect(matriz.determinant()).toBeGreaterThan(0)
  expect(v.malhas[0]!.geometry.boundingBox).toEqual(modelo.caixa)
  variantes.descartar()
  modelo.descartar()
})
