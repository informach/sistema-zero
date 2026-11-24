import { expect, test } from 'bun:test'
import { abrirEdicaoDeTerreno, alturaDoCampo, type BaseDeTerreno, CaminhoSchema } from '../src/v2'
import { geometriaDoPiso } from '../src/v2/geometria-de-piso'

const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: -32, z: -32 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -20,
  max: 60,
  fundo: 0,
  pecas: [],
}
const trilha = () =>
  CaminhoSchema.parse({
    id: 't',
    nome: 'Trilha',
    grupo: null,
    bloqueado: false,
    oculto: false,
    tipo: 'trilha',
    acabamento: null,
    largura: 4,
    pontos: [
      { x: -10, z: 0 },
      { x: 10, z: 0 },
    ],
  })
const area = (g: ReturnType<typeof geometriaDoPiso>) => {
  let total = 0
  for (let i = 0; i < g.posicoes.length; i += 9) {
    const p = g.posicoes
    total +=
      ((p[i + 2]! - p[i + 8]!) * (p[i + 3]! - p[i]!) -
        (p[i]! - p[i + 6]!) * (p[i + 5]! - p[i + 2]!)) /
      2
  }
  return total
}

test('piso usa os mesmos triângulos do terreno, inclusive no interior de cada face', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map())
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) estado.campo.alturas[z * 65 + x] = (x * 17 + z * 23) % 7
  const g = geometriaDoPiso(trilha(), base, estado)
  expect(area(g)).toBeCloseTo(80, 5)
  for (let i = 0; i < g.posicoes.length; i += 9) {
    const p = g.posicoes,
      x = (p[i]! + p[i + 3]! + p[i + 6]!) / 3 + g.origem.x,
      z = (p[i + 2]! + p[i + 5]! + p[i + 8]!) / 3 + g.origem.z,
      y = (p[i + 1]! + p[i + 4]! + p[i + 7]!) / 3
    expect(y).toBeCloseTo(alturaDoCampo(estado.campo, x, z), 5)
  }
})

test('buracos de célula e recorte do lago retiram a superfície em vez de criar piso invisível', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map())
  estado.buracos.celulas[32 * 64 + 32] = 1
  const comRecorte = {
    ...base,
    recortes: [
      [
        { x: -5, z: -1 },
        { x: -3, z: -1 },
        { x: -3, z: 1 },
        { x: -5, z: 1 },
      ],
    ],
  }
  const g = geometriaDoPiso(trilha(), comRecorte, estado)
  expect(area(g)).toBeCloseTo(75, 5)
  for (let i = 0; i < g.posicoes.length; i += 9) {
    const x = (g.posicoes[i]! + g.posicoes[i + 3]! + g.posicoes[i + 6]!) / 3 + g.origem.x,
      z = (g.posicoes[i + 2]! + g.posicoes[i + 5]! + g.posicoes[i + 8]!) / 3 + g.origem.z
    expect(x > 0 && x < 1 && z > 0 && z < 1).toBe(false)
    expect(x > -5 && x < -3 && z > -1 && z < 1).toBe(false)
  }
})

test('praça côncava conserva área, UV métrica e winding para cima sem preencher a concavidade', () => {
  const c = CaminhoSchema.parse({
    ...trilha(),
    tipo: 'praca',
    pontos: [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: 4 },
      { x: 0, z: 4 },
    ],
  })
  const g = geometriaDoPiso(c, { tipo: 'plano', largura: 64, comprimento: 64 }, null)
  expect(area(g)).toBeCloseTo(12, 7)
  expect(Math.max(...g.uvs)).toBe(4)
  expect(g.posicoes.every((v) => Number.isFinite(v))).toBe(true)
})

test('piso recorta limites do plano e não cobre peças ausentes do terreno esparso', () => {
  expect(
    area(geometriaDoPiso(trilha(), { tipo: 'plano', largura: 10, comprimento: 8 }, null)),
  ).toBeCloseTo(40, 5)
  const esparsa = { ...base }
  delete esparsa.cobertura
  expect(
    geometriaDoPiso(trilha(), esparsa, abrirEdicaoDeTerreno(base, new Map())).posicoes.length,
  ).toBe(0)
})

test('origem local conserva encaixe próximo de cem quilômetros sem elevação artificial', () => {
  const longe = { ...base, origem: { x: 99900, z: 99900 } },
    estado = abrirEdicaoDeTerreno(longe, new Map())
  const c = CaminhoSchema.parse({
    ...trilha(),
    largura: 0.1,
    pontos: [
      { x: 99910, z: 99910 },
      { x: 99920, z: 99910 },
    ],
  })
  const g = geometriaDoPiso(c, longe, estado)
  expect(area(g)).toBeCloseTo(1, 5)
  for (let i = 1; i < g.posicoes.length; i += 3) expect(g.posicoes[i]).toBe(0)
})

test('orçamento de recorte e falta de terreno carregado produzem erro antes de uma malha parcial', () => {
  expect(() => geometriaDoPiso(trilha(), base, null)).toThrow('carregado')
  const c = CaminhoSchema.parse({
    ...trilha(),
    tipo: 'praca',
    pontos: [
      { x: -30, z: -30 },
      { x: 30, z: -30 },
      { x: 30, z: 30 },
      { x: -30, z: 30 },
    ],
  })
  expect(() =>
    geometriaDoPiso(c, base, abrirEdicaoDeTerreno(base, new Map()), { visitas: 4 }),
  ).toThrow('trechos menores')
  expect(() =>
    geometriaDoPiso(trilha(), base, abrirEdicaoDeTerreno(base, new Map()), { vertices: 3 }),
  ).toThrow('trechos menores')
})

test('circuito fechado mantém juntas e faixa de largura real com faces para cima', () => {
  const c = CaminhoSchema.parse({
      ...trilha(),
      fechada: true,
      pontos: [
        { x: -5, z: -5 },
        { x: 5, z: -5 },
        { x: 5, z: 5 },
        { x: -5, z: 5 },
      ],
    }),
    g = geometriaDoPiso(c, base, abrirEdicaoDeTerreno(base, new Map()))
  expect(area(g)).toBeCloseTo(160, 5)
  for (let i = 0; i < g.posicoes.length; i += 9) {
    const p = g.posicoes,
      y =
        (p[i + 5]! - p[i + 2]!) * (p[i + 6]! - p[i]!) -
        (p[i + 3]! - p[i]!) * (p[i + 8]! - p[i + 2]!)
    expect(y).toBeGreaterThan(0)
  }
})

test('trilha diagonal longa tem recorte limitado sem preencher seu retângulo inteiro', () => {
  const grande = { ...base, colunas: 256, linhas: 256, origem: { x: 0, z: 0 } },
    c = CaminhoSchema.parse({
      ...trilha(),
      largura: 2,
      pontos: [
        { x: 8, z: 8 },
        { x: 248, z: 248 },
      ],
    }),
    g = geometriaDoPiso(c, grande, abrirEdicaoDeTerreno(grande, new Map()), { visitas: 200_000 })
  expect(area(g)).toBeCloseTo(Math.hypot(240, 240) * 2, 2)
  expect(g.posicoes.length / 9).toBeLessThan(15_000)
})

test('malha recusa campo ou máscara incompatível e alturas não finitas', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map())
  estado.buracos = { colunas: 1, linhas: 1, celulas: new Uint8Array(1) }
  expect(() => geometriaDoPiso(trilha(), base, estado)).toThrow('carregado')
  estado.buracos = abrirEdicaoDeTerreno(base, new Map()).buracos
  estado.campo.alturas[32 * 65 + 32] = Number.NaN
  expect(() => geometriaDoPiso(trilha(), base, estado)).toThrow('altura')
})

test('curva apertada demais para a largura é recusada em vez de desenhar a faixa dobrada', () => {
  const c = CaminhoSchema.parse({
    ...trilha(),
    pontos: [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
    ],
  })
  expect(() => geometriaDoPiso(c, { tipo: 'plano', largura: 64, comprimento: 64 }, null)).toThrow(
    'reduza a largura',
  )
})
