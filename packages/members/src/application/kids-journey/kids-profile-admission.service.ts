import { IdentityUuidSchema } from '@sistemazero/core/identity'
import type {
  KidsJourneyOwner,
  KidsJourneyRepository,
} from '../../domain/ports/kids-journey-repository.port'

/** Auth-only materialization. Input contains ownership, never milestones, ranks or capabilities. */
export class KidsProfileAdmissionService {
  constructor(private readonly journey: Pick<KidsJourneyRepository, 'initializeProfile'>) {}

  async initialize(input: KidsJourneyOwner) {
    const owner = { userId: IdentityUuidSchema.parse(input.userId), accountId: IdentityUuidSchema.parse(input.accountId) }
    const policy = await this.journey.initializeProfile(owner)
    if (!policy) return null
    return { ...owner, policyVersion: policy.version }
  }
}
