import { and, eq } from 'drizzle-orm'
import type { SuppressionRepository } from '../../../domain/ports/suppression-repository.port'
import type { Channel } from '../../../domain/shared/channel'
import type { Database } from './db'
import { suppressions } from './schema'

export class DrizzleSuppressionRepository implements SuppressionRepository {
  constructor(private readonly db: Database) {}

  async isSuppressed(channel: Channel, address: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: suppressions.id })
      .from(suppressions)
      .where(and(eq(suppressions.channel, channel), eq(suppressions.address, address)))
      .limit(1)
    return row !== undefined
  }

  async add(channel: Channel, address: string, reason: string): Promise<void> {
    await this.db.insert(suppressions).values({ channel, address, reason }).onConflictDoNothing()
  }
}
