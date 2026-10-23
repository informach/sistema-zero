import { describe, expect, test } from 'bun:test'
import { projectEntryReport } from './objective-entry-report'

describe('project entry diagnostics', () => {
  test('a satisfied prerequisite does not invalidate a practice with unmet work', () => {
    expect(
      projectEntryReport([
        { id: 'reveal', optional: false, verdict: true },
        { id: 'count', optional: false, verdict: false },
      ]),
    ).toEqual({ kind: 'has-unmet-objectives', unmetIds: ['count'] })
  })

  test('all required true is explicit, without claiming the whole section is complete', () => {
    expect(
      projectEntryReport([
        { id: 'reveal', optional: false, verdict: true },
        { id: 'count', optional: false, verdict: true },
        { id: 'extra', optional: true, verdict: false },
      ]),
    ).toEqual({ kind: 'already-satisfied', satisfiedIds: ['reveal', 'count'] })
  })

  test.each([
    'pending',
    'error',
    'inconclusive',
    null,
  ] as const)('an unknown required result remains inconclusive: %s', (verdict) => {
    expect(
      projectEntryReport([
        { id: 'prepared', optional: false, verdict: true },
        { id: 'execution', optional: false, verdict },
      ]),
    ).toEqual({ kind: 'inconclusive', inconclusiveIds: ['execution'] })
  })

  test('an explicit unmet goal remains unmet even if another observation is unavailable', () => {
    expect(
      projectEntryReport([
        { id: 'build', optional: false, verdict: false },
        { id: 'execution', optional: false, verdict: 'error' },
      ]),
    ).toEqual({ kind: 'has-unmet-objectives', unmetIds: ['build'] })
  })

  test('extras never create required work, regardless of their results', () => {
    expect(projectEntryReport([])).toEqual({ kind: 'no-required-objectives' })
    expect(
      projectEntryReport([
        { id: 'extra', optional: true, verdict: true },
        { id: 'unknown-extra', optional: true, verdict: 'error' },
      ]),
    ).toEqual({ kind: 'no-required-objectives' })
  })
})
