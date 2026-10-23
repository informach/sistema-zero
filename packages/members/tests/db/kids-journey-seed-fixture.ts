import type { Database } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'

/** Real empty-cohort bootstrap for isolated fixtures, before admitting any learner. */
export async function publishKidsSeedForTest(db: Database) {
  const repository = new DrizzleKidsJourneyRepository(db)
  await repository.initializeSeed()
  const initial = await repository.createSeedPreparation()
  if (!initial) throw new Error('Fixture requires a new unpublished Kids seed')
  await repository.startSeedOwnerCapture(initial.id, null)
  let preparation = await repository.sealSeedOwners(initial.id, null)
  if (!preparation) throw new Error('Fixture seed owner capture failed')
  for (let step = 0; preparation.status === 'capturing' && step < 20; step++) {
    preparation = await repository.advanceCapture(
      preparation.id,
      preparation.captureStage,
      preparation.captureCursor,
    )
    if (!preparation) throw new Error('Fixture seed capture conflicted')
  }
  if (preparation.status !== 'ready' || !preparation.cohortHash)
    throw new Error('Fixture seed must have an empty, fully captured cohort')
  const published = await repository.publishPrepared({
    preparationId: preparation.id,
    expectedVersion: preparation.expectedVersion,
    draftHash: preparation.draftHash,
    catalogHash: preparation.catalogHash,
    cohortHash: preparation.cohortHash,
    actor: { kind: 'system' },
  })
  if (published?.version !== 1) throw new Error('Fixture seed publication failed')
  return repository
}
