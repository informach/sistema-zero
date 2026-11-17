import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  BaseDeTerrenoSchema,
  BYTES_DA_PECA,
  codificarPecaDeAlturas,
  criarFonteDeAlturas,
  lerPecaDeAlturas,
  malhaDaPecaDeTerreno,
  PecaDeTerrenoAusente,
} from '../src/v2/terreno'

const digest = (letra: string) => letra.repeat(64)
const base = (pecas: BaseDeTerreno['pecas'] = []): BaseDeTerreno => ({
  tipo: 'terreno',
  origem: { x: -64, z: -32 },
  passo: 1,
  colunas: 128,
  linhas: 64,
  min: 0,
  max: 255,
  fundo: 0,
  pecas,
})
const campo = (ox: number, oz: number) =>
  Float64Array.from(
    { length: AMOSTRAS_DA_PECA },
    (_, i) => (ox + (i % 65)) / 8 + (oz + Math.floor(i / 65)) / 16,
  )

test('peça Uint16 tem formato canônico, intervalo e erro de quantização limitado', () => {
  const origem = campo(0, 0)
  const bytes = codificarPecaDeAlturas(origem, 0, 255)
  expect(bytes.byteLength).toBe(BYTES_DA_PECA)
  expect([...bytes.subarray(0, 8)]).toEqual([83, 90, 72, 84, 1, 0, 65, 0])
  expect(codificarPecaDeAlturas(origem, 0, 255)).toEqual(bytes)
  const p = lerPecaDeAlturas(bytes)
  expect([p.min, p.max, p.amostras.length]).toEqual([0, 255, AMOSTRAS_DA_PECA])
  for (const i of [0, 1, 64, 65, 1000, AMOSTRAS_DA_PECA - 1])
    expect(Math.abs((p.amostras[i]! / 65535) * 255 - origem[i]!)).toBeLessThanOrEqual(
      255 / 65535 / 2,
    )
})

test('altura respeita origem e passo; bordas e vértices das peças vizinhas coincidem', () => {
  const dados = new Map([
    [digest('a'), lerPecaDeAlturas(codificarPecaDeAlturas(campo(0, 0), 0, 255))],
    [digest('b'), lerPecaDeAlturas(codificarPecaDeAlturas(campo(64, 0), 0, 255))],
  ])
  const fonte = criarFonteDeAlturas(
    base([
      { coluna: 0, linha: 0, digest: digest('a') },
      { coluna: 1, linha: 0, digest: digest('b') },
    ]),
    dados,
  )
  for (const [x, z] of [
    [0, 0],
    [63.99, 12],
    [64, 12],
    [64.01, 12],
    [128, 64],
  ])
    expect(Math.abs(fonte(x! - 64, z! - 32) - (x! / 8 + z! / 16))).toBeLessThan(0.004)
  expect(fonte(-65, -32)).toBe(0)
  expect(fonte(65, 0)).toBe(0)
})

test('interpolação usa os dois triângulos da célula, com a diagonal entre os outros dois cantos', () => {
  const amostras = new Float64Array(AMOSTRAS_DA_PECA)
  amostras[1] = 4
  amostras[65] = 8
  amostras[66] = 20
  const p = lerPecaDeAlturas(codificarPecaDeAlturas(amostras, 0, 255))
  const fonte = criarFonteDeAlturas(
    { ...base([{ coluna: 0, linha: 0, digest: digest('a') }]), origem: { x: 0, z: 0 } },
    new Map([[digest('a'), p]]),
  )
  expect(fonte(0.25, 0.25)).toBeCloseTo(3, 6)
  expect(fonte(0.75, 0.75)).toBeCloseTo(13, 6)
  expect(fonte(1, 1)).toBeCloseTo(20, 6)
  expect(() => fonte(Number.NaN, 0)).toThrow('ponto')
})

test('peça omitida é fundo; arquivo ausente, intervalo errado ou borda inconsistente não viram terreno plano', () => {
  expect(criarFonteDeAlturas(base(), new Map())(0, 0)).toBe(0)
  const descritor = base([{ coluna: 0, linha: 0, digest: digest('a') }])
  expect(() => criarFonteDeAlturas(descritor, new Map())).toThrow(PecaDeTerrenoAusente)
  const zero = new Float64Array(AMOSTRAS_DA_PECA)
  const p = lerPecaDeAlturas(codificarPecaDeAlturas(zero, 0, 255))
  expect(() => criarFonteDeAlturas({ ...descritor, min: -1 }, new Map([[digest('a'), p]]))).toThrow(
    'intervalo',
  )
  zero[0] = 1
  const q = lerPecaDeAlturas(codificarPecaDeAlturas(zero, 0, 255))
  expect(() =>
    criarFonteDeAlturas(
      base([...descritor.pecas, { coluna: 1, linha: 0, digest: digest('b') }]),
      new Map([
        [digest('a'), p],
        [digest('b'), q],
      ]),
    ),
  ).toThrow('bordas')
})

test('bytes truncados, versão desconhecida e amostras fora do intervalo são recusados', () => {
  const dados = new Float64Array(AMOSTRAS_DA_PECA)
  const bytes = codificarPecaDeAlturas(dados, 0, 255)
  expect(() => lerPecaDeAlturas(bytes.subarray(0, bytes.length - 1))).toThrow('tamanho')
  const invalido = bytes.slice()
  invalido[4] = 2
  expect(() => lerPecaDeAlturas(invalido)).toThrow('formato')
  dados[0] = -1
  expect(() => codificarPecaDeAlturas(dados, 0, 255)).toThrow('amostra')
  expect(() => codificarPecaDeAlturas(dados, 1, 0)).toThrow('intervalo')
})

test('descritor limita extensão e quantidade, recusa posições repetidas e mantém fontes isoladas', () => {
  expect(BaseDeTerrenoSchema.safeParse({ ...base(), colunas: 65 }).success).toBe(false)
  expect(BaseDeTerrenoSchema.safeParse({ ...base(), colunas: 4096, passo: 32 }).success).toBe(false)
  expect(
    BaseDeTerrenoSchema.safeParse(base([{ coluna: 2, linha: 0, digest: digest('a') }])).success,
  ).toBe(false)
  const ref = { coluna: 0, linha: 0, digest: digest('a') }
  expect(BaseDeTerrenoSchema.safeParse(base([ref, ref])).success).toBe(false)
  const p = lerPecaDeAlturas(
    codificarPecaDeAlturas(new Float64Array(AMOSTRAS_DA_PECA).fill(4), 0, 255),
  )
  const q = lerPecaDeAlturas(
    codificarPecaDeAlturas(new Float64Array(AMOSTRAS_DA_PECA).fill(8), 0, 255),
  )
  const primeira = criarFonteDeAlturas(base([ref]), new Map([[ref.digest, p]]))
  const segunda = criarFonteDeAlturas(base([ref]), new Map([[ref.digest, q]]))
  expect(primeira(-32, 0)).toBe(4)
  expect(segunda(-32, 0)).toBe(8)
  expect(primeira(-32, 0)).toBe(4)
})

test('malha usa vértices locais, Uint16 e os mesmos triângulos da consulta de altura', () => {
  const ref = { coluna: 0, linha: 0, digest: digest('a') },
    b = base([ref])
  const p = lerPecaDeAlturas(codificarPecaDeAlturas(campo(0, 0), 0, 255))
  const fonte = criarFonteDeAlturas(b, new Map([[ref.digest, p]]))
  const malha = malhaDaPecaDeTerreno(b, ref, p)
  expect(malha.origem).toEqual(b.origem)
  expect(malha.vertices.length).toBe(AMOSTRAS_DA_PECA * 3)
  expect(malha.indices.length).toBe(64 * 64 * 6)
  expect([...malha.indices.subarray(0, 6)]).toEqual([0, 65, 1, 1, 65, 66])
  for (const t of [0, 1, 25, 8191]) {
    const is = [...malha.indices.subarray(t * 3, t * 3 + 3)]
    const media = (eixo: number) =>
      is.reduce((soma, i) => soma + malha.vertices[i * 3 + eixo]!, 0) / 3
    expect(
      Math.abs(fonte(malha.origem.x + media(0), malha.origem.z + media(2)) - media(1)),
    ).toBeLessThan(0.0001)
  }
  expect(() => malhaDaPecaDeTerreno(b, { ...ref, coluna: 1 }, p)).toThrow('pertence')
})
