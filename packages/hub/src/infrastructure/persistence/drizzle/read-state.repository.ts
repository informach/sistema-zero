import { randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import type { ReadStateRepository } from '../../../domain/ports/read-state-repository.port'
import type { Database } from './db'
import { readState } from './schema'

export class DrizzleReadStateRepository implements ReadStateRepository {
  constructor(private readonly db: Database) {}

  async markSeen(userId: string, channelId: string, now: Date): Promise<void> {
    await this.db
      .insert(readState)
      .values({ id: randomUUID(), userId, channelId, lastSeenAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [readState.userId, readState.channelId],
        set: { lastSeenAt: now, updatedAt: now },
      })
  }

  async lastSeen(userId: string, channelIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>()
    if (channelIds.length === 0) return map
    const rows = await this.db
      .select({ channelId: readState.channelId, lastSeenAt: readState.lastSeenAt })
      .from(readState)
      .where(and(eq(readState.userId, userId), inArray(readState.channelId, channelIds)))
    for (const r of rows) map.set(r.channelId, r.lastSeenAt)
    return map
  }
}
