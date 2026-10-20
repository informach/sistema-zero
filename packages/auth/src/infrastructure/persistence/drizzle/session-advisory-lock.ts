import type { PgClient } from './db'

/**
 * Executa `work` só se ESTA réplica obtiver o advisory lock `key` (string + cast ::bigint,
 * como a purga). Usa lock de SESSÃO numa conexão reservada, não `pg_try_advisory_xact_lock`:
 * o trabalho faz chamadas HTTP e uma transação aberta ficaria `idle in transaction`, morta
 * pelo timeout de 30 s do pool no meio do ciclo. A conexão reservada fica fora do pool até o
 * `release`; se ela cair, o Postgres solta o lock sozinho.
 * Devolve `false` quando outra réplica segura o lock (nada é executado).
 */
export async function withSessionAdvisoryLock(
  sql: PgClient,
  key: string,
  work: () => Promise<void>,
): Promise<boolean> {
  const reserved = await sql.reserve()
  try {
    const [row] = await reserved`select pg_try_advisory_lock(${key}::bigint) as locked`
    if (!row?.locked) return false
    try {
      await work()
    } finally {
      await reserved`select pg_advisory_unlock(${key}::bigint)`
    }
    return true
  } finally {
    reserved.release()
  }
}
