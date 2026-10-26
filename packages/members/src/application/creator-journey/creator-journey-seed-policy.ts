import type {
  AdultJourneyPolicy,
  CreatorJourneyCurriculum,
  KidsJourneyPolicy,
} from '@sistemazero/core/journey'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { KidsJourneyConfigurationService } from '../kids-journey/kids-journey-configuration.service'

/** Keep the historical policy body for audit; curriculum presence selects the new core authority. */
export function creatorKidsSeedPolicy(
  existing: KidsJourneyPolicy,
  curriculum: CreatorJourneyCurriculum,
): KidsJourneyPolicy {
  return { ...existing, curriculum }
}
export function creatorAdultSeedPolicy(
  existing: AdultJourneyPolicy,
  curriculum: CreatorJourneyCurriculum,
): AdultJourneyPolicy {
  return { ...existing, curriculum }
}

/** No raw policy UPDATE: all existing cohort capture, earned freeze and publication fences apply. */
export async function prepareCreatorKidsSeed(
  service: KidsJourneyConfigurationService,
  curriculum: CreatorJourneyCurriculum,
  actorId: string,
) {
  const current = await service.policy()
  if (JSON.stringify(current.policy.curriculum) === JSON.stringify(curriculum))
    return { status: 'unchanged' as const, version: current.version }
  const preparation = await service.prepare({
    expectedVersion: current.version,
    policy: creatorKidsSeedPolicy(current.policy, curriculum),
    actorId,
    reason:
      'Implantação da Jornada do Criador: par, missão, Poderes e Maestrias; direitos anteriores preservados.',
  })
  return { status: 'prepared' as const, preparationId: preparation.id }
}

export async function publishCreatorAdultSeed(
  service: AdultJourneyService,
  curriculum: CreatorJourneyCurriculum,
) {
  const current = await service.policy()
  if (JSON.stringify(current.policy.curriculum) === JSON.stringify(curriculum))
    return { status: 'unchanged' as const, version: current.version }
  const saved = await service.configure(
    creatorAdultSeedPolicy(current.policy, curriculum),
    current.version,
  )
  return { status: 'published' as const, version: saved.version }
}
