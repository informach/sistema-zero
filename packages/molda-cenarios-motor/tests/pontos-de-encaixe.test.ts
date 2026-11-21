import { expect, test } from 'bun:test'
import { acharEncaixe, pontosNoMundo } from '@sistemazero/molda-cenarios-core/v2'
import { BoxGeometry, type BufferGeometry, Matrix4, SphereGeometry } from 'three'
import { pontosDeEncaixeDaGeometria } from '../src/pontos-de-encaixe'

const perto = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
  expect(a.x).toBeCloseTo(b.x, 5)
  expect(a.y).toBeCloseTo(b.y, 5)
  expect(a.z).toBeCloseTo(b.z, 5)
}
const parte = (geometria: BufferGeometry, matriz = new Matrix4()) => ({ geometria, matriz })
const caixa = (x: number, y: number, z: number, px = 0, py = 0, pz = 0) =>
  parte(new BoxGeometry(x, y, z), new Matrix4().makeTranslation(px, py + y / 2, pz))

test('trecho de caminho comprido: um ponto em cada ponta, na altura do piso', () => {
  const pontos = pontosDeEncaixeDaGeometria([caixa(1.2, 0.1, 4)])
  expect(pontos).toHaveLength(2)
  const frente = pontos.find((p) => p.direcao.z === 1)!,
    tras = pontos.find((p) => p.direcao.z === -1)!
  perto(frente.posicao, { x: 0, y: 0.1, z: 2 })
  perto(tras.posicao, { x: 0, y: 0.1, z: -2 })
  expect(frente.largura).toBeCloseTo(1.2, 6)
})

test('plataforma quase quadrada se liga pelos quatro lados', () => {
  const pontos = pontosDeEncaixeDaGeometria([caixa(3, 0.5, 3)])
  expect(pontos.map((p) => `${p.direcao.x},${p.direcao.z}`).sort()).toEqual([
    '-1,0',
    '0,-1',
    '0,1',
    '1,0',
  ])
})

test('ponte com corrimão: vale a altura do tabuleiro, não a do corrimão', () => {
  const pontos = pontosDeEncaixeDaGeometria([
    caixa(1.5, 0.2, 5),
    caixa(0.08, 0.9, 5, -0.71, 0.2),
    caixa(0.08, 0.9, 5, 0.71, 0.2),
  ])
  expect(pontos).toHaveLength(2)
  for (const p of pontos) {
    expect(p.posicao.y).toBeCloseTo(0.2, 6)
    expect(p.largura).toBeCloseTo(1.5, 6)
  }
})

test('escada: o ponto de baixo no primeiro degrau e o de cima no último', () => {
  const degraus = [0, 1, 2, 3].map((i) => caixa(1.2, 0.3 * (i + 1), 0.5, 0, 0, i * 0.5))
  const pontos = pontosDeEncaixeDaGeometria(degraus)
  const baixo = pontos.find((p) => p.direcao.z === -1)!,
    cima = pontos.find((p) => p.direcao.z === 1)!
  expect(baixo.posicao.y).toBeCloseTo(0.3, 6)
  expect(cima.posicao.y).toBeCloseTo(1.2, 6)
})

test('cerca: um ponto em cada ponta, no pé; árvore e casa não ganham pontos', () => {
  const cerca = pontosDeEncaixeDaGeometria([caixa(3, 1, 0.1)])
  expect(cerca).toHaveLength(2)
  perto(cerca[0]!.posicao, { x: 1.5, y: 0, z: 0 })
  perto(cerca[1]!.posicao, { x: -1.5, y: 0, z: 0 })
  // Tronco e copa redonda: a parte de cima que dá para pisar é pequena perto da base.
  const arvore = pontosDeEncaixeDaGeometria([
    caixa(0.3, 2, 0.3),
    parte(new SphereGeometry(1, 16, 12), new Matrix4().makeTranslation(0, 2.5, 0)),
  ])
  expect(arvore).toEqual([])
})

test('duas peças se encontram: o encaixe gira e leva o ponto até a vizinha', () => {
  const pontos = pontosDeEncaixeDaGeometria([caixa(1.2, 0.1, 4)])
  const fixo = pontosNoMundo(pontos, new Matrix4().elements)
  // A segunda peça chega girada 30° e um pouco fora do lugar.
  const movel = new Matrix4()
    .makeTranslation(0.3, 0, 4.2)
    .multiply(new Matrix4().makeRotationY((30 * Math.PI) / 180))
  const achado = acharEncaixe(pontosNoMundo(pontos, movel.elements), fixo, 3)
  expect(achado).not.toBeNull()
  // O ponto que vai encaixar é o da vizinha virado para +z (a ponta da frente).
  expect(fixo[achado!.para]!.direcao.z).toBe(1)
  // Fora do alcance, nada encaixa.
  const longe = new Matrix4().makeTranslation(0, 0, 9)
  expect(acharEncaixe(pontosNoMundo(pontos, longe.elements), fixo)).toBeNull()
})
