import { describe, expect, test } from 'bun:test'
import {
  courseCreationPrefill,
  journeyLensHref,
  platformTransition,
} from '../src/lib/platform-transition'

describe('matriz de transição Kids ↔ Adultos', () => {
  test.each([
    ['kids', 'adult'],
    ['adult', 'kids'],
  ] as const)('%s → %s limpa todo estado incompatível', (_from, to) => {
    expect(platformTransition(to)).toEqual({
      teaching: { audience: to, courseId: '' },
      moderation: { audience: to, spaceId: '', offset: 0 },
      analytics: { selectedCourseId: null },
      activity: { learnerId: null, offset: 0 },
    })
    expect(courseCreationPrefill(to)).toEqual({ audience: to })
  })
})

describe('Jornada: trocar a lente leva o endereço junto', () => {
  test('a preparação aberta vai e volta com a lente', () => {
    const kids = '/admin/professor/jornada-kids'
    const adult = '/admin/professor/jornada-adulta'
    const there = journeyLensHref(adult, '?preparacao=abc')
    expect(there).toBe(`${adult}?preparacao=abc`)
    expect(journeyLensHref(kids, there.slice(adult.length))).toBe(`${kids}?preparacao=abc`)
  })

  test('sem nada no endereço, vai só para a página', () => {
    expect(journeyLensHref('/admin/professor/jornada-adulta', '')).toBe(
      '/admin/professor/jornada-adulta',
    )
    expect(journeyLensHref('/admin/professor/jornada-kids', '?')).toBe(
      '/admin/professor/jornada-kids',
    )
  })
})
