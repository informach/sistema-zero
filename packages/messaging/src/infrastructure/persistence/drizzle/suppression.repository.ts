import { and, eq } from 'drizzle-orm'
import type { SuppressionRepository } from '../../../domain/ports/suppression-repository.port'
import { normalizeAddress } from '../../../domain/services/address'
import type { Channel } from '../../../domain/shared/channel'
import type { Database } from './db'
import { suppressions } from './schema'

export class DrizzleSuppressionRepository implements SuppressionRepository {
  constructor(private readonly db: Database) {}

  async isSuppressed(channel: Channel, address: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: suppressions.id })
      .from(suppressions)
      .where(
        and(
          eq(suppressions.channel, channel),
          // Normaliza nos DOIS lados (gravação e consulta) — supressão por
          // igualdade não pode depender do formato que o consumidor mandou.
          eq(suppressions.address, normalizeAddress(channel, address)),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  async add(channel: Channel, address: string, reason: string): Promise<void> {
    await this.db
      .insert(suppressions)
      .values({ channel, address: normalizeAddress(channel, address), reason })
      .onConflictDoNothing()
  }
}
