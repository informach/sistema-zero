import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  kidsJourneySteps,
  legacyKidsJourneyPolicy,
  pauseKidsJourneyPolicy,
} from '@sistemazero/core/journey'
import type {
  KidsJourneyOwner,
  KidsJourneyPreparation,
} from '../../src/domain/ports/kids-journey-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { kidsJourneyTestTarget, openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.KIDS_JOURNEY_TEST_DATABASE_URL
if (target !== undefined) kidsJourneyTestTarget(target) // An explicit broken contract must fail, never skip.

describe.skipIf(!target)('Kids journey repository / real migrations', () => {
  let conn: DbConnection
  let repo: DrizzleKidsJourneyRepository
  const actorId = randomUUID()
  const owner = (): KidsJourneyOwner => ({ userId: randomUUID(), accountId: randomUUID() })

  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(target!)
    repo = new DrizzleKidsJourneyRepository(conn.db)
  }, 60_000)
  afterAll(async () => {
    await conn?.close()
  })
  beforeEach(async () => {
    const tables = await conn.sql<
      { name: string }[]
    >`select format('%I.%I', schemaname, tablename) as name from pg_tables where schemaname = 'members'`
    await conn.sql.unsafe(`truncate table ${tables.map((table) => table.name).join(', ')} cascade`)
  })

  async function profile(subject: KidsJourneyOwner) {
    await conn.sql`insert into members.gamification_profiles(id,user_id,account_id,audience,created_at,updated_at)
      values (${randomUUID()},${subject.userId},${subject.accountId},'kids',now(),now())`
  }
  async function milestone(
    subject: KidsJourneyOwner,
    courseId: string,
    type: 'course_complete' | 'course_showcased',
    audience = 'kids',
  ) {
    await conn.sql`insert into members.xp_events(id,user_id,audience,source_type,source_id,amount,source_level,source_track,source_career_slot,created_at)
      values (${randomUUID()},${subject.userId},${audience},${type},${courseId},0,'primeiros-passos','2d',1,now())`
  }
  async function prepare(expectedVersion = 0) {
    const result = await repo.createPreparation({
      expectedVersion,
      candidatePolicy: legacyKidsJourneyPolicy(),
      actorId,
      reason: 'Ajuste pedagógico',
    })
    if (!result) throw new Error('Preparation unexpectedly conflicted')
    return result
  }
  const publish = (ready: KidsJourneyPreparation) =>
    repo.publishPrepared({
      preparationId: ready.id,
      expectedVersion: ready.expectedVersion,
      draftHash: ready.draftHash,
      catalogHash: ready.catalogHash,
      actorId,
    })
  async function refusal(operation: () => Promise<unknown>) {
    let caught: unknown
    try {
      await operation()
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
  }
  async function purge(subject: KidsJourneyOwner) {
    await new DrizzleUserDataPurgeRepository(conn.db).purgeForUser({
      userIds: [subject.accountId, subject.userId],
      accountId: subject.accountId,
      cleanup: {
        id: randomUUID(),
        prefixes: [`creations/${subject.userId}/`],
        createdAt: new Date(),
        notBefore: new Date(),
      },
    })
  }

  async function withHeldLock(key: string, operation: (release: () => void) => Promise<void>) {
    let signalLocked!: () => void
    let release!: () => void
    const locked = new Promise<void>((resolve) => {
      signalLocked = resolve
    })
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    const holder = conn.sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`
      signalLocked()
      await released
    })
    await locked
    try {
      await operation(release)
    } finally {
      release()
      await holder
    }
  }

  async function waitForBlockedAdvisory() {
    const deadline = Date.now() + 2_000
    do {
      const [state] = await conn.sql`select exists (
        select 1 from pg_locks where locktype='advisory' and not granted
          and database=(select oid from pg_database where datname=current_database())
      ) as blocked`
      if (state!.blocked) return
    } while (Date.now() < deadline)
    throw new Error('Expected the repository operation to wait on the held advisory lock')
  }

  test('lifetime: freeze captures owner A before awaits even when the caller changes it to B', async () => {
    const first = owner(),
      second = owner()
    await profile(first)
    await profile(second)
    const input = { ...first }
    await withHeldLock(`members-account:${first.accountId}`, async (release) => {
      const pending = repo.freezeEarned(input, 0, { level: 'coder', capabilities: ['studio'] })
      await waitForBlockedAdvisory()
      Object.assign(input, second)
      release()
      expect(await pending).toBe('frozen')
    })
    const snapshot = await repo.readSnapshot([first, second])
    expect(snapshot.profiles.get(first.userId)!.earned.level).toBe('coder')
    expect(snapshot.profiles.get(second.userId)!.earned.level).toBe('noob')
  })

  test('lifetime: preparation captures actor and CAS before waiting for policy', async () => {
    const input = {
      expectedVersion: 0,
      candidatePolicy: legacyKidsJourneyPolicy(),
      actorId,
      reason: 'Capturado',
    }
    await withHeldLock('kids-journey-policy', async (release) => {
      const pending = repo.createPreparation(input)
      await waitForBlockedAdvisory()
      input.actorId = randomUUID()
      input.expectedVersion = 1
      release()
      const created = await pending
      expect(created).not.toBeNull()
      expect(created!.actorId).toBe(actorId)
      expect(created!.expectedVersion).toBe(0)
    })
  })

  test('lifetime: publication captures actor before waiting for policy', async () => {
    const ready = await prepare()
    const input = {
      preparationId: ready.id,
      expectedVersion: 0,
      draftHash: ready.draftHash,
      catalogHash: ready.catalogHash,
      actorId,
    }
    await withHeldLock('kids-journey-policy', async (release) => {
      const pending = repo.publishPrepared(input)
      await waitForBlockedAdvisory()
      input.actorId = randomUUID()
      release()
      expect((await pending)!.version).toBe(1)
    })
    expect((await repo.listHistory())[0]!.actorId).toBe(actorId)
  })

  test('lifetime: publication captures CAS and hashes before waiting for policy', async () => {
    const ready = await prepare()
    const input = {
      preparationId: ready.id,
      expectedVersion: 0,
      draftHash: ready.draftHash,
      catalogHash: ready.catalogHash,
      actorId,
    }
    await withHeldLock('kids-journey-policy', async (release) => {
      const pending = repo.publishPrepared(input)
      await waitForBlockedAdvisory()
      input.expectedVersion = 1
      input.draftHash = 'f'.repeat(64)
      input.catalogHash = 'f'.repeat(64)
      release()
      expect((await pending)?.version).toBe(1)
    })
  })

  test('lifetime: empty earned state is independent between profiles', async () => {
    const first = owner(),
      second = owner()
    const snapshot = await repo.readSnapshot([first, second])
    const earned = snapshot.profiles.get(first.userId)!.earned
    try {
      earned.level = 'god'
      earned.capabilities = ['pro']
      expect(snapshot.profiles.get(second.userId)!.earned).toEqual({
        level: 'noob',
        capabilities: [],
      })
    } finally {
      earned.level = 'noob'
      earned.capabilities = []
    }
  })

  test('lifetime: missing policy record is independent between reads', async () => {
    const first = await repo.readSnapshot([])
    try {
      first.policy.version = 99
      expect((await repo.readSnapshot([])).policy.version).toBe(0)
    } finally {
      first.policy.version = 0
    }
  })

  test('missing policy is exact legacy v0; repeated snapshot reads never materialize grants', async () => {
    const subject = owner()
    await profile(subject)
    const courseId = randomUUID()
    await milestone(subject, courseId, 'course_complete')
    const first = await repo.readSnapshot([subject])
    await repo.readSnapshot([subject])
    expect(first.policy).toEqual({ version: 0, policy: legacyKidsJourneyPolicy(), updatedAt: null })
    expect(first.profiles.get(subject.userId)!.earned).toEqual({ level: 'noob', capabilities: [] })
    const [counts] =
      await conn.sql`select (select count(*)::int from members.kids_journey_earned) as earned,
      (select count(*)::int from members.kids_journey_policy) as policy,
      (select count(*)::int from members.xp_events) as xp`
    expect(counts).toMatchObject({ earned: 0, policy: 0, xp: 1 })
  })

  test('batch ledger reads isolate siblings/audience and retain a deleted course snapshot', async () => {
    const first = owner(),
      second = { userId: randomUUID(), accountId: first.accountId }
    await profile(first)
    await profile(second)
    const courseId = randomUUID()
    await milestone(first, courseId, 'course_complete')
    await milestone(second, courseId, 'course_showcased')
    await milestone(first, randomUUID(), 'course_showcased', 'adult')
    const snapshot = await repo.readSnapshot([first, second, first])
    expect(snapshot.profiles.size).toBe(2)
    expect(snapshot.profiles.get(first.userId)!.milestones).toEqual([
      {
        courseId,
        completed: true,
        showcased: false,
        qualifiedTier: 'primeiros-passos-2d',
        qualifiedSlot: 1,
      },
    ])
    expect(snapshot.profiles.get(second.userId)!.milestones[0]).toMatchObject({
      completed: false,
      showcased: true,
    })
    await refusal(() => repo.readSnapshot([{ ...first, accountId: randomUUID() }]))
    await refusal(() => repo.readSnapshot([first, { ...first, accountId: randomUUID() }]))
  })

  test('catalog derives formatura identity and published reachable showcase, excluding coming-soon/archived blocks', async () => {
    const courseId = randomUUID(),
      moduleId = randomUUID(),
      lessonId = randomUUID(),
      blockId = randomUUID()
    await conn.sql`insert into members.courses(id,slug,title,audience,level,created_at,updated_at)
      values (${courseId},${courseId},'Formatura','kids','lenda',now(),now())`
    await conn.sql`insert into members.modules(id,course_id,title,created_at,updated_at) values (${moduleId},${courseId},'Parte',now(),now())`
    await conn.sql`insert into members.lessons(id,course_id,module_id,slug,title,created_at,updated_at)
      values (${lessonId},${courseId},${moduleId},${lessonId},'Aula',now(),now())`
    await conn.sql`insert into members.lesson_blocks(id,lesson_id,kind,sort_order,content)
      values (${blockId},${lessonId},'studio',0,'{"kind":"studio","showcase":{"enabled":true}}'::jsonb)`
    expect((await repo.readSnapshot([])).catalog[0]).toMatchObject({
      graduationOnly: true,
      tier: null,
      hasShowcaseBlock: true,
    })
    const pendingId = randomUUID()
    await conn.sql`insert into members.lesson_blocks(id,lesson_id,kind,sort_order,content)
      values (${pendingId},${lessonId},'coming_soon',1,'{"kind":"coming_soon"}'::jsonb)`
    expect((await repo.readSnapshot([])).catalog[0]!.hasShowcaseBlock).toBe(false)
    await conn.sql`update members.lesson_blocks set archived_at=now() where id=${pendingId}`
    expect((await repo.readSnapshot([])).catalog[0]!.hasShowcaseBlock).toBe(true)
    await conn.sql`update members.lessons set is_published=false where id=${lessonId}`
    expect((await repo.readSnapshot([])).catalog[0]!.hasShowcaseBlock).toBe(false)
  })

  test('concurrent stale writers preserve the maximum rank and union capabilities; owner never moves', async () => {
    const subject = owner()
    await profile(subject)
    expect(
      await Promise.all([
        repo.freezeEarned(subject, 0, { level: 'elite', capabilities: ['studio'] }),
        repo.freezeEarned(subject, 0, { level: 'coder', capabilities: ['pinta'] }),
      ]),
    ).toEqual(['frozen', 'frozen'])
    await repo.freezeEarned(subject, 0, { level: 'noob', capabilities: [] })
    const saved = (await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned
    expect(saved.level).toBe('elite')
    expect([...saved.capabilities].sort()).toEqual(['pinta', 'studio'])
    await refusal(() =>
      repo.freezeEarned({ ...subject, accountId: randomUUID() }, 0, {
        level: 'god',
        capabilities: ['pro'],
      }),
    )
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toEqual(saved)
  })

  test('v0 and v1 publication CAS create one atomic immutable revision each', async () => {
    const first = await prepare(),
      concurrent = await prepare()
    const results = await Promise.all([publish(first), publish(concurrent)])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect((await repo.readSnapshot([])).policy.version).toBe(1)
    expect(
      await repo.createPreparation({
        expectedVersion: 0,
        candidatePolicy: legacyKidsJourneyPolicy(),
        actorId,
        reason: 'Stale',
      }),
    ).toBeNull()
    expect(await repo.freezeEarned(owner(), 0, { level: 'coder', capabilities: ['studio'] })).toBe(
      'conflict',
    )
    const next = await prepare(1),
      competing = await prepare(1)
    const updates = await Promise.all([publish(next), publish(competing)])
    expect(updates.filter(Boolean)).toHaveLength(1)
    const winning = updates[0] ? next : competing
    const history = await repo.listHistory()
    expect(history.map((revision) => [revision.version, revision.previousVersion])).toEqual([
      [2, 1],
      [1, 0],
    ])
    expect(history[0]).toMatchObject({
      actorId,
      reason: 'Ajuste pedagógico',
      preparationId: winning.id,
      draftHash: winning.draftHash,
    })
    expect((await repo.listHistory(2, 1)).map((revision) => revision.version)).toEqual([1])
  })

  test('baseline freezes an offline veteran and advances cursor in the same transaction', async () => {
    const subject = owner(),
      courseId = randomUUID()
    await profile(subject)
    await milestone(subject, courseId, 'course_complete')
    await milestone(subject, courseId, 'course_showcased')
    const initial = await prepare()
    expect(initial.status).toBe('preparing')
    expect(await publish(initial)).toBeNull()
    const result = await repo.advancePreparation(initial.id, null)
    expect(result.status).toBe('advanced')
    if (result.status !== 'advanced') throw new Error('Expected progress')
    expect(result.preparation).toMatchObject({
      status: 'ready',
      cursor: subject.userId,
      processed: 1,
    })
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toMatchObject(
      { level: 'coder', capabilities: ['studio', 'pinta'] },
    )
    expect(await repo.advancePreparation(initial.id, null)).toEqual({ status: 'conflict' })
    expect((await publish(result.preparation))!.version).toBe(1)
  })

  test('unowned historical milestones stop preparation instead of silently skipping a veteran', async () => {
    await milestone(owner(), randomUUID(), 'course_complete')
    const initial = await prepare()
    expect(await repo.advancePreparation(initial.id, null)).toEqual({ status: 'unowned' })
    expect((await repo.getPreparation(initial.id))!.processed).toBe(0)
    expect(await publish(initial)).toBeNull()
  })

  test('two workers cannot process the same cursor twice', async () => {
    const subject = owner()
    await profile(subject)
    await milestone(subject, randomUUID(), 'course_complete')
    const initial = await prepare()
    const results = await Promise.all([
      repo.advancePreparation(initial.id, null),
      repo.advancePreparation(initial.id, null),
    ])
    expect(results.map((result) => result.status).sort()).toEqual(['advanced', 'conflict'])
    expect((await repo.getPreparation(initial.id))!.processed).toBe(1)
  })

  test('publication rejects changed hashes/catalog and marks the preparation stale', async () => {
    const ready = await prepare()
    expect(
      await repo.publishPrepared({
        preparationId: ready.id,
        expectedVersion: 0,
        draftHash: 'f'.repeat(64),
        catalogHash: ready.catalogHash,
        actorId,
      }),
    ).toBeNull()
    const courseId = randomUUID()
    await conn.sql`insert into members.courses(id,slug,title,created_at,updated_at) values (${courseId},${courseId},'Novo',now(),now())`
    expect(await publish(ready)).toBeNull()
    expect((await repo.getPreparation(ready.id))!.status).toBe('stale')
    expect((await repo.readSnapshot([])).policy.version).toBe(0)
    expect(await repo.listHistory()).toHaveLength(0)
  })

  test('pause candidate must preserve the actual outgoing rules', async () => {
    const wrong = {
      schemaVersion: 1 as const,
      mode: 'configured' as const,
      steps: kidsJourneySteps(legacyKidsJourneyPolicy()),
    }
    await refusal(() =>
      repo.createPreparation({
        expectedVersion: 0,
        candidatePolicy: pauseKidsJourneyPolicy(wrong),
        actorId,
        reason: 'Pausa alterada',
      }),
    )
    const ready = await repo.createPreparation({
      expectedVersion: 0,
      candidatePolicy: pauseKidsJourneyPolicy(legacyKidsJourneyPolicy()),
      actorId,
      reason: 'Pausa',
    })
    expect(ready!.status).toBe('ready')
    expect((await publish(ready!))!.policy).toEqual(
      pauseKidsJourneyPolicy(legacyKidsJourneyPolicy()),
    )
    const subject = owner()
    expect(await repo.freezeEarned(subject, 1, { level: 'god', capabilities: ['pro'] })).toBe(
      'frozen',
    )
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toEqual({
      level: 'noob',
      capabilities: [],
    })
  })

  test('purge removes grants by account even for an omitted profile; fence prevents resurrection on retries', async () => {
    const subject = owner(),
      omitted = { userId: randomUUID(), accountId: subject.accountId }
    await profile(subject)
    await profile(omitted)
    await repo.freezeEarned(omitted, 0, { level: 'elite', capabilities: ['studio'] })
    await milestone(subject, randomUUID(), 'course_complete')
    const initial = await prepare()
    await purge(subject)
    const [count] = await conn.sql`select count(*)::int as value from members.kids_journey_earned`
    expect(count!.value).toBe(0)
    expect(await repo.freezeEarned(omitted, 0, { level: 'god', capabilities: ['pro'] })).toBe(
      'deleted',
    )
    const result = await repo.advancePreparation(initial.id, null)
    expect(result.status).toBe('advanced')
    const [after] = await conn.sql`select count(*)::int as value from members.kids_journey_earned`
    expect(after!.value).toBe(0)
  })

  test('corrupt persisted policy fails closed rather than falling back to permissive legacy', async () => {
    await conn.sql`insert into members.kids_journey_policy(id,version,policy,updated_at)
      values ('kids',1,'{"schemaVersion":1,"mode":"configured","steps":[]}'::jsonb,now())`
    await refusal(() => repo.readSnapshot([]))
  })

  test('failed audit insertion rolls back the active policy and preparation together', async () => {
    const ready = await prepare()
    await conn.sql`alter table members.kids_journey_revisions add constraint kids_journey_test_reject_audit check (false) not valid`
    try {
      await refusal(() => publish(ready))
      expect((await repo.readSnapshot([])).policy.version).toBe(0)
      expect(await repo.listHistory()).toHaveLength(0)
      expect((await repo.getPreparation(ready.id))!.status).toBe('ready')
    } finally {
      await conn.sql`alter table members.kids_journey_revisions drop constraint kids_journey_test_reject_audit`
    }
  })

  test('the QA harness refuses reuse while a client is connected', async () => {
    await refusal(() => openKidsJourneyTestDatabase(target!))
    expect((await conn.sql`select 1 as alive`)[0]!.alive).toBe(1)
  })
})
