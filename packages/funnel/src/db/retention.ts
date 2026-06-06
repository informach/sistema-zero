import { sql } from 'drizzle-orm'
import type { Database } from './client'
import { processedWebhooks } from './schema'

// Advisory lock PRÓPRIO do funil (padrão do monorepo: members/auth/payments têm
// as suas chaves) — garante que só UMA réplica roda a limpeza por ciclo.
const RETENTION_LOCK_KEY = 47713920114417

/** Dedupe de webhook só precisa cobrir a janela de retry do gateway (dias). */
const RETENTION_DAYS = 30
const RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000 // a cada 6h
const FIRST_RUN_DELAY_MS = 60_000 // fora do caminho do cold start

type Log = (msg: string, meta?: Record<string, unknown>) => void

/**
 * Apaga `processed_webhooks` mais velhos que a retenção (o dedupe por
 * delivery-id só faz sentido dentro da janela de reentrega do gateway; sem
 * limpeza a tabela cresce p/ sempre). `funnel_events` fica DE PROPÓSITO: é o
 * analytics histórico do dashboard — apagar distorceria a conversão.
 * Retorna false quando outra réplica detinha o lock (nada a fazer).
 */
export async function pruneProcessedWebhooks(db: Database): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx.execute(
      sql`select pg_try_advisory_xact_lock(${RETENTION_LOCK_KEY}) as locked`,
    )
    const locked = (rows as unknown as Array<{ locked?: boolean }>)[0]?.locked === true
    if (!locked) return false
    await tx.execute(
      sql`delete from ${processedWebhooks}
          where ${processedWebhooks.processedAt} < now() - make_interval(days => ${RETENTION_DAYS})`,
    )
    return true
  })
}

let started = false

/**
 * Agenda a limpeza periódica (1x por processo; timers com `unref` p/ não
 * segurar o shutdown). Erros são logados e NUNCA derrubam o servidor.
 */
export function startWebhookRetention(db: Database, log?: Log): void {
  if (started) return
  started = true
  const run = async () => {
    try {
      const ran = await pruneProcessedWebhooks(db)
      if (ran) log?.('retention.pruned', { table: 'processed_webhooks' })
    } catch (err) {
      log?.('retention.error', { message: err instanceof Error ? err.message : String(err) })
    }
  }
  setTimeout(run, FIRST_RUN_DELAY_MS).unref?.()
  setInterval(run, RETENTION_INTERVAL_MS).unref?.()
}
