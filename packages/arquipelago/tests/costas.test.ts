import { describe, expect, test } from 'bun:test'
import {
  AVATAR_CATALOG,
  type AvatarSlots,
  avatarDoPack,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import {
  CLIPES_DEITADA,
  clipesDoCorpo,
  PLANADOR_DOBRADO,
  vestirAsCostas,
} from '../src/personagem/costas'

const C = AVATAR_CATALOG
const base = (): AvatarSlots => avatarDoPack({})
const situacao = { planador: true, clipes: [] as string[], sentada: false }
const deitada = { ...situacao, clipes: [...CLIPES_DEITADA] }
const s = C.parts[PLANADOR_DOBRADO]?.situations
const slotDoFardo = C.parts[PLANADOR_DOBRADO]?.slot ?? 'planador'
const mochila = Object.entries(C.parts).find(
  ([, p]) => p.slot === 'costas' && p.offIn?.includes('deitado') && p.armLayers,
)?.[0]

describe('o que vai nas costas do avatar no jogo', () => {
  test('com o planador e sem nada nas costas, o fardo entra e manda o braço sair da frente', () => {
    const { slots, bracoDasCostas } = vestirAsCostas(base(), situacao)
    expect(slots[slotDoFardo]).toBe(PLANADOR_DOBRADO)
    expect(bracoDasCostas).toBe(PLANADOR_DOBRADO)
  })

  test('sem o planador, deitada, sentada ou empurrando agachada, o fardo não entra', () => {
    for (const outra of [
      { ...situacao, planador: false },
      deitada,
      { ...situacao, sentada: true },
      { ...situacao, clipes: ['empurrar_baixo'] },
      { ...situacao, clipes: ['empurrar_meio'] },
    ])
      expect(vestirAsCostas(base(), outra).slots[slotDoFardo]).toBeUndefined()
  })

  test('com a mochila, o fardo é o de trás da mochila, e o braço segue a mochila', () => {
    if (!mochila || !s) throw new Error('sem mochila com camadas no catálogo')
    const { slots, bracoDasCostas } = vestirAsCostas({ ...base(), costas: mochila }, situacao)
    expect(slots[slotDoFardo]).toBe(s.byBack[mochila])
    expect(bracoDasCostas).toBe(mochila)
  })

  test('deitada, a mochila sai (o sai_nas_animacoes da arte)', () => {
    if (!mochila) throw new Error('sem mochila no catálogo')
    const { slots, bracoDasCostas } = vestirAsCostas({ ...base(), costas: mochila }, deitada)
    expect(slots.costas).toBeUndefined()
    expect(bracoDasCostas).toBeNull()
  })

  test('um cabelo comprido cobre o fardo', () => {
    const cabelo = s?.hiddenWith?.find((id) => C.parts[id]?.slot === 'cabelo')
    if (!cabelo) return
    expect(vestirAsCostas({ ...base(), cabelo }, situacao).slots[slotDoFardo]).toBeUndefined()
  })

  test('empurrando agachada ou de meia altura, a mochila sai; de pé, fica', () => {
    if (!mochila) throw new Error('sem mochila no catálogo')
    for (const jeito of ['baixo', 'meio'] as const) {
      const clipes = clipesDoCorpo({ deitada: false, empurrandoComo: jeito, nadando: false })
      expect(
        vestirAsCostas({ ...base(), costas: mochila }, { ...situacao, clipes }).slots.costas,
      ).toBeUndefined()
    }
    const dePe = clipesDoCorpo({ deitada: false, empurrandoComo: 'alto', nadando: false })
    expect(dePe).toEqual([])
    expect(
      vestirAsCostas({ ...base(), costas: mochila }, { ...situacao, clipes: dePe }).slots.costas,
    ).toBe(mochila)
  })

  test('com capa, o planador não aparece', () => {
    const capa = Object.keys(C.parts).find(
      (id) => C.parts[id]?.slot === 'costas' && s?.hiddenWith?.includes(id),
    )
    if (!capa) return
    expect(vestirAsCostas({ ...base(), costas: capa }, situacao).slots[slotDoFardo]).toBeUndefined()
  })

  test('nadando, o planador sai; deitada, a capa sai', () => {
    const nadando = clipesDoCorpo({ deitada: false, empurrandoComo: null, nadando: true })
    expect(
      vestirAsCostas(base(), { ...situacao, clipes: nadando }).slots[slotDoFardo],
    ).toBeUndefined()
    const capa = Object.keys(C.parts).find(
      (id) => C.parts[id]?.slot === 'costas' && s?.hiddenWith?.includes(id),
    )
    if (!capa) return
    expect(vestirAsCostas({ ...base(), costas: capa }, deitada).slots.costas).toBeUndefined()
  })
})
