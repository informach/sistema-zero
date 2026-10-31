import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ArquipelagoCoinsRepository } from '../../src/infrastructure/persistence/drizzle/arquipelago-coins.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const url = process.env.ARQUIPELAGO_COINS_TEST_DATABASE_URL
let connection: DbConnection
beforeAll(async () => {
  if (url) connection = await openKidsJourneyTestDatabase(url)
})
afterAll(async () => {
  await connection?.close()
})

test.skipIf(!url)('limite semanal, concorrência, idempotência e saldo no Postgres', async () => {
  const repo = new ArquipelagoCoinsRepository(connection.db)
  const userId = randomUUID(),
    accountId = randomUUID()
  const base = {
    userId,
    accountId,
    audience: 'kids' as const,
    operation: 'credit' as const,
    amount: 20,
  }
  const now = new Date('2026-10-27T12:00:00Z')
  const results = await Promise.all(
    Array.from({ length: 10 }, () => repo.movimentar({ ...base, key: randomUUID() }, now)),
  )
  expect(results.filter((result) => result.ok)).toHaveLength(5)
  expect(results.filter((result) => !result.ok && result.code === 'WEEKLY_LIMIT')).toHaveLength(5)
  const [profile] =
    await connection.sql`select coin_balance, lifetime_coins_earned from members.gamification_profiles where user_id = ${userId}`
  expect(profile?.coin_balance).toBe(100)
  expect(profile?.lifetime_coins_earned).toBe(100)
  const nextWeek = new Date('2026-11-02T03:00:00Z')
  const key = randomUUID()
  const credit = await repo.movimentar({ ...base, key }, nextWeek)
  expect(credit).toMatchObject({ ok: true, balance: 120, replayed: false })
  expect(await repo.movimentar({ ...base, key }, nextWeek)).toMatchObject({
    ok: true,
    balance: 120,
    replayed: true,
  })
  expect(await repo.movimentar({ ...base, key, amount: 21 }, nextWeek)).toEqual({
    ok: false,
    code: 'KEY_CONFLICT',
  })
  expect(
    await repo.movimentar(
      { ...base, operation: 'debit', amount: 121, key: randomUUID() },
      nextWeek,
    ),
  ).toEqual({ ok: false, code: 'INSUFFICIENT_BALANCE' })
  expect(
    await repo.movimentar({ ...base, operation: 'debit', amount: 30, key: randomUUID() }, nextWeek),
  ).toMatchObject({ ok: true, balance: 90 })
  expect(
    await repo.movimentar({ ...base, accountId: randomUUID(), key: randomUUID() }, nextWeek),
  ).toEqual({ ok: false, code: 'OWNER_MISMATCH' })
})

test.skipIf(!url)('adultos seguem o mesmo teto semanal de ganhos', async () => {
  const repo = new ArquipelagoCoinsRepository(connection.db)
  const userId = randomUUID()
  const base = {
    userId,
    accountId: userId,
    audience: 'adult' as const,
    operation: 'credit' as const,
  }
  const now = new Date('2026-10-27T12:00:00Z')
  expect(
    await repo.movimentar({ ...base, accountId: randomUUID(), key: randomUUID(), amount: 1 }, now),
  ).toEqual({ ok: false, code: 'OWNER_MISMATCH' })
  expect(await repo.movimentar({ ...base, key: randomUUID(), amount: 100 }, now)).toMatchObject({
    ok: true,
    balance: 100,
  })
  expect(await repo.movimentar({ ...base, key: randomUUID(), amount: 1 }, now)).toEqual({
    ok: false,
    code: 'WEEKLY_LIMIT',
  })
})

test.skipIf(!url)(
  'compra não reabre o teto e a semana muda à meia-noite de São Paulo',
  async () => {
    const repo = new ArquipelagoCoinsRepository(connection.db)
    const base = {
      userId: randomUUID(),
      accountId: randomUUID(),
      audience: 'kids' as const,
      operation: 'credit' as const,
    }
    const domingo = new Date('2026-11-02T02:59:59.999Z')
    const segunda = new Date('2026-11-02T03:00:00.000Z')
    const key = randomUUID()
    expect(await repo.movimentar({ ...base, key, amount: 100 }, domingo)).toMatchObject({
      ok: true,
      balance: 100,
      replayed: false,
    })
    expect(
      await repo.movimentar(
        { ...base, key: randomUUID(), operation: 'debit', amount: 75 },
        domingo,
      ),
    ).toMatchObject({
      ok: true,
      balance: 25,
    })
    expect(await repo.movimentar({ ...base, key: randomUUID(), amount: 1 }, domingo)).toEqual({
      ok: false,
      code: 'WEEKLY_LIMIT',
    })
    // Repetir um crédito da semana passada não ocupa o teto da semana nova.
    expect(await repo.movimentar({ ...base, key, amount: 100 }, segunda)).toMatchObject({
      ok: true,
      replayed: true,
    })
    expect(
      await repo.movimentar({ ...base, key: randomUUID(), amount: 100 }, segunda),
    ).toMatchObject({
      ok: true,
      balance: 125,
    })
    const [row] =
      await connection.sql`select coin_balance, lifetime_coins_earned from members.gamification_profiles where user_id = ${base.userId}`
    expect(row).toMatchObject({ coin_balance: 125, lifetime_coins_earned: 200 })
  },
)

test.skipIf(!url)(
  'crédito histórico acima do teto novo é preservado sem nova cobrança',
  async () => {
    const repo = new ArquipelagoCoinsRepository(connection.db)
    const userId = randomUUID()
    const base = {
      userId,
      accountId: userId,
      audience: 'adult' as const,
      operation: 'credit' as const,
    }
    const now = new Date('2026-10-29T12:00:00Z')
    const key = randomUUID()
    await repo.movimentar({ ...base, key, amount: 100 }, now)
    // Fixture da política antiga, somente no banco descartável do teste.
    await connection.sql`update members.coin_events set amount = 150, balance_after = 150 where user_id = ${userId} and source_id = ${key}`
    await connection.sql`update members.gamification_profiles set coin_balance = 150, lifetime_coins_earned = 150 where user_id = ${userId}`
    expect(await repo.movimentar({ ...base, key, amount: 150 }, now)).toMatchObject({
      ok: true,
      balance: 150,
      replayed: true,
    })
    expect(await repo.movimentar({ ...base, key: randomUUID(), amount: 1 }, now)).toEqual({
      ok: false,
      code: 'WEEKLY_LIMIT',
    })
    const [row] =
      await connection.sql`select coin_balance, lifetime_coins_earned from members.gamification_profiles where user_id = ${userId}`
    expect(row).toMatchObject({ coin_balance: 150, lifetime_coins_earned: 150 })
  },
)

test.skipIf(!url)(
  'A26: o resumo das compras soma só os débitos do jogo, pelo dia de São Paulo',
  async () => {
    const repo = new ArquipelagoCoinsRepository(connection.db)
    // Um ano sem nenhum outro teste: o resumo é de todo o banco.
    const credito = new Date('2031-03-10T12:00:00Z')
    const pessoas = [randomUUID(), randomUUID()]
    for (const userId of pessoas)
      await repo.movimentar(
        {
          userId,
          accountId: userId,
          audience: 'adult',
          key: randomUUID(),
          operation: 'credit',
          amount: 50,
        },
        credito,
      )
    const debitar = (userId: string, amount: number, quando: Date) =>
      repo.movimentar(
        {
          userId,
          accountId: userId,
          audience: 'adult',
          key: randomUUID(),
          operation: 'debit',
          amount,
        },
        quando,
      )
    await debitar(pessoas[0]!, 30, credito)
    // 02:30 UTC do dia 11 ainda é dia 10 em São Paulo.
    await debitar(pessoas[1]!, 10, new Date('2031-03-11T02:30:00Z'))
    await debitar(pessoas[1]!, 5, new Date('2031-03-11T12:00:00Z'))
    expect(
      await repo.resumoDasCompras({ audience: 'adult', de: '2031-03-10', ate: '2031-03-10' }),
    ).toEqual({
      quantidade: 2,
      pessoas: 2,
      moedas: 40,
    })
    expect(
      await repo.resumoDasCompras({ audience: 'kids', de: '2031-03-10', ate: '2031-03-11' }),
    ).toEqual({
      quantidade: 0,
      pessoas: 0,
      moedas: 0,
    })
  },
)
