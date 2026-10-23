import { canonicalJson } from '@sistemazero/core/creations'
import {
  ADULT_JOURNEY_TEMPLATE,
  buildAdultJourneySeed,
} from '../src/application/adult-journey/adult-journey-seed'
import {
  type AdultJourneySeedOnceDeps,
  runAdultJourneySeedOnce,
} from '../src/application/adult-journey/adult-journey-seed-once'

export function parseAdultProductionSeedArgs(args: readonly string[]) {
  const mode = args[0] ?? 'plan'
  if (
    !['plan', 'status', 'apply'].includes(mode) ||
    args.length > 2 ||
    (args.length === 2 && (mode !== 'apply' || args[1] !== '--allow-partial'))
  ) {
    throw new Error(
      'Uso: journey:seed-production [plan|status|apply [--allow-partial]]. Force/reseed não são suportados.',
    )
  }
  return { mode: mode as 'plan' | 'status' | 'apply', allowPartial: args[1] === '--allow-partial' }
}

type Ports = Omit<AdultJourneySeedOnceDeps, 'logger'>
export async function runAdultProductionSeed(
  options: ReturnType<typeof parseAdultProductionSeedArgs>,
  ports: Ports,
) {
  const current = await ports.service.policy()
  const courses = await ports.listCourses()
  const showcaseCourseIds = await ports.listShowcaseCourseIds(courses.map((c) => c.id))
  const proposed = buildAdultJourneySeed(courses, { showcaseCourseIds: new Set(showcaseCourseIds) })
  const configured = current.version > 0
  const partial = proposed.pendingStages.length > 0
  const before = {
    current,
    proposed,
    state: configured
      ? 'configured'
      : proposed.pendingStages.length === proposed.stages.length
        ? 'missing-planned'
        : partial
          ? 'missing-partial'
          : 'missing-complete',
    differsFromProposal:
      configured && canonicalJson(current.policy) !== canonicalJson(proposed.policy),
    templateStageIdsAbsentFromCurrent: ADULT_JOURNEY_TEMPLATE.filter(
      (stage) => !current.policy.stages.some((s) => s.id === stage.id),
    ).map((stage) => stage.id),
  }
  if (options.mode !== 'apply')
    return {
      schemaVersion: 1,
      domain: 'adult-journey',
      ...options,
      before,
      outcome: 'read-only' as const,
    }
  if (configured)
    return {
      schemaVersion: 1,
      domain: 'adult-journey',
      ...options,
      before,
      outcome: 'preserved-existing' as const,
    }
  if (partial && !options.allowPartial)
    return {
      schemaVersion: 1,
      domain: 'adult-journey',
      ...options,
      before,
      outcome: 'partial-needs-explicit-apply' as const,
    }
  // Same canonical seed-once and atomic insertIfAbsent as boot. Freeze the
  // inspected input; do not silently replace it with a different second plan.
  const applied = await runAdultJourneySeedOnce({
    service: ports.service,
    listCourses: async () => courses,
    listShowcaseCourseIds: async () => showcaseCourseIds,
    logger: { info: () => {}, warn: () => {} },
  })
  const after = await ports.service.policy()
  const outcome =
    applied.status === 'applied'
      ? applied.pendingStages > 0
        ? 'applied-partial'
        : 'applied-complete'
      : applied.reason === 'already-configured'
        ? 'preserved-concurrent'
        : 'failed'
  return { schemaVersion: 1, domain: 'adult-journey', ...options, before, after, applied, outcome }
}

export function adultProductionSeedFailed(
  report: Awaited<ReturnType<typeof runAdultProductionSeed>>,
) {
  return ['failed', 'partial-needs-explicit-apply'].includes(report.outcome)
}
