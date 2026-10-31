import { describe, expect, test } from 'bun:test'
import {
  andarPedacos,
  COR_AO_ABRIR,
  corDoPonto,
  corMedia,
  DURACAO_DA_TINTA_S,
  pedacoDoPonto,
  pedacosPintados,
} from '../src/sistemas/cor-da-ilha'
import type { Quadro } from '../src/sistemas/quadro-das-cores'

const q = (estados: Quadro['estado'][]): Quadro[] =>
  estados.map((estado, i) => ({ numero: i + 1, estado, desafio: null }))

describe('a cor da ilha em seis pedaços', () => {
  test('só feito ganha cor; pronto, trancado e vazio esperam', () => {
    expect(
      pedacosPintados(q(['feito', 'disponivel', 'trancado', 'vazio', 'feito', 'disponivel'])),
    ).toEqual([1, 0, 0, 0, 1, 0])
  })

  test('primeiro acesso sem lista ou sem desafio conserva somente a cor-base da ponte', () => {
    expect(pedacosPintados(null)).toEqual([0, 0, 0, 0, 0, 0])
    expect(pedacosPintados(q(['vazio', 'vazio', 'vazio', 'vazio', 'vazio', 'vazio']))).toEqual([
      0, 0, 0, 0, 0, 0,
    ])
  })

  test('arquivar ou substituir publicação não tira posição conquistada', () => {
    expect(pedacosPintados(null, [1, 4])).toEqual([1, 0, 0, 1, 0, 0])
    expect(pedacosPintados(q(['disponivel', 'feito', 'vazio', 'trancado']), [1, 4])).toEqual([
      1, 1, 0, 1, 0, 0,
    ])
  })

  test('ponte fechada é cinza; aberta dá um pouco de cor; o pedaço feito, a cor inteira', () => {
    expect(corDoPonto(0, 1)).toBe(0)
    expect(corDoPonto(1, 0)).toBeCloseTo(COR_AO_ABRIR)
    expect(corDoPonto(1, 1)).toBe(1)
    expect(corMedia(1, [1, 1, 1, 0, 0, 0])).toBeCloseTo(COR_AO_ABRIR + (1 - COR_AO_ABRIR) / 2)
  })

  test('o pedaço 1 fica na chegada da ponte (+x do modelo) e os outros seguem em volta', () => {
    expect(pedacoDoPonto(10, 0).pedaco).toBe(0)
    expect(pedacoDoPonto(10, 0).dentro).toBeCloseTo(0.5)
    expect(pedacoDoPonto(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)).pedaco).toBe(1)
    expect(pedacoDoPonto(-10, 0.01).pedaco).toBe(3)
    expect(pedacoDoPonto(Math.cos(-Math.PI / 3), Math.sin(-Math.PI / 3)).pedaco).toBe(5)
  })

  test('a cor avança sem regredir; outra montagem reinicia a pintura para seu próprio perfil', () => {
    const atual = [0, 0, 1, 1, 0, 0]
    andarPedacos(atual, [1, 0, 0, 1, 0, 0], DURACAO_DA_TINTA_S / 2, false)
    expect(atual[0]).toBeCloseTo(0.5)
    expect(atual[2]).toBe(1)
    andarPedacos(atual, [1, 0, 0, 1, 0, 0], DURACAO_DA_TINTA_S, false)
    expect(atual[0]).toBe(1)
    const outro = [1, 1, 1, 1, 1, 1]
    andarPedacos(outro, [0, 1, 0, 1, 0, 1], 0.016, true)
    expect(outro).toEqual([0, 1, 0, 1, 0, 1])
  })
})
