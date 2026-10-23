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
 * - Sem curso adulto publicado no primeiro nível (ou plano recusado pela validação do Admin): só
 *   registra o motivo e tenta de novo no próximo boot.
 * - Plano parcial (faltam níveis): GRAVA o que tem. Uma etapa sem curso não existe (a política
 *   exige ao menos um curso por etapa e o seed para antes do primeiro nível vazio), então as
 *   ferramentas das etapas que faltam continuam fechadas; nada abre antes da hora. A equipe
 *   completa as etapas depois, no Admin. E o piso da posição (`adult_journey_reached`) segura quem
 *   já terminou as etapas existentes quando as novas chegarem.
 *
 * Nunca lança: qualquer falha vira log e o boot segue.
 */
export type AdultJourneySeedOnceOutcome =
  | { status: 'applied'; version: number; stages: number; partial: boolean }
  | { status: 'skipped'; reason: 'already-configured' | 'no-courses' | 'invalid' | 'error' }

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
    if (plan.stages.length === 0) {
      logger.warn('adult_journey_seed.skipped', {
        reason: 'no-courses',
        detail:
          'nenhum curso adulto publicado no primeiro nível (primeiros-passos-2d); tenta de novo no próximo boot',
        excluded: plan.excluded.map((course) => course.slug),
      })
      return { status: 'skipped', reason: 'no-courses' }
    }
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
      partial: plan.stoppedAt !== null,
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
    stoppedAt: plan.stoppedAt?.tier ?? null,
    excluded: plan.excluded.map((course) => course.slug),
  }
}
