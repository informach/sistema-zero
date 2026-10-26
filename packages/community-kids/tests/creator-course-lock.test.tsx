import { expect, test } from 'bun:test'
import type { CreatorCoursePlacement } from '@sistemazero/core/journey'
import { createLogger } from '@sistemazero/core/logging'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorSceneFixture } from '../../member-shell/qa/creator-journey-fixtures'
import { CourseJourneyLockedError } from '../../members/src/domain/course/course.errors'
import { buildErrorResponse } from '../../members/src/interfaces/http/error-handler'
import { CatalogCourseCard } from '../src/components/kids/catalog-course-card'
import { KidsLockedCourse } from '../src/components/kids/kids-locked-course'

for (const role of ['mastery-nucleus', 'mastery-workshop', 'mastery-project'] as const) {
  test(`kids ${role} catalog and 423 DTO name the level and link its area`, () => {
    const placement: CreatorCoursePlacement = {
      role,
      level: null,
      masteryId: 'modelagem3d',
      masteryLevel: 3,
    }
    const { status, body } = buildErrorResponse({
      code: 'UNKNOWN',
      error: new CourseJourneyLockedError('future-tier', undefined, placement),
      logger: createLogger({ level: 'error' }),
    })
    expect(status).toBe(423)
    const notice = renderToStaticMarkup(<KidsLockedCourse body={body} reason="future-tier" />)
    const course = {
      ...creatorSceneFixture('kids', 'fresh').catalog[0]!,
      hasAccess: true,
      careerLock: { locked: true, reason: 'future-tier' as const },
      curriculum: placement,
    }
    const html = renderToStaticMarkup(<CatalogCourseCard course={course} salesUrl={null} />)
    for (const output of [notice, html]) {
      expect(output).toContain('href="/maestrias/modelagem3d"')
      expect(output).toContain('nível 3')
      expect(output).not.toContain('O primeiro curso')
      expect(output).not.toContain('bases do posto')
    }
  })
}
