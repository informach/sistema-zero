import { IdentityUuidSchema } from '@sistemazero/core/identity'
import type { KidsJourneyView } from '@sistemazero/core/journey'
import { z } from 'zod'
import type { KidsJourneyRepository } from '../../domain/ports/kids-journey-repository.port'
import type { KidsJourneyProfileState, KidsJourneyQueryService } from './kids-journey-query.service'

/**
 * Trusted server consumers (Admin inspection, account-owned reports, peer avatar metadata).
 * Registry ownership resolves data identity, never Auth admission or operation permission.
 * Missing profiles remain absent, rather than becoming fabricated Noob learners.
 */
export class KidsJourneyProfilesService {
  constructor(
    private readonly registry: Pick<KidsJourneyRepository, 'listOwners'>,
    private readonly query: Pick<KidsJourneyQueryService, 'getMany' | 'getManyStates'>,
  ) {}

  async getMany(inputProfileIds: readonly string[]): Promise<ReadonlyMap<string, KidsJourneyView>> {
    return this.query.getMany(await this.owners(inputProfileIds))
  }

  async getOwned(
    accountId: string,
    inputProfileIds: readonly string[],
  ): Promise<ReadonlyMap<string, KidsJourneyView>> {
    return this.query.getMany(
      await this.owners(inputProfileIds, IdentityUuidSchema.parse(accountId)),
    )
  }

  async getOwnedStates(
    accountId: string,
    inputProfileIds: readonly string[],
  ): Promise<ReadonlyMap<string, KidsJourneyProfileState>> {
    return this.query.getManyStates(
      await this.owners(inputProfileIds, IdentityUuidSchema.parse(accountId)),
    )
  }

  private async owners(inputProfileIds: readonly string[], accountId?: string) {
    const ids = [...new Set(z.array(IdentityUuidSchema).max(200).parse(inputProfileIds))]
    const owners = await this.registry.listOwners(ids)
    const requested = new Set(ids)
    const owned = owners
      .filter(
        (owner) =>
          requested.has(owner.userId) && (accountId === undefined || owner.accountId === accountId),
      )
      .map((owner) => ({ userId: owner.userId, accountId: owner.accountId }))
    // An empty result still goes through the query; missing policy never becomes an empty report.
    return owned
  }
}
