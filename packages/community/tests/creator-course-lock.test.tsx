import { expect, test } from 'bun:test'
import type { CreatorCoursePlacement } from '@sistemazero/core/journey'
import { createLogger } from '@sistemazero/core/logging'
import { creatorCourseLockFromBody } from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorSceneFixture } from '../../member-shell/qa/creator-journey-fixtures'
import { CourseJourneyLockedError } from '../../members/src/domain/course/course.errors'
import { buildErrorResponse } from '../../members/src/interfaces/http/error-handler'
import { CatalogCourseCard } from '../src/components/community/catalog-course-card'
import { lockedCourseLink } from '../src/lib/continuity'

for (const role of ['mastery-nucleus', 'mastery-workshop', 'mastery-project'] as const) {
  test(`adult ${role} catalog and 423 DTO point to the mastery requirements`, () => {
    const placement: CreatorCoursePlacement = {
      role,
      level: null,
      masteryId: 'python2d',
      masteryLevel: 2,
    }
    const response = buildErrorResponse({
      code: 'UNKNOWN',
      error: new CourseJourneyLockedError('foundation-first', undefined, placement),
      logger: createLogger({ level: 'error' }),
    })
    expect(response.status).toBe(423)
    const lock = creatorCourseLockFromBody(response.body, 'adult')
    expect(lock.href).toBe('/maestrias/python2d')
    expect(lock.message).toContain('nível 2')
    expect(lock.message).not.toContain('bases')
    const course = {
      ...creatorSceneFixture('adult', 'fresh').catalog[0]!,
      hasAccess: true,
      careerLock: { locked: true, reason: 'foundation-first' as const },
      curriculum: placement,
    }
    const html = renderToStaticMarkup(
      <CatalogCourseCard course={course} progress={null} locked={lockedCourseLink(null)} />,
    )
    expect(html).toContain('href="/maestrias/python2d"')
    expect(html).toContain('Ver requisitos da maestria')
    expect(html).not.toContain('bases do posto')
  })
}
