import { expect, test } from 'bun:test'
import { abrirEdicaoDeTerreno, type BaseDeTerreno, clonarEstadoDoTerreno } from '../src/v2'
import { prepararOperacaoDeCaminho } from '../src/v2/operacoes-de-caminho'

const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: -32, z: -32 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -20,
  max: 60,
  fundo: 10,
  pecas: [],
}
const comum = {
  id: 'c',
  nome: 'Caminho',
  grupo: null,
  bloqueado: false,
  oculto: false,
  acabamento: null,
  largura: 3,
  pontos: [
    { x: -24, z: 0 },
    { x: 24, z: 0 },
  ],
}
test('preparar as seis variantes conserva dados de origem e só estrada devolve terreno', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map()),
    antes = clonarEstadoDoTerreno(estado)
  for (const tipo of ['trilha', 'praca', 'estrada', 'cerca', 'muro', 'ponte'] as const) {
    const r = prepararOperacaoDeCaminho(
      {
        ...comum,
        tipo,
        ...(tipo === 'praca' ? { pontos: [...comum.pontos, { x: 0, z: 12 }] } : {}),
      },
      estado,
    )
    expect(r.caminho.tipo).toBe(tipo)
    expect(Boolean(r.terreno)).toBe(tipo === 'estrada')
    expect(r.resumo.comprimento).toBeGreaterThan(0)
  }
  expect(estado).toEqual(antes)
})
test('estrada nivela o leito transversal, conserva o exterior e retorna regiões para uma transação', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map()),
    campo = estado.campo
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) campo.alturas[z * 65 + x] = 10 + (x - 32) * 0.05 + (z - 32) * 0.25
  const antes = clonarEstadoDoTerreno(estado),
    r = prepararOperacaoDeCaminho(
      { ...comum, tipo: 'estrada', molde: { borda: 2, deslocamento: -0.2, suavizacao: 8 } },
      estado,
    )
  expect(estado).toEqual(antes)
  expect(r.regioes.alturas).not.toBeNull()
  const novo = r.terreno!
  expect(novo.campo.alturas[31 * 65 + 32]).toBeCloseTo(novo.campo.alturas[33 * 65 + 32]!, 10)
  expect(novo.campo.alturas[52 * 65 + 32]).toBe(antes.campo.alturas[52 * 65 + 32]!)
  expect(novo.pintura).toEqual(antes.pintura)
  expect(novo.buracos).toEqual(antes.buracos)
})
test('ponte mede o vão e avisa quando o terreno invade; não modifica o campo', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map())
  const r = prepararOperacaoDeCaminho(
    { ...comum, tipo: 'ponte', cotas: { de: 12, ate: 12 } },
    estado,
  )
  expect(r.resumo.maiorVao).toBeCloseTo(2, 10)
  expect(r.resumo.atravessa).toBe(false)
  estado.campo.alturas[32 * 65 + 32] = 15
  const obstruida = prepararOperacaoDeCaminho(
    { ...comum, tipo: 'ponte', cotas: { de: 12, ate: 12 } },
    estado,
  )
  expect(obstruida.resumo.atravessa).toBe(true)
  expect(obstruida.resumo.avisos.length).toBeGreaterThan(0)
  expect(estado.campo.alturas[32 * 65 + 32]).toBe(15)
})
test('estrada exige campo carregado, controles na cobertura e orçamento antes de copiar', () => {
  expect(() => prepararOperacaoDeCaminho({ ...comum, tipo: 'estrada' }, null)).toThrow('terreno')
  const estado = abrirEdicaoDeTerreno(base, new Map())
  expect(() =>
    prepararOperacaoDeCaminho(
      {
        ...comum,
        tipo: 'estrada',
        pontos: [
          { x: -40, z: 0 },
          { x: 0, z: 0 },
        ],
      },
      estado,
    ),
  ).toThrow('fora')
  const grande = abrirEdicaoDeTerreno(
    { ...base, origem: { x: 0, z: 0 }, colunas: 1536, linhas: 1536 },
    new Map(),
  )
  expect(() =>
    prepararOperacaoDeCaminho(
      {
        ...comum,
        tipo: 'estrada',
        pontos: [
          { x: 4, z: 4 },
          { x: 1532, z: 1532 },
        ],
      },
      grande,
    ),
  ).toThrow('trechos menores')
  expect(grande.campo.alturas.every((h) => h === 10)).toBe(true)
})
test('controle inválido, praça cruzada e número excessivo de módulos não publicam um resultado', () => {
  expect(() =>
    prepararOperacaoDeCaminho(
      {
        ...comum,
        tipo: 'trilha',
        pontos: [
          { x: 0, z: 0 },
          { x: 0, z: 0 },
        ],
      },
      null,
    ),
  ).toThrow()
  expect(() =>
    prepararOperacaoDeCaminho(
      {
        ...comum,
        tipo: 'praca',
        pontos: [
          { x: 0, z: 0 },
          { x: 4, z: 4 },
          { x: 0, z: 4 },
          { x: 4, z: 0 },
        ],
      },
      null,
    ),
  ).toThrow()
  expect(() =>
    prepararOperacaoDeCaminho(
      {
        ...comum,
        tipo: 'muro',
        comprimentoDoModulo: 0.05,
        pontos: [
          { x: 0, z: 0 },
          { x: 2000, z: 0 },
        ],
      },
      null,
    ),
  ).toThrow('peças')
})

test('estrada fechada molda também o lance de fechamento sem alterar pintura ou buracos', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map())
  estado.buracos.celulas[100] = 1
  estado.pintura.pesos[20] = 123
  const antes = clonarEstadoDoTerreno(estado)
  const r = prepararOperacaoDeCaminho(
    {
      ...comum,
      tipo: 'estrada',
      fechada: true,
      pontos: [
        { x: -8, z: -8 },
        { x: 8, z: -8 },
        { x: 8, z: 8 },
        { x: -8, z: 8 },
      ],
      molde: { borda: 2, deslocamento: -1, suavizacao: 0 },
    },
    estado,
  )
  expect(r.terreno!.campo.alturas[32 * 65 + 24]).toBe(9)
  expect(r.terreno!.pintura).toEqual(antes.pintura)
  expect(r.terreno!.buracos).toEqual(antes.buracos)
  expect(estado).toEqual(antes)
})

test('prévia informa limite de altura e preserva os controles de uma curva suave', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map())
  const pontos = [
    { x: -12, z: 0 },
    { x: 0, z: 4 },
    { x: 12, z: 0 },
  ]
  const entrada = {
    ...comum,
    pontos,
    tipo: 'estrada',
    suave: true,
    molde: { deslocamento: 100, suavizacao: 0 },
  }
  const r = prepararOperacaoDeCaminho(entrada, estado)
  expect(r.caminho.pontos).toEqual(pontos)
  expect(r.resumo.comprimento).toBeGreaterThan(25)
  expect(r.resumo.avisos).toHaveLength(1)
  expect(Math.max(...r.terreno!.campo.alturas)).toBe(60)
  expect(estado.campo.alturas.every((h) => h === 10)).toBe(true)
})

test('praça pequena longe da origem conserva uma área utilizável', () => {
  const r = prepararOperacaoDeCaminho(
    {
      ...comum,
      tipo: 'praca',
      pontos: [
        { x: 99990, z: 99990 },
        { x: 99990.1, z: 99990 },
        { x: 99990.1, z: 99990.1 },
        { x: 99990, z: 99990.1 },
      ],
    },
    null,
  )
  expect(r.resumo.area).toBeCloseTo(0.01, 8)
})
