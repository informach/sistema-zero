import { describe, expect, test } from 'bun:test'
import { algumaCriancaVe, decidirAcesso, type PoliticaDeAcesso } from '../../src/domain/acesso'
import type { Jogador } from '../../src/domain/jogador'

const crianca: Jogador = {
  id: 'p1',
  publico: 'kids',
  contaId: 'c1',
  equipe: false,
  somenteLeitura: false,
}
const adulto: Jogador = { ...crianca, id: 'a1', publico: 'adulto', contaId: null }
const politica = (p: Partial<PoliticaDeAcesso>): PoliticaDeAcesso => ({
  modo: 'aberto',
  publicos: new Set(['kids']),
  lista: new Set(),
  ...p,
})

describe('quem vê o jogo', () => {
  test('desligado bloqueia todos, até a equipe', () => {
    expect(decidirAcesso(politica({ modo: 'desligado' }), crianca)).toEqual({
      liberado: false,
      motivo: 'desligado',
    })
    expect(
      decidirAcesso(politica({ modo: 'desligado' }), { ...crianca, equipe: true }).liberado,
    ).toBe(false)
  })

  test('modo aberto libera qualquer perfil Kids, sem exigir assinatura ou lista', () => {
    expect(decidirAcesso(politica({ modo: 'aberto', lista: new Set() }), crianca)).toEqual({
      liberado: true,
      motivo: null,
    })
  })

  test('público desligado', () => {
    expect(decidirAcesso(politica({}), adulto)).toEqual({
      liberado: false,
      motivo: 'publico-desligado',
    })
    expect(
      decidirAcesso(politica({ publicos: new Set(['kids', 'adulto']) }), adulto).liberado,
    ).toBe(true)
  })

  test('modo lista aceita o perfil ou a conta da família', () => {
    const lista = politica({ modo: 'lista' })
    expect(decidirAcesso(lista, crianca).motivo).toBe('fora-da-lista')
    expect(decidirAcesso({ ...lista, lista: new Set(['p1']) }, crianca).liberado).toBe(true)
    expect(decidirAcesso({ ...lista, lista: new Set(['c1']) }, crianca).liberado).toBe(true)
  })

  test('a equipe entra com o jogo ligado, em qualquer público e fora da lista', () => {
    const equipe = { ...adulto, equipe: true }
    expect(decidirAcesso(politica({ modo: 'lista' }), equipe).liberado).toBe(true)
  })
})

describe('alguma criança da família vê o jogo (cartão dos pais)', () => {
  const familia = { contaId: 'c1', equipe: false, perfis: ['p1', 'p2'] }

  test('modo lista: só com a criança (ou a conta) na lista', () => {
    const lista = politica({ modo: 'lista' })
    expect(algumaCriancaVe(lista, familia)).toBe(false)
    expect(algumaCriancaVe({ ...lista, lista: new Set(['p2']) }, familia)).toBe(true)
    expect(algumaCriancaVe({ ...lista, lista: new Set(['c1']) }, familia)).toBe(true)
    // A criança de outra família na lista não conta.
    expect(algumaCriancaVe({ ...lista, lista: new Set(['p9']) }, familia)).toBe(false)
  })

  test('desligado: ninguém vê, nem a família da equipe', () => {
    const desligado = politica({ modo: 'desligado', lista: new Set(['p1']) })
    expect(algumaCriancaVe(desligado, familia)).toBe(false)
    expect(algumaCriancaVe(desligado, { ...familia, equipe: true })).toBe(false)
  })

  test('aberto: vê com o público Kids ligado', () => {
    expect(algumaCriancaVe(politica({ modo: 'aberto' }), familia)).toBe(true)
    expect(algumaCriancaVe(politica({ publicos: new Set(['adulto']) }), familia)).toBe(false)
  })

  test('sem perfis, nenhuma criança vê', () => {
    expect(algumaCriancaVe(politica({ modo: 'aberto' }), { ...familia, perfis: [] })).toBe(false)
  })

  test('a família da equipe vê fora da lista, como os perfis dela no jogo', () => {
    const lista = politica({ modo: 'lista' })
    expect(algumaCriancaVe(lista, { ...familia, equipe: true })).toBe(true)
  })
})
