import { describe, expect, test } from 'bun:test'
import { decidirAcesso, type PoliticaDeAcesso } from '../../src/domain/acesso'
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
