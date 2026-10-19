import { and, asc, desc, gt, lte } from 'drizzle-orm'
import type {
  ProfileCohortQuery,
  ProfileCohortRepository,
} from '../../../domain/ports/profile-cohort-repository.port'
import { ProfileCohortQuerySchema } from '../../../domain/profile/profile-cohort'
import type { Database } from './db'
import { profiles } from './schema'

/** Auth owns these pairs. No Members schema, gamification membership or long-lived snapshot. */
export class DrizzleProfileCohortRepository implements ProfileCohortRepository {
  constructor(private readonly db: Database) {}

  readPage(input: ProfileCohortQuery) {
    const query = ProfileCohortQuerySchema.parse(input)
    return this.db.transaction(
      async (tx) => {
        const upperBound =
          query.kind === 'start'
            ? ((
                await tx
                  .select({ id: profiles.id })
                  .from(profiles)
                  .orderBy(desc(profiles.id))
                  .limit(1)
              )[0]?.id ?? null)
            : query.upperBound
        const cursor = query.kind === 'continue' ? query.cursor : null
        if (upperBound === null) return { upperBound, cursor: null, done: true, owners: [] }
        const rows = await tx
          .select({ profileId: profiles.id, accountUserId: profiles.accountUserId })
          .from(profiles)
          .where(and(lte(profiles.id, upperBound), cursor ? gt(profiles.id, cursor) : undefined))
          .orderBy(asc(profiles.id))
          .limit(query.limit + 1)
        const owners = rows.slice(0, query.limit)
        return {
          upperBound,
          cursor: owners.at(-1)?.profileId ?? cursor,
          done: rows.length <= query.limit,
          owners,
        }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
}
