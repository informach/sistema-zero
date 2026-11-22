import { describe, expect, test } from 'bun:test'
import {
  coursesForLearner,
  memberActivityScope,
  memberHistoryQuery,
  memberLearners,
} from '../src/lib/member-learners'
import type { MemberCourseProgressView } from '../src/lib/types'

const progress = (
  courseRef: string,
  audience: 'adult' | 'kids',
  learner: 'child' | 'parents',
): MemberCourseProgressView => ({
  courseRef,
  title: courseRef,
  status: 'published',
  audience,
  learner,
  completedLessons: 1,
  totalLessons: 3,
  percent: 33,
})

describe('a conta aprende como responsável na comunidade Kids', () => {
  test('históricos de curso levam o público; atividade informa quando o alcance é a conta inteira', () => {
    const parents = memberLearners('account', 'kids', [])[0]
    const adult = memberLearners('account', 'adult', [])[0]
    const child = memberLearners('account', 'kids', [{ id: 'child', name: 'Ana' }])[1]
    if (!parents || !adult || !child) throw new Error('Aprendizes ausentes')
    expect(memberHistoryQuery(parents)).toBe('?audience=kids&learner=parents')
    expect(memberHistoryQuery(adult)).toBe('?audience=adult&learner=child')
    expect(memberHistoryQuery(child)).toBe('?audience=kids&learner=child')
    expect(memberActivityScope(parents)).toContain('Histórico geral da conta')
    expect(memberActivityScope(adult)).toContain('cursos para pais')
    expect(memberActivityScope(child)).toBeNull()
  })
  test('distingue pais, adulto e criança sem trocar a identidade da conta', () => {
    const kids = memberLearners('account', 'kids', [{ id: 'child', name: 'Ana' }])
    expect(kids).toEqual([
      { id: 'account', label: 'Pais · responsável', audience: 'kids', kind: 'parents' },
      { id: 'child', label: 'Criança · Ana', audience: 'kids', kind: 'child' },
    ])
    expect(memberLearners('account', 'adult', [])).toEqual([
      { id: 'account', label: 'Adulto · conta', audience: 'adult', kind: 'adult' },
    ])
  })
  test('cada contexto apresenta só os cursos do seu público', () => {
    const parents = memberLearners('account', 'kids', [])[0]
    const adult = memberLearners('account', 'adult', [])[0]
    const child = memberLearners('account', 'kids', [{ id: 'child', name: 'Ana' }])[1]
    if (!parents || !adult || !child) throw new Error('Aprendizes ausentes')
    const all = [
      progress('pais', 'kids', 'parents'),
      progress('crianca', 'kids', 'child'),
      progress('adulto', 'adult', 'child'),
    ]
    expect(coursesForLearner(all, parents).map((c) => c.courseRef)).toEqual(['pais'])
    expect(coursesForLearner(all, adult).map((c) => c.courseRef)).toEqual(['adulto'])
    expect(coursesForLearner(all, child).map((c) => c.courseRef)).toEqual(['crianca'])
  })
})
