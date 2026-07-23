import { type QualifiedCareerSlots, resolveCareerCourseLock } from '@sistemazero/core/career'
import type { Course } from '../../domain/course/course'
import { courseTier } from '../../domain/gamification/levels'
import type { CareerCourseLockView } from '../mappers/views'

/**
 * Projeta as travas pedagógicas sem misturá-las com matrícula/comercial.
 * O mapa de cursos-base permite à interface explicar exatamente o próximo passo.
 */
export function careerLocksForCourses(
  courses: readonly Course[],
  qualified: QualifiedCareerSlots,
  enabled: boolean,
): Map<string, CareerCourseLockView> {
  if (!enabled) return new Map()

  const foundationByTier = new Map<string, string>()
  for (const course of courses) {
    if (course.audience === 'kids' && course.careerSlot === 1) {
      foundationByTier.set(courseTier(course.level, course.track), course.slug)
    }
  }

  const locks = new Map<string, CareerCourseLockView>()
  for (const course of courses) {
    const tier = courseTier(course.level, course.track)
    // Sem um curso-base publicado na etapa, a trava foundation-first falha aberta
    // (senão as posições 2+ ficariam presas sem nada a concluir para liberar).
    const lock = resolveCareerCourseLock(
      qualified,
      tier,
      course.careerSlot,
      foundationByTier.has(tier),
    )
    locks.set(course.id, {
      locked: lock.locked,
      ...(lock.reason ? { reason: lock.reason } : {}),
      ...(lock.requiredLevel ? { requiredLevel: lock.requiredLevel } : {}),
      ...(lock.locked && lock.reason === 'foundation-first' && foundationByTier.has(tier)
        ? { foundationCourseSlug: foundationByTier.get(tier) }
        : {}),
    })
  }
  return locks
}
