import { expect, test } from 'bun:test'
import { dividirMalhaParaExportacao, MAX_INDICES_POR_MALHA } from '../src/compilar/dividir-malha'
import type { MalhaParaRecorte } from '../src/geometria'

test('divisão conserva triângulos, winding e todos os atributos sem alterar a origem', () => {
  const malha: MalhaParaRecorte = {
      atributos: {
        position: { itemSize: 3, valores: new Float32Array([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1]) },
        uv: { itemSize: 2, valores: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]) },
        normal: { itemSize: 3, valores: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]) },
        tangent: {
          itemSize: 4,
          valores: new Float32Array([1, 0, 0, -1, 1, 0, 0, -1, 1, 0, 0, -1, 1, 0, 0, -1]),
        },
      },
      indices: new Uint32Array([0, 2, 1, 0, 3, 2]),
    },
    original = JSON.stringify(malha),
    partes = dividirMalhaParaExportacao(malha, 3)
  expect(partes).toHaveLength(2)
  for (const nome of Object.keys(malha.atributos)) {
    const origem = malha.atributos[nome]!,
      esperado = Array.from(malha.indices!).flatMap((i) =>
        Array.from({ length: origem.itemSize }, (_, c) => origem.valores[i * origem.itemSize + c]),
      ),
      resultado = partes.flatMap((p) =>
        Array.from(p.indices).flatMap((i) =>
          Array.from(
            { length: origem.itemSize },
            (_, c) => p.atributos[nome]!.valores[i * origem.itemSize + c],
          ),
        ),
      )
    expect(resultado).toEqual(esperado)
  }
  expect(JSON.stringify(malha)).toBe(original)
  partes[0]!.atributos.position!.valores[0] = 42
  expect(malha.atributos.position!.valores[0]).toBe(0)
})

for (const quantidade of [65_000, 65_001])
  test(`${quantidade} vértices respeitam o teto de 65 mil sem perder índices`, () => {
    const valores = Float32Array.from({ length: quantidade * 3 }, (_, i) =>
        i % 3 === 0 ? Math.floor(i / 3) : 0,
      ),
      indices = Uint32Array.from(
        { length: Math.ceil(quantidade / 3) * 3 },
        (_, i) => i % quantidade,
      ),
      partes = dividirMalhaParaExportacao({
        atributos: { position: { itemSize: 3, valores } },
        indices,
      })
    expect(partes).toHaveLength(quantidade === 65_000 ? 1 : 2)
    expect(partes.reduce((s, p) => s + p.indices.length, 0)).toBe(indices.length)
    for (const parte of partes) {
      expect(parte.atributos.position!.valores.length / 3).toBeLessThanOrEqual(65_000)
      expect(parte.indices).toBeInstanceOf(Uint16Array)
      expect(parte.indices.every((i) => i < parte.atributos.position!.valores.length / 3)).toBe(
        true,
      )
    }
  })

test('malha não indexada e malha vazia têm saídas próprias e limitadas', () => {
  const partes = dividirMalhaParaExportacao(
    { atributos: { position: { itemSize: 3, valores: new Float32Array(18) } } },
    3,
  )
  expect(partes.map((p) => Array.from(p.indices))).toEqual([
    [0, 1, 2],
    [0, 1, 2],
  ])
  expect(
    dividirMalhaParaExportacao({ atributos: { position: { itemSize: 3, valores: [] } } }),
  ).toEqual([])
})

test('triângulos muito densos também limitam os índices de cada parte', () => {
  const indices = Uint32Array.from({ length: MAX_INDICES_POR_MALHA + 3 }, (_, i) => i % 3),
    partes = dividirMalhaParaExportacao({
      atributos: { position: { itemSize: 3, valores: new Float32Array(9) } },
      indices,
    })
  expect(partes).toHaveLength(2)
  expect(partes.reduce((s, p) => s + p.indices.length, 0)).toBe(indices.length)
  expect(partes.every((p) => p.indices.length <= MAX_INDICES_POR_MALHA)).toBe(true)
})

test('medidas, atributos e índices inválidos não produzem partes utilizáveis', () => {
  const valida: MalhaParaRecorte = {
    atributos: { position: { itemSize: 3, valores: [0, 0, 0, 1, 0, 0, 0, 0, 1] } },
  }
  for (const limite of [0, 2, 65_001, NaN, Infinity, 4.5])
    expect(() => dividirMalhaParaExportacao(valida, limite)).toThrow()
  for (const indices of [
    [0, 1],
    [-1, 1, 2],
    [0, 1, 3],
    [0, 0.5, 2],
    [0, NaN, 2],
  ])
    expect(() => dividirMalhaParaExportacao({ ...valida, indices })).toThrow()
  expect(() =>
    dividirMalhaParaExportacao({
      atributos: { ...valida.atributos, uv: { itemSize: 2, valores: [0, 0] } },
    }),
  ).toThrow()
  for (const valor of [NaN, Infinity, 1e100])
    expect(() =>
      dividirMalhaParaExportacao({
        atributos: { position: { itemSize: 3, valores: [valor, 0, 0, 1, 0, 0, 0, 0, 1] } },
      }),
    ).toThrow()
})

test('orçamento é recusado antes de percorrer uma fonte enorme', () => {
  let leituras = 0
  const valores = {
    length: 1_000_000_002,
    get 0(): number {
      leituras++
      throw Error('não pode percorrer')
    },
  }
  expect(() =>
    dividirMalhaParaExportacao({ atributos: { position: { itemSize: 3, valores } } }),
  ).toThrow(/grande|limite|orçamento/i)
  expect(leituras).toBe(0)
})

test('o orçamento de saída inclui vértices duplicados nas juntas das partes', () => {
  const malha: MalhaParaRecorte = {
    atributos: { position: { itemSize: 3, valores: new Float32Array(12) } },
    indices: [0, 1, 2, 0, 2, 3],
  }
  // São 48 bytes na origem, mas duas partes somam 72 bytes de posições e 12 de índices.
  expect(() => dividirMalhaParaExportacao(malha, 3, 80)).toThrow(/orçamento/i)
  expect(dividirMalhaParaExportacao(malha, 3, 84)).toHaveLength(2)
  for (const teto of [0, NaN, Infinity, -1, 2 ** 32])
    expect(() => dividirMalhaParaExportacao(malha, 3, teto)).toThrow()
})
