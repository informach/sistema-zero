import { desc, eq, inArray } from 'drizzle-orm'
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
