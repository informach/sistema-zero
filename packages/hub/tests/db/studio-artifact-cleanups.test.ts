import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'
import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { DeliverStudioCleanupsService } from '../../src/application/showcase/deliver-studio-cleanups.service'
import { createStudioArtifactHttpGateway } from '../../src/infrastructure/gateways/studio-artifact-http.gateway'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  channels,
  spaces,
  studioArtifactCleanups,
  threads,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioCleanupRepository } from '../../src/infrastructure/persistence/drizzle/studio-cleanup.repository'
import { DrizzleThreadRepository } from '../../src/infrastructure/persistence/drizzle/thread.repository'

const databaseUrl = process.env.TEST_DATABASE_URL
describe.skipIf(!databaseUrl)('durable Studio artifact cleanup in PostgreSQL', () => {
  let connection: DbConnection
  const ownedSpaces: string[] = []
  const ownedThreads: string[] = []
  const now = new Date('2020-01-01T00:00:00Z')
  const migrations = path.join(
    import.meta.dir,
    '../../src/infrastructure/persistence/drizzle/migrations',
  )

  beforeAll(async () => {
    const url = new URL(databaseUrl!)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
      throw new Error('Use a dedicated loopback test database')
    connection = createDbConnection(databaseUrl!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: migrations,
      migrationsTable: 'hub_migrations',
      migrationsSchema: 'drizzle',
    })
  })
  afterEach(async () => {
    if (ownedThreads.length)
      await connection.db
        .delete(studioArtifactCleanups)
        .where(inArray(studioArtifactCleanups.threadId, ownedThreads.splice(0)))
    for (const id of ownedSpaces.splice(0))
      await connection.db.delete(spaces).where(eq(spaces.id, id))
  })
  afterAll(async () => {
    await connection?.close()
  })

  async function publication(audience: 'kids' | 'adult', showcase = true) {
    const spaceId = randomUUID(),
      channelId = randomUUID(),
      threadId = randomUUID(),
      playId = randomUUID(),
      authorId = randomUUID()
    ownedSpaces.push(spaceId)
    ownedThreads.push(threadId)
    await connection.db.insert(spaces).values({
      id: spaceId,
      slug: spaceId,
      name: 'Cleanup QA',
      audience,
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
    await new DrizzleThreadRepository(connection.db).createShowcaseThread({
      id: threadId,
      channelId,
      authorId,
      authorDisplayName: 'QA',
      authorPublic: false,
      title: 'Game',
      slug: threadId,
      body: 'Game',
      playId,
      coverImageUrl: `https://art.test/studio/cover/${playId}.webp`,
      idempotencyKey: threadId,
      now,
    })
    if (!showcase)
      await connection.db.update(threads).set({ isShowcase: false }).where(eq(threads.id, threadId))
    return {
      threadId,
      playId,
      authorId,
      audience,
      repo: new DrizzleThreadRepository(connection.db),
    }
  }

  test('only a terminal showcase transition creates an immutable audience-scoped job', async () => {
    const kid = await publication('kids'),
      adult = await publication('adult'),
      ordinary = await publication('kids', false)
    expect(await kid.repo.setThreadStatus(kid.threadId, 'hidden', ['visible'], now)).toBe('updated')
    expect(
      await connection.db
        .select()
        .from(studioArtifactCleanups)
        .where(eq(studioArtifactCleanups.threadId, kid.threadId)),
    ).toHaveLength(0)
    await kid.repo.setThreadStatus(kid.threadId, 'deleted', ['hidden'], now)
    await adult.repo.setThreadStatus(adult.threadId, 'deleted', ['visible'], now)
    await ordinary.repo.setThreadStatus(ordinary.threadId, 'deleted', ['visible'], now)
    expect(await adult.repo.setThreadStatus(adult.threadId, 'deleted', ['visible'], now)).toBe(
      'invalid_state',
    )
    const jobs = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(inArray(studioArtifactCleanups.threadId, ownedThreads))
    expect(jobs).toHaveLength(2)
    expect(jobs.find((job) => job.threadId === kid.threadId)).toMatchObject({
      audience: 'kids',
      playId: kid.playId,
      authorId: kid.authorId,
      deliveredAt: null,
    })
    expect(jobs.find((job) => job.threadId === adult.threadId)).toMatchObject({
      audience: 'adult',
      playId: adult.playId,
    })
    await connection.db.delete(threads).where(eq(threads.id, kid.threadId))
    expect(
      await new DrizzleStudioCleanupRepository(connection.db).claim(now, 'kids'),
    ).toMatchObject({ threadId: kid.threadId, payload: { authorId: kid.authorId } })
  })

  test.each([
    'deleted',
    'rejected',
  ] as const)('an outbox INSERT failure rolls back %s in the same transaction', async (terminal) => {
    const item = await publication('kids')
    const suffix = randomUUID().replaceAll('-', '')
    const name = `cleanup_failure_${suffix}`
    await connection.sql.unsafe(
      `CREATE FUNCTION hub.${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.thread_id = '${item.threadId}'::uuid THEN RAISE EXCEPTION 'owned cleanup insertion failure'; END IF; RETURN NEW; END $$`,
    )
    try {
      await connection.sql.unsafe(
        `CREATE TRIGGER ${name} BEFORE INSERT ON hub.studio_artifact_cleanups FOR EACH ROW EXECUTE FUNCTION hub.${name}()`,
      )
      let failure: unknown
      try {
        await item.repo.setThreadStatus(item.threadId, terminal, ['visible'], now)
      } catch (error) {
        failure = error
      }
      expect(failure).toBeInstanceOf(Error)
      const [row] = await connection.db.select().from(threads).where(eq(threads.id, item.threadId))
      expect(row?.status).toBe('visible')
      expect(
        await connection.db
          .select()
          .from(studioArtifactCleanups)
          .where(eq(studioArtifactCleanups.threadId, item.threadId)),
      ).toHaveLength(0)
    } finally {
      await connection.sql.unsafe(`DROP TRIGGER IF EXISTS ${name} ON hub.studio_artifact_cleanups`)
      await connection.sql.unsafe(`DROP FUNCTION hub.${name}()`)
    }
  })

  test.each([
    ['kids', 'visible'],
    ['kids', 'pending'],
    ['adult', 'visible'],
    ['adult', 'pending'],
  ] as const)('rejection of %s/%s enqueues once and a later delete does not reopen delivered work', async (audience, initial) => {
    const item = await publication(audience)
    if (initial === 'pending')
      await connection.db
        .update(threads)
        .set({ status: 'pending' })
        .where(eq(threads.id, item.threadId))
    expect(
      await connection.db
        .select()
        .from(studioArtifactCleanups)
        .where(eq(studioArtifactCleanups.threadId, item.threadId)),
    ).toHaveLength(0)
    expect(await item.repo.setThreadStatus(item.threadId, 'rejected', [initial], now)).toBe(
      'updated',
    )
    const rows = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      authorId: item.authorId,
      playId: item.playId,
      audience,
      attempts: 0,
      deliveredAt: null,
    })
    expect((await item.repo.hasVisibleShowcasePlayId(item.playId, false, audience)).visible).toBe(
      false,
    )
    await new DrizzleStudioCleanupRepository(connection.db).acknowledge(item.threadId, now)
    expect(await item.repo.setThreadStatus(item.threadId, 'deleted', ['rejected'], now)).toBe(
      'updated',
    )
    const repeated = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    expect(repeated).toHaveLength(1)
    expect(repeated[0]?.deliveredAt?.getTime()).toBe(now.getTime())
    expect(repeated[0]?.attempts).toBe(0)
    const ordinary = await publication(audience, false)
    await ordinary.repo.setThreadStatus(ordinary.threadId, 'rejected', ['visible'], now)
    expect(
      await connection.db
        .select()
        .from(studioArtifactCleanups)
        .where(eq(studioArtifactCleanups.threadId, ordinary.threadId)),
    ).toHaveLength(0)
  })

  test('concurrent claims lease once; worker restart and failure retain the job until durable acceptance', async () => {
    const item = await publication('adult')
    await item.repo.setThreadStatus(item.threadId, 'deleted', ['visible'], now)
    const repo = new DrizzleStudioCleanupRepository(connection.db)
    expect(
      (
        await Promise.all([
          repo.claim(now, 'adult'),
          repo.claim(now, 'adult'),
          repo.claim(now, 'adult'),
        ])
      ).filter(Boolean),
    ).toHaveLength(1)
    expect(await repo.claim(new Date(now.getTime() + 119_999), 'adult')).toBeNull()
    const failedAt = new Date(now.getTime() + 120_001)
    await new DeliverStudioCleanupsService(
      new DrizzleStudioCleanupRepository(connection.db),
      {
        cleanupShowcaseArtifacts: async () => false,
      },
      () => failedAt,
    ).execute('adult')
    const [failed] = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    expect(failed).toMatchObject({ attempts: 2, deliveredAt: null })
    const retryAt = new Date(failedAt.getTime() + 240_001)
    const restarted = new DeliverStudioCleanupsService(
      new DrizzleStudioCleanupRepository(connection.db),
      {
        cleanupShowcaseArtifacts: async (payload) => {
          expect(payload).toMatchObject({ playId: item.playId, audience: 'adult' })
          return true
        },
      },
      () => retryAt,
    )
    expect(await restarted.execute('adult')).toBe(true)
    expect(await restarted.execute('adult')).toBe(false)
    const [delivered] = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    expect(delivered?.deliveredAt?.getTime()).toBe(retryAt.getTime())
  })

  test.each([
    ['deleted', '0015_backfill_studio_artifact_cleanups.sql'],
    ['rejected', '0016_backfill_rejected_studio_artifact_cleanups.sql'],
  ] as const)('the generated custom backfill recovers %s history idempotently with authoritative audience', async (terminal, migration) => {
    const item = await publication('adult')
    await connection.db
      .update(threads)
      .set({ status: terminal, coverImageUrl: 'https://external.test/cover.webp' })
      .where(eq(threads.id, item.threadId))
    const sql = await readFile(path.join(migrations, migration), 'utf8')
    await connection.sql.unsafe(sql)
    await connection.sql.unsafe(sql)
    const rows = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      audience: 'adult',
      playId: item.playId,
      coverUrl: 'https://external.test/cover.webp',
    })
  })

  test('real HTTP failures and timeouts survive restart; only a signed 2xx marks SQL delivered', async () => {
    const item = await publication('adult')
    await item.repo.setThreadStatus(item.threadId, 'deleted', ['visible'], now)
    let mode: 'unavailable' | 'held' | 'accepted' = 'unavailable'
    let calls = 0
    const held: Array<() => void> = []
    const accepted: unknown[] = []
    const secret = `cleanup-${randomUUID()}`
    const receiver = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        calls++
        const raw = await request.text()
        const signed = verifyHmacSignature({
          secret,
          body: canonicalHmacMessage({ method: 'POST', path: '/api/studio/cleanup', body: raw }),
          signatureHeader: request.headers.get('x-signature') ?? undefined,
          nowSeconds: Math.floor(Date.now() / 1000),
          toleranceSeconds: 60,
        })
        if (!signed.valid) return new Response(null, { status: 401 })
        if (mode === 'unavailable') return new Response(null, { status: 503 })
        if (mode === 'held')
          return new Promise<Response>((resolve) =>
            held.push(() => resolve(new Response(null, { status: 204 }))),
          )
        accepted.push(JSON.parse(raw))
        return new Response(null, { status: 204 })
      },
    })
    const gateway = createStudioArtifactHttpGateway({
      adultBaseUrl: `http://127.0.0.1:${receiver.port}`,
      hmacSecret: secret,
      timeoutMs: 50,
    })
    const state = async () =>
      (
        await connection.db
          .select()
          .from(studioArtifactCleanups)
          .where(eq(studioArtifactCleanups.threadId, item.threadId))
      )[0]
    try {
      await new DeliverStudioCleanupsService(
        new DrizzleStudioCleanupRepository(connection.db),
        gateway,
        () => now,
      ).execute('adult')
      expect(calls).toBe(3)
      expect((await state())?.deliveredAt).toBeNull()
      mode = 'held'
      const secondAt = new Date(now.getTime() + 120_001)
      await new DeliverStudioCleanupsService(
        new DrizzleStudioCleanupRepository(connection.db),
        gateway,
        () => secondAt,
      ).execute('adult')
      expect(held).toHaveLength(3)
      expect((await state())?.deliveredAt).toBeNull()
      for (const release of held.splice(0)) release()
      mode = 'accepted'
      const thirdAt = new Date(secondAt.getTime() + 240_001)
      await new DeliverStudioCleanupsService(
        new DrizzleStudioCleanupRepository(connection.db),
        gateway,
        () => thirdAt,
      ).execute('adult')
      expect((await state())?.deliveredAt?.getTime()).toBe(thirdAt.getTime())
      expect(accepted).toEqual([
        {
          authorId: item.authorId,
          playId: item.playId,
          coverUrl: `https://art.test/studio/cover/${item.playId}.webp`,
        },
      ])
      expect(calls).toBe(7)
    } finally {
      for (const release of held.splice(0)) release()
      await receiver.stop(true)
    }
  })

  test('unverified orphan jobs remain pending without starving a verified author', async () => {
    const orphanId = randomUUID()
    ownedThreads.push(orphanId)
    await connection.db.insert(studioArtifactCleanups).values({
      threadId: orphanId,
      playId: randomUUID(),
      audience: 'adult',
      nextAttemptAt: new Date(now.getTime() - 1000),
    })
    const item = await publication('adult')
    await item.repo.setThreadStatus(item.threadId, 'rejected', ['visible'], now)
    const repo = new DrizzleStudioCleanupRepository(connection.db)
    expect(await repo.claim(now, 'adult')).toMatchObject({
      threadId: item.threadId,
      payload: { authorId: item.authorId },
    })
    expect(await repo.claim(now, 'adult')).toBeNull()
    const [orphan] = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, orphanId))
    expect(orphan).toMatchObject({ authorId: null, attempts: 0, deliveredAt: null })
    await connection.db.delete(threads).where(eq(threads.id, item.threadId))
    expect(await repo.claim(new Date(now.getTime() + 120_001), 'adult')).toMatchObject({
      payload: { authorId: item.authorId },
    })
  })

  test.each([
    'deleted',
    'rejected',
  ] as const)('author backfill verifies only the surviving canonical %s thread', async (terminal) => {
    const item = await publication('kids')
    await item.repo.setThreadStatus(item.threadId, terminal, ['visible'], now)
    await connection.db
      .update(studioArtifactCleanups)
      .set({ authorId: null })
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    const orphanId = randomUUID()
    ownedThreads.push(orphanId)
    await connection.db
      .insert(studioArtifactCleanups)
      .values({ threadId: orphanId, playId: randomUUID(), audience: 'kids', nextAttemptAt: now })
    const sql = await readFile(
      path.join(migrations, '0018_backfill_studio_cleanup_authors.sql'),
      'utf8',
    )
    await connection.sql.unsafe(sql)
    await connection.sql.unsafe(sql)
    const [verified] = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, item.threadId))
    expect(verified?.authorId).toBe(item.authorId)
    const [unknown] = await connection.db
      .select()
      .from(studioArtifactCleanups)
      .where(eq(studioArtifactCleanups.threadId, orphanId))
    expect(unknown).toMatchObject({ authorId: null, attempts: 0, deliveredAt: null })
  })
})
