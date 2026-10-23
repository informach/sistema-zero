import type { Logger } from '@sistemazero/core/logging'
import type { AdultJourneyService } from './adult-journey.service'
import {
  type AdultJourneySeedPlan,
  buildAdultJourneySeed,
  type SeedCourse,
} from './adult-journey-seed'

/**
 * O seed AUTOMÁTICO da jornada adulta (decisão da dona, 20/10/2026): roda sozinho no boot do
 * Members, uma vez só, e nunca sobrescreve.
 *
 * - Já existe política (do Admin ou de um seed anterior): não faz nada, para sempre.
 * - Sem cursos ou com níveis faltando: grava todas as etapas. Etapas vazias ficam planejadas,
 *   bloqueiam novos avanços e não concedem ferramentas. A equipe vincula os cursos no Admin.
 * - Plano recusado pela validação: registra o motivo e tenta de novo no próximo boot.
 *
 * Nunca lança: qualquer falha vira log e o boot segue.
 */
export type AdultJourneySeedOnceOutcome =
  | { status: 'applied'; version: number; stages: number; pendingStages: number }
  | { status: 'skipped'; reason: 'already-configured' | 'invalid' | 'error' }

export interface AdultJourneySeedOnceDeps {
  service: Pick<AdultJourneyService, 'policy' | 'seedIfAbsent'>
  /** Cursos adultos publicados (`listPublishedCourses('adult')`). */
  listCourses(): Promise<readonly SeedCourse[]>
  /** Cursos com a atividade de publicar no Mural (`listCourseIdsWithShowcaseBlock`). */
  listShowcaseCourseIds(courseIds: readonly string[]): Promise<readonly string[]>
  logger: Pick<Logger, 'info' | 'warn'>
}

export async function runAdultJourneySeedOnce(
  deps: AdultJourneySeedOnceDeps,
): Promise<AdultJourneySeedOnceOutcome> {
  const { logger } = deps
  try {
    if ((await deps.service.policy()).version > 0) {
      logger.info('adult_journey_seed.skipped', {
        reason: 'already-configured',
        detail: 'política já configurada, seed ignorado',
      })
      return { status: 'skipped', reason: 'already-configured' }
    }
    const courses = await deps.listCourses()
    const showcaseCourseIds = new Set(
      await deps.listShowcaseCourseIds(courses.map((course) => course.id)),
    )
    const plan = buildAdultJourneySeed(courses, { showcaseCourseIds })
    let saved: Awaited<ReturnType<AdultJourneySeedOnceDeps['service']['seedIfAbsent']>>
    try {
      saved = await deps.service.seedIfAbsent(plan.policy)
    } catch (error) {
      logger.warn('adult_journey_seed.skipped', {
        reason: 'invalid',
        detail: `plano recusado pela validação: ${error instanceof Error ? error.message : String(error)}; tenta de novo no próximo boot`,
      })
      return { status: 'skipped', reason: 'invalid' }
    }
    if (!saved) {
      logger.info('adult_journey_seed.skipped', {
        reason: 'already-configured',
        detail: 'política já configurada, seed ignorado',
      })
      return { status: 'skipped', reason: 'already-configured' }
    }
    logger.info('adult_journey_seed.applied', summary(plan, saved.version))
    return {
      status: 'applied',
      version: saved.version,
      stages: plan.stages.length,
      pendingStages: plan.pendingStages.length,
    }
  } catch (error) {
    logger.warn('adult_journey_seed.skipped', {
      reason: 'error',
      detail: `falha ao rodar o seed: ${error instanceof Error ? error.message : String(error)}; tenta de novo no próximo boot`,
    })
    return { status: 'skipped', reason: 'error' }
  }
}

function summary(plan: AdultJourneySeedPlan, version: number) {
  return {
    version,
    stages: plan.stages.map((stage) => `${stage.title} (${stage.courses.length})`),
    pendingStages: plan.pendingStages.map((stage) => stage.tier),
    excluded: plan.excluded.map((course) => course.slug),
  }
}
