import { sql } from 'drizzle-orm'
import type { Database } from './db'

export type TransacaoDeCenarios = Parameters<Parameters<Database['transaction']>[0]>[0]
export type ExecutorDeCenarios = Database | TransacaoDeCenarios

export async function travarEspacoDeCenarios(
  tx: TransacaoDeCenarios,
  espacoId: string,
): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`cenarios-espaco:${espacoId}`}, 0))`,
  )
}
