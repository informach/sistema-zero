import { expect, test } from 'bun:test'
import {
  alteracoesDoGesto,
  apoioNaSuperficie,
  CaminhoSchema,
  capturarFragmento,
  colarFragmento,
  criarDocumentoVazio,
  estruturaDoCaminho,
  executarLote,
  inverterLote,
  transformacaoResolvida,
  validarDocumento,
} from '../src/v2'

function cena() {
  const d = criarDocumentoVazio('d', 'Ponte')
  d.formas = [{ id: 'f', nome: 'Objeto', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.caminhos = [
    CaminhoSchema.parse({
      id: 'ponte',
      nome: 'Ponte',
      tipo: 'ponte',
      grupo: null,
      bloqueado: false,
      oculto: false,
      acabamento: null,
      largura: 4,
      cotas: { de: 4, ate: 6 },
      pontos: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ],
    }),
  ]
  d.instancias = [
    {
      id: 'o',
      nome: 'Objeto',
      modelo: 'f',
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 5, y: 5, z: 1 },
        rotacao: { x: 0, y: 0.3, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  return d
}

test('apoio no tabuleiro acompanha cabeceiras, largura e deslocamento pelo contrato de objeto existente', () => {
  const d = cena(),
    o = d.instancias[0]!
  o.apoio = apoioNaSuperficie(d, 'ponte', o.transformacao.posicao, undefined, 'tabuleiro/0')
  validarDocumento(d)
  expect(o.apoio).toMatchObject({ tipo: 'objeto', objeto: 'ponte', parte: 'tabuleiro/0' })
  const via = d.caminhos[0]!
  if (via.tipo !== 'ponte') throw Error('Ponte esperada')
  via.pontos = [
    { x: 20, z: 10 },
    { x: 30, z: 10 },
  ]
  via.cotas = { de: 6, ate: 8 }
  via.largura = 8
  const t = transformacaoResolvida(d, o)
  expect(t.posicao.x).toBeCloseTo(25, 9)
  expect(t.posicao.y).toBeCloseTo(7, 9)
  expect(t.posicao.z).toBeCloseTo(12, 9)
  expect(t.rotacao).toEqual(o.transformacao.rotacao)
})

test('apoio em muro conformado mede contato relativo ao chão no ponto, não no pivô', () => {
  const d = cena()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 10,
    fundo: 0,
    pecas: [],
  }
  d.caminhos = [
    CaminhoSchema.parse({
      id: 'muro',
      nome: 'Muro',
      tipo: 'muro',
      grupo: null,
      bloqueado: false,
      oculto: false,
      acabamento: null,
      pontos: d.caminhos[0]!.pontos,
      largura: 0.3,
      altura: 2,
      comprimentoDoModulo: 10,
    }),
  ]
  const fonte = (x: number) => x * 0.1,
    o = d.instancias[0]!
  o.transformacao.posicao = { x: 3, y: 2.3, z: 0 }
  o.apoio = apoioNaSuperficie(d, 'muro', o.transformacao.posicao, fonte, 'modulo/0')
  d.caminhos[0] = CaminhoSchema.parse({ ...d.caminhos[0], altura: 3 })
  const t = transformacaoResolvida(d, o, (x) => fonte(x) + 2)
  expect(t.posicao.x).toBeCloseTo(3, 9)
  expect(t.posicao.y).toBeCloseTo(5.3, 9)
})

test('gesto mantém a parte e atualiza o contato; replay, undo e remoção respeitam o apoio', () => {
  const d = cena(),
    o = d.instancias[0]!
  o.apoio = apoioNaSuperficie(d, 'ponte', o.transformacao.posicao, undefined, 'tabuleiro/0')
  const novo = { ...o.transformacao, posicao: { x: 6, y: 5.2, z: 1 } },
    mudanca = alteracoesDoGesto(d, o, novo),
    atualizado = executarLote(
      { documento: d, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [{ tipo: 'instancia.atualizar', id: 'o', alteracoes: mudanca }],
      },
    ).documento
  expect(atualizado.instancias[0]!.apoio).toMatchObject({ parte: 'tabuleiro/0' })
  expect(transformacaoResolvida(atualizado, atualizado.instancias[0]!).posicao.y).toBeCloseTo(
    5.2,
    9,
  )
  expect(
    executarLote(
      { documento: atualizado, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, atualizado) },
    ).documento,
  ).toEqual(d)
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'caminho.remover', id: 'ponte' }] },
    ),
  ).toThrow('Apoio ausente')
})

test('copiar ponte e dependente remapeia parte e contato; copiar só dependente resolve posição mundial', () => {
  const d = cena(),
    o = d.instancias[0]!
  o.apoio = apoioNaSuperficie(d, 'ponte', o.transformacao.posicao, undefined, 'tabuleiro/0')
  const f = capturarFragmento(d, ['ponte', 'o'], 'e'),
    novo = colarFragmento(criarDocumentoVazio('n', 'N'), f, 'p', {
      x: f.ancora.x + 20,
      y: f.ancora.y + 2,
      z: f.ancora.z - 5,
    }),
    pose = transformacaoResolvida(novo, novo.instancias[0]!)
  expect(novo.instancias[0]!.apoio).toMatchObject({
    tipo: 'objeto',
    objeto: 'p/caminho/0',
    parte: 'tabuleiro/0',
  })
  expect(pose.posicao.x).toBeCloseTo(25, 9)
  expect(pose.posicao.y).toBeCloseTo(7, 9)
  expect(pose.posicao.z).toBeCloseTo(-4, 9)
  expect(capturarFragmento(d, ['o'], 'e').instancias[0]!.apoio).toEqual({ tipo: 'absoluto' })
})

test('validação recusa parte ausente, papel errado e parte aplicada em objeto comum', () => {
  const d = cena(),
    o = d.instancias[0]!
  o.apoio = { tipo: 'objeto', objeto: 'ponte', deslocamento: 0, contato: { x: 0, y: 0, z: 0 } }
  expect(() => validarDocumento(d)).toThrow('Parte')
  o.apoio = { ...o.apoio, parte: 'modelo/0' }
  expect(() => validarDocumento(d)).toThrow('Parte')
  d.instancias.push({ ...structuredClone(o), id: 'base', apoio: { tipo: 'absoluto' } })
  o.apoio = { ...o.apoio, objeto: 'base', parte: 'tabuleiro/0' }
  expect(() => validarDocumento(d)).toThrow('Parte')
})

test('apoio em pilar GLB lê a mesma parte real da consulta de superfícies e conserva projeção sem bytes', () => {
  const d = cena(),
    c = CaminhoSchema.parse({
      ...d.caminhos[0],
      acabamento: 'm',
      encaixeModelo: { eixo: 'x', pisoLocal: 0 },
      pilares: { espacamento: 5, largura: 0.3 },
    })
  d.caminhos = [c]
  d.modelos = [
    {
      id: 'm',
      modelo: 'm',
      biblioteca: 'b',
      digest: 'a'.repeat(64),
      volume: { min: { x: -5, y: -1, z: -2 }, max: { x: 5, y: 1, z: 2 } },
    },
  ]
  const partes = estruturaDoCaminho(c, () => -2, d.modelos[0]!.volume, {
      baseDoTabuleiro: () => 3.5,
    }).pecas,
    fonte = Object.assign(() => -2, {
      parteDoCaminho: (id: string, parte: string) =>
        id === c.id ? (partes.find((p) => p.chave === parte) ?? null) : null,
    }),
    pilar = partes.find((p) => p.chave === 'pilar/0')!,
    o = d.instancias[0]!
  o.transformacao.posicao = { ...pilar.transformacao.posicao, y: 3.5 }
  o.apoio = apoioNaSuperficie(d, c.id, o.transformacao.posicao, fonte, 'pilar/0')
  expect(transformacaoResolvida(d, o, fonte).posicao.y).toBeCloseTo(3.5, 9)
  expect(transformacaoResolvida(d, o).posicao).toEqual(o.transformacao.posicao)
})

test('parte indisponível ou transformação inválida não inventa uma superfície de apoio', () => {
  const d = cena(),
    o = d.instancias[0]!,
    ausente = Object.assign(() => 0, { parteDoCaminho: () => null })
  expect(() =>
    apoioNaSuperficie(d, 'ponte', o.transformacao.posicao, ausente, 'tabuleiro/0'),
  ).toThrow('sem superfície')
  const invalida = Object.assign(() => 0, {
    parteDoCaminho: () => ({
      noTerreno: false,
      transformacao: { ...o.transformacao, escala: { x: 0, y: 1, z: 1 } },
    }),
  })
  expect(() =>
    apoioNaSuperficie(d, 'ponte', o.transformacao.posicao, invalida, 'tabuleiro/0'),
  ).toThrow('transformação inválida')
})

test('contato que ultrapassa o mundo é recusado antes de gravar uma revisão', () => {
  const d = cena(),
    o = d.instancias[0]!
  o.apoio = {
    tipo: 'objeto',
    objeto: 'ponte',
    parte: 'tabuleiro/0',
    deslocamento: 0,
    contato: { x: 100000, y: 0, z: 0 },
  }
  expect(() => validarDocumento(d)).toThrow('limites da transformação')
})
