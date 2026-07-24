import { describe, expect, test } from 'bun:test'
import { careerLockReason } from '../src/components/kids/kids-locked-course'

describe('careerLockReason (motivo do 423 de curso travado pela carreira)', () => {
  test('extrai os três motivos conhecidos do envelope do members', () => {
    expect(careerLockReason({ careerLock: { reason: 'foundation-first' } })).toBe(
      'foundation-first',
    )
    expect(careerLockReason({ careerLock: { reason: 'future-tier' } })).toBe('future-tier')
    expect(careerLockReason({ careerLock: { reason: 'tier-reward' } })).toBe('tier-reward')
  })

  test('motivo desconhecido ou corpo sem careerLock → undefined (cai na copy genérica)', () => {
    expect(careerLockReason({ careerLock: { reason: 'motivo-novo-do-futuro' } })).toBeUndefined()
    expect(careerLockReason({ error: { code: 'COURSE_CAREER_LOCKED' } })).toBeUndefined()
    expect(careerLockReason(null)).toBeUndefined()
    expect(careerLockReason(undefined)).toBeUndefined()
  })
})
