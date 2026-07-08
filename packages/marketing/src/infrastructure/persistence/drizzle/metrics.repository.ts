import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm'
import type {
  AccountSnapshot,
  MetricsRepository,
  PublicationSnapshot,
} from '../../../domain/ports/metrics-repository.port'
import type { Database } from './db'
import { metricAccountSnapshots, metricPublicationSnapshots } from './schema'

export class DrizzleMetricsRepository implements MetricsRepository {
  constructor(private readonly db: Database) {}

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
      .orderBy(desc(metricAccountSnapshots.capturedAt))
      .limit(1)
    return row ?? null
  }

  async latestAccountSnapshots(socialAccountIds: string[]): Promise<Map<string, AccountSnapshot>> {
    const map = new Map<string, AccountSnapshot>()
    if (socialAccountIds.length === 0) return map
    // Mais recentes primeiro; o primeiro visto por conta vence.
    const rows = await this.db
      .select()
      .from(metricAccountSnapshots)
      .where(inArray(metricAccountSnapshots.socialAccountId, socialAccountIds))
      .orderBy(desc(metricAccountSnapshots.capturedAt))
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
      .orderBy(asc(metricAccountSnapshots.capturedAt))
  }

  async latestPublicationStats(
    publicationIds: string[],
  ): Promise<Map<string, PublicationSnapshot>> {
    const map = new Map<string, PublicationSnapshot>()
    if (publicationIds.length === 0) return map
    // Mais recentes primeiro; o primeiro visto por publicação vence.
    const rows = await this.db
      .select()
      .from(metricPublicationSnapshots)
      .where(inArray(metricPublicationSnapshots.publicationId, publicationIds))
      .orderBy(desc(metricPublicationSnapshots.capturedAt))
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
      .orderBy(desc(metricPublicationSnapshots.capturedAt))
      .limit(limit)
  }
}
