import type { PgClient } from './db'

/**
 * Executa `work` só se ESTA réplica obtiver o advisory lock `key` (string + cast ::bigint, como
 * os outros ciclos). Porte do helper do Auth (`withSessionAdvisoryLock`).
 *
 * Usa lock de SESSÃO numa conexão reservada, não `pg_try_advisory_xact_lock` numa transação
 * "portão": o trabalho faz chamadas HTTP (Auth, Messaging) e a transação aberta ficaria
 * `idle in transaction`, morta pelo `idle_in_transaction_session_timeout` de 30 s do pool
 * (`db.ts`) no meio do ciclo. A conexão reservada fica fora do pool até o `release` e só segura
 * o lock (o trabalho usa o pool normal); se ela cair, o Postgres solta o lock sozinho.
 *
 * Unlock e `release` rodam em todos os caminhos, inclusive quando `work` lança (o erro sobe).
 * Devolve `false` quando outra sessão segura o lock (nada é executado). Duas chamadas na MESMA
 * réplica usam conexões reservadas diferentes, então a segunda também recebe `false`.
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
