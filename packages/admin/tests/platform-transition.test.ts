import { describe, expect, test } from 'bun:test'
import { courseCreationPrefill, platformTransition } from '../src/lib/platform-transition'

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
