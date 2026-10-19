import { describe, expect, test } from 'bun:test'
import { journeyLockLevel, journeyLockReason } from '../src/components/kids/kids-locked-course'

describe('journeyLockReason (motivo do 423 de curso travado pela jornada)', () => {
  test('extrai os três motivos conhecidos do envelope do members', () => {
    expect(journeyLockReason({ careerLock: { reason: 'foundation-first' } })).toBe(
      'foundation-first',
    )
    expect(journeyLockReason({ careerLock: { reason: 'future-tier' } })).toBe('future-tier')
    expect(journeyLockReason({ careerLock: { reason: 'tier-reward' } })).toBe('tier-reward')
  })

  test('motivo desconhecido ou corpo sem careerLock → undefined (cai na copy genérica)', () => {
    expect(journeyLockReason({ careerLock: { reason: 'motivo-novo-do-futuro' } })).toBeUndefined()
    expect(journeyLockReason({ error: { code: 'COURSE_CAREER_LOCKED' } })).toBeUndefined()
    expect(journeyLockReason(null)).toBeUndefined()
    expect(journeyLockReason(undefined)).toBeUndefined()
  })
})

test('journeyLockLevel transports only a known server-provided identity, without inferring a default', () => {
  expect(journeyLockLevel({ careerLock: { requiredLevel: 'god' } })).toBe('god')
  expect(journeyLockLevel({ careerLock: { requiredLevel: 'hacker' } })).toBe('hacker')
  for (const body of [
    null,
    undefined,
    {},
    { careerLock: {} },
    { careerLock: { requiredLevel: 'unknown' } },
    { careerLock: { requiredLevel: 'constructor' } },
    { careerLock: { requiredLevel: 1 } },
  ])
    expect(journeyLockLevel(body)).toBeUndefined()
})
