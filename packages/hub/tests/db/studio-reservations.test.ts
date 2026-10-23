import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { ConcurrencyConflictError, PostingNotAllowedError } from '../../src/domain/hub-errors'
import type { StudioReservationInput } from '../../src/domain/ports/studio-reservation-repository.port'
import type { CreateShowcaseThreadInput } from '../../src/domain/ports/thread-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  accountDeletionFences,
  channels,
  spaces,
  studioArtifactCleanups,
  studioPublicationEvents,
  studioPublicationReservations,
  studioReservationCleanups,
  threads,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioEventRepository } from '../../src/infrastructure/persistence/drizzle/studio-event.repository'
import { DrizzleThreadRepository } from '../../src/infrastructure/persistence/drizzle/thread.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'

const databaseUrl = process.env.TEST_DATABASE_URL
describe.skipIf(!databaseUrl)('Studio reservations in PostgreSQL', () => {
  let connection: DbConnection, repository: DrizzleThreadRepository
  const ownedSpaces: string[] = [],
    ownedAuthors: string[] = [],
    ownedAccounts: string[] = []
  const now = new Date('2020-01-01T00:00:00Z')
  beforeAll(async () => {
    const url = new URL(databaseUrl!)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
      throw new Error('Use a dedicated loopback QA database')
    connection = createDbConnection(databaseUrl!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'hub_migrations',
      migrationsSchema: 'drizzle',
    })
    repository = new DrizzleThreadRepository(connection.db)
  })
  afterEach(async () => {
    if (ownedAuthors.length) {
      await connection.db
        .delete(studioReservationCleanups)
        .where(inArray(studioReservationCleanups.authorId, ownedAuthors))
      const rows = await connection.db
        .select({ id: threads.id })
        .from(threads)
        .where(inArray(threads.authorId, ownedAuthors))
      if (rows.length) {
        const ids = rows.map((r) => r.id)
        await connection.db
          .delete(studioPublicationEvents)
          .where(inArray(studioPublicationEvents.threadId, ids))
        await connection.db
          .delete(studioArtifactCleanups)
          .where(inArray(studioArtifactCleanups.threadId, ids))
      }
      await connection.db
        .delete(studioPublicationReservations)
        .where(inArray(studioPublicationReservations.authorId, ownedAuthors.splice(0)))
    }
    if (ownedAccounts.length)
      await connection.db
        .delete(accountDeletionFences)
        .where(inArray(accountDeletionFences.accountId, ownedAccounts.splice(0)))
    for (const id of ownedSpaces.splice(0))
      await connection.db.delete(spaces).where(eq(spaces.id, id))
  })
  afterAll(async () => {
    await connection?.close()
  })
  async function fixture() {
    const spaceId = randomUUID(),
      channelId = randomUUID(),
      authorId = randomUUID(),
      accountId = randomUUID()
    ownedSpaces.push(spaceId)
    ownedAuthors.push(authorId)
    ownedAccounts.push(accountId)
    await connection.db.insert(spaces).values({
      id: spaceId,
      slug: spaceId,
      name: 'Reservation QA',
      audience: 'kids',
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      createdAt: now,
      updatedAt: now,
    })
    await connection.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: channelId,
      name: 'Wall',
      createdAt: now,
      updatedAt: now,
    })
    const input: StudioReservationInput = {
      id: randomUUID(),
      scopeKey: createHash('sha256').update(randomUUID()).digest('hex'),
      idempotencyKey: randomUUID(),
      authorId,
      accountId,
      audience: 'kids',
      context: JSON.stringify({ audience: 'kids', kind: 'free' }),
      semanticHash: 'a'.repeat(64),
      snapshotHash: 'b'.repeat(64),
      now,
    }
    const candidate: CreateShowcaseThreadInput = {
      id: randomUUID(),
      channelId,
      authorId,
      authorAccountId: accountId,
      authorDisplayName: 'QA',
      authorPublic: false,
      title: 'Game',
      slug: randomUUID(),
      body: 'QA',
      coverImageUrl: null,
      playId: null,
      idempotencyKey: input.idempotencyKey,
      now,
    }
    return { input, candidate }
  }
  test('parallel prepare and finalize are one canonical ID, thread and typed event; lost ACK is inert', async () => {
    const { input, candidate } = await fixture()
    const [first, second] = await Promise.all([
      repository.prepareStudioPublication(input),
      repository.prepareStudioPublication({ ...input, id: randomUUID() }),
    ])
    expect(first).toEqual(second)
    if (first.state !== 'reserved') throw new Error('Expected a private reservation')
    expect(
      await connection.db.select().from(threads).where(eq(threads.authorId, input.authorId)),
    ).toHaveLength(0)
    expect(await repository.showcaseCoverReference(first.playId, 'kids')).toEqual({
      status: 'pending',
      coverImageUrl: null,
    })
    expect(await repository.showcaseCoverReference(first.playId, 'adult')).toEqual({
      status: 'absent',
      coverImageUrl: null,
    })
    candidate.playId = first.playId
    candidate.studioEvents = [
      {
        kind: 'standalone',
        payload: {
          userId: input.authorId,
          accountId: input.accountId,
          audience: 'kids',
          playId: first.playId,
        },
      },
    ]
    const results = await Promise.all([
      repository.finalizeStudioPublication(first.reservationId, input, candidate),
      repository.finalizeStudioPublication(first.reservationId, input, {
        ...candidate,
        id: randomUUID(),
      }),
    ])
    expect(results[0]!.thread.id).toBe(results[1]!.thread.id)
    expect(results.map((r) => r.deduped).sort()).toEqual([false, true])
    const events = await connection.db
      .select()
      .from(studioPublicationEvents)
      .where(eq(studioPublicationEvents.threadId, results[0]!.thread.id))
    expect(events).toHaveLength(1)
    expect(events[0]?.eventId).toBe(`studio:${results[0]!.thread.id}:standalone`)
    expect(events[0]?.event).toEqual({
      kind: 'standalone',
      payload: {
        userId: input.authorId,
        accountId: input.accountId,
        audience: 'kids',
        playId: first.playId,
        publishedAt: now.toISOString(),
      },
    })
    expect(
      (await repository.prepareStudioPublication({ ...input, snapshotHash: 'c'.repeat(64) })).state,
    ).toBe('finalized')
    const worker = new DrizzleStudioEventRepository(connection.db)
    // Claim only this owned job by making all other jobs later; this test never mutates foreign rows.
    await connection.db
      .update(studioPublicationEvents)
      .set({ nextAttemptAt: new Date('1900-01-01') })
      .where(eq(studioPublicationEvents.eventId, events[0]!.eventId))
    const claimed = await worker.claim(new Date('1900-01-02'))
    expect(claimed?.eventId).toBe(events[0]!.eventId)
    expect(await worker.claim(new Date('1900-01-02'))).toBeNull()
    expect((await worker.claim(new Date('1900-01-03')))?.event).toEqual(events[0]?.event)
    await worker.acknowledge(events[0]!.eventId, now)
    expect(await worker.claim(new Date('1900-01-04'))).toBeNull()
  })
  test('notification insert failure rolls back thread, reservation phase and delivery atomically', async () => {
    const { input, candidate } = await fixture()
    const reserved = await repository.prepareStudioPublication(input)
    if (reserved.state !== 'reserved') throw new Error('Expected reservation')
    candidate.playId = reserved.playId
    candidate.studioEvents = [
      {
        kind: 'standalone',
        payload: {
          userId: input.authorId,
          accountId: input.accountId,
          audience: 'kids',
          playId: reserved.playId,
        },
      },
    ]
    const name = `studio_event_failure_${randomUUID().replaceAll('-', '')}`
    await connection.sql.unsafe(
      `CREATE FUNCTION hub.${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.thread_id = '${candidate.id}'::uuid THEN RAISE EXCEPTION 'owned event insertion failure'; END IF; RETURN NEW; END $$`,
    )
    try {
      await connection.sql.unsafe(
        `CREATE TRIGGER ${name} BEFORE INSERT ON hub.studio_publication_events FOR EACH ROW EXECUTE FUNCTION hub.${name}()`,
      )
      const error = await repository
        .finalizeStudioPublication(reserved.reservationId, input, candidate)
        .then(
          () => null,
          (error: unknown) => error,
        )
      expect(error).toBeInstanceOf(Error)
      const [row] = await connection.db
        .select()
        .from(studioPublicationReservations)
        .where(eq(studioPublicationReservations.id, reserved.reservationId))
      expect(row?.phase).toBe('reserved')
      expect(row?.threadId).toBeNull()
      expect(
        await connection.db.select().from(threads).where(eq(threads.authorId, input.authorId)),
      ).toHaveLength(0)
      expect(
        await connection.db
          .select()
          .from(studioPublicationEvents)
          .where(eq(studioPublicationEvents.threadId, candidate.id)),
      ).toHaveLength(0)
    } finally {
      await connection.sql.unsafe(`DROP TRIGGER IF EXISTS ${name} ON hub.studio_publication_events`)
      await connection.sql.unsafe(`DROP FUNCTION hub.${name}()`)
    }
    expect(
      (await repository.finalizeStudioPublication(reserved.reservationId, input, candidate))
        .deduped,
    ).toBe(false)
  })
  test('invalid thread insert rolls back finalization and outbox; the reservation remains retryable', async () => {
    const { input, candidate } = await fixture()
    const reserved = await repository.prepareStudioPublication(input)
    if (reserved.state !== 'reserved') throw new Error('Expected reservation')
    candidate.playId = reserved.playId
    const error = await repository
      .finalizeStudioPublication(reserved.reservationId, input, {
        ...candidate,
        channelId: randomUUID(),
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(error).not.toBeNull()
    const [saved] = await connection.db
      .select()
      .from(studioPublicationReservations)
      .where(eq(studioPublicationReservations.id, reserved.reservationId))
    expect(saved?.phase).toBe('reserved')
    expect(saved?.threadId).toBeNull()
    expect(
      await connection.db.select().from(threads).where(eq(threads.authorId, input.authorId)),
    ).toHaveLength(0)
    expect(
      (await repository.finalizeStudioPublication(reserved.reservationId, input, candidate))
        .deduped,
    ).toBe(false)
  })
  for (const status of ['deleted', 'rejected'] as const)
    test(`${status} and physical thread removal preserve the reservation tombstone`, async () => {
      const { input, candidate } = await fixture()
      const reserved = await repository.prepareStudioPublication(input)
      if (reserved.state !== 'reserved') throw new Error('Expected reservation')
      candidate.playId = reserved.playId
      const result = await repository.finalizeStudioPublication(
        reserved.reservationId,
        input,
        candidate,
      )
      await repository.setThreadStatus(result.thread.id, status, ['visible'], now)
      expect(
        (await repository.finalizeStudioPublication(reserved.reservationId, input, candidate))
          .thread.status,
      ).toBe(status)
      await connection.db
        .delete(studioArtifactCleanups)
        .where(eq(studioArtifactCleanups.threadId, result.thread.id))
      await connection.db.delete(threads).where(eq(threads.id, result.thread.id))
      expect(await repository.prepareStudioPublication(input)).toEqual({
        state: 'retired',
        playId: reserved.playId,
        thread: null,
      })
      await expect(
        repository.finalizeStudioPublication(reserved.reservationId, input, candidate),
      ).rejects.toBeInstanceOf(ConcurrencyConflictError)
    })
  test('account deletion retires an unfinalized reservation and fences late calls, including empty profile lists', async () => {
    const { input, candidate } = await fixture()
    const reserved = await repository.prepareStudioPublication(input)
    if (reserved.state !== 'reserved') throw new Error('Expected reservation')
    candidate.playId = reserved.playId
    await new DrizzleUserDataPurgeRepository(connection.db).purgeForUser([], input.accountId)
    await expect(
      repository.finalizeStudioPublication(reserved.reservationId, input, candidate),
    ).rejects.toBeInstanceOf(PostingNotAllowedError)
    const [saved] = await connection.db
      .select()
      .from(studioPublicationReservations)
      .where(eq(studioPublicationReservations.id, reserved.reservationId))
    expect(saved?.phase).toBe('retired')
    expect(await repository.showcaseCoverReference(reserved.playId, 'kids')).toEqual({
      status: 'deleted',
      coverImageUrl: null,
    })
    expect(
      await connection.db.select().from(threads).where(eq(threads.authorId, input.authorId)),
    ).toHaveLength(0)
  })
  test('account purge preserves finalized public history and its canonical cover/play status', async () => {
    const { input, candidate } = await fixture()
    const reserved = await repository.prepareStudioPublication(input)
    if (reserved.state !== 'reserved') throw new Error('Expected reservation')
    candidate.playId = reserved.playId
    candidate.coverImageUrl = 'https://cdn.test/published-history.webp'
    await repository.finalizeStudioPublication(reserved.reservationId, input, candidate)
    await new DrizzleUserDataPurgeRepository(connection.db).purgeForUser(
      [input.authorId],
      input.accountId,
    )
    const [saved] = await connection.db
      .select()
      .from(studioPublicationReservations)
      .where(eq(studioPublicationReservations.id, reserved.reservationId))
    expect(saved?.phase).toBe('finalized')
    expect(await repository.showcaseCoverReference(reserved.playId, 'kids')).toEqual({
      status: 'visible',
      coverImageUrl: candidate.coverImageUrl,
    })
    expect(
      (await repository.hasVisibleShowcasePlayId(reserved.playId, false, 'kids')).visible,
    ).toBe(true)
  })
  test('snapshot and live play identity cannot be rebound; legacy posts remain references without invented hashes/account', async () => {
    const { input, candidate } = await fixture()
    candidate.playId = randomUUID()
    const legacy = await repository.createShowcaseThread(candidate)
    const outcome = await repository.prepareStudioPublication(input)
    expect(outcome.state).toBe('finalized')
    const [saved] = await connection.db
      .select()
      .from(studioPublicationReservations)
      .where(eq(studioPublicationReservations.threadId, legacy.thread.id))
    expect(saved?.snapshotHash).toBeNull()
    expect(saved?.accountId).toBeNull()
    await expect(
      repository.prepareStudioPublication({
        ...input,
        id: randomUUID(),
        scopeKey: createHash('sha256').update(randomUUID()).digest('hex'),
        idempotencyKey: randomUUID(),
        livePlayId: candidate.playId,
      }),
    ).rejects.toBeInstanceOf(ConcurrencyConflictError)
    const other = await repository.prepareStudioPublication({
      ...input,
      id: randomUUID(),
      scopeKey: createHash('sha256').update(randomUUID()).digest('hex'),
      idempotencyKey: randomUUID(),
    })
    if (other.state !== 'reserved') throw new Error('Expected reservation')
    await expect(
      repository.finalizeStudioPublication(
        other.reservationId,
        { ...input, snapshotHash: 'c'.repeat(64) },
        { ...candidate, playId: other.playId },
      ),
    ).rejects.toBeInstanceOf(ConcurrencyConflictError)
  })
})
