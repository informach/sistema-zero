import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  comandosParaGuardarMarcador,
  mudarApoioDoMarcador,
  NOMES_JOGO,
  novoMarcador,
  tipoDoMarcador,
} from '../src/oficina/jogo-formulario'
import {
  comandosParaPropriedades,
  linhasDasPropriedades,
  propriedadesDasLinhas,
} from '../src/oficina/propriedades-formulario'

test('todas as ferramentas criam descritores reais, com altura nativa e sem inferência por nome', () => {
  const doc = criarDocumentoVazio('d', 'Jogo')
  for (const tipo of Object.keys(NOMES_JOGO) as (keyof typeof NOMES_JOGO)[]) {
    const m = novoMarcador(doc, tipo, `m/${tipo}`, { x: 2, y: 3, z: 4 }, 1.17)
    expect(tipoDoMarcador(m)).toBe(tipo)
    expect(m.posicao).toEqual({ x: 2, y: 3, z: 4 })
    const fim = executarLote(
      { documento: doc, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: comandosParaGuardarMarcador(doc, { ...m, nome: 'Nome livre' }),
      },
    )
    expect(tipoDoMarcador(fim.documento.marcadores[0]!)).toBe(tipo)
    expect(comandosParaGuardarMarcador(fim.documento, fim.documento.marcadores[0]!)).toEqual([])
    if (tipo === 'escala') expect(m.configuracao).toEqual({ tipo: 'escala', altura: 1.17 })
  }
})
test('trocar início principal usa um lote reversível e não destranca o início anterior', () => {
  const doc = criarDocumentoVazio('d', 'Inícios'),
    primeiro = novoMarcador(doc, 'inicio', 'a', { x: 0, y: 0, z: 0 })
  doc.marcadores = [primeiro]
  const segundo = novoMarcador(doc, 'inicio', 'b', { x: 3, y: 0, z: 0 })
  expect(segundo.configuracao).toEqual({ tipo: 'inicio', principal: false })
  segundo.configuracao = { tipo: 'inicio', principal: true }
  const comandos = comandosParaGuardarMarcador(doc, segundo),
    fim = executarLote({ documento: doc, revisao: 0 }, { revisaoEsperada: 0, comandos }),
    inversos = inverterLote(doc, fim.documento)
  expect(
    fim.documento.marcadores
      .filter((m) => m.configuracao?.tipo === 'inicio' && m.configuracao.principal)
      .map((m) => m.id),
  ).toEqual(['b'])
  expect(executarLote(fim, { revisaoEsperada: 1, comandos: inversos }).documento).toEqual(doc)
  primeiro.bloqueado = true
  expect(() =>
    executarLote({ documento: doc, revisao: 0 }, { revisaoEsperada: 0, comandos }),
  ).toThrow()
  expect(primeiro.configuracao).toEqual({ tipo: 'inicio', principal: true })
})
test('trocar apoio conserva a altura mundial e os controles locais', () => {
  const doc = criarDocumentoVazio('d', 'Apoio')
  doc.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  const fonte = (x: number) => x / 2,
    m = novoMarcador(doc, 'rota', 'r', { x: 4, y: 3, z: 0 }),
    apoiado = mudarApoioDoMarcador(doc, m, true, fonte)
  expect(apoiado.posicao.y).toBe(1)
  expect(transformacaoDoMarcador(doc, apoiado, fonte).posicao.y).toBe(3)
  expect(mudarApoioDoMarcador(doc, apoiado, false, fonte)).toEqual(m)
  expect(apoiado.configuracao).toEqual(m.configuracao)
})
test('propriedades preservam tipos e recusam duplicação, números vazios e valores inválidos', () => {
  const p = { texto: 'missão', numero: 0, ligado: false }
  expect(propriedadesDasLinhas(linhasDasPropriedades(p))).toEqual(p)
  expect(propriedadesDasLinhas([{ chave: 'distancia', tipo: 'numero', valor: '1,25' }])).toEqual({
    distancia: 1.25,
  })
  expect(() => propriedadesDasLinhas([{ chave: 'n', tipo: 'numero', valor: '' }])).toThrow('número')
  expect(() => propriedadesDasLinhas([{ chave: 'n', tipo: 'numero', valor: Infinity }])).toThrow(
    'número',
  )
  expect(() => propriedadesDasLinhas([{ chave: 'a', tipo: 'booleano', valor: 'false' }])).toThrow(
    'valor',
  )
  expect(() =>
    propriedadesDasLinhas([
      { chave: 'a', tipo: 'texto', valor: 'um' },
      { chave: ' a ', tipo: 'texto', valor: 'dois' },
    ]),
  ).toThrow('repetida')
  expect(() =>
    propriedadesDasLinhas([{ chave: 'inválida com espaço', tipo: 'texto', valor: 'x' }]),
  ).toThrow()
})
test('editar propriedades usa comandos normais, não perde pose e respeita trava de entidade', () => {
  const doc = criarDocumentoVazio('d', 'Props'),
    m = novoMarcador(doc, 'camera', 'm', { x: 2, y: 3, z: 4 })
  doc.marcadores = [m]
  const comandos = comandosParaPropriedades(doc, 'm', { referencia: 'vila', disponivel: false }),
    fim = executarLote({ documento: doc, revisao: 0 }, { revisaoEsperada: 0, comandos })
  expect(fim.documento.marcadores[0]).toEqual({
    ...m,
    propriedades: { referencia: 'vila', disponivel: false },
  })
  expect(
    comandosParaPropriedades(fim.documento, 'm', { referencia: 'vila', disponivel: false }),
  ).toEqual([])
  m.bloqueado = true
  expect(() =>
    executarLote({ documento: doc, revisao: 0 }, { revisaoEsperada: 0, comandos }),
  ).toThrow()
})
