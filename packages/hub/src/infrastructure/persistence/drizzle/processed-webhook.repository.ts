import { eq } from 'drizzle-orm'
import type { ProcessedWebhookRepository } from '../../../domain/ports/processed-webhook-repository.port'
import type { Database } from './db'
import { processedWebhooks } from './schema'

export class DrizzleProcessedWebhookRepository implements ProcessedWebhookRepository {
  constructor(private readonly db: Database) {}

  async isProcessed(deliveryId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: processedWebhooks.deliveryId })
      .from(processedWebhooks)
      .where(eq(processedWebhooks.deliveryId, deliveryId))
      .limit(1)
    return Boolean(row)
  }

  async markProcessed(deliveryId: string, eventName: string): Promise<void> {
    await this.db
      .insert(processedWebhooks)
      .values({ deliveryId, eventName })
      .onConflictDoNothing({ target: processedWebhooks.deliveryId })
  }
}
