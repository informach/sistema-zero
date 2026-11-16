import { expect, test } from 'bun:test'
import { dentroDaAgua, discoTocaAgua } from '../src/sistemas/agua'
import { ilhaDoArquipelago } from '../src/sistemas/geografia-do-arquipelago'
import { LAGO_DA_FAISCA, pontoNoContorno } from '../src/sistemas/lago-da-faisca'
import { superficieDaAgua } from '../src/sistemas/modos/chao'
import { malhaDoSetor } from '../src/sistemas/setores-do-arquipelago'

test('água segue o contorno do GLB, mantendo o contrato de elipse fora do recorte', () => {
  const a = LAGO_DA_FAISCA.agua
  expect(dentroDaAgua(a, 39, 127)).toBe(true)
  expect(dentroDaAgua(a, 46, 127)).toBe(false)
  expect(superficieDaAgua([a], 0, 39, 127)).toBeCloseTo(3.85, 5)
  const e = { x: 0, z: 0, raioX: 4, raioZ: 2, giro: 0 }
  expect(dentroDaAgua(e, 3.9, 0)).toBe(true)
  expect(dentroDaAgua(e, 0, 2.1)).toBe(false)
})
test('o terreno físico não atravessa o furo catalogado do lago', () => {
  const m = malhaDoSetor(ilhaDoArquipelago('sua-ilha'), 0, 1, 4, true)
  let junto = 0
  for (let i = 0; i < m.indices.length; i += 3) {
    const ids = [0, 1, 2].map((j) => m.indices[i + j]! * 3)
    const x = ids.reduce((s, k) => s + m.vertices[k]!, 0) / 3,
      z = ids.reduce((s, k) => s + m.vertices[k + 2]!, 0) / 3
    expect(pontoNoContorno(LAGO_DA_FAISCA.furo, x, z)).toBe(false)
    if (Math.hypot(x - 39, z - 127) < 12) junto++
  }
  expect(junto).toBeGreaterThan(10)
})

test('a sonda reconhece a margem tocada pelo corpo mesmo com o centro fora da água', () => {
  const a = LAGO_DA_FAISCA.agua
  expect(dentroDaAgua(a, 34.78, 128.8)).toBe(false)
  expect(discoTocaAgua(a, 34.78, 128.8, 0.45)).toBe(true)
  expect(superficieDaAgua([a], 0, 34.78, 128.8, 0.45)).toBeCloseTo(3.85, 5)
  expect(superficieDaAgua([a], 0, 34.78, 128.8)).toBe(0)
  expect(discoTocaAgua(a, 26, 127, 0.45)).toBe(false)
  const quadrado = {
    x: 0,
    z: 0,
    giro: 0,
    raioX: 1,
    raioZ: 1,
    contorno: [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
    ],
  }
  expect(discoTocaAgua(quadrado, 1.2, 1.2, 0.2)).toBe(false)
  expect(discoTocaAgua(quadrado, 1.2, 1.2, 0.3)).toBe(true)
})
test('o contato circular mantém a curvatura e o giro das águas elípticas', () => {
  const elipse = { x: 3, z: 5, giro: Math.PI / 2, raioX: 4, raioZ: 1 }
  expect(discoTocaAgua(elipse, 3, 0.9, 0.1)).toBe(true)
  expect(discoTocaAgua(elipse, 4.11, 5, 0.1)).toBe(false)
  const circulo = { x: 0, z: 0, giro: 0, raioX: 2, raioZ: 2 }
  for (const [x, z] of [
    [2.1, 0],
    [0, 2.5],
    [2, 2],
    [-2, -0.1],
  ])
    expect(discoTocaAgua(circulo, x!, z!, 0.25)).toBe(Math.hypot(x!, z!) <= 2.25)
})
