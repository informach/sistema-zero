import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AVATAR_CATALOG as C } from '@sistemazero/core/avatar'
import { ArquipelagoAvatarRepository } from '../../src/infrastructure/persistence/drizzle/arquipelago-avatar.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

/** As roupas do Arquipélago no inventário do avatar (§6.28, A21), no Postgres local descartável. */
const pagas = Object.entries(C.parts)
  .filter(([, p]) => p.tier === 'coins' && !p.hidden)
  .map(([id]) => id)
const A = pagas[0] ?? ''
const B = pagas[1] ?? ''
const FESTA = Object.values(C.rules.festas)[0]?.prize ?? ''
const GRATIS = Object.entries(C.parts).find(([, p]) => p.tier === 'free')?.[0] ?? ''
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
      repo.conceder({ ...base, pecas: [A, B] }),
      repo.conceder({ ...base, pecas: [A] }),
    ])
    const concedidas = pedidos.flatMap((r) => (r.ok ? r.concedidas : []))
    expect(concedidas.sort()).toEqual([A, B].sort())
    expect(await repo.conceder({ ...base, pecas: [A, B] })).toEqual({
      ok: true,
      concedidas: [],
    })
    const linhas =
      await connection.sql`select part_id from members.avatar_inventory where user_id = ${userId} order by part_id`
    expect(linhas.map((l) => l.part_id)).toEqual([A, B].sort())
    // A roupa da festa (B16) só chega por aqui: a concessão aceita.
    expect(await repo.conceder({ ...base, pecas: [FESTA] })).toEqual({
      ok: true,
      concedidas: [FESTA],
    })
    expect(await repo.conceder({ ...base, pecas: [GRATIS] })).toEqual({
      ok: false,
      code: 'UNKNOWN_PART',
    })
    expect(await repo.conceder({ ...base, pecas: ['nao_existe'] })).toEqual({
      ok: false,
      code: 'UNKNOWN_PART',
    })
    expect(
      await repo.conceder({ userId, accountId: userId, audience: 'adult', pecas: [A] }),
    ).toMatchObject({ ok: true })
    expect(
      await repo.conceder({
        userId: randomUUID(),
        accountId: randomUUID(),
        audience: 'adult',
        pecas: [A],
      }),
    ).toEqual({ ok: false, code: 'OWNER_MISMATCH' })
  },
)
