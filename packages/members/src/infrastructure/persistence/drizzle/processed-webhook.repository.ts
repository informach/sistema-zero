import { eq, inArray, lt } from 'drizzle-orm'
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
   * Retenção: apaga registros de dedupe anteriores a `before` (chamado pelo ciclo
   * de retenção — NÃO no caminho quente). Seguro: a janela de tolerância do HMAC
   * é de minutos; reprocessar uma entrega muito antiga seria idempotente de
   * qualquer forma (chave da matrícula). Apaga em LOTES (subquery com LIMIT sobre
   * o índice de `processed_at`) — um DELETE único da tabela inteira estouraria o
   * `statement_timeout` de 30s no primeiro ciclo grande e seguraria locks no
   * banco COMPARTILHADO do monorepo. Conta via `count` do driver (sem RETURNING
   * materializando linhas só para contar). Retorna o nº total de linhas apagadas.
   */
  async pruneProcessedBefore(before: Date, batchSize = 5000): Promise<number> {
    let total = 0
    for (;;) {
      const batch = this.db
        .select({ id: processedWebhooks.deliveryId })
        .from(processedWebhooks)
        .where(lt(processedWebhooks.processedAt, before))
        .limit(batchSize)
      const result = await this.db
        .delete(processedWebhooks)
        .where(inArray(processedWebhooks.deliveryId, batch))
      const deleted = Number((result as unknown as { count?: number }).count ?? 0)
      total += deleted
      if (deleted < batchSize) break
    }
    return total
  }
}
