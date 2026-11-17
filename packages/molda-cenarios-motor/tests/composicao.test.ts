import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  executarLote,
  repetirObjetos,
  sortearTransformacoes,
} from '@sistemazero/molda-cenarios-core/v2'
import { Euler, Matrix4, Vector3 } from 'three'

function exemplo(rotacao = { x: 0.6, y: 0.2, z: -0.4 }) {
  const doc = criarDocumentoVazio('composicao', 'Composição')
  doc.modelos = [{ id: 'm', biblioteca: 'b', modelo: 'm', digest: 'a'.repeat(64) }]
  doc.instancias = [
    {
      id: 'o',
      nome: 'Peça inclinada',
      modelo: 'm',
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: { posicao: { x: 2, y: 3, z: 1 }, rotacao, escala: { x: 1, y: 2, z: 1 } },
    },
  ]
  return doc
}
const matriz = (r: { x: number; y: number; z: number }) =>
  new Matrix4().makeRotationFromEuler(new Euler(r.x, r.y, r.z, 'XYZ'))

test('repetição circular gira uma peça inclinada em torno da vertical do mundo, inclusive no limite Euler', () => {
  for (const r of [
    { x: 0.6, y: 0.2, z: -0.4 },
    { x: Math.PI / 2, y: 0.3, z: 0.7 },
    { x: 0, y: Math.PI / 2, z: 0 },
  ]) {
    const doc = exemplo(r),
      angulo = Math.PI / 2
    const comandos = repetirObjetos(
      doc,
      ['o'],
      { tipo: 'circulo', copias: 1, centro: { x: 0, z: 0 }, arco: angulo, girar: true },
      ['copia'],
    )
    const depois = executarLote(
      { documento: doc, revisao: 0 },
      { revisaoEsperada: 0, comandos },
    ).documento
    const copia = depois.instancias[1]!
    const esperada = new Matrix4().makeRotationY(angulo).multiply(matriz(r))
    const atual = matriz(copia.transformacao.rotacao)
    for (let i = 0; i < 16; i++)
      expect(Math.abs(atual.elements[i]! - esperada.elements[i]!)).toBeLessThan(1e-7)
    expect(copia.transformacao.posicao.x).toBeCloseTo(1)
    expect(copia.transformacao.posicao.z).toBeCloseTo(-2)
    expect(copia.transformacao.posicao.y).toBe(3)
    expect(doc.instancias).toHaveLength(1)
  }
})

test('variação de giro preserva a inclinação em relação à vertical, não a recompõe em eixos locais', () => {
  const doc = exemplo()
  const comandos = sortearTransformacoes(doc, ['o'], 1234, {
    giro: 1,
    tamanhoMin: 1,
    tamanhoMax: 1,
  })
  const depois = executarLote(
    { documento: doc, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  ).documento
  const antes = new Vector3().setFromMatrixColumn(
    matriz(doc.instancias[0]!.transformacao.rotacao),
    1,
  )
  const apos = new Vector3().setFromMatrixColumn(
    matriz(depois.instancias[0]!.transformacao.rotacao),
    1,
  )
  expect(apos.y).toBeCloseTo(antes.y, 10)
  expect(apos.distanceTo(antes)).toBeGreaterThan(0.01)
})
