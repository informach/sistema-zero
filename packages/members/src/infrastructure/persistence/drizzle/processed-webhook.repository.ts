import { eq, lt } from 'drizzle-orm'
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

  /**
   * Retenção: apaga registros de dedupe anteriores a `before` (chamado por um
   * cron/script de manutenção — NÃO no caminho quente). Seguro: a janela de
   * tolerância do HMAC é de minutos; reprocessar uma entrega muito antiga seria
   * idempotente de qualquer forma (chave da matrícula). Retorna nº de linhas.
   */
  async pruneProcessedBefore(before: Date): Promise<number> {
    const deleted = await this.db
      .delete(processedWebhooks)
      .where(lt(processedWebhooks.processedAt, before))
      .returning({ id: processedWebhooks.deliveryId })
    return deleted.length
  }
}
