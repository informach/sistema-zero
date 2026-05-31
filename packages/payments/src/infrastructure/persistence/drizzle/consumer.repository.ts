import { and, eq } from 'drizzle-orm'
import type { Consumer, ConsumerRepository } from '../../../domain/ports/consumer-repository.port'
import type { Database } from './db'
import { consumers } from './schema'

/** Repositório dos consumidores autorizados (credenciais de acesso ao serviço). */
export class DrizzleConsumerRepository implements ConsumerRepository {
  constructor(private readonly db: Database) {}

  async findById(consumerId: string): Promise<Consumer | null> {
    const [row] = await this.db
      .select()
      .from(consumers)
      .where(and(eq(consumers.id, consumerId), eq(consumers.isActive, true)))
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      hmacSecret: row.hmacSecret,
      allowedCidrs: row.allowedCidrs,
      webhookUrl: row.webhookUrl,
      isActive: row.isActive,
    }
  }
}
