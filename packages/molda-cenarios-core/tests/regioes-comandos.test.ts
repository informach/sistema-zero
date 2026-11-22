import { describe, expect, test } from 'bun:test'
import {
  CenarioInvalido,
  criarDocumentoVazio,
  type EstadoDeCenario,
  executarLote,
  inverterLote,
  type RegiaoDeCenario,
} from '../src/v2'

/** Os comandos `regiao.definir` e `regiao.remover`, e o desfazer (lote 5 da conclusão, 22/11/2026). */
const regiao = (
  id: string,
  nome: string,
  caixa: [number, number, number, number],
  vizinhas: string[] = [],
): RegiaoDeCenario => ({
  id,
  nome,
  caixa: { x0: caixa[0], z0: caixa[1], x1: caixa[2], z1: caixa[3] },
  vizinhas,
})

const inicial = (): EstadoDeCenario => ({
  documento: criarDocumentoVazio('ilha', 'Ilha'),
  revisao: 0,
})

const vila = regiao('vila', 'Vila', [-128, -128, 0, 0], ['floresta'])
const floresta = regiao('floresta', 'Floresta', [0, -128, 128, 0], ['vila'])

describe('os comandos das regiões', () => {
  test('o par de vizinhas entra no mesmo lote; sozinho, ele é recusado', () => {
    const depois = executarLote(inicial(), {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'regiao.definir', regiao: vila },
        { tipo: 'regiao.definir', regiao: floresta },
      ],
    })
    expect(depois.documento.regioes).toEqual([vila, floresta])
    expect(depois.revisao).toBe(1)
    expect(() =>
      executarLote(inicial(), {
        revisaoEsperada: 0,
        comandos: [{ tipo: 'regiao.definir', regiao: vila }],
      }),
    ).toThrow(CenarioInvalido)
  })

  test('definir troca a região inteira pelo id', () => {
    const com = executarLote(inicial(), {
      revisaoEsperada: 0,
      comandos: [{ tipo: 'regiao.definir', regiao: regiao('vila', 'Vila', [0, 0, 10, 10]) }],
    })
    const renomeada = executarLote(com, {
      revisaoEsperada: 1,
      comandos: [{ tipo: 'regiao.definir', regiao: regiao('vila', 'Vilarejo', [0, 0, 20, 10]) }],
    })
    expect(renomeada.documento.regioes).toEqual([regiao('vila', 'Vilarejo', [0, 0, 20, 10])])
  })

  test('remover tira a região e o id dela das vizinhas; a última sai com o campo', () => {
    const com = executarLote(inicial(), {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'regiao.definir', regiao: vila },
        { tipo: 'regiao.definir', regiao: floresta },
      ],
    })
    const sem = executarLote(com, {
      revisaoEsperada: 1,
      comandos: [{ tipo: 'regiao.remover', id: 'floresta' }],
    })
    expect(sem.documento.regioes).toEqual([{ ...vila, vizinhas: [] }])
    const vazio = executarLote(sem, {
      revisaoEsperada: 2,
      comandos: [{ tipo: 'regiao.remover', id: 'vila' }],
    })
    expect('regioes' in vazio.documento).toBe(false)
    expect(() =>
      executarLote(vazio, {
        revisaoEsperada: 3,
        comandos: [{ tipo: 'regiao.remover', id: 'vila' }],
      }),
    ).toThrow('Elemento ausente: vila')
  })

  test('o desfazer devolve as regiões de antes, nos três sentidos (criar, mudar, apagar)', () => {
    const vazio = inicial()
    const com = executarLote(vazio, {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'regiao.definir', regiao: vila },
        { tipo: 'regiao.definir', regiao: floresta },
      ],
    })
    const mudada = executarLote(com, {
      revisaoEsperada: 1,
      comandos: [
        { tipo: 'regiao.remover', id: 'floresta' },
        { tipo: 'regiao.definir', regiao: regiao('vila', 'Vilarejo', [-128, -128, 10, 0]) },
      ],
    })
    const voltaDaMudanca = executarLote(mudada, {
      revisaoEsperada: 2,
      comandos: inverterLote(com.documento, mudada.documento),
    })
    expect(voltaDaMudanca.documento.regioes).toEqual(com.documento.regioes)
    const voltaDaCriacao = executarLote(com, {
      revisaoEsperada: 1,
      comandos: inverterLote(vazio.documento, com.documento),
    })
    expect('regioes' in voltaDaCriacao.documento).toBe(false)
    expect(inverterLote(com.documento, com.documento)).toEqual([])
  })
})
