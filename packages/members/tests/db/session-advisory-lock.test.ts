import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { withSessionAdvisoryLock } from '../../src/infrastructure/persistence/drizzle/session-advisory-lock'
import { prepareTestDatabase } from './test-database'

/**
 * O lock de SESSÃO do ciclo de vencimentos/fim do acesso (o ciclo faz HTTP, então não pode
 * segurar uma transação aberta). Chave própria do teste: o espaço de advisory locks é global ao
 * banco e o de tests/db é compartilhado entre os arquivos.
 */
const url = await prepareTestDatabase()
describe.skipIf(!url)('withSessionAdvisoryLock (Postgres real)', () => {
  const KEY = '30792292938117799'
  let conn: DbConnection

  beforeAll(() => {
    // Pool pequeno: uma conexão reservada que não voltasse ao pool travaria as chamadas seguintes.
    conn = createDbConnection(url as string, { max: 2 })
  })
  afterAll(async () => {
    await conn.close()
  })

  async function heldLocks(): Promise<number> {
    const [row] = await conn.sql<{ count: number }[]>`
      select count(*)::int as count from pg_locks
       where locktype = 'advisory' and objsubid = 1
         and ((classid::bigint << 32) | objid::bigint) = ${KEY}::bigint`
    return row?.count ?? 0
  }

  test('executa com o lock livre e recusa uma segunda sessão enquanto ele está preso', async () => {
    const inner: boolean[] = []
    const outer = await withSessionAdvisoryLock(conn.sql, KEY, async () => {
      expect(await heldLocks()).toBe(1)
      inner.push(await withSessionAdvisoryLock(conn.sql, KEY, async () => {}))
    })
    expect(outer).toBe(true)
    expect(inner).toEqual([false])
    expect(await heldLocks()).toBe(0)
  })

  test('erro no trabalho sobe, e o lock e a conexão reservada são liberados', async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await expect(
        withSessionAdvisoryLock(conn.sql, KEY, async () => {
          throw new Error('gateway fora')
        }),
      ).rejects.toThrow('gateway fora')
      expect(await heldLocks()).toBe(0)
    }
    // Quatro falhas seguidas com pool de 2: nenhuma reserva ficou presa e o lock está livre.
    let ran = false
    expect(
      await withSessionAdvisoryLock(conn.sql, KEY, async () => {
        ran = true
      }),
    ).toBe(true)
    expect(ran).toBe(true)
  })

  test('trabalho mais longo que uma transação ociosa aguentaria não perde o lock', async () => {
    // Sem transação aberta não há `idle in transaction`: com o timeout curto, uma transação-portão
    // seria derrubada aqui; o lock de sessão continua preso até o fim.
    const short = createDbConnection(url as string, { max: 2, idleInTransactionTimeoutMs: 200 })
    try {
      const done = await withSessionAdvisoryLock(short.sql, KEY, async () => {
        await Bun.sleep(400)
        expect(await heldLocks()).toBe(1)
      })
      expect(done).toBe(true)
      expect(await heldLocks()).toBe(0)
    } finally {
      await short.close()
    }
  })
})
