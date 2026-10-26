import type { EntitlementAggregate } from './entitlement.aggregate'

/** These products promise access to the purchased course independently of the curriculum. */
export const INDEPENDENT_JOURNEY_COURSES = new Set([
  'desafio-primeiro-jogo',
  'desafio-primeiro-jogo-adulto',
  'cade-todo-mundo',
  'cade-todo-mundo-adulto',
])

export type IndependentCourseAccessReason = 'direct-purchase' | 'gift' | 'manual-grant'

/**
 * Inspect all active grants: a longer master subscription may win the commercial access
 * selection without cancelling a simultaneous, independently purchased course.
 * A subscription can itself grant a specific course, so courseRef alone is insufficient.
 */
export function independentCourseAccessReason(
  courseSlug: string,
  entitlements: readonly EntitlementAggregate[],
  now: Date,
): IndependentCourseAccessReason | undefined {
  if (!INDEPENDENT_JOURNEY_COURSES.has(courseSlug)) return undefined
  for (const entitlement of entitlements) {
    if (
      entitlement.accessType !== 'course' ||
      entitlement.courseRef !== courseSlug ||
      !entitlement.isActiveAt(now)
    )
      continue
    const state = entitlement.toSnapshot()
    if (state.subscriptionId !== null || state.sourceKind === 'subscription') continue
    if (state.sourceKind === 'payment') return 'direct-purchase'
    if (state.sourceKind === 'manual') {
      // A manual specific-course grant is an explicit, independent administrative right.
      // Scholarship grants use this same path and retain their actual expiry date.
      return state.sourceId.startsWith('scholarship:') ? 'gift' : 'manual-grant'
    }
  }
  return undefined
}
