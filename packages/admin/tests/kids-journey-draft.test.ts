import { describe, expect, test } from 'bun:test'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import {
  KIDS_JOURNEY_DRAFT_KEY,
  keepKidsJourneyDraft,
  takeKidsJourneyDraft,
} from '../src/lib/kids-journey-draft'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('rascunho da Jornada do Criador guardado na troca de lente', () => {
  test('guarda e devolve uma vez só', () => {
    const storage = memoryStorage()
    const policy = { ...initialKidsJourneyPolicy(), mode: 'paused' as const }
    expect(keepKidsJourneyDraft(storage, { version: 3, policy, reason: 'Motivo' })).toBe(true)
    expect(takeKidsJourneyDraft(storage, 3)).toEqual({ version: 3, policy, reason: 'Motivo' })
    expect(takeKidsJourneyDraft(storage, 3)).toBeNull()
  })

  test('o que não tem forma de rascunho é descartado sem quebrar', () => {
    const storage = memoryStorage()
    storage.setItem(KIDS_JOURNEY_DRAFT_KEY, 'não é json')
    expect(takeKidsJourneyDraft(storage, 3)).toBeNull()
    storage.setItem(
      KIDS_JOURNEY_DRAFT_KEY,
      JSON.stringify({ version: '3', reason: '', policy: {} }),
    )
    expect(takeKidsJourneyDraft(storage, 3)).toBeNull()
  })

  test('sem armazenamento, guardar avisa que não deu', () => {
    const policy = initialKidsJourneyPolicy()
    expect(keepKidsJourneyDraft(null, { version: 1, policy, reason: '' })).toBe(false)
    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(keepKidsJourneyDraft(full, { version: 1, policy, reason: '' })).toBe(false)
  })

  test('a versão publicada mudou: conserva o rascunho para uma recuperação explícita', () => {
    const storage = memoryStorage()
    const draft = { version: 3, policy: initialKidsJourneyPolicy(), reason: 'Não perder' }
    keepKidsJourneyDraft(storage, draft)
    expect(takeKidsJourneyDraft(storage, 4)).toEqual(draft)
    expect(storage.getItem(KIDS_JOURNEY_DRAFT_KEY)).not.toBeNull()
    expect(takeKidsJourneyDraft(storage, 3)).toEqual(draft)
    expect(storage.getItem(KIDS_JOURNEY_DRAFT_KEY)).toBeNull()
  })

  test('outro rascunho não apaga a recuperação que ainda não foi escolhida', () => {
    const storage = memoryStorage()
    const draft = { version: 3, policy: initialKidsJourneyPolicy(), reason: 'Não perder' }
    keepKidsJourneyDraft(storage, draft)
    expect(keepKidsJourneyDraft(storage, { ...draft, version: 4, reason: 'Mais recente' })).toBe(
      false,
    )
    expect(JSON.parse(storage.getItem(KIDS_JOURNEY_DRAFT_KEY)!)).toEqual(draft)
  })
})
