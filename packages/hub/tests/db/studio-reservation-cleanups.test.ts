import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { DeliverStudioReservationCleanupsService } from '../../src/application/showcase/deliver-studio-reservation-cleanups.service'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  accountDeletionFences,
  studioPublicationReservations,
  studioReservationCleanups,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioReservationCleanupRepository } from '../../src/infrastructure/persistence/drizzle/studio-reservation-cleanup.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'

const url = process.env.TEST_DATABASE_URL
describe.skipIf(!url)('new-reservation retirement outbox in PostgreSQL', () => {
  let connection: DbConnection
  const ids: string[] = [],
    accounts: string[] = []
  const migrations = path.join(
    import.meta.dir,
    '../../src/infrastructure/persistence/drizzle/migrations',
  )
  const leasedAt = new Date('1900-01-02T00:00:00Z')
  beforeAll(async () => {
    const target = new URL(url!)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname))
      throw new Error('Use an explicit loopback QA database')
    connection = createDbConnection(url!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: migrations,
      migrationsTable: 'hub_migrations',
      migrationsSchema: 'drizzle',
    })
  })
  afterEach(async () => {
    if (ids.length) {
      await connection.db
        .delete(studioReservationCleanups)
        .where(inArray(studioReservationCleanups.reservationId, ids))
      await connection.db
        .delete(studioPublicationReservations)
        .where(inArray(studioPublicationReservations.id, ids.splice(0)))
    }
    if (accounts.length)
      await connection.db
        .delete(accountDeletionFences)
        .where(inArray(accountDeletionFences.accountId, accounts.splice(0)))
  })
  afterAll(async () => {
    await connection?.close()
  })
  const hash = () => createHash('sha256').update(randomUUID()).digest('hex')
  async function reservation(
    overrides: Partial<typeof studioPublicationReservations.$inferInsert> = {},
  ) {
    const id = randomUUID(),
      accountId = randomUUID(),
      authorId = overrides.audience === 'adult' ? accountId : randomUUID()
    const row = {
      id,
      accountId,
      authorId,
      audience: 'kids' as const,
      idempotencyKey: hash(),
      scopeKey: hash(),
      semanticHash: hash(),
      snapshotHash: hash(),
      context: JSON.stringify({ audience: 'kids', kind: 'free' }),
      playId: randomUUID(),
      phase: 'reserved' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }
    ids.push(row.id)
    if (row.accountId) accounts.push(row.accountId)
    await connection.db.insert(studioPublicationReservations).values(row)
    return row
  }
  async function makeDue(id: string) {
    await connection.db
      .update(studioReservationCleanups)
      .set({ nextAttemptAt: new Date('1900-01-01') })
      .where(eq(studioReservationCleanups.reservationId, id))
  }
  test('purge atomically retires only an unpublished proven reservation and delivery survives restart/failure', async () => {
    const row = await reservation()
    if (!row.accountId || !row.snapshotHash)
      throw new Error('Expected a proven reservation fixture')
    expect(
      await connection.db
        .select()
        .from(studioReservationCleanups)
        .where(eq(studioReservationCleanups.reservationId, row.id)),
    ).toHaveLength(0)
    await new DrizzleUserDataPurgeRepository(connection.db).purgeForUser([], row.accountId!)
    const [retired] = await connection.db
      .select()
      .from(studioPublicationReservations)
      .where(eq(studioPublicationReservations.id, row.id))
    expect(retired?.phase).toBe('retired')
    await makeDue(row.id)
    const repository = new DrizzleStudioReservationCleanupRepository(connection.db)
    const value = await repository.claim(leasedAt, 'kids')
    expect(value).toEqual({
      version: 1,
      deliveryId: `studio-reservation-cleanup:${row.id}`,
      reservationId: row.id,
      playId: row.playId,
      authorId: row.authorId,
      accountId: row.accountId,
      audience: 'kids',
      snapshotHash: row.snapshotHash,
      context: { kind: 'free', audience: 'kids' },
    })
    expect(await repository.claim(leasedAt, 'kids')).toBeNull()
    await connection.db
      .delete(studioPublicationReservations)
      .where(eq(studioPublicationReservations.id, row.id))
    await new DeliverStudioReservationCleanupsService(
      repository,
      { cleanupReservation: async () => false },
      () => new Date('1900-01-03'),
    ).execute('kids')
    const [failed] = await connection.db
      .select()
      .from(studioReservationCleanups)
      .where(eq(studioReservationCleanups.reservationId, row.id))
    expect(failed?.deliveredAt).toBeNull()
    let received: unknown
    await new DeliverStudioReservationCleanupsService(
      new DrizzleStudioReservationCleanupRepository(connection.db),
      {
        cleanupReservation: async (payload) => {
          received = payload
          return true
        },
      },
      () => new Date('1900-01-04'),
    ).execute('kids')
    expect(received).toEqual(value)
    const [confirmed] = await connection.db
      .select()
      .from(studioReservationCleanups)
      .where(eq(studioReservationCleanups.reservationId, row.id))
    expect(confirmed?.deliveredAt).not.toBeNull()
  })
  test('outbox insertion failure rolls back retirement and account fence, leaving the original reservation resumable', async () => {
    const row = await reservation(),
      name = `reservation_cleanup_failure_${randomUUID().replaceAll('-', '')}`
    await connection.sql.unsafe(
      `CREATE FUNCTION hub.${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reservation_id = '${row.id}'::uuid THEN RAISE EXCEPTION 'owned retirement outbox failure'; END IF; RETURN NEW; END $$`,
    )
    try {
      await connection.sql.unsafe(
        `CREATE TRIGGER ${name} BEFORE INSERT ON hub.studio_reservation_cleanups FOR EACH ROW EXECUTE FUNCTION hub.${name}()`,
      )
      const failure = await new DrizzleUserDataPurgeRepository(connection.db)
        .purgeForUser([], row.accountId!)
        .then(
          () => null,
          (error: unknown) => error,
        )
      expect(failure).toBeInstanceOf(Error)
      const [saved] = await connection.db
        .select()
        .from(studioPublicationReservations)
        .where(eq(studioPublicationReservations.id, row.id))
      expect(saved?.phase).toBe('reserved')
      expect(
        await connection.db
          .select()
          .from(accountDeletionFences)
          .where(eq(accountDeletionFences.accountId, row.accountId!)),
      ).toHaveLength(0)
      expect(
        await connection.db
          .select()
          .from(studioReservationCleanups)
          .where(eq(studioReservationCleanups.reservationId, row.id)),
      ).toHaveLength(0)
    } finally {
      await connection.sql.unsafe(
        `DROP TRIGGER IF EXISTS ${name} ON hub.studio_reservation_cleanups`,
      )
      await connection.sql.unsafe(`DROP FUNCTION hub.${name}()`)
    }
    await new DrizzleUserDataPurgeRepository(connection.db).purgeForUser([], row.accountId!)
    expect(
      await connection.db
        .select()
        .from(studioReservationCleanups)
        .where(eq(studioReservationCleanups.reservationId, row.id)),
    ).toHaveLength(1)
  })
  test('backfill recovers only complete new terminal proofs, never legacy, published history, malformed context or another audience', async () => {
    const good = await reservation({ phase: 'retired' })
    const adult = await reservation({
      phase: 'retired',
      audience: 'adult',
      context: JSON.stringify({ kind: 'free', audience: 'adult' }),
    })
    const invalid = await Promise.all([
      reservation({
        phase: 'retired',
        snapshotHash: null,
        scopeKey: null,
        semanticHash: null,
        accountId: null,
      }),
      reservation({ phase: 'retired', threadId: randomUUID() }),
      reservation({ phase: 'finalized', threadId: randomUUID() }),
      reservation({ phase: 'retired', context: 'not-json' }),
      reservation({
        phase: 'retired',
        context: JSON.stringify({ kind: 'free', audience: 'adult' }),
      }),
      reservation({
        phase: 'retired',
        context: JSON.stringify({ kind: 'free', audience: 'kids', unknown: true }),
      }),
      reservation({ phase: 'retired', scopeKey: 'unproven' }),
      reservation({
        phase: 'retired',
        audience: 'adult',
        accountId: randomUUID(),
        context: JSON.stringify({ kind: 'free', audience: 'adult' }),
      }),
      reservation(),
    ])
    const migration = await readFile(
      path.join(migrations, '0023_backfill_studio_reservation_cleanups.sql'),
      'utf8',
    )
    await connection.sql.unsafe(migration)
    const found = await connection.db
      .select()
      .from(studioReservationCleanups)
      .where(inArray(studioReservationCleanups.reservationId, ids))
    expect(found.map((value) => value.reservationId).sort()).toEqual([good.id, adult.id].sort())
    expect(found.every((value) => !invalid.some((item) => item.id === value.reservationId))).toBe(
      true,
    )
    const confirmedAt = new Date()
    await connection.db
      .update(studioReservationCleanups)
      .set({ deliveredAt: confirmedAt })
      .where(eq(studioReservationCleanups.reservationId, good.id))
    await connection.sql.unsafe(migration)
    const [unchanged] = await connection.db
      .select()
      .from(studioReservationCleanups)
      .where(eq(studioReservationCleanups.reservationId, good.id))
    expect(unchanged?.deliveredAt).toEqual(confirmedAt)
    await makeDue(adult.id)
    const claimed = await new DrizzleStudioReservationCleanupRepository(connection.db).claim(
      leasedAt,
      'adult',
    )
    expect(claimed?.reservationId).toBe(adult.id)
    expect(claimed?.accountId).toBe(adult.authorId)
    expect(
      await new DrizzleStudioReservationCleanupRepository(connection.db).claim(leasedAt, 'kids'),
    ).toBeNull()
  })
})
