import { and, eq } from 'drizzle-orm'
import type { WebhookInbox } from '../../../domain/ports/webhook-inbox.port'
import type { Database } from './db'
import { webhookEvents } from './schema'

/**
 * Dedupe de webhooks via constraint única `(provider, provider_event_id)`. O
 * `INSERT ... ON CONFLICT DO NOTHING RETURNING` é atômico: se nada retornou, o
 * evento já havia sido recebido.
 *
 * O token de dedupe só é "consumido" por `markProcessed` (que grava `processedAt`):
 * uma linha registrada mas ainda **não processada** (`processed_at IS NULL`)
 * continua reprocessável. Assim, uma falha no meio do processamento (cobrança
 * ainda não confirmada na fonte, txid ainda não persistido no modo assíncrono,
 * erro transitório) NÃO descarta as reentregas seguintes da Efí.
 */
export class DrizzleWebhookInbox implements WebhookInbox {
  constructor(private readonly db: Database) {}

  async registerIfNew(input: {
    provider: string
    eventId: string
    eventType: string
    payload: Record<string, unknown>
  }): Promise<boolean> {
    const inserted = await this.db
      .insert(webhookEvents)
      .values({
        provider: input.provider,
        providerEventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload,
      })
      .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.providerEventId] })
      .returning({ id: webhookEvents.id })

    if (inserted.length > 0) return true // primeira vez → processar

    // Já existe: só é duplicado (ignorar) se JÁ foi processado com sucesso.
    const [row] = await this.db
      .select({ processedAt: webhookEvents.processedAt })
      .from(webhookEvents)
      .where(
        and(eq(webhookEvents.provider, input.provider), eq(webhookEvents.providerEventId, input.eventId)),
      )
      .limit(1)

    // Linha sumiu entre o insert e o select (corrida rara) → trata como novo.
    return row ? row.processedAt === null : true
  }

  async markProcessed(provider: string, eventId: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(
        and(eq(webhookEvents.provider, provider), eq(webhookEvents.providerEventId, eventId)),
      )
  }
}
