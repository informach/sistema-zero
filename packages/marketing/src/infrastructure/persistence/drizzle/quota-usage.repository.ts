import { and, eq, sql } from 'drizzle-orm'
import type {
  QuotaUsage,
  QuotaUsageRepository,
} from '../../../domain/ports/quota-usage-repository.port'
import type { Database } from './db'
import { providerQuotaUsage } from './schema'

export class DrizzleQuotaUsageRepository implements QuotaUsageRepository {
  constructor(private readonly db: Database) {}

  async get(provider: string, day: string): Promise<QuotaUsage> {
    const [row] = await this.db
      .select()
      .from(providerQuotaUsage)
      .where(and(eq(providerQuotaUsage.provider, provider), eq(providerQuotaUsage.day, day)))
      .limit(1)
    return { units: row?.units ?? 0, uploads: row?.uploads ?? 0 }
  }

  async add(provider: string, day: string, units: number, uploads: number): Promise<QuotaUsage> {
    const [row] = await this.db
      .insert(providerQuotaUsage)
      .values({ provider, day, units, uploads })
      .onConflictDoUpdate({
        target: [providerQuotaUsage.provider, providerQuotaUsage.day],
        set: {
          units: sql`${providerQuotaUsage.units} + ${units}`,
          uploads: sql`${providerQuotaUsage.uploads} + ${uploads}`,
        },
      })
      .returning()
    return { units: row?.units ?? units, uploads: row?.uploads ?? uploads }
  }
}
