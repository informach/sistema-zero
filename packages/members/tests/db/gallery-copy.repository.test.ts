import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { GallerySubmission } from '@sistemazero/core/learning'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import {
  GALLERY_COPY_CLEANUP_DELAY_MS,
  GALLERY_COPY_PENDING_LIMIT,
} from '../../src/domain/ports/gallery-copy-repository.port'
import { DrizzleCreationCleanupRepository } from '../../src/infrastructure/persistence/drizzle/creation-cleanup.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGalleryCopyRepository } from '../../src/infrastructure/persistence/drizzle/gallery-copy.repository'
import { DrizzleStudioSubmissionRepository } from '../../src/infrastructure/persistence/drizzle/studio-submission.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'

const url = process.env.GALLERY_QA_DATABASE_URL
if (url && !/^\/sz_gallery_qa_[a-z0-9_]+$/.test(new URL(url).pathname))
  throw new Error('GALLERY_QA_DATABASE_URL must name a disposable sz_gallery_qa_* database.')
const connection = url ? createDbConnection(url) : null
const get = () => {
  if (!connection) throw new Error('Missing disposable gallery database')
  return connection
}
const courseId = randomUUID(),
  moduleId = randomUUID(),
  lessonId = randomUUID(),
  blockId = randomUUID(),
  revision = 'b'.repeat(32)
beforeAll(async () => {
  if (!connection) return
  const migrationsFolder = resolve(
    import.meta.dir,
    '../../src/infrastructure/persistence/drizzle/migrations',
  )
  const migrations = readMigrationFiles({ migrationsFolder })
  // As in learning-migrations.test.ts, historical enum additions must commit
  // before later statements use them. Upgrade from the real 0077 baseline.
  const [existing] = await connection.sql`select to_regclass('members.entitlements') as name`
  if (existing?.name) throw new Error('Gallery QA requires a fresh disposable database.')
  for (const migration of migrations.slice(0, 78))
    for (const statement of migration.sql)
      if (statement.trim()) await connection.sql.unsafe(statement)
  const baseline = migrations[77]
  if (!baseline) throw new Error('Missing pre-upgrade migration baseline')
  await connection.sql`create schema if not exists drizzle`
  await connection.sql`create table if not exists drizzle.members_migrations (id serial primary key, hash text not null, created_at bigint)`
  await connection.sql`insert into drizzle.members_migrations (hash,created_at) values (${baseline.hash},${baseline.folderMillis})`
  await migrate(connection.db, { migrationsFolder, migrationsTable: 'members_migrations' })
  const now = new Date().toISOString()
  await connection.sql`insert into members.courses (id,slug,title,audience,created_at,updated_at) values (${courseId},${`gallery-${courseId}`},'Galeria QA','kids',${now},${now})`
  await connection.sql`insert into members.modules (id,course_id,title,sort_order,created_at,updated_at) values (${moduleId},${courseId},'Unidade',0,${now},${now})`
  await connection.sql`insert into members.lessons (id,module_id,course_id,slug,title,sort_order,is_published,created_at,updated_at) values (${lessonId},${moduleId},${courseId},'galeria','Minha entrega',0,true,${now},${now})`
  await connection.sql`insert into members.lesson_blocks (id,lesson_id,kind,content,content_revision) values (${blockId},${lessonId},'studio','{"kind":"studio","gallery":{"minItems":1,"maxItems":1}}'::jsonb,${revision})`
}, 60_000)
afterAll(async () => {
  await connection?.close()
})
afterEach(async () => {
  if (connection) await connection.sql`truncate table members.gallery_copy_attempts`
})

function attempt(userId = randomUUID()) {
  const generation = randomUUID(),
    requestId = randomUUID()
  const snapshot: GallerySubmission = {
    kind: 'gallery-delivery',
    version: 1,
    requestId,
    copyGeneration: generation,
    tool: 'studio',
    items: [
      {
        itemId: randomUUID(),
        revision: 1,
        name: 'Projeto',
        kind: 'program',
        storageKey: `creations/${userId}/lesson-submissions/${blockId}/${requestId}/${generation}/item-1/project.gz`,
        parts: [],
      },
    ],
  }
  return { userId, accountId: userId, generation, blockId, snapshot }
}

test.skipIf(!url)(
  'account purge removes its gallery admissions and accepted snapshots while preserving another profile',
  async () => {
    const { db, sql } = get(),
      repo = new DrizzleGalleryCopyRepository(db),
      value = attempt(),
      other = attempt(),
      now = new Date()
    await repo.reserve(value, now)
    await repo.reserve(other, now)
    await persist(value)
    await new DrizzleUserDataPurgeRepository(db).purgeForUser({
      accountId: value.accountId,
      userIds: [value.userId],
      cleanup: {
        id: randomUUID(),
        prefixes: [`creations/${value.userId}/`],
        createdAt: now,
        notBefore: new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS),
      },
    })
    expect(
      await sql`select generation from members.gallery_copy_attempts where account_id=${value.accountId}`,
    ).toHaveLength(0)
    expect(
      await sql`select id from members.studio_submissions where user_id=${value.userId}`,
    ).toHaveLength(0)
    expect(
      await sql`select id from members.lesson_evidence where user_id=${value.userId}`,
    ).toHaveLength(0)
    expect(
      await sql`select generation from members.gallery_copy_attempts where generation=${other.generation}`,
    ).toHaveLength(1)
    expect(
      await sql`select account_id from members.account_deletion_fences where account_id=${value.accountId}`,
    ).toHaveLength(1)
  },
)
function persist(value: ReturnType<typeof attempt>, contentRevision = revision) {
  return new DrizzleStudioSubmissionRepository(get().db).upsert(
    {
      id: randomUUID(),
      userId: value.userId,
      accountId: value.accountId,
      blockId,
      lessonId,
      courseId,
      project: value.snapshot,
      submittedAt: new Date(),
    },
    { revision: contentRevision, galleryRequestId: value.snapshot.requestId },
  )
}

async function expectRejected(operation: Promise<unknown>, code: string) {
  // Bun 1.3.11's promise rejection matcher can block postgres.js socket progress.
  // Await the real operation before asserting; an unexpected success remains a failure.
  const outcome = await operation.then(
    () => ({ accepted: true }),
    (error: { code?: string }) => ({ code: error.code }),
  )
  expect(outcome).toEqual({ code })
}

test.skipIf(!url)(
  'atomic gallery no-op returns the winner receipt and does not retain the losing files',
  async () => {
    const { db, sql } = get(),
      repo = new DrizzleGalleryCopyRepository(db),
      now = new Date()
    const loser = attempt(),
      winner = { ...loser, generation: randomUUID(), snapshot: structuredClone(loser.snapshot) }
    winner.snapshot.copyGeneration = winner.generation
    for (const item of winner.snapshot.items)
      item.storageKey = item.storageKey.replace(loser.generation, winner.generation)
    await repo.reserve(loser, now)
    await repo.reserve(winner, now)
    await persist(winner, revision)
    const result = await persist(loser)
    expect(result).toMatchObject({
      duplicateGallery: true,
      receipt: { submittedAt: expect.any(String) },
    })
    const [saved] =
      await sql`select project from members.studio_submissions where user_id=${winner.userId} and block_id=${blockId}`
    expect(saved?.project).toEqual(winner.snapshot)
    expect(result?.receipt).not.toHaveProperty('score')
    expect(
      await sql`select id from members.lesson_evidence where user_id=${winner.userId} and block_id=${blockId}`,
    ).toHaveLength(1)
    const due = new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS)
    expect(await repo.claimDue(due, now)).toMatchObject({ scope: 'gallery', id: loser.generation })
  },
)

test.skipIf(!url)(
  'registered generations bind owner, block, snapshot and expiration; cleanup waits 24h',
  async () => {
    const repo = new DrizzleGalleryCopyRepository(get().db),
      value = attempt(),
      now = new Date()
    await repo.reserve(value, now)
    await repo.assertActive(value, now)
    await expectRejected(
      repo.assertActive({ ...value, userId: randomUUID() }, now),
      'LEARNING_CONFLICT',
    )
    await expectRejected(
      repo.assertActive(
        { ...value, snapshot: { ...value.snapshot, requestId: randomUUID() } },
        now,
      ),
      'LEARNING_CONFLICT',
    )
    await expectRejected(
      repo.assertActive(value, new Date(now.getTime() + 3_600_000)),
      'LEARNING_CONFLICT',
    )
    expect(
      await repo.claimDue(new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS - 1), now),
    ).toBeNull()
    expect(await repo.complete(value.generation, now)).toBe(false)
    const due = new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS)
    const claim = await repo.claimDue(due, now)
    expect(claim).toMatchObject({ scope: 'gallery', id: value.generation, attempts: 1 })
    expect(claim?.prefixes).toEqual([
      `creations/${value.userId}/lesson-submissions/${blockId}/${value.snapshot.requestId}/${value.generation}/`,
    ])
    await expectRejected(persist(value), 'LEARNING_CONFLICT')
    expect(
      await repo.fail(value.generation, 'R2 indisponível', due, new Date(due.getTime() + 60_000)),
    ).toBe(true)
    expect(await repo.claimDue(new Date(due.getTime() + 1), now)).toBeNull()
    expect(await repo.claimDue(new Date(due.getTime() + 60_000), now)).toMatchObject({
      id: value.generation,
      attempts: 2,
    })
    expect(await repo.complete(value.generation, due)).toBe(true)
    expect(await repo.claimDue(new Date(due.getTime() + 120_000), now)).toBeNull()
  },
)

test.skipIf(!url)(
  'submission retention and rollback are atomic with real evidence and previous snapshots',
  async () => {
    const { db, sql } = get(),
      repo = new DrizzleGalleryCopyRepository(db),
      now = new Date()
    const first = attempt(),
      second = attempt(first.userId)
    await repo.reserve(first, now)
    await expectRejected(persist(first, 'wrong'), 'LEARNING_CONFLICT')
    const [rolledBack] =
      await sql`select retained_at from members.gallery_copy_attempts where generation=${first.generation}`
    expect(rolledBack?.retained_at).toBeNull()
    await persist(first)
    await repo.reserve(second, now)
    await persist(second)
    const [saved] =
      await sql`select project,previous_project from members.studio_submissions where user_id=${first.userId} and block_id=${blockId}`
    expect(saved?.project).toEqual(second.snapshot)
    expect(saved?.previous_project).toEqual(first.snapshot)
    const evidence =
      await sql`select payload from members.lesson_evidence where user_id=${first.userId} and block_id=${blockId}`
    expect(evidence.map((row) => (row.payload as { project: unknown }).project)).toEqual([
      first.snapshot,
      second.snapshot,
    ])
    expect(
      await repo.claimDue(new Date(now.getTime() + 2 * GALLERY_COPY_CLEANUP_DELAY_MS), now),
    ).toBeNull()
  },
)

test.skipIf(!url)(
  'pending generation admission is bounded per profile without blocking another profile',
  async () => {
    const { db, sql } = get(),
      repo = new DrizzleGalleryCopyRepository(db),
      value = attempt(),
      now = new Date()
    const rows = Array.from({ length: GALLERY_COPY_PENDING_LIMIT }, () => attempt(value.userId))
    // Seed the exact admission boundary; exercising 128 equivalent inserts adds no coverage.
    for (const row of rows)
      await sql`insert into members.gallery_copy_attempts (generation,account_id,user_id,block_id,snapshot,created_at,expires_at,not_before) values (${row.generation},${row.accountId},${row.userId},${blockId},${JSON.stringify(row.snapshot)}::jsonb,${now.toISOString()},${new Date(now.getTime() + 3_600_000).toISOString()},${new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS).toISOString()})`
    await expectRejected(repo.reserve(value, now), 'VALIDATION_ERROR')
    await repo.reserve(attempt(), now)
    await sql`delete from members.gallery_copy_attempts where user_id=${value.userId}`
  },
)

test.skipIf(!url)(
  'cleanup only returns gallery jobs to a worker that advertises that scope',
  async () => {
    const { db, sql } = get(),
      repo = new DrizzleGalleryCopyRepository(db),
      now = new Date(),
      old = new Date(now.getTime() - 2 * GALLERY_COPY_CLEANUP_DELAY_MS),
      value = attempt()
    await repo.reserve(value, old)
    const queue = new DrizzleCreationCleanupRepository(db)
    expect(await queue.claimDue(now, old, [])).toBeNull()
    const job = await queue.claimDue(now, old, ['gallery'])
    expect(job).toMatchObject({ scope: 'gallery', id: value.generation })
    expect(await queue.complete(value.generation, now)).toBe(true)
    await sql`delete from members.gallery_copy_attempts where generation=${value.generation}`
  },
)

test.skipIf(!url).each(['submission', 'cleanup'] as const)(
  'owner lock serializes %s winning a real cleanup race',
  async (winner) => {
    const { db, sql } = get(),
      repo = new DrizzleGalleryCopyRepository(db),
      value = attempt(),
      now = new Date()
    await repo.reserve(value, now)
    const gateEntered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>()
    const gate = sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${`members-account:${value.accountId}`}, 0))`
      gateEntered.resolve()
      await release.promise
    })
    await gateEntered.promise
    async function waitForBlocked(count: number) {
      const deadline = performance.now() + 3000
      while (performance.now() < deadline) {
        const [row] =
          await sql`select count(*)::integer as total from pg_stat_activity where datname=current_database() and wait_event='advisory'`
        if (row?.total === count) return
        await Bun.sleep(10)
      }
      throw new Error(`Expected ${count} real PostgreSQL advisory-lock waiters`)
    }
    // Advance only the cleanup clock to force both transaction branches to contend;
    // persistence retains its real wall clock and can still accept the active ticket.
    const cleanupNow = new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS)
    const submit = () =>
      persist(value).then(
        () => 'saved',
        (error: { code?: string }) => error.code,
      )
    const clean = () => repo.claimDue(cleanupNow, now)
    let submitted: Promise<unknown> | undefined, cleaned: Promise<unknown> | undefined
    try {
      if (winner === 'submission') submitted = submit()
      else cleaned = clean()
      await waitForBlocked(1)
      if (winner === 'submission') cleaned = clean()
      else submitted = submit()
      await waitForBlocked(2)
      release.resolve()
      await gate
      const [submission, cleanup] = await Promise.all([submitted, cleaned])
      if (winner === 'submission') {
        expect(submission).toBe('saved')
        expect(cleanup).toBeNull()
      } else {
        expect(submission).toBe('LEARNING_CONFLICT')
        expect(cleanup).toMatchObject({ scope: 'gallery', id: value.generation })
      }
      const [row] =
        await sql`select retained_at,retired_at from members.gallery_copy_attempts where generation=${value.generation}`
      expect(Boolean(row?.retained_at)).toBe(winner === 'submission')
      expect(Boolean(row?.retired_at)).toBe(winner === 'cleanup')
    } finally {
      release.resolve()
      await gate
      await Promise.allSettled(
        [submitted, cleaned].filter((p): p is Promise<unknown> => Boolean(p)),
      )
    }
  },
  10_000,
)
