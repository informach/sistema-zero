import { describe, expect, test } from 'bun:test'
import {
  CAREER_LEVEL_SLUGS,
  type CareerLevelSlug,
  careerCourseQualified,
  courseJourneyState,
  creativeToolAvailability,
  type JourneyCourse,
  MOLDA_TOOL_BAND_LEVELS,
  nextCareerCourse,
  THREE_D_CREATION_MIN_LEVEL,
} from '../src/career'

const course = (overrides: Partial<JourneyCourse> = {}): JourneyCourse => ({
  careerSlot: 1,
  continueLessonId: null,
  progress: { completedLessons: 0, totalLessons: 4 },
  milestones: { completed: false, showcased: false },
  ...overrides,
})

describe('creator journey', () => {
  test('foundation publication precedes ongoing work and other pending publications', () => {
    const ongoing = course({ continueLessonId: 'lesson' })
    const publish = course({ careerSlot: 2, milestones: { completed: true, showcased: false } })
    const foundation = course({ milestones: { completed: true, showcased: false } })
    expect(nextCareerCourse([ongoing, publish, foundation])).toBe(foundation)
  })

  test('completion is distinct from publication, including publication before completion', () => {
    expect(courseJourneyState(course({ milestones: { completed: true, showcased: false } }))).toBe(
      'publish',
    )
    expect(courseJourneyState(course({ milestones: { completed: false, showcased: true } }))).toBe(
      'start',
    )
    expect(
      careerCourseQualified(course({ milestones: { completed: false, showcased: true } })),
    ).toBe(false)
  })

  test('bonus courses never incur a publication debt or revoke an earned milestone', () => {
    const bonus = course({ careerSlot: null, milestones: { completed: true, showcased: false } })
    expect(careerCourseQualified(bonus)).toBe(true)
    expect(courseJourneyState(bonus)).toBe('start') // New lessons remain discoverable.
  })

  test('does not route to locked, empty or fully reviewed courses', () => {
    const locked = course({ careerLock: { locked: true }, continueLessonId: 'old' })
    const empty = course({ progress: { completedLessons: 0, totalLessons: 0 } })
    const reviewed = course({ progress: { completedLessons: 4, totalLessons: 4 } })
    expect(nextCareerCourse([locked, empty, reviewed])).toBeNull()
  })

  test('family ownership cannot bypass the child career or an unavailable level', () => {
    expect(creativeToolAvailability({ tool: 'molda', owned: true, level: 'hacker' })).toBe(
      'career-locked',
    )
    expect(creativeToolAvailability({ tool: 'molda', owned: true, level: 'explorer' })).toBe(
      'available',
    )
    expect(creativeToolAvailability({ tool: 'pinta', owned: false, level: 'god' })).toBe(
      'not-included',
    )
    expect(creativeToolAvailability({ tool: 'pinta', owned: true, level: null })).toBe(
      'unavailable',
    )
    expect(creativeToolAvailability({ tool: 'pensa', owned: null, level: 'god' })).toBe(
      'unavailable',
    )
  })
})

describe('faixas de ferramentas do Molda', () => {
  test('a faixa de entrada é o próprio portão do Molda, e os postos crescem estritamente', () => {
    expect(MOLDA_TOOL_BAND_LEVELS.basic).toBe(THREE_D_CREATION_MIN_LEVEL)
    const levels: readonly CareerLevelSlug[] = [
      MOLDA_TOOL_BAND_LEVELS.basic,
      MOLDA_TOOL_BAND_LEVELS.intermediate,
      MOLDA_TOOL_BAND_LEVELS.professional,
    ]
    const order = levels.map((slug) => CAREER_LEVEL_SLUGS.indexOf(slug))
    expect(order.every((index) => index >= 0)).toBe(true)
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThan(order[i - 1]!)
  })

  test('as faixas são as três de sempre, na ordem: o molda confere o outro lado pelo nome', () => {
    expect(Object.keys(MOLDA_TOOL_BAND_LEVELS)).toEqual(['basic', 'intermediate', 'professional'])
  })
})
