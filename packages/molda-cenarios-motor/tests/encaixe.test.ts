import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  destransformarPonto,
  EncaixeDeComposicaoSchema,
  transformarPonto,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Raycaster,
  Vector3,
} from 'three'
import { geometriaDaGrade } from '../src/grade'
import { SuperficiesDosObjetos } from '../src/superficies'

test('transformação pura e inversa correspondem à matriz Three com inclinação e escala por eixo', () => {
  const t = {
      posicao: { x: 12, y: -5, z: 23 },
      rotacao: { x: 0.6, y: 1.2, z: -0.8 },
      escala: { x: 1.5, y: 3, z: 0.7 },
    },
    ponto = { x: 1.3, y: -2, z: 0.2 }
  const matriz = new Matrix4().compose(
    new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
    new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z, 'XYZ')),
    new Vector3(t.escala.x, t.escala.y, t.escala.z),
  )
  const esperado = new Vector3(ponto.x, ponto.y, ponto.z).applyMatrix4(matriz),
    atual = transformarPonto(ponto, t)
  expect(new Vector3(atual.x, atual.y, atual.z).distanceTo(esperado)).toBeLessThan(1e-10)
  const volta = destransformarPonto(atual, t)
  for (const e of ['x', 'y', 'z'] as const) expect(volta[e]).toBeCloseTo(ponto[e], 10)
})

test('superfície consulta a rampa real, respeita exclusões e não muda a geometria de renderização', () => {
  const g = new BufferGeometry().setAttribute(
    'position',
    new Float32BufferAttribute([-2, 0, -2, -2, 0, 2, 2, 2, 2, -2, 0, -2, 2, 2, 2, 2, 2, -2], 3),
  )
  g.computeVertexNormals()
  const m = new MeshStandardMaterial(),
    matriz = new Matrix4().makeTranslation(4, 3, 6)
  const mesh = new Mesh(g, m)
  mesh.matrixAutoUpdate = false
  mesh.matrixWorld.copy(matriz)
  const raio = new Raycaster(new Vector3(4, 20, 6), new Vector3(0, -1, 0))
  const esperado = raio.intersectObject(mesh)[0]!
  const consulta = new SuperficiesDosObjetos(),
    antes = Array.from(g.getAttribute('position').array)
  consulta.definir([{ id: 'ponte', geometria: g, material: m, matriz }])
  const acertado = consulta.acertar(raio)
  expect(acertado?.id).toBe('ponte')
  expect(acertado!.ponto.distanceTo(esperado.point)).toBeLessThan(1e-10)
  expect(acertado!.ponto.y).toBeCloseTo(4)
  expect(consulta.acertar(raio, new Set(['ponte']))).toBeNull()
  expect('boundsTree' in g).toBe(false)
  consulta.definir([])
  expect(consulta.acertar(raio)).toBeNull()
  consulta.descartar()
  consulta.descartar()
  expect(Array.from(g.getAttribute('position').array)).toEqual(antes)
  g.dispose()
  m.dispose()
})

test('grade visível acompanha origem, andar e relevo, com orçamento limitado em territórios grandes', () => {
  const doc = criarDocumentoVazio('d', 'Grade')
  doc.base = { tipo: 'plano', largura: 8, comprimento: 8 }
  const config = EncaixeDeComposicaoSchema.parse({
    grade: 1,
    angulo: 90,
    origem: { x: 0.25, y: 0.5, z: -0.25 },
    andar: { altura: 3, nivel: 2 },
  })
  const g = geometriaDaGrade(doc, config),
    p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) expect(p.getY(i)).toBeCloseTo(6.515, 5)
  expect(p.getX(0)).toBe(-3.75)
  g.dispose()
  doc.base = {
    tipo: 'terreno',
    origem: { x: -4096, z: -4096 },
    passo: 2,
    colunas: 4096,
    linhas: 4096,
    min: -1000,
    max: 1000,
    fundo: 0,
    pecas: [],
  }
  const semFonte = geometriaDaGrade(doc, config)
  expect(semFonte.getAttribute('position')).toBeUndefined()
  semFonte.dispose()
  const terreno = geometriaDaGrade(
    doc,
    { ...config, andar: null, grade: 0.05 },
    (x, z) => x / 100 + z / 200,
  )
  const v = terreno.getAttribute('position')
  expect(v.count).toBeLessThanOrEqual(2 * 129 * 64 * 2)
  for (let i = 0; i < v.count; i += 133)
    expect(v.getY(i)).toBeCloseTo(v.getX(i) / 100 + v.getZ(i) / 200 + 0.015, 4)
  terreno.dispose()
})
