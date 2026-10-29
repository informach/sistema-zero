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
  expect(results.filter((result) => result.ok)).toHaveLength(7)
  expect(results.filter((result) => !result.ok && result.code === 'WEEKLY_LIMIT')).toHaveLength(3)
  const [profile] =
    await connection.sql`select coin_balance, lifetime_coins_earned from members.gamification_profiles where user_id = ${userId}`
  expect(profile?.coin_balance).toBe(140)
  expect(profile?.lifetime_coins_earned).toBe(140)
  const nextWeek = new Date('2026-11-02T03:00:00Z')
  const key = randomUUID()
  const credit = await repo.movimentar({ ...base, key }, nextWeek)
  expect(credit).toMatchObject({ ok: true, balance: 160, replayed: false })
  expect(await repo.movimentar({ ...base, key }, nextWeek)).toMatchObject({
    ok: true,
    balance: 160,
    replayed: true,
  })
  expect(await repo.movimentar({ ...base, key, amount: 21 }, nextWeek)).toEqual({
    ok: false,
    code: 'KEY_CONFLICT',
  })
  expect(
    await repo.movimentar(
      { ...base, operation: 'debit', amount: 161, key: randomUUID() },
      nextWeek,
    ),
  ).toEqual({ ok: false, code: 'INSUFFICIENT_BALANCE' })
  expect(
    await repo.movimentar({ ...base, operation: 'debit', amount: 30, key: randomUUID() }, nextWeek),
  ).toMatchObject({ ok: true, balance: 130 })
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
  expect(await repo.movimentar({ ...base, key: randomUUID(), amount: 150 }, now)).toMatchObject({
    ok: true,
    balance: 150,
  })
  expect(await repo.movimentar({ ...base, key: randomUUID(), amount: 1 }, now)).toEqual({
    ok: false,
    code: 'WEEKLY_LIMIT',
  })
})
