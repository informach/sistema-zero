import { and, eq, lt } from 'drizzle-orm'
import type {
  MarkReceivedInput,
  WebhookInboxRepository,
} from '../../../domain/ports/webhook-inbox.port'
import type { Database } from './db'
import { webhookEvents } from './schema'

export class DrizzleWebhookInboxRepository implements WebhookInboxRepository {
  constructor(private readonly db: Database) {}

  async alreadyReceived(provider: string, providerEventId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: webhookEvents.id })
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.provider, provider),
          eq(webhookEvents.providerEventId, providerEventId),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  async markReceived(input: MarkReceivedInput): Promise<boolean> {
    const inserted = await this.db
      .insert(webhookEvents)
      .values({
        provider: input.provider,
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        messageId: input.messageId,
        payload: input.payload,
        processedAt: new Date(),
      })
      .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.providerEventId] })
      .returning({ id: webhookEvents.id })
    return inserted.length > 0
  }

  async cleanup(olderThan: Date): Promise<number> {
    const result = await this.db
      .delete(webhookEvents)
      .where(lt(webhookEvents.receivedAt, olderThan))
    return Number((result as unknown as { count?: number }).count ?? 0)
  }
}
