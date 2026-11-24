import { describe, expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  type DocumentoDeCenario,
  executarLote,
  type RegiaoDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  alternarVizinha,
  caixaDeDoisPontos,
  caixaPelosCantos,
  cantosDaRegiao,
  comandosParaGuardarRegiao,
  encaixarRegiao,
  MENOR_LADO_DE_REGIAO,
  medidasDaRegiao,
  nomeLivreDeRegiao,
  novaRegiao,
  problemasDaRegiao,
  regiaoComMedidas,
} from '../src/oficina/regioes-formulario'

/**
 * O formulário da ferramenta Regiões (lote 7 da conclusão, 22/11/2026): dois cliques criam, as
 * medidas e os cantos mudam a caixa, as vizinhas ficam em par e os recados do núcleo aparecem
 * antes de guardar. O documento vazio tem um plano de 64 x 64 m (de -32 a 32).
 */

const plano = (regioes?: RegiaoDeCenario[]): DocumentoDeCenario => ({
  ...criarDocumentoVazio('ilha', 'Ilha'),
  base: { tipo: 'plano', largura: 64, comprimento: 64 },
  ...(regioes ? { regioes } : {}),
})

const vila: RegiaoDeCenario = {
  id: 'vila',
  nome: 'Vila',
  caixa: { x0: -32, z0: -32, x1: 0, z1: 32 },
  vizinhas: [],
}

describe('criar com dois cliques', () => {
  test('a caixa entre os cliques, presa na base e com o menor lado garantido', () => {
    expect(caixaDeDoisPontos(plano(), { x: 10, z: -5 }, { x: -3, z: 7.257 })).toEqual({
      x0: -3,
      z0: -5,
      x1: 10,
      z1: 7.26,
    })
    expect(caixaDeDoisPontos(plano(), { x: 31, z: 0 }, { x: 50, z: 10 })).toEqual({
      x0: 31,
      z0: 0,
      x1: 32,
      z1: 10,
    })
    const ponto = caixaDeDoisPontos(plano(), { x: 0, z: 0 }, { x: 0, z: 0 })
    expect(ponto.x1 - ponto.x0).toBe(MENOR_LADO_DE_REGIAO)
  })

  test('a região nova ganha um nome livre e as vizinhas que encostam nela', () => {
    const doc = plano([vila])
    const r = novaRegiao(doc, 'praia', { x: 1, z: -10 }, { x: 20, z: 10 })
    expect(r.nome).toBe('Região 1')
    expect(r.vizinhas).toEqual(['vila'])
    expect(nomeLivreDeRegiao([{ ...vila, nome: 'região 1' }])).toBe('Região 2')
  })
})

describe('medidas, cantos e vizinhas', () => {
  test('mudar as medidas mantém o canto e respeita o menor lado', () => {
    const r = regiaoComMedidas(plano(), vila, 10, 2)
    expect(r.caixa).toEqual({ x0: -32, z0: -32, x1: -22, z1: -28 })
    expect(medidasDaRegiao(r)).toEqual({ largura: 10, comprimento: 4 })
  })

  test('arrastar um canto leva as duas bordas dele; cruzar não vira caixa sem área', () => {
    const cantos = cantosDaRegiao(vila.caixa)
    cantos[2] = { x: -10, z: 20 }
    expect(caixaPelosCantos(plano(), vila.caixa, cantos, 2)).toEqual({
      x0: -32,
      z0: -32,
      x1: -10,
      z1: 20,
    })
    const cruzado = cantosDaRegiao(vila.caixa)
    cruzado[0] = { x: 10, z: -32 }
    const c = caixaPelosCantos(plano(), vila.caixa, cruzado, 0)
    expect(c.x1 - c.x0).toBeGreaterThanOrEqual(MENOR_LADO_DE_REGIAO)
  })

  test('as vizinhas: liga, desliga e para em 8', () => {
    let r = alternarVizinha(vila, 'a', true)
    r = alternarVizinha(r, 'b', true)
    expect(alternarVizinha(r, 'a', false).vizinhas).toEqual(['b'])
    let cheia = vila
    for (let i = 0; i < 9; i++) cheia = alternarVizinha(cheia, `v${i}`, true)
    expect(cheia.vizinhas).toHaveLength(8)
  })

  test('encaixar encosta a borda que está a até 2 m da vizinha', () => {
    const doc = plano([vila])
    const praia: RegiaoDeCenario = {
      id: 'praia',
      nome: 'Praia',
      caixa: { x0: 1.5, z0: -10, x1: 20, z1: 10 },
      vizinhas: [],
    }
    expect(encaixarRegiao(doc, praia).caixa.x0).toBe(0)
  })
})

describe('guardar', () => {
  test('o lote guarda as duas pontas da vizinhança e o núcleo aceita', () => {
    const doc = plano([vila])
    const praia: RegiaoDeCenario = {
      id: 'praia',
      nome: '  Praia ',
      caixa: { x0: 0, z0: -10, x1: 20, z1: 10 },
      vizinhas: ['vila'],
    }
    expect(problemasDaRegiao(doc, praia)).toEqual([])
    const depois = executarLote(
      { documento: doc, revisao: 0 },
      { revisaoEsperada: 0, comandos: comandosParaGuardarRegiao(doc, praia) },
    )
    expect(depois.documento.regioes?.map((r) => [r.nome, r.vizinhas])).toEqual([
      ['Vila', ['praia']],
      ['Praia', ['vila']],
    ])
  })

  test('os recados de sobreposição, nome repetido e fora da base', () => {
    const doc = plano([vila])
    const ruim: RegiaoDeCenario = {
      id: 'ruim',
      nome: 'vila',
      caixa: { x0: -5, z0: -5, x1: 40, z1: 5 },
      vizinhas: [],
    }
    const problemas = problemasDaRegiao(doc, ruim)
    expect(problemas).toContain('Já existe uma região chamada vila.')
    expect(problemas).toContain('A região vila sai da base do cenário.')
    expect(problemas.some((p) => p.includes('se sobrepõem'))).toBe(true)
    for (const p of problemas) expect(p).not.toContain('—')
  })
})

test('relevo grande demais para regiões: o painel avisa antes de guardar (revisão do lote 5)', () => {
  const grande: DocumentoDeCenario = {
    ...criarDocumentoVazio('ilha', 'Ilha'),
    base: {
      tipo: 'terreno',
      cobertura: 'grade',
      origem: { x: 0, z: 0 },
      passo: 2,
      colunas: 4096,
      linhas: 4096,
      min: 0,
      max: 10,
      fundo: 0,
      pecas: [],
    } as unknown as DocumentoDeCenario['base'],
  }
  const r: RegiaoDeCenario = {
    id: 'a',
    nome: 'A',
    caixa: { x0: 0, z0: 0, x1: 100, z1: 100 },
    vizinhas: [],
  }
  expect(problemasDaRegiao(grande, r)[0]).toContain('grande demais para dividir em regiões')
})

describe('revisão do lote 7', () => {
  // Uma Vila (0..32 em x) com oito vizinhas pequenas em cima dela, e a nona região encostada.
  const oito = Array.from({ length: 8 }, (_, i) => ({
    id: `v${i}`,
    nome: `V${i}`,
    caixa: { x0: i * 4, z0: -8, x1: i * 4 + 4, z1: -4 },
    vizinhas: ['cheia'],
  }))
  const cheia: RegiaoDeCenario = {
    id: 'cheia',
    nome: 'Vila',
    caixa: { x0: 0, z0: -4, x1: 32, z1: 8 },
    vizinhas: oito.map((r) => r.id),
  }
  const doc = plano([cheia, ...oito])

  test('a nona região encostada não ganha como vizinha quem já tem oito', () => {
    const nova = novaRegiao(doc, 'nona', { x: 0, z: 8 }, { x: 10, z: 20 })
    expect(nova.vizinhas).not.toContain('cheia')
    expect(problemasDaRegiao(doc, nova)).toEqual([])
  })

  test('marcar à mão a vizinha cheia dá o recado em português antes da prévia', () => {
    const nova = novaRegiao(doc, 'nona', { x: 0, z: 8 }, { x: 10, z: 20 })
    expect(problemasDaRegiao(doc, alternarVizinha(nova, 'cheia', true))).toEqual([
      'A região Vila tem 9 vizinhas. Uma região pode ter até 8.',
    ])
  })

  test('apagar um canto (Delete) não desloca a região: ela continua com os quatro', () => {
    const antes = { x0: 0, z0: 0, x1: 20, z1: 10 }
    const tres = cantosDaRegiao(antes).slice(1)
    expect(caixaPelosCantos(plano(), antes, tres, 0)).toEqual(antes)
    expect(caixaPelosCantos(plano(), antes, tres, null)).toEqual(antes)
  })
})

/**
 * Full review final (22/11/2026): o arredondamento aos centímetros não pode tirar a região da base
 * nem a pôr por cima da vizinha. A borda da base pode ser fracionária (um plano de 64,015 m vai de
 * -32,0075 a 32,0075, e 32,0075 arredondado dá 32,01, fora dela), e uma vizinha gravada por comando pode ter mais casas que os centímetros.
 */
describe('arredondar sem sair da base nem invadir a vizinha', () => {
  const fracionario = (regioes?: RegiaoDeCenario[]): DocumentoDeCenario => ({
    ...criarDocumentoVazio('ilha', 'Ilha'),
    base: { tipo: 'plano', largura: 64.015, comprimento: 64.015 },
    ...(regioes ? { regioes } : {}),
  })

  test('dois cliques na borda de uma base fracionária ficam dentro dela', () => {
    const doc = fracionario()
    const caixa = caixaDeDoisPontos(doc, { x: 20, z: 20 }, { x: 40, z: 40 })
    expect(caixa.x1).toBeLessThanOrEqual(32.0075)
    expect(caixa.z1).toBeLessThanOrEqual(32.0075)
    const r = novaRegiao(doc, 'canto', { x: 20, z: 20 }, { x: 40, z: 40 })
    const caixaBaixa = caixaDeDoisPontos(doc, { x: -40, z: -40 }, { x: -20, z: -20 })
    expect(caixaBaixa.x0).toBeGreaterThanOrEqual(-32.0075)
    expect(problemasDaRegiao(doc, r)).toEqual([])
  })

  test('arrastar um canto não arredonda a borda que encosta na vizinha', () => {
    // A vizinha termina em x = 10,005 (gravada por comando); a região começa ali, encostada.
    const vizinha: RegiaoDeCenario = {
      id: 'vizinha',
      nome: 'Vizinha',
      caixa: { x0: -20, z0: -20, x1: 10.005, z1: 20 },
      vizinhas: ['regiao'],
    }
    const regiao: RegiaoDeCenario = {
      id: 'regiao',
      nome: 'Região',
      caixa: { x0: 10.005, z0: -20, x1: 30, z1: 20 },
      vizinhas: ['vizinha'],
    }
    const doc = plano([vizinha, regiao])
    // Arrasta o canto (x1, z1): só as bordas x1 e z1 mudam.
    const cantos = cantosDaRegiao(regiao.caixa)
    cantos[2] = { x: 28.123, z: 18.456 }
    const caixa = caixaPelosCantos(doc, regiao.caixa, cantos, 2)
    expect(caixa.x0).toBe(10.005)
    expect(caixa.z0).toBe(-20)
    expect(caixa.x1).toBe(28.12)
    expect(caixa.z1).toBe(18.46)
    expect(problemasDaRegiao(doc, { ...regiao, caixa })).toEqual([])
    // Mudar a largura pelo campo mantém o canto de menor x e z como está.
    const medida = regiaoComMedidas(doc, regiao, 12, 40)
    expect(medida.caixa.x0).toBe(10.005)
    expect(problemasDaRegiao(doc, medida)).toEqual([])
  })
})
