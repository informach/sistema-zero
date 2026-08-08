import { describe, expect, it } from 'bun:test'
import { courseHasActivity, hasAnyCourseActivity } from '../src/components/kids/continue-hero'

describe('atividade de curso usada pelo onboarding e pelo ContinueHero', () => {
  it('considera a última aula acessada mesmo antes da primeira conclusão', () => {
    expect(
      courseHasActivity({ continueLessonId: 'aula-1', progress: { completedLessons: 0 } }),
    ).toBe(true)
  })

  it('mantém conclusão como sinal e não inventa atividade sem nenhum dos dois', () => {
    expect(courseHasActivity({ continueLessonId: null, progress: { completedLessons: 1 } })).toBe(
      true,
    )
    expect(courseHasActivity({ continueLessonId: null, progress: { completedLessons: 0 } })).toBe(
      false,
    )
    expect(
      hasAnyCourseActivity([
        { continueLessonId: null, progress: { completedLessons: 0 } },
        { continueLessonId: 'aula-2', progress: { completedLessons: 0 } },
      ]),
    ).toBe(true)
  })
})
