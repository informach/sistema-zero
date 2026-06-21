import { and, eq, isNotNull, lt } from 'drizzle-orm'
import type { WebhookInbox } from '../../../domain/ports/webhook-inbox.port'
import type { Database } from './db'
import { webhookEvents } from './schema'

/**
 * Dedupe de webhooks via constraint única `(provider, provider_event_id)`. Usa
 * lease no `payload` para impedir concorrência entre réplicas no mesmo evento:
 * uma linha recém-criada recebe `__processingStartedAt` e uma segunda entrega que
 * chega enquanto o processamento da primeira ainda está em andamento retorna `false`
 * sem disputar o evento novamente.
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
    const now = new Date()
    const claimedPayload = { ...input.payload, __processingStartedAt: now.toISOString() }
    const staleMs = 60_000

    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(webhookEvents)
        .values({
          provider: input.provider,
          providerEventId: input.eventId,
          eventType: input.eventType,
          payload: claimedPayload,
        })
        .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.providerEventId] })
        .returning({ id: webhookEvents.id })

      if (inserted.length > 0) return true // primeira vez → processar

      // Já existe: só é duplicado (ignorar) se JÁ foi processado com sucesso.
      const [row] = await tx
        .select({
          processedAt: webhookEvents.processedAt,
          payload: webhookEvents.payload,
        })
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.provider, input.provider),
            eq(webhookEvents.providerEventId, input.eventId),
          ),
        )
        .for('update')
        .limit(1)

      // Linha sumiu entre o insert e o select (corrida rara) → trata como novo.
      if (!row) return true

      if (row.processedAt) return false

      const processingStartedAt = parseProcessingStartedAt(
        row.payload as Record<string, unknown> | null,
      )

      if (processingStartedAt === null || now.getTime() - processingStartedAt.getTime() > staleMs) {
        await tx
          .update(webhookEvents)
          .set({
            payload: {
              ...(row.payload as Record<string, unknown>),
              __processingStartedAt: now.toISOString(),
            },
          })
          .where(
            and(
              eq(webhookEvents.provider, input.provider),
              eq(webhookEvents.providerEventId, input.eventId),
            ),
          )
        return true
      }

      return false
    })
  }

  async markProcessed(provider: string, eventId: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.providerEventId, eventId)))
  }

  /**
   * Retenção: remove eventos já processados mais antigos que `olderThan`. Linhas
   * não processadas (reprocessáveis) nunca são tocadas. Retorna quantas removeu.
   */
  async cleanup(olderThan: Date): Promise<number> {
    const deleted = await this.db
      .delete(webhookEvents)
      .where(and(isNotNull(webhookEvents.processedAt), lt(webhookEvents.processedAt, olderThan)))
      .returning({ id: webhookEvents.id })
    return deleted.length
  }
}

function parseProcessingStartedAt(value: Record<string, unknown> | null): Date | null {
  if (!value || typeof value.__processingStartedAt !== 'string') return null
  const date = new Date(value.__processingStartedAt)
  return Number.isNaN(date.getTime()) ? null : date
}
