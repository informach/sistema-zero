import { describe, expect, it } from 'bun:test'
import type { CheckResult, LessonActivity } from '../studio/activity'
import { gradeActivity } from './grade'

function activity(
  partial: Partial<LessonActivity> & { checks: LessonActivity['checks'] },
): LessonActivity {
  return { instructions: '', ...partial }
}

const struct = (id: string, weight?: number) =>
  ({ id, label: id, kind: 'structure', rule: { type: 'usesLoop' }, weight }) as const

const res = (checkId: string, passed: boolean): CheckResult => ({
  checkId,
  kind: 'structure',
  passed,
  verifiedBy: 'client',
})

describe('gradeActivity', () => {
  it('média simples: 1 de 2 passou → 50', () => {
    const a = activity({ checks: [struct('a'), struct('b')] })
    const r = gradeActivity(a, [res('a', true), res('b', false)])
    expect(r.score).toBe(50)
  })

  it('formativa (sem passingScore) → passed true mesmo com falha', () => {
    const a = activity({ checks: [struct('a'), struct('b')] })
    const r = gradeActivity(a, [res('a', false), res('b', false)])
    expect(r.score).toBe(0)
    expect(r.passed).toBe(true)
  })

  it('com passingScore: aprova só ao atingir', () => {
    const a = activity({ checks: [struct('a'), struct('b')], passingScore: 50 })
    expect(gradeActivity(a, [res('a', true), res('b', false)]).passed).toBe(true)
    expect(
      gradeActivity(activity({ checks: [struct('a'), struct('b')], passingScore: 60 }), [
        res('a', true),
        res('b', false),
      ]).passed,
    ).toBe(false)
  })

  it('pondera pelo weight', () => {
    const a = activity({ checks: [struct('a', 3), struct('b', 1)] })
    // só a de peso 3 passou → 75
    expect(gradeActivity(a, [res('a', true), res('b', false)]).score).toBe(75)
  })

  it('sem checagens → 100', () => {
    expect(gradeActivity(activity({ checks: [] }), []).score).toBe(100)
  })

  it('checagem sem resultado entra como falha, na ordem da atividade', () => {
    const a = activity({ checks: [struct('a'), struct('b')] })
    const r = gradeActivity(a, [res('b', true)])
    expect(r.results.map((x) => x.checkId)).toEqual(['a', 'b'])
    expect(r.results[0]?.passed).toBe(false)
    expect(r.score).toBe(50)
  })
})
