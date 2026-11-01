import { describe, expect, test } from 'bun:test'
import type {
  ConferenciaDoManifesto,
  DesafioDoManifesto,
  ManifestoDeDesafios,
  ResumoDoDesafio,
} from '@sistemazero/arquipelago-contracts'
import {
  manifestFileName,
  manifestScopeLabel,
  mergeConferences,
  missingFromManifest,
  parseChallengeManifest,
  splitManifest,
} from '../src/challenge-manifest'

const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const item = (slug: string, over: Partial<DesafioDoManifesto> = {}): DesafioDoManifesto => ({
  slug,
  publico: 'kids',
  ilha: 'bosque',
  tipo: 'quadro-das-cores',
  quadro: 1,
  ordem: 0,
  publicar: true,
  conteudo: {
    versao: 1,
    titulo: `Desafio ${slug}`,
    enunciado: 'Faça o bicho chegar.',
    dicas: [],
    projetoInicial: projeto,
    gabarito: projeto,
    objetivos: [{ id: 'o1', label: 'Chega', rule: { type: 'usesBlock', block: 'x' } }],
    recompensa: { cor: true, moedas: 20, moedasExtra: 0 },
    blocosManuais: { acrescentar: [], retirar: [] },
  },
  ...over,
})
const manifesto = (
  desafios: DesafioDoManifesto[],
  escopo?: ManifestoDeDesafios['escopo'],
): ManifestoDeDesafios => ({
  formato: 'arquipelago-desafios',
  versao: 1,
  ...(escopo ? { escopo } : {}),
  desafios,
})
const doDia = (slug: string) => item(slug, { tipo: 'desafio-do-dia', quadro: null })

describe('ler o arquivo', () => {
  test('aceita o manifesto válido', () => {
    const r = parseChallengeManifest(JSON.stringify(manifesto([item('corrida')], 'ilha')))
    expect(r.ok && r.manifest.desafios[0]?.slug).toBe('corrida')
  })

  test('diz o que está errado e em qual desafio, com o nome do campo em português', () => {
    expect(parseChallengeManifest('{ "formato": ')).toEqual({
      ok: false,
      errors: ['O arquivo não é um JSON válido. Confira vírgulas e chaves.'],
    })
    const outro = parseChallengeManifest(JSON.stringify({ formato: 'outra-coisa', desafios: [] }))
    expect(!outro.ok && outro.errors[0]).toContain('não é um manifesto de desafios')
    const semTitulo = manifesto([item('corrida'), item('pedras', { quadro: 2 })])
    ;(semTitulo.desafios[1]?.conteudo as { titulo: string }).titulo = ''
    const r = parseChallengeManifest(JSON.stringify(semTitulo))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toStartWith('Desafio 2 "pedras", conteúdo › título:')
  })

  test('as regras do arquivo inteiro também chegam (slug repetido)', () => {
    const r = parseChallengeManifest(
      JSON.stringify(manifesto([item('a'), item('a', { quadro: 2 })])),
    )
    expect(!r.ok && r.errors.join(' ')).toContain('aparece duas vezes')
  })
})

describe('dividir em lotes', () => {
  test('poucos desafios por lote, os do Quadro das Cores de uma ilha sempre juntos', () => {
    const m = manifesto([
      item('q1'),
      doDia('d1'),
      item('q2', { quadro: 2 }),
      doDia('d2'),
      item('v1', { ilha: 'vila-doce' }),
      doDia('d3'),
      item('q3', { quadro: 3 }),
    ])
    const lotes = splitManifest(m, { bytes: 1_000_000, items: 4 })
    expect(lotes.map((l) => l.desafios.map((d) => d.slug))).toEqual([
      ['q1', 'q2', 'q3', 'd1'],
      ['d2', 'v1', 'd3'],
    ])
    // Cada lote continua sendo um manifesto do mesmo escopo, e nenhum desafio some.
    expect(lotes.flatMap((l) => l.desafios).length).toBe(m.desafios.length)
  })

  test('um grupo maior que o lote vai sozinho; o tamanho em bytes também corta', () => {
    const quadros = [1, 2, 3, 4, 5, 6].map((q) => item(`q${q}`, { quadro: q }))
    const lotes = splitManifest(manifesto([doDia('d1'), ...quadros]), {
      bytes: 1_000_000,
      items: 4,
    })
    expect(lotes.map((l) => l.desafios.length)).toEqual([1, 6])
    const grande = JSON.stringify({ manifesto: manifesto([doDia('d1')]) }).length
    const porTamanho = splitManifest(manifesto([doDia('d1'), doDia('d2'), doDia('d3')]), {
      bytes: grande + 50,
      items: 10,
    })
    expect(porTamanho.map((l) => l.desafios.length)).toEqual([1, 1, 1])
  })
})

test('juntar as prévias dos lotes soma as contagens e mantém a ordem', () => {
  const parte = (slug: string, acao: 'criar' | 'igual'): ConferenciaDoManifesto => ({
    impressao: slug,
    itens: [
      {
        slug,
        titulo: slug,
        publico: 'kids',
        ilha: 'bosque',
        tipo: 'desafio-do-dia',
        quadro: null,
        acao,
        id: null,
        conflito: null,
        analise: null,
        publica: acao === 'criar',
      },
    ],
    contagem: {
      criar: acao === 'criar' ? 1 : 0,
      atualizar: 0,
      igual: acao === 'igual' ? 1 : 0,
      conflito: 0,
      comProblema: 0,
      publica: acao === 'criar' ? 1 : 0,
    },
  })
  const junto = mergeConferences([parte('a', 'criar'), parte('b', 'igual')])
  expect(junto.itens.map((i) => i.slug)).toEqual(['a', 'b'])
  expect(junto.contagem).toEqual({
    criar: 1,
    atualizar: 0,
    igual: 1,
    conflito: 0,
    comProblema: 0,
    publica: 1,
  })
})

describe('o que o arquivo não traz', () => {
  const linha = (slug: string, over: Partial<ResumoDoDesafio> = {}): ResumoDoDesafio => ({
    id: crypto.randomUUID(),
    slug,
    publico: 'kids',
    ilha: 'bosque',
    tipo: 'quadro-das-cores',
    quadro: 1,
    ordem: 0,
    titulo: slug,
    situacao: 'publicado',
    revisao: 1,
    revisaoPublicada: 1,
    alteradoDepoisDePublicar: false,
    atualizadoEm: new Date().toISOString(),
    ...over,
  })
  const cadastro = [
    linha('corrida'),
    linha('antigo'),
    linha('arquivado', { situacao: 'arquivado' }),
    linha('da-vila', { ilha: 'vila-doce' }),
    linha('adulto', { publico: 'adulto' }),
  ]

  test('o pacote da ilha aponta só os da mesma ilha e público, fora os arquivados', () => {
    const m = manifesto([item('corrida')], 'ilha')
    expect(missingFromManifest(m, cadastro).map((r) => r.slug)).toEqual(['antigo'])
  })

  test('o pacote do jogo olha todas as ilhas do público do arquivo', () => {
    const m = manifesto([item('corrida')], 'jogo')
    expect(missingFromManifest(m, cadastro).map((r) => r.slug)).toEqual(['antigo', 'da-vila'])
  })

  test('um desafio só, ou arquivo sem escopo, nunca aponta nada', () => {
    expect(missingFromManifest(manifesto([item('corrida')], 'desafio'), cadastro)).toEqual([])
    expect(missingFromManifest(manifesto([item('corrida')]), cadastro)).toEqual([])
  })
})

test('nome do arquivo e descrição do escopo', () => {
  expect(manifestFileName(manifesto([item('corrida')], 'desafio'))).toBe('desafio-corrida.json')
  expect(manifestFileName(manifesto([item('corrida')], 'ilha'))).toBe('desafios-kids-bosque.json')
  expect(manifestFileName(manifesto([item('a'), item('b', { publico: 'adulto' })], 'jogo'))).toBe(
    'desafios-kids-e-adulto-jogo.json',
  )
  expect(manifestScopeLabel(manifesto([item('a'), doDia('b')], 'ilha'))).toBe(
    'Bosque dos Bichos: 2 desafios',
  )
  expect(manifestScopeLabel(manifesto([item('a')], 'jogo'))).toBe('O jogo inteiro: 1 desafio')
})
