import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ArquipelagoAvatarRepository } from '../../src/infrastructure/persistence/drizzle/arquipelago-avatar.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

/** As roupas do Arquipélago no inventário do avatar (§6.28, A21), no Postgres local descartável. */
const url = process.env.ARQUIPELAGO_COINS_TEST_DATABASE_URL
let connection: DbConnection
beforeAll(async () => {
  if (url) connection = await openKidsJourneyTestDatabase(url)
})
afterAll(async () => {
  await connection?.close()
})

test.skipIf(!url)(
  'concede peças pagas uma vez só, recusa grátis, desconhecida e outro dono',
  async () => {
    const repo = new ArquipelagoAvatarRepository(connection.db)
    const userId = randomUUID(),
      accountId = randomUUID()
    const base = { userId, accountId, audience: 'kids' as const }
    const pedidos = await Promise.all([
      repo.conceder({ ...base, pecas: ['hat-04', 'acc-09'] }),
      repo.conceder({ ...base, pecas: ['hat-04'] }),
    ])
    const concedidas = pedidos.flatMap((r) => (r.ok ? r.concedidas : []))
    expect(concedidas.sort()).toEqual(['acc-09', 'hat-04'])
    expect(await repo.conceder({ ...base, pecas: ['hat-04', 'acc-09'] })).toEqual({
      ok: true,
      concedidas: [],
    })
    const linhas =
      await connection.sql`select part_id from members.avatar_inventory where user_id = ${userId} order by part_id`
    expect(linhas.map((l) => l.part_id)).toEqual(['acc-09', 'hat-04'])
    expect(await repo.conceder({ ...base, pecas: ['head-01'] })).toEqual({
      ok: false,
      code: 'UNKNOWN_PART',
    })
    expect(await repo.conceder({ ...base, pecas: ['hat-99'] })).toEqual({
      ok: false,
      code: 'UNKNOWN_PART',
    })
    expect(
      await repo.conceder({ userId, accountId: userId, audience: 'adult', pecas: ['hat-04'] }),
    ).toMatchObject({ ok: true })
    expect(
      await repo.conceder({
        userId: randomUUID(),
        accountId: randomUUID(),
        audience: 'adult',
        pecas: ['hat-04'],
      }),
    ).toEqual({ ok: false, code: 'OWNER_MISMATCH' })
  },
)
