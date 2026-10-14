import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '../persistence/drizzle/db'
import { liveMediaConnections } from '../persistence/drizzle/schema'
import {
  type LiveMediaConnection,
  LiveMediaError,
  type LiveMediaRegistryPort,
} from './media-registry'

const data = (value: Record<string, unknown>): LiveMediaConnection =>
  value as unknown as LiveMediaConnection
const json = (value: LiveMediaConnection): Record<string, unknown> =>
  value as unknown as Record<string, unknown>

/** Locks are short database transactions; no network request holds a database lock. */
export class DrizzleLiveMediaRegistry implements LiveMediaRegistryPort {
  constructor(private readonly db: Database) {}

  async insert(connection: LiveMediaConnection): Promise<LiveMediaConnection> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`live-media:${connection.occurrenceId}:${connection.actor.id}`}, 0))`,
      )
      const rows = await tx
        .select()
        .from(liveMediaConnections)
        .where(
          and(
            eq(liveMediaConnections.occurrenceId, connection.occurrenceId),
            eq(liveMediaConnections.actorId, connection.actor.id),
          ),
        )
        .for('update')
      if (rows.some((row) => row.id === connection.id))
        throw new LiveMediaError('MEDIA_ATTEMPT_USED', 'Tentativa já utilizada.')
      const next = {
        ...connection,
        generation: Math.max(0, ...rows.map((row) => row.generation)) + 1,
      }
      for (const row of rows) {
        const prior = data(row.state)
        if (prior.status === 'closed' || prior.status === 'retired') continue
        prior.status = 'retired'
        prior.cleanupPending = true
        await tx
          .update(liveMediaConnections)
          .set({ state: json(prior) })
          .where(eq(liveMediaConnections.id, prior.id))
      }
      await tx.insert(liveMediaConnections).values({
        id: next.id,
        occurrenceId: next.occurrenceId,
        actorId: next.actor.id,
        participationId: `${next.occurrenceId}:${next.actor.id}`,
        deviceId: next.deviceId,
        generation: next.generation,
        state: json(next),
      })
      return next
    })
  }

  async get(id: string): Promise<LiveMediaConnection | null> {
    const [row] = await this.db
      .select({ state: liveMediaConnections.state })
      .from(liveMediaConnections)
      .where(eq(liveMediaConnections.id, id))
    return row ? data(row.state) : null
  }

  async list(occurrenceId: string): Promise<LiveMediaConnection[]> {
    const rows = await this.db
      .select({ state: liveMediaConnections.state })
      .from(liveMediaConnections)
      .where(eq(liveMediaConnections.occurrenceId, occurrenceId))
    return rows.map((row) => data(row.state))
  }

  async mutate<T>(id: string, update: (connection: LiveMediaConnection) => T): Promise<T> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ state: liveMediaConnections.state })
        .from(liveMediaConnections)
        .where(eq(liveMediaConnections.id, id))
        .for('update')
      if (!row) throw new LiveMediaError('MEDIA_CONNECTION_MISSING', 'Conexão não encontrada.', 404)
      const connection = data(row.state)
      const result = update(connection)
      await tx
        .update(liveMediaConnections)
        .set({ state: json(connection) })
        .where(eq(liveMediaConnections.id, id))
      return result
    })
  }
}
