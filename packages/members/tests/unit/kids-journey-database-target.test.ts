import { describe, expect, test } from 'bun:test'
import { kidsJourneyTestTarget } from '../db/kids-journey-database'

describe('Kids journey disposable database contract', () => {
  test('accepts only explicit local PostgreSQL and a kids_journey_* name', () => {
    expect(
      kidsJourneyTestTarget('postgres://user:pass@127.0.0.1:5433/kids_journey_repository').pathname,
    ).toBe('/kids_journey_repository')
    expect(
      kidsJourneyTestTarget('postgresql://user:pass@localhost/kids_journey_review').hostname,
    ).toBe('localhost')
  })

  test('refuses a remote, generic, empty or non-PostgreSQL target before any connection', () => {
    for (const target of [
      'postgres://user:pass@example.com/kids_journey_review',
      'postgres://user:pass@localhost/sistemazero',
      'postgres://user:pass@localhost/',
      'http://localhost/kids_journey_review',
      '',
    ])
      expect(() => kidsJourneyTestTarget(target)).toThrow()
  })
})
