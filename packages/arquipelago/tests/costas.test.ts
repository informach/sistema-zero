import { describe, expect, test } from 'bun:test'
import {
  AVATAR_CATALOG,
  type AvatarSlots,
  avatarDoPack,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { PLANADOR_DOBRADO, vestirAsCostas } from '../src/personagem/costas'

const C = AVATAR_CATALOG
const base = (): AvatarSlots => avatarDoPack({})
const situacao = { planador: true, deitada: false, sentada: false }
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

  test('sem o planador, voando, deitada ou sentada, o fardo não entra', () => {
    for (const outra of [
      { ...situacao, planador: false },
      { ...situacao, deitada: true },
      { ...situacao, sentada: true },
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
    const { slots, bracoDasCostas } = vestirAsCostas(
      { ...base(), costas: mochila },
      { ...situacao, deitada: true },
    )
    expect(slots.costas).toBeUndefined()
    expect(bracoDasCostas).toBeNull()
  })

  test('um cabelo comprido cobre o fardo', () => {
    const cabelo = s?.hiddenWith?.find((id) => C.parts[id]?.slot === 'cabelo')
    if (!cabelo) return
    expect(vestirAsCostas({ ...base(), cabelo }, situacao).slots[slotDoFardo]).toBeUndefined()
  })
})
