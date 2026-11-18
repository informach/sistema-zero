import { expect, test } from 'bun:test'
import { CaminhoSchema, transformarPonto } from '../src/v2'
import { estruturaDoCaminho } from '../src/v2/estrutura-de-caminho'

const comum = {
  id: 'c',
  nome: 'Estrutura',
  grupo: null,
  oculto: false,
  bloqueado: false,
  acabamento: null,
  largura: 3,
  pontos: [
    { x: 0, z: 0 },
    { x: 12, z: 0 },
  ],
}
const volume = { min: { x: 2, y: -2, z: 4 }, max: { x: 6, y: 3, z: 6 } }

test('tabuleiro nativo encontra as duas cabeceiras e deixa o vão livre', () => {
  const c = CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      cotas: { de: 3, ate: 6 },
      guardas: false,
    }),
    r = estruturaDoCaminho(c, () => 0),
    p = r.pecas[0]!
  expect(r.pecas).toHaveLength(1)
  expect(p.chave).toBe('tabuleiro/0')
  expect(p.noTerreno).toBe(false)
  const de = transformarPonto({ x: -0.5, y: 0.5, z: 0 }, p.transformacao),
    ate = transformarPonto({ x: 0.5, y: 0.5, z: 0 }, p.transformacao)
  expect(de.x).toBeCloseTo(0, 10)
  expect(de.y).toBeCloseTo(3, 10)
  expect(ate.x).toBeCloseTo(12, 10)
  expect(ate.y).toBeCloseTo(6, 10)
  expect(r.avisos).toEqual([])
})

test('ponte de catálogo respeita pivô, piso local, eixo e inclinação sem modificar suas medidas', () => {
  for (const eixo of ['x', 'z'] as const) {
    const c = CaminhoSchema.parse({
        ...comum,
        tipo: 'ponte',
        acabamento: 'modelo',
        encaixeModelo: { eixo, pisoLocal: 0.5 },
        cotas: { de: 2, ate: 5 },
        pontos: [
          { x: -2, z: 3 },
          { x: 8, z: -7 },
        ],
      }),
      antes = structuredClone(volume),
      p = estruturaDoCaminho(c, () => 0, volume).pecas[0]!,
      centro = { x: 4, y: 0.5, z: 5 },
      a = { ...centro, [eixo]: volume.min[eixo] },
      b = { ...centro, [eixo]: volume.max[eixo] },
      de = transformarPonto(a, p.transformacao),
      ate = transformarPonto(b, p.transformacao)
    expect(p.tipo).toBe('modelo')
    expect(de.x).toBeCloseTo(-2, 9)
    expect(de.y).toBeCloseTo(2, 9)
    expect(de.z).toBeCloseTo(3, 9)
    expect(ate.x).toBeCloseTo(8, 9)
    expect(ate.y).toBeCloseTo(5, 9)
    expect(ate.z).toBeCloseTo(-7, 9)
    expect(volume).toEqual(antes)
  }
})

test('guarda e pilares têm peças reais; pilares param sob o tabuleiro e não nascem no vazio', () => {
  const c = CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      cotas: { de: 4, ate: 4 },
      pilares: { espacamento: 4, largura: 0.3 },
    }),
    altura = Object.assign(() => -1, { temChao: (p: { x: number }) => p.x < 7 }),
    r = estruturaDoCaminho(c, altura)
  expect(r.pecas.some((p) => p.chave === 'guarda/0')).toBe(true)
  expect(r.pecas.some((p) => p.chave.startsWith('guarda-poste/'))).toBe(true)
  const pilares = r.pecas.filter((p) => p.chave.startsWith('pilar/'))
  expect(pilares).toHaveLength(2)
  for (const p of pilares) {
    expect(p.tipo).toBe('pilar')
    expect(p.transformacao.posicao.y - p.transformacao.escala.y / 2).toBeCloseTo(-1, 8)
    expect(p.transformacao.posicao.y + p.transformacao.escala.y / 2).toBeCloseTo(3.8, 8)
  }
  expect(r.avisos.some((a) => a.includes('pilares'))).toBe(true)
})

test('cerca fechada não duplica o poste da emenda e exige fechamento explícito', () => {
  const c = CaminhoSchema.parse({
      ...comum,
      tipo: 'cerca',
      largura: 0.2,
      fechada: true,
      pontos: [
        { x: 0, z: 0 },
        { x: 6, z: 0 },
        { x: 6, z: 6 },
        { x: 0, z: 6 },
      ],
    }),
    postes = estruturaDoCaminho(c, () => 0).pecas.filter((p) => p.chave.startsWith('poste/')),
    posicoes = new Set(
      postes.map((p) => `${p.transformacao.posicao.x}:${p.transformacao.posicao.z}`),
    )
  expect(posicoes.size).toBe(postes.length)
  if (c.tipo !== 'cerca') throw Error('Cerca esperada')
  expect(() =>
    estruturaDoCaminho({ ...c, fechada: false, pontos: [...c.pontos, c.pontos[0]!] }, () => 0),
  ).toThrow('fechada')
})

test('cerca conserva os controles de esquina e apoia postes; muro fecha cada lance', () => {
  const pontos = [
    { x: 0, z: 0 },
    { x: 5, z: 0 },
    { x: 5, z: 7 },
  ]
  for (const tipo of ['cerca', 'muro'] as const) {
    const c = CaminhoSchema.parse({
        ...comum,
        tipo,
        largura: 0.2,
        comprimentoDoModulo: 3,
        altura: 1.5,
        pontos,
      }),
      r = estruturaDoCaminho(c, (x, z) => x * 0.1 + z * 0.2)
    expect(r.pecas.length).toBeGreaterThan(3)
    expect(
      r.pecas.every((p) =>
        ['x', 'y', 'z'].every((e) =>
          Number.isFinite(p.transformacao.posicao[e as 'x' | 'y' | 'z']),
        ),
      ),
    ).toBe(true)
    if (tipo === 'cerca') {
      const postes = r.pecas.filter((p) => p.chave.startsWith('poste/'))
      expect(
        postes.some(
          (p) =>
            Math.abs(p.transformacao.posicao.x - 5) < 1e-8 &&
            Math.abs(p.transformacao.posicao.z) < 1e-8,
        ),
      ).toBe(true)
      expect(postes.every((p) => p.noTerreno)).toBe(true)
    } else {
      const primeiro = r.pecas[0]!,
        ultimo = r.pecas.at(-1)!,
        a = transformarPonto({ x: -0.5, y: -0.5, z: 0 }, primeiro.transformacao),
        b = transformarPonto({ x: 0.5, y: -0.5, z: 0 }, ultimo.transformacao)
      expect(a.x).toBeCloseTo(0, 8)
      expect(a.z).toBeCloseTo(0, 8)
      expect(b.x).toBeCloseTo(5, 8)
      expect(b.z).toBeCloseTo(7, 8)
      expect(r.pecas.every((p) => p.noTerreno)).toBe(true)
    }
  }
})

test('modelo modular usa eixo e base medidos; fonte ruim ou orçamento excessivo não produz peças', () => {
  const c = CaminhoSchema.parse({
      ...comum,
      tipo: 'muro',
      acabamento: 'modelo',
      encaixeModelo: { eixo: 'z', baseLocal: -1 },
      altura: 2,
      largura: 1,
      comprimentoDoModulo: 4,
    }),
    p = estruturaDoCaminho(c, () => 0, volume).pecas[0]!,
    base = transformarPonto({ x: 4, y: -1, z: 5 }, p.transformacao)
  expect(base.y).toBeCloseTo(0, 8)
  expect(p.noTerreno).toBe(true)
  expect(() => estruturaDoCaminho(c, () => 0)).toThrow('medidas')
  expect(() =>
    estruturaDoCaminho(CaminhoSchema.parse({ ...comum, tipo: 'ponte' }), () => Number.NaN),
  ).toThrow('altura')
  expect(() =>
    estruturaDoCaminho(
      CaminhoSchema.parse({
        ...comum,
        tipo: 'cerca',
        comprimentoDoModulo: 0.05,
        pontos: [
          { x: 0, z: 0 },
          { x: 1000, z: 0 },
        ],
      }),
      () => 0,
    ),
  ).toThrow('peças')
})

test('encaixe próximo ao eixo mantém cabeceiras exatas em uma ponte longa', () => {
  for (const desvio of [0, 0.000001, 0.01, 100]) {
    const c = CaminhoSchema.parse({
        ...comum,
        tipo: 'ponte',
        acabamento: 'm',
        encaixeModelo: { eixo: 'z', pisoLocal: 0 },
        cotas: { de: 0, ate: desvio },
        pontos: [
          { x: 0, z: 0 },
          { x: 2000, z: 0.000001 },
        ],
      }),
      p = estruturaDoCaminho(c, () => -5, volume).pecas[0]!,
      de = transformarPonto({ x: 4, y: 0, z: 4 }, p.transformacao),
      ate = transformarPonto({ x: 4, y: 0, z: 6 }, p.transformacao)
    expect(Math.hypot(de.x, de.y, de.z)).toBeLessThan(1e-8)
    expect(ate.x).toBeCloseTo(2000, 8)
    expect(ate.y).toBeCloseTo(desvio, 8)
    expect(ate.z).toBeCloseTo(0.000001, 8)
  }
})

test('pilares de ponte GLB usam sua geometria inferior real, inclusive em tabuleiro arqueado', () => {
  const modelo = { min: { x: -6, y: -2, z: -1.5 }, max: { x: 6, y: 2, z: 1.5 } },
    c = CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      acabamento: 'm',
      encaixeModelo: { eixo: 'x', pisoLocal: 0, baseLocal: -0.8 },
      cotas: { de: 4, ate: 4 },
      pilares: { espacamento: 6, largura: 0.3 },
    }),
    r = estruturaDoCaminho(c, () => -1, modelo, { baseDoTabuleiro: (p) => 3.2 + p.x / 10 })
  const pilar = r.pecas.find((p) => p.chave === 'pilar/0')!
  expect(pilar.transformacao.posicao.y + pilar.transformacao.escala.y / 2).toBeCloseTo(3.8, 10)
  expect(() => estruturaDoCaminho(c, () => -1, modelo)).toThrow('geometria inferior')
})

test('cabeceiras medidas conservam sobras do modelo fora do lance útil sem escolher pelo nome', () => {
  const c = CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      acabamento: 'm',
      encaixeModelo: {
        eixo: 'x',
        pisoLocal: 0.5,
        inicioLocal: 2.5,
        fimLocal: 5.5,
        centroTransversalLocal: 5.25,
      },
      cotas: { de: 2, ate: 3 },
    }),
    p = estruturaDoCaminho(c, () => 0, volume).pecas[0]!,
    de = transformarPonto({ x: 2.5, y: 0.5, z: 5.25 }, p.transformacao),
    ate = transformarPonto({ x: 5.5, y: 0.5, z: 5.25 }, p.transformacao)
  expect(de.x).toBeCloseTo(0, 10)
  expect(de.y).toBeCloseTo(2, 10)
  expect(de.z).toBeCloseTo(0, 10)
  expect(ate.x).toBeCloseTo(12, 10)
  expect(ate.y).toBeCloseTo(3, 10)
  expect(ate.z).toBeCloseTo(0, 10)
  expect(
    CaminhoSchema.safeParse({ ...c, encaixeModelo: { ...c.encaixeModelo, inicioLocal: 6 } })
      .success,
  ).toBe(false)
  expect(() =>
    estruturaDoCaminho(
      { ...c, encaixeModelo: { ...c.encaixeModelo!, inicioLocal: 1 } },
      () => 0,
      volume,
    ),
  ).toThrow('volume original')
})

test('consulta do tabuleiro usa só seu referencial e não amostra o relevo distante', () => {
  const c = CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      cotas: { de: 3, ate: 6 },
      pilares: { espacamento: 3, largura: 0.2 },
    }),
    completo = estruturaDoCaminho(c, () => -2),
    contato = estruturaDoCaminho(
      c,
      () => {
        throw Error('Não é necessário consultar o perfil')
      },
      undefined,
      { somenteParte: 'tabuleiro/0' },
    )
  expect(contato.pecas).toEqual(completo.pecas.filter((p) => p.chave === 'tabuleiro/0'))
})

test('medidas que multiplicariam sobras do modelo além do mundo são recusadas antes de desenhar', () => {
  const c = CaminhoSchema.parse({
    ...comum,
    tipo: 'ponte',
    acabamento: 'm',
    encaixeModelo: { eixo: 'x', pisoLocal: 0, inicioLocal: 2, fimLocal: 2.00001 },
  })
  expect(() => estruturaDoCaminho(c, () => 0, volume)).toThrow('limites do mundo')
})
