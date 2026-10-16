import { describe, expect, it } from 'bun:test'
import { studioTutorSourceHash } from '../../../studio/tutorSafety'
import { currentProDiagnostics } from './ProBottomPanel'

describe('origem dos problemas Pro', () => {
  it('deduplicates the same diagnostic and rejects locations from another source revision', () => {
    const content = 'const score: number = "zero"'
    const item = {
      path: 'closed.ts',
      line: 1,
      code: 2322,
      message: 'Different type',
      sourceHash: studioTutorSourceHash(content),
      severity: 'error' as const,
    }
    expect(currentProDiagnostics([item, item], { 'closed.ts': { kind: 'file', content } })).toEqual(
      [item],
    )
    expect(
      currentProDiagnostics([item], { 'closed.ts': { kind: 'file', content: 'const score = 0' } }),
    ).toEqual([])
    expect(currentProDiagnostics([item], {})).toEqual([])
  })
})
