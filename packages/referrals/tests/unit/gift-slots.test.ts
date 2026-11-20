import { describe, expect, test } from 'bun:test'
import { giftSlotOf } from '../../src/domain/ports/referral-repository.port'

describe('limite por benefício dos blocos de presente', () => {
  test('o Cadê conserva a vaga usada nos resgates da campanha e do embaixador', () => {
    expect(giftSlotOf({ slug: 'cade-todo-mundo', learner: 'child' })).toBe('main')
    expect(giftSlotOf({ slug: 'cade-todo-mundo-adulto', learner: null })).toBe('main')
  })
  test('outros cursos têm vagas independentes e um curso para pais não consome a da criança', () => {
    expect(giftSlotOf({ slug: 'curso-pais', learner: 'parents' })).toBe('parents:curso-pais')
    expect(giftSlotOf({ slug: 'jogo-2', learner: 'child' })).toBe('course:jogo-2')
    expect(giftSlotOf({ slug: 'jogo-3', learner: 'child' })).not.toBe(
      giftSlotOf({ slug: 'jogo-2', learner: 'child' }),
    )
  })
})
