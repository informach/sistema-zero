import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { followerValue } from '../src/domain/metrics/availability'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleMetricsRepository } from '../src/infrastructure/persistence/drizzle/metrics.repository'
import { socialAccounts } from '../src/infrastructure/persistence/drizzle/schema'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('métricas de conta PostgreSQL', () => {
  let connection: DbConnection
  beforeAll(async () => {
    if (
      !url ||
      new URL(url).hostname !== '127.0.0.1' ||
      new URL(url).pathname !== '/marketing_review'
    )
      throw new Error('Banco exclusivo de revisão obrigatório')
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
  })
  afterAll(async () => connection?.close())
  test('conserva registros antigos e distingue ausência nova de zero observado', async () => {
    const accountId = randomUUID(),
      now = new Date(),
      oldId = randomUUID(),
      missingId = randomUUID(),
      zeroId = randomUUID()
    await connection.db.insert(socialAccounts).values({
      id: accountId,
      network: 'instagram',
      externalId: accountId,
      displayName: 'Revisão',
      connectedBy: randomUUID(),
      createdAt: now,
      updatedAt: now,
    })
    // An old writer omits collection_version, exactly like the pre-migration collector.
    await connection.sql`insert into marketing.metric_account_snapshots (id,social_account_id,captured_at,followers) values (${oldId},${accountId},${now.toISOString()},0)`
    const repo = new DrizzleMetricsRepository(connection.db),
      old = await repo.latestAccountSnapshot(accountId)
    if (!old) throw new Error('Snapshot ausente')
    expect(old.followers).toBe(0)
    expect(old.collectionVersion).toBe(0)
    expect(followerValue(old)).toBeNull()
    await repo.insertAccountSnapshot({
      id: missingId,
      socialAccountId: accountId,
      capturedAt: new Date(now.getTime() + 1000),
      collectionVersion: 1,
      followers: null,
      raw: {},
    })
    expect((await repo.latestAccountSnapshot(accountId))?.followers).toBeNull()
    await repo.insertAccountSnapshot({
      id: zeroId,
      socialAccountId: accountId,
      capturedAt: new Date(now.getTime() + 2000),
      collectionVersion: 1,
      followers: 0,
      raw: {},
    })
    const latest = (await repo.latestAccountSnapshots([accountId])).get(accountId)
    if (!latest) throw new Error('Snapshot ausente')
    expect(latest.id).toBe(zeroId)
    expect(followerValue(latest)).toBe(0)
    expect(
      (await repo.listAccountSnapshotsSince([accountId], now)).map((item) => [
        item.id,
        item.followers,
        item.collectionVersion,
      ]),
    ).toEqual([
      [oldId, 0, 0],
      [missingId, null, 1],
      [zeroId, 0, 1],
    ])
  })
})
