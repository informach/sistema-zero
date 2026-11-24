import { expect, test } from 'bun:test'
import { type MalhaParaRecorte, recortarAtributos } from '../src/geometria'

const malha = (): MalhaParaRecorte => ({
  atributos: {
    position: { itemSize: 3, valores: [-1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1] },
    uv: { itemSize: 2, valores: [0, 0, 1, 0, 0, 1, 1, 1] },
  },
  indices: [0, 2, 1, 1, 2, 3],
})
const area = (valores: Float32Array) => {
  let total = 0
  for (let i = 0; i < valores.length; i += 9)
    total +=
      Math.abs(
        (valores[i + 3]! - valores[i]!) * (valores[i + 8]! - valores[i + 2]!) -
          (valores[i + 6]! - valores[i]!) * (valores[i + 5]! - valores[i + 2]!),
      ) / 2
  return total
}

test('recorte puro conserva UVs e não modifica os buffers de entrada', () => {
  const origem = malha(),
    antes = JSON.stringify(origem)
  const r = recortarAtributos(origem, [{ x: 1, z: 0, limite: 0 }])
  expect(area(r.position!.valores)).toBeCloseTo(2)
  for (let i = 0; i < r.position!.valores.length / 3; i++) {
    const x = r.position!.valores[i * 3]!
    expect(x).toBeLessThanOrEqual(0)
    expect(r.uv!.valores[i * 2]).toBeCloseTo((x + 1) / 2)
  }
  expect(JSON.stringify(origem)).toBe(antes)
})

test('furo preserva a área externa e exclusões fora da malha não a alteram', () => {
  const furo = [
    { x: -0.25, z: -0.25 },
    { x: 0.25, z: -0.25 },
    { x: 0.25, z: 0.25 },
    { x: -0.25, z: 0.25 },
  ]
  expect(area(recortarAtributos(malha(), [], [furo]).position!.valores)).toBeCloseTo(3.75)
  expect(
    area(
      recortarAtributos(malha(), [], [furo.map((p) => ({ x: p.x + 10, z: p.z }))]).position!
        .valores,
    ),
  ).toBeCloseTo(4)
})

test('atributos e índices inconsistentes são recusados antes de produzir uma malha parcial', () => {
  expect(() => recortarAtributos({ atributos: {} }, [])).toThrow('Posições')
  expect(() => recortarAtributos({ ...malha(), indices: [0, 1, 10] }, [])).toThrow('Índice')
  expect(() => recortarAtributos({ ...malha(), indices: [0, 1] }, [])).toThrow('Triângulos')
  const d = malha()
  d.atributos.uv!.valores = [0, 0]
  expect(() => recortarAtributos(d, [])).toThrow('Atributos')
  const n = malha()
  n.atributos.position!.valores = [Number.NaN, 0, 0]
  expect(() => recortarAtributos(n, [])).toThrow()
})

test('aresta quase coincidente não extrapola vértices nem atributos ao recortar', () => {
  const fonte: MalhaParaRecorte = {
    atributos: {
      position: { itemSize: 3, valores: [5e-8, 0, 0, 2e-7, 1, 1, 5e-8, 0, 1] },
      uv: { itemSize: 2, valores: [0, 0, 1, 1, 0, 1] },
    },
  }
  for (const escala of [1, 1000, 0.001]) {
    const r = recortarAtributos(fonte, [{ x: escala, z: 0, limite: 0 }])
    for (const [i, v] of Array.from(r.position!.valores).entries()) {
      expect(v).toBeGreaterThanOrEqual(i % 3 === 0 ? 5e-8 - 1e-14 : 0)
      expect(v).toBeLessThanOrEqual(i % 3 === 0 ? 2e-7 + 1e-14 : 1)
    }
    for (const v of r.uv!.valores) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  }
})
