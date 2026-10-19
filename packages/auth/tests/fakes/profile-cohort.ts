import type {
  ProfileCohortQuery,
  ProfileCohortRepository,
} from '../../src/domain/ports/profile-cohort-repository.port'
import type { InMemoryProfileRepository } from './in-memory'

export class InMemoryProfileCohortRepository implements ProfileCohortRepository {
  constructor(private readonly profiles: InMemoryProfileRepository) {}

  async readPage(query: ProfileCohortQuery) {
    const rows = [...this.profiles.byId.values()].sort((a, b) => a.id.localeCompare(b.id))
    const upperBound = query.kind === 'start' ? (rows.at(-1)?.id ?? null) : query.upperBound
    const cursor = query.kind === 'continue' ? query.cursor : null
    const eligible = upperBound
      ? rows.filter((row) => row.id <= upperBound && (!cursor || row.id > cursor))
      : []
    const owners = eligible
      .slice(0, query.limit)
      .map((row) => ({ profileId: row.id, accountUserId: row.accountUserId }))
    return {
      upperBound,
      cursor: owners.at(-1)?.profileId ?? cursor,
      done: eligible.length <= query.limit,
      owners,
    }
  }
}
