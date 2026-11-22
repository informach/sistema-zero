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
