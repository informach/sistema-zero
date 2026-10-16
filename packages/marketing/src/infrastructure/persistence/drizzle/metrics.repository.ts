import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import type {
  AccountSnapshot,
  MetricsRepository,
  PublicationSnapshot,
} from '../../../domain/ports/metrics-repository.port'
import type { Database } from './db'
import { metricAccountSnapshots, metricPublicationSnapshots } from './schema'

export class DrizzleMetricsRepository implements MetricsRepository {
  constructor(private readonly db: Pick<Database, 'insert' | 'select' | 'selectDistinctOn'>) {}

  async insertAccountSnapshot(row: AccountSnapshot): Promise<void> {
    await this.db.insert(metricAccountSnapshots).values(row)
  }

  async insertPublicationSnapshots(rows: PublicationSnapshot[]): Promise<void> {
    if (rows.length === 0) return
    await this.db.insert(metricPublicationSnapshots).values(rows)
  }

  async latestAccountSnapshot(socialAccountId: string): Promise<AccountSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(metricAccountSnapshots)
      .where(eq(metricAccountSnapshots.socialAccountId, socialAccountId))
      .orderBy(desc(metricAccountSnapshots.capturedAt), desc(metricAccountSnapshots.id))
      .limit(1)
    return row ?? null
  }

  async latestAccountSnapshots(socialAccountIds: string[]): Promise<Map<string, AccountSnapshot>> {
    const map = new Map<string, AccountSnapshot>()
    if (socialAccountIds.length === 0) return map
    // Keep one row per account in PostgreSQL, rather than transferring its entire history.
    const rows = await this.db
      .selectDistinctOn([metricAccountSnapshots.socialAccountId])
      .from(metricAccountSnapshots)
      .where(inArray(metricAccountSnapshots.socialAccountId, socialAccountIds))
      .orderBy(
        asc(metricAccountSnapshots.socialAccountId),
        desc(metricAccountSnapshots.capturedAt),
        desc(metricAccountSnapshots.id),
      )
    for (const row of rows) {
      if (!map.has(row.socialAccountId)) map.set(row.socialAccountId, row)
    }
    return map
  }

  async listAccountSnapshotsSince(
    socialAccountIds: string[],
    since: Date,
  ): Promise<AccountSnapshot[]> {
    if (socialAccountIds.length === 0) return []
    return this.db
      .select()
      .from(metricAccountSnapshots)
      .where(
        and(
          inArray(metricAccountSnapshots.socialAccountId, socialAccountIds),
          gte(metricAccountSnapshots.capturedAt, since),
        ),
      )
      .orderBy(asc(metricAccountSnapshots.capturedAt), asc(metricAccountSnapshots.id))
  }

  async latestPublicationStats(
    publicationIds: string[],
    until?: Date,
  ): Promise<Map<string, PublicationSnapshot>> {
    const map = new Map<string, PublicationSnapshot>()
    if (publicationIds.length === 0) return map
    // Bound the result by the requested publications, independently of snapshot history size.
    const rows = await this.db
      .selectDistinctOn([metricPublicationSnapshots.publicationId])
      .from(metricPublicationSnapshots)
      .where(
        and(
          inArray(metricPublicationSnapshots.publicationId, publicationIds),
          until ? lte(metricPublicationSnapshots.capturedAt, until) : undefined,
        ),
      )
      .orderBy(
        asc(metricPublicationSnapshots.publicationId),
        desc(metricPublicationSnapshots.capturedAt),
        desc(metricPublicationSnapshots.id),
      )
    for (const row of rows) {
      if (!map.has(row.publicationId)) map.set(row.publicationId, row)
    }
    return map
  }

  async listPublicationSnapshots(
    publicationId: string,
    limit: number,
  ): Promise<PublicationSnapshot[]> {
    return this.db
      .select()
      .from(metricPublicationSnapshots)
      .where(eq(metricPublicationSnapshots.publicationId, publicationId))
      .orderBy(desc(metricPublicationSnapshots.capturedAt), desc(metricPublicationSnapshots.id))
      .limit(limit)
  }
}
