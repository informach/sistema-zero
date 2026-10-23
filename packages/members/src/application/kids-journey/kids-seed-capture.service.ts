import type { KidsJourneyRepository } from '../../domain/ports/kids-journey-repository.port'
import type {
  KidsProfileCohortGateway,
  KidsProfileCohortQuery,
} from '../../domain/ports/kids-profile-cohort-gateway.port'

const OWNERS_PER_ADVANCE = 20

/** One remote page per call; every owner/cursor commits in its own fenced transaction. */
export class KidsSeedCaptureService {
  constructor(
    private readonly journey: Pick<
      KidsJourneyRepository,
      'getPreparation' | 'startSeedOwnerCapture' | 'appendSeedOwner' | 'sealSeedOwners'
    >,
    private readonly auth: KidsProfileCohortGateway,
  ) {}

  async advance(preparationId: string) {
    let current = await this.journey.getPreparation(preparationId)
    if (
      current?.origin !== 'seed' ||
      current.status !== 'capturing' ||
      current.captureStage !== 'auth'
    )
      return null
    const capture = current.authCapture
    if (capture?.upperBound === null)
      return this.journey.sealSeedOwners(preparationId, capture.cursor)
    const query: KidsProfileCohortQuery = capture
      ? {
          kind: 'continue',
          upperBound: capture.upperBound!,
          cursor: capture.cursor,
          limit: OWNERS_PER_ADVANCE,
        }
      : { kind: 'start', limit: OWNERS_PER_ADVANCE }
    // No Auth RPC runs while any Members transaction or lock is held.
    const page = await this.auth.readPage(query)
    if (!capture) {
      current = await this.journey.startSeedOwnerCapture(preparationId, page.upperBound)
      // A concurrent worker may have fixed another bound/progressed. Resume its durable envelope.
      if (
        !current?.authCapture ||
        current.authCapture.upperBound !== page.upperBound ||
        current.authCapture.cursor !== null
      )
        return null
    }
    let cursor = current.authCapture!.cursor
    for (const owner of page.owners) {
      const next = await this.journey.appendSeedOwner({
        preparationId,
        expectedCursor: cursor,
        owner,
      })
      if (!next?.authCapture) return null
      current = next
      cursor = next.authCapture.cursor
    }
    if (page.done) return this.journey.sealSeedOwners(preparationId, cursor)
    return current
  }
}
