import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { DrizzleLiveMediaRegistry } from '../../src/infrastructure/live/drizzle-media-registry'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_test')
if (!databaseUrl)
  console.warn('[tests/db] Postgres indisponível: lease do reconcile de mídia não verificado.')

describe.skipIf(!databaseUrl)('Lease do reconcile de mídia no PostgreSQL', () => {
  let connection: DbConnection
  beforeAll(() => {
    connection = createDbConnection(databaseUrl!)
  })
  afterAll(async () => {
    await connection?.close()
  })

  test('uma réplica por vez; o dono renova e solta; lease vencido é retomado', async () => {
    const registry = new DrizzleLiveMediaRegistry(connection.db)
    const occurrenceId = randomUUID(),
      first = randomUUID(),
      second = randomUUID()
    expect(await registry.tryLease(occurrenceId, first, 60_000)).toBe(true)
    expect(await registry.tryLease(occurrenceId, second, 60_000)).toBe(false)
    // The same holder may renew its own lease.
    expect(await registry.tryLease(occurrenceId, first, 60_000)).toBe(true)
    // Only the holder releases it.
    await registry.releaseLease(occurrenceId, second)
    expect(await registry.tryLease(occurrenceId, second, 60_000)).toBe(false)
    await registry.releaseLease(occurrenceId, first)
    expect(await registry.tryLease(occurrenceId, second, 1)).toBe(true)
    // A crashed holder's lease expires (database clock) and another replica takes over.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(await registry.tryLease(occurrenceId, first, 60_000)).toBe(true)
    // Concurrent attempts: exactly one wins.
    const contested = randomUUID()
    const winners = await Promise.all(
      Array.from({ length: 5 }, () => registry.tryLease(contested, randomUUID(), 60_000)),
    )
    expect(winners.filter(Boolean)).toHaveLength(1)
  })
})
