import {
  JOURNEY_LEVEL_SLUGS,
  type JourneyLevelSlug,
  type KidsJourneyView,
  kidsRequirementKey,
} from '@sistemazero/core/journey'
import { levelInfo } from './level-info'

export type CanonicalJourneyProgress =
  | { kind: 'top' | 'paused' | 'up-to-date'; hint: string | null }
  | { kind: 'pending'; remaining: number; done: number; ready: number; hint: string | null }

type RequirementState = KidsJourneyView['advances'][number]['requirements'][number]

/** Group presentation by evaluated identity without removing any canonical requirement/state. */
function requirementGroups(requirements: readonly RequirementState[]): RequirementState[][] {
  const groups = new Map<string, RequirementState[]>()
  for (const item of requirements) {
    const key = item.resolvedCourseId
      ? `resolved:${item.resolvedCourseId}`
      : kidsRequirementKey(item.requirement)
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }
  return [...groups.values()]
}

/** Pending course actions use the identity from the same projection, never a UI slot lookup. */
export function canonicalPendingCourses(
  view: KidsJourneyView,
): { courseId: string; milestone: 'complete' | 'showcase' }[] {
  if (view.mode !== 'active' || view.nextLevel === null) return []
  const advance = view.advances.find((step) => step.level === view.nextLevel)
  return requirementGroups(advance?.requirements ?? []).flatMap((group) => {
    const pending = group.filter((item) => item.state === 'pending')
    const courseId = pending[0]?.resolvedCourseId
    if (!courseId || group.some((item) => item.state === 'unavailable')) return []
    return [
      {
        courseId,
        milestone: pending.some((item) => item.requirement.milestone === 'showcase')
          ? ('showcase' as const)
          : ('complete' as const),
      },
    ]
  })
}

/** Presentation reads the canonical requirement states; it never re-evaluates course eligibility. */
export function canonicalJourneyProgress(view: KidsJourneyView): CanonicalJourneyProgress {
  if (view.nextLevel === null) return { kind: 'top', hint: null }
  if (view.mode === 'paused')
    return {
      kind: 'paused',
      hint: 'Suas conquistas estão guardadas. As próximas aventuras estão em preparação.',
    }
  const advance = view.advances.find((step) => step.level === view.nextLevel)
  const pending = advance?.requirements.filter((item) => item.state === 'pending') ?? []
  const unavailable = advance?.requirements.some((item) => item.state === 'unavailable') ?? true
  if (pending.length === 0)
    return {
      kind: 'up-to-date',
      hint: 'Você já fez tudo que está pronto. Novas aventuras estão sendo criadas!',
    }
  const groups = requirementGroups(advance?.requirements ?? [])
  const pendingGroups = groups.filter((group) => group.some((item) => item.state === 'pending'))
  const remaining = pendingGroups.length
  const complete = pendingGroups.filter(
    (group) =>
      !group.some((item) => item.state === 'pending' && item.requirement.milestone === 'showcase'),
  ).length
  const showcase = remaining - complete
  const prefix =
    remaining === 1
      ? `Falta 1 aventura para você virar ${levelInfo(view.nextLevel).label}.`
      : `Faltam ${remaining} aventuras para você virar ${levelInfo(view.nextLevel).label}.`
  const action =
    showcase === 0
      ? remaining === 1
        ? 'Termine a aventura!'
        : 'Termine as aventuras!'
      : complete === 0
        ? remaining === 1
          ? 'Termine e publique o seu jogo no Mural!'
          : 'Termine e publique os seus jogos no Mural!'
        : `Termine ${complete === 1 ? '1 aventura' : `${complete} aventuras`} e publique ${showcase === 1 ? '1 jogo' : `${showcase} jogos`} no Mural.`
  return {
    kind: 'pending',
    remaining,
    done: groups.filter((group) => group.every((item) => item.state === 'satisfied')).length,
    ready: groups.filter((group) => group.every((item) => item.state !== 'unavailable')).length,
    hint: unavailable ? null : `${prefix} ${action}`,
  }
}

/** Readiness limits future promises, while all already earned rank identities remain visible. */
export function canonicalVisibleJourneyLevels(
  view: KidsJourneyView,
  accessibleLevels: readonly JourneyLevelSlug[] = [],
): JourneyLevelSlug[] {
  const earned = JOURNEY_LEVEL_SLUGS.indexOf(view.earned.level)
  const horizon =
    view.readiness.horizon === null ? -1 : JOURNEY_LEVEL_SLUGS.indexOf(view.readiness.horizon)
  const accessible = Math.max(
    -1,
    ...accessibleLevels.map((level) => JOURNEY_LEVEL_SLUGS.indexOf(level)),
  )
  return JOURNEY_LEVEL_SLUGS.slice(0, Math.max(earned, horizon, accessible) + 1)
}
