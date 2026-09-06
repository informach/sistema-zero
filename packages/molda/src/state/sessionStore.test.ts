import { describe, expect, test } from 'bun:test'
import { createSessionStore } from './sessionStore'

describe('seleção múltipla de peças (sessionStore)', () => {
  test('toggleExtra soma/tira; sem principal vira a principal; tirar a principal promove a próxima', () => {
    const store = createSessionStore()
    store.getState().toggleExtra('a')
    expect(store.getState().selectedId).toBe('a')
    expect(store.getState().extraIds).toEqual([])
    store.getState().toggleExtra('b')
    store.getState().toggleExtra('c')
    expect(store.getState().extraIds).toEqual(['b', 'c'])
    store.getState().toggleExtra('b')
    expect(store.getState().extraIds).toEqual(['c'])
    store.getState().toggleExtra('a')
    expect(store.getState().selectedId).toBe('c')
    expect(store.getState().extraIds).toEqual([])
  })

  test('pick: somar mantém a principal; trocar limpa as somadas; toque no vazio com Shift não limpa', () => {
    const store = createSessionStore()
    store.getState().pick('a', false)
    store.getState().pick('b', true)
    expect(store.getState().extraIds).toEqual(['b'])
    store.getState().pick(null, true)
    expect(store.getState().selectedId).toBe('a')
    expect(store.getState().extraIds).toEqual(['b'])
    store.getState().pick('c', false)
    expect(store.getState().selectedId).toBe('c')
    expect(store.getState().extraIds).toEqual([])
    store.getState().pick(null, false)
    expect(store.getState().selectedId).toBeNull()
  })

  test('entrar no Editar malha e trocar de modo limpam as somadas', () => {
    const store = createSessionStore()
    store.getState().pick('a', false)
    store.getState().pick('b', true)
    store.getState().enterMeshEdit('a')
    expect(store.getState().extraIds).toEqual([])
    store.getState().pick('b', true)
    expect(store.getState().meshEditId).toBeNull()
    store.getState().setMode('paint')
    expect(store.getState().extraIds).toEqual([])
  })
})
