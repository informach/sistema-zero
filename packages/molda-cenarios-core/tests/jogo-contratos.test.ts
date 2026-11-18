import { expect, test } from 'bun:test'
import { criarDocumentoVazio, executarLote, inverterLote, validarDocumento } from '../src/v2'

const ponto = (id: string, configuracao?: unknown) => ({
  id,
  nome: id,
  grupo: null,
  oculto: false,
  bloqueado: false,
  posicao: { x: 0, y: 0, z: 0 },
  giro: 0,
  noChao: true,
  objeto: null,
  ...(configuracao ? { configuracao } : {}),
})

test('marcadores antigos e configurações de jogo coexistem sem reescrever pontos antigos', () => {
  const d = criarDocumentoVazio('d', 'Jogo')
  const marcadores = [
    ponto('antigo'),
    ponto('inicio', { tipo: 'inicio', principal: true }),
    ponto('zona', { tipo: 'zona', forma: { tipo: 'caixa', tamanho: { x: 2, y: 3, z: 4 } } }),
    ponto('rota', {
      tipo: 'rota',
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 1, z: 2 },
      ],
      fechada: false,
      seguirTerreno: true,
    }),
    ponto('camera', { tipo: 'camera', alvo: { x: 0, y: 0, z: -4 }, campoDeVisao: 48 }),
    ponto('luz', {
      tipo: 'luz',
      luz: {
        tipo: 'pontual',
        cor: '#ffeebb',
        intensidade: 12,
        alcance: 8,
        decaimento: 2,
        sombra: false,
      },
    }),
    ponto('regua', { tipo: 'regua', fim: { x: 3, y: 4, z: 0 } }),
    ponto('escala', { tipo: 'escala', altura: 1.16 }),
  ]
  const novo = validarDocumento({ ...d, marcadores })
  expect<unknown>(novo.marcadores).toEqual(marcadores)
  const depois = executarLote(
    { documento: d, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: novo.marcadores.map((marcador) => ({ tipo: 'marcador.definir', marcador })),
    },
  ).documento
  expect(depois).toEqual(novo)
  expect(
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, depois) },
    ).documento,
  ).toEqual(d)
})

test('configurações de jogo inválidas são recusadas antes de uma revisão', () => {
  const d = criarDocumentoVazio('d', 'Limites')
  for (const configuracao of [
    { tipo: 'zona', forma: { tipo: 'esfera', raio: 0 } },
    {
      tipo: 'zona',
      forma: {
        tipo: 'poligono',
        altura: 2,
        pontos: [
          { x: 0, z: 0 },
          { x: 2, z: 2 },
          { x: 0, z: 2 },
          { x: 2, z: 0 },
        ],
      },
    },
    { tipo: 'rota', pontos: [{ x: 0, y: 0, z: 0 }], fechada: false, seguirTerreno: true },
    {
      tipo: 'rota',
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ],
      fechada: false,
      seguirTerreno: false,
    },
    { tipo: 'camera', alvo: { x: 0, y: 0, z: 0 }, campoDeVisao: 48 },
    { tipo: 'camera', alvo: { x: 0, y: 1, z: 0 }, campoDeVisao: 0 },
    {
      tipo: 'luz',
      luz: { tipo: 'foco', cor: '#fff', intensidade: Infinity, alcance: 4, sombra: true },
    },
    { tipo: 'escala', altura: -1 },
    { tipo: 'regua', fim: { x: NaN, y: 0, z: 0 } },
  ])
    expect(() =>
      validarDocumento({ ...d, marcadores: [ponto('invalido', configuracao)] }),
    ).toThrow()
  expect(d.marcadores).toEqual([])
})

test('início principal e orçamento de luzes são conferidos no conjunto do documento', () => {
  const d = criarDocumentoVazio('d', 'Orçamento')
  expect(() =>
    validarDocumento({
      ...d,
      marcadores: [
        ponto('a', { tipo: 'inicio', principal: true }),
        ponto('b', { tipo: 'inicio', principal: true }),
      ],
    }),
  ).toThrow('principal')
  expect(() =>
    validarDocumento({
      ...d,
      marcadores: [
        ponto('a', { tipo: 'inicio', principal: true }),
        ponto('b', { tipo: 'inicio', principal: false }),
      ],
    }),
  ).not.toThrow()
  const luzes = Array.from({ length: 33 }, (_, i) =>
    ponto(`l${i}`, {
      tipo: 'luz',
      luz: {
        tipo: 'pontual',
        cor: '#fff4dd',
        intensidade: 10,
        alcance: 5,
        decaimento: 2,
        sombra: false,
      },
    }),
  )
  expect(() => validarDocumento({ ...d, marcadores: luzes })).toThrow('32 luzes')
  for (const m of luzes.slice(0, 5))
    Object.assign(m.configuracao as object, {
      luz: {
        tipo: 'pontual',
        cor: '#fff4dd',
        intensidade: 10,
        alcance: 5,
        decaimento: 2,
        sombra: true,
      },
    })
  expect(() => validarDocumento({ ...d, marcadores: luzes.slice(0, 5) })).toThrow(
    '4 luzes com sombra',
  )
})
