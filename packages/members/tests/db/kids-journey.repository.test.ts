import { afterAll, beforeAll, beforeEach, test as bunTest, describe, expect } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  initialKidsJourneyPolicy,
  type KidsJourneyPolicy,
  pauseKidsJourneyPolicy,
  resolveKidsJourneyCourseLock,
} from '@sistemazero/core/journey'
import type {
  KidsJourneyOwner,
  KidsJourneyPreparation,
} from '../../src/domain/ports/kids-journey-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import {
  kidsJourneyPolicy,
  kidsJourneyPreparations,
  kidsJourneyRevisions,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import {
  kidsJourneyTestTarget,
  OwnedKidsJourneyTestWork,
  openKidsJourneyTestDatabase,
} from './kids-journey-database'

const target = process.env.KIDS_JOURNEY_TEST_DATABASE_URL
if (target !== undefined) kidsJourneyTestTarget(target) // An explicit broken contract must fail, never skip.

describe.skipIf(!target)('Kids journey repository / real migrations', () => {
  let conn: DbConnection
  let repo: DrizzleKidsJourneyRepository
  let seedFixture: {
    policy: typeof kidsJourneyPolicy.$inferSelect
    preparation: typeof kidsJourneyPreparations.$inferSelect
    revision: typeof kidsJourneyRevisions.$inferSelect
  }
  const actorId = randomUUID()
  const ownedWork = new OwnedKidsJourneyTestWork()
  function test(name: string, operation: () => Promise<void>) {
    bunTest(name, () => ownedWork.track(operation))
  }
  const owner = (): KidsJourneyOwner => ({ userId: randomUUID(), accountId: randomUUID() })

  beforeAll(
    () =>
      ownedWork.track(async () => {
        conn = await openKidsJourneyTestDatabase(target!)
        repo = new DrizzleKidsJourneyRepository(conn.db)
        await truncate()
        // Capture a genuine empty-cohort bootstrap once; dedicated tests exercise populated bootstrap.
        await repo.initializeSeed()
        const preparation = await repo.createSeedPreparation()
        if (!preparation) throw new Error('Seed preparation missing')
        const sealed = await repo.sealSeedOwners(preparation.id)
        if (!sealed) throw new Error('Seed capture missing')
        const ready = await capture(sealed)
        if (!(await publish(ready))) throw new Error('Seed publication failed')
        seedFixture = {
          policy: (await conn.db.select().from(kidsJourneyPolicy))[0]!,
          preparation: (await conn.db.select().from(kidsJourneyPreparations))[0]!,
          revision: (await conn.db.select().from(kidsJourneyRevisions))[0]!,
        }
      }),
    60_000,
  )
  afterAll(async () => {
    await ownedWork.drain()
    await conn?.close()
  })
  beforeEach(() =>
    ownedWork.track(async () => {
      await truncate()
      await conn.db.insert(kidsJourneyPolicy).values(seedFixture.policy)
      await conn.db.insert(kidsJourneyPreparations).values(seedFixture.preparation)
      await conn.db.insert(kidsJourneyRevisions).values(seedFixture.revision)
    }),
  )
  async function truncate() {
    const tables = await conn.sql<
      { name: string }[]
    >`select format('%I.%I', schemaname, tablename) as name from pg_tables where schemaname = 'members'`
    await conn.sql.unsafe(`truncate table ${tables.map((table) => table.name).join(', ')} cascade`)
  }

  async function profile(subject: KidsJourneyOwner, admit = true) {
    await conn.sql`insert into members.gamification_profiles(id,user_id,account_id,audience,created_at,updated_at)
      values (${randomUUID()},${subject.userId},${subject.accountId},'kids',now(),now())`
    if (admit) await repo.initializeProfile(subject)
  }
  async function capture(initial: KidsJourneyPreparation) {
    let current = initial
    while (current.status === 'capturing') {
      const next = await repo.advanceCapture(
        current.id,
        current.captureStage,
        current.captureCursor,
      )
      if (!next) throw new Error('Capture unexpectedly conflicted')
      current = next
    }
    return current
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
  async function prepare(
    expectedVersion = 1,
    candidatePolicy: KidsJourneyPolicy = initialKidsJourneyPolicy(),
  ) {
    const result = await repo.createPreparation({
      expectedVersion,
      candidatePolicy,
      actor: { kind: 'user' as const, id: actorId },
      reason: 'Ajuste pedagógico',
    })
    if (!result) throw new Error('Preparation unexpectedly conflicted')
    return capture(result)
  }
  async function baseline(initial: KidsJourneyPreparation) {
    let current = initial
    while (current.status === 'preparing') {
      const next = await repo.advancePreparation(current.id, current.cursor)
      if (next.status !== 'advanced') throw new Error(`Baseline unexpectedly ${next.status}`)
      current = next.preparation
    }
    return current
  }
  const publish = (ready: KidsJourneyPreparation) =>
    repo.publishPrepared({
      preparationId: ready.id,
      expectedVersion: ready.expectedVersion,
      draftHash: ready.draftHash,
      catalogHash: ready.catalogHash,
      cohortHash: ready.cohortHash!,
      actor:
        ready.origin === 'seed'
          ? { kind: 'system' as const }
          : { kind: 'user' as const, id: actorId },
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
      const pending = repo.freezeEarned(input, 1, {
        level: 'coder',
        capabilities: ['studio'],
        courseAccess: { entry: [], expanded: [], reward: [] },
      })
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
      expectedVersion: 1,
      candidatePolicy: initialKidsJourneyPolicy(),
      actor: { kind: 'user' as const, id: actorId },
      reason: 'Capturado',
    }
    await withHeldLock('kids-journey-policy', async (release) => {
      const pending = repo.createPreparation(input)
      await waitForBlockedAdvisory()
      input.actor.id = randomUUID()
      input.expectedVersion = 2
      release()
      const created = await pending
      expect(created).not.toBeNull()
      expect(created!.actorId).toBe(actorId)
      expect(created!.expectedVersion).toBe(1)
    })
  })

  test('lifetime: publication captures actor before waiting for policy', async () => {
    const ready = await prepare()
    const input = {
      preparationId: ready.id,
      expectedVersion: 1,
      draftHash: ready.draftHash,
      catalogHash: ready.catalogHash,
      cohortHash: ready.cohortHash!,
      actor: { kind: 'user' as const, id: actorId },
    }
    await withHeldLock('kids-journey-policy', async (release) => {
      const pending = repo.publishPrepared(input)
      await waitForBlockedAdvisory()
      input.actor.id = randomUUID()
      release()
      expect((await pending)!.version).toBe(2)
    })
    expect((await repo.listHistory())[0]!.actorId).toBe(actorId)
  })

  test('lifetime: publication captures CAS and hashes before waiting for policy', async () => {
    const ready = await prepare()
    const input = {
      preparationId: ready.id,
      expectedVersion: 1,
      draftHash: ready.draftHash,
      catalogHash: ready.catalogHash,
      cohortHash: ready.cohortHash!,
      actor: { kind: 'user' as const, id: actorId },
    }
    await withHeldLock('kids-journey-policy', async (release) => {
      const pending = repo.publishPrepared(input)
      await waitForBlockedAdvisory()
      input.expectedVersion = 2
      input.draftHash = 'f'.repeat(64)
      input.catalogHash = 'f'.repeat(64)
      release()
      expect((await pending)?.version).toBe(2)
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
        courseAccess: { entry: [], expanded: [], reward: [] },
      })
    } finally {
      earned.level = 'noob'
      earned.capabilities = []
    }
  })

  test('lifetime: published policy record is independent between reads', async () => {
    const first = await repo.readSnapshot([])
    try {
      first.policy.version = 99
      expect((await repo.readSnapshot([])).policy.version).toBe(1)
    } finally {
      first.policy.version = 1
    }
  })

  test('published seed snapshot is read-only and never materializes grants', async () => {
    const subject = owner()
    await profile(subject, false)
    const courseId = randomUUID()
    await milestone(subject, courseId, 'course_complete')
    const first = await repo.readSnapshot([subject])
    await repo.readSnapshot([subject])
    expect(first.policy).toMatchObject({
      phase: 'published',
      version: 1,
      policy: initialKidsJourneyPolicy(),
    })
    expect(first.profiles.get(subject.userId)!.earned).toEqual({
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    })
    const [counts] =
      await conn.sql`select (select count(*)::int from members.kids_journey_earned) as earned,
      (select count(*)::int from members.kids_journey_policy) as policy,
      (select count(*)::int from members.xp_events) as xp`
    expect(counts).toMatchObject({ earned: 0, policy: 1, xp: 1 })
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
        repo.freezeEarned(subject, 1, {
          level: 'elite',
          capabilities: ['studio'],
          courseAccess: { entry: [], expanded: [], reward: [] },
        }),
        repo.freezeEarned(subject, 1, {
          level: 'coder',
          capabilities: ['pinta'],
          courseAccess: { entry: [], expanded: [], reward: [] },
        }),
      ]),
    ).toEqual(['frozen', 'frozen'])
    await repo.freezeEarned(subject, 1, {
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    })
    const saved = (await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned
    expect(saved.level).toBe('elite')
    expect([...saved.capabilities].sort()).toEqual(['pinta', 'studio'])
    await refusal(() =>
      repo.freezeEarned({ ...subject, accountId: randomUUID() }, 1, {
        level: 'god',
        capabilities: ['pro'],
        courseAccess: { entry: [], expanded: [], reward: [] },
      }),
    )
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toEqual(saved)
  })

  test('v1 and v2 publication CAS create one atomic immutable revision each', async () => {
    const first = await prepare(),
      concurrent = await prepare()
    const results = await Promise.all([publish(first), publish(concurrent)])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect((await repo.readSnapshot([])).policy.version).toBe(2)
    expect(
      await repo.createPreparation({
        expectedVersion: 1,
        candidatePolicy: initialKidsJourneyPolicy(),
        actor: { kind: 'user' as const, id: actorId },
        reason: 'Stale',
      }),
    ).toBeNull()
    expect(
      await repo.freezeEarned(owner(), 1, {
        level: 'coder',
        capabilities: ['studio'],
        courseAccess: { entry: [], expanded: [], reward: [] },
      }),
    ).toBe('conflict')
    const next = await prepare(2),
      competing = await prepare(2)
    const updates = await Promise.all([publish(next), publish(competing)])
    expect(updates.filter(Boolean)).toHaveLength(1)
    const winning = updates[0] ? next : competing
    const history = await repo.listHistory()
    expect(history.map((revision) => [revision.version, revision.previousVersion])).toEqual([
      [3, 2],
      [2, 1],
      [1, 0],
    ])
    expect(history[0]).toMatchObject({
      actorKind: 'user',
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
      {
        level: 'coder',
        capabilities: ['studio', 'pinta'],
        courseAccess: {
          entry: ['primeiros-passos-2d', 'iniciante-2d'],
          expanded: ['primeiros-passos-2d', 'iniciante-2d'],
          reward: [
            'primeiros-passos-2d',
            'iniciante-2d',
            'iniciante-3d',
            'intermediario-2d',
            'intermediario-3d',
            'avancado-2d',
            'avancado-3d',
          ],
        },
      },
    )
    expect(await repo.advancePreparation(initial.id, null)).toEqual({ status: 'conflict' })
    expect((await publish(result.preparation))!.version).toBe(2)
  })

  test('unowned historical milestones stop bootstrap capture instead of silently skipping a veteran', async () => {
    await conn.sql`truncate members.kids_journey_policy, members.kids_journey_preparations, members.kids_journey_revisions cascade`
    await milestone(owner(), randomUUID(), 'course_complete')
    await repo.initializeSeed()
    const initial = (await repo.createSeedPreparation())!
    const sealed = (await repo.sealSeedOwners(initial.id))!
    await refusal(() => repo.advanceCapture(sealed.id, sealed.captureStage, sealed.captureCursor))
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
        expectedVersion: 1,
        draftHash: 'f'.repeat(64),
        catalogHash: ready.catalogHash,
        cohortHash: ready.cohortHash!,
        actor: { kind: 'user' as const, id: actorId },
      }),
    ).toBeNull()
    const courseId = randomUUID()
    await conn.sql`insert into members.courses(id,slug,title,created_at,updated_at) values (${courseId},${courseId},'Novo',now(),now())`
    expect(await publish(ready)).toBeNull()
    expect((await repo.getPreparation(ready.id))!.status).toBe('stale')
    expect((await repo.readSnapshot([])).policy.version).toBe(1)
    expect(await repo.listHistory()).toHaveLength(1)
  })

  test('pause candidate must preserve the actual outgoing rules', async () => {
    const wrong = {
      ...initialKidsJourneyPolicy(),
      schemaVersion: 1 as const,
      mode: 'active' as const,
      steps: initialKidsJourneyPolicy().steps,
      tierAccess: initialKidsJourneyPolicy().tierAccess.map((rule) => ({
        ...rule,
        foundation: { ...rule.foundation, whenMissing: 'locked' as const },
      })),
    }
    await refusal(() =>
      repo.createPreparation({
        expectedVersion: 1,
        candidatePolicy: pauseKidsJourneyPolicy(wrong),
        actor: { kind: 'user' as const, id: actorId },
        reason: 'Pausa alterada',
      }),
    )
    const ready = await repo.createPreparation({
      expectedVersion: 1,
      candidatePolicy: pauseKidsJourneyPolicy(initialKidsJourneyPolicy()),
      actor: { kind: 'user' as const, id: actorId },
      reason: 'Pausa',
    })
    const captured = await capture(ready!)
    expect(captured.status).toBe('ready')
    expect((await publish(captured))!.policy).toEqual(
      pauseKidsJourneyPolicy(initialKidsJourneyPolicy()),
    )
    const subject = owner()
    expect(
      await repo.freezeEarned(subject, 2, {
        level: 'god',
        capabilities: ['pro'],
        courseAccess: { entry: [], expanded: [], reward: [] },
      }),
    ).toBe('frozen')
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toMatchObject(
      {
        level: 'noob',
        capabilities: [],
      },
    )
  })

  test('purge removes grants by account even for an omitted profile; fence prevents resurrection on retries', async () => {
    const subject = owner(),
      omitted = { userId: randomUUID(), accountId: subject.accountId }
    await profile(subject)
    await profile(omitted)
    await repo.freezeEarned(omitted, 1, {
      level: 'elite',
      capabilities: ['studio'],
      courseAccess: { entry: [], expanded: [], reward: [] },
    })
    await milestone(subject, randomUUID(), 'course_complete')
    const initial = await prepare()
    await purge(subject)
    const [count] = await conn.sql`select count(*)::int as value from members.kids_journey_earned`
    expect(count!.value).toBe(0)
    expect(
      await repo.freezeEarned(omitted, 1, {
        level: 'god',
        capabilities: ['pro'],
        courseAccess: { entry: [], expanded: [], reward: [] },
      }),
    ).toBe('deleted')
    const result = await repo.advancePreparation(initial.id, null)
    expect(result.status).toBe('advanced')
    const [after] = await conn.sql`select count(*)::int as value from members.kids_journey_earned`
    expect(after!.value).toBe(0)
  })

  test('corrupt persisted policy fails closed rather than falling back to permissive legacy', async () => {
    await conn.sql`update members.kids_journey_policy set policy='{"schemaVersion":1,"mode":"active","steps":[],"tierAccess":[]}'::jsonb where id='kids'`
    await refusal(() => repo.readSnapshot([]))
  })

  test('failed audit insertion rolls back the active policy and preparation together', async () => {
    const ready = await prepare()
    await conn.sql`alter table members.kids_journey_revisions add constraint kids_journey_test_reject_audit check (false) not valid`
    try {
      await refusal(() => publish(ready))
      expect((await repo.readSnapshot([])).policy.version).toBe(1)
      expect(await repo.listHistory()).toHaveLength(1)
      expect((await repo.getPreparation(ready.id))!.status).toBe('ready')
    } finally {
      await conn.sql`alter table members.kids_journey_revisions drop constraint kids_journey_test_reject_audit`
    }
  })

  test('missing policy after seed is unavailable and cannot silently reseed history', async () => {
    await conn.sql`delete from members.kids_journey_policy`
    await refusal(() => repo.readSnapshot([]))
    await refusal(() => repo.initializeSeed())
    expect(await repo.listHistory()).toHaveLength(1)
  })

  test('missing initializing policy with a preparation is not mistaken for a new database', async () => {
    await conn.sql`truncate members.kids_journey_policy, members.kids_journey_preparations, members.kids_journey_revisions cascade`
    await repo.initializeSeed()
    const prep = (await repo.createSeedPreparation())!
    await conn.sql`delete from members.kids_journey_policy`
    await refusal(() => repo.initializeSeed())
    expect((await repo.getPreparation(prep.id))!.status).toBe('capturing')
  })

  test('bootstrap captures Auth children without XP, resumes bounded phases, and audits system V1', async () => {
    await conn.sql`truncate members.kids_journey_policy, members.kids_journey_preparations, members.kids_journey_revisions cascade`
    const first = owner(),
      second = owner()
    const initial = await repo.initializeSeed()
    expect(initial).toMatchObject({
      phase: 'initializing',
      version: 0,
      policy: initialKidsJourneyPolicy(),
    })
    await refusal(() => repo.readSnapshot([]))
    expect(await repo.initializeProfile(first)).toBeNull()
    const prep = (await repo.createSeedPreparation())!
    expect((await repo.createSeedPreparation())!.id).toBe(prep.id)
    expect(await repo.appendSeedOwners(prep.id, [first])).toBe(true)
    expect(await repo.appendSeedOwners(prep.id, [second, first])).toBe(true)
    expect((await repo.getPreparation(prep.id))!.captureCursor).toBe(
      [first.userId, second.userId].sort().at(-1)!,
    )
    const sealed = (await repo.sealSeedOwners(prep.id))!
    expect(await repo.appendSeedOwners(prep.id, [owner()])).toBe(false)
    let current = await capture(sealed)
    expect(current.status).toBe('preparing')
    expect(current.cohortHash).toMatch(/^[a-f0-9]{64}$/)
    const firstProgress = await repo.advancePreparation(current.id, null)
    if (firstProgress.status !== 'advanced') throw new Error('Expected one profile baseline')
    current = firstProgress.preparation
    expect(current).toMatchObject({ processed: 1, status: 'preparing' })
    const secondProgress = await repo.advancePreparation(current.id, current.cursor)
    if (secondProgress.status !== 'advanced') throw new Error('Expected second profile baseline')
    current = secondProgress.preparation
    expect(current).toMatchObject({ processed: 2, status: 'ready' })
    expect((await publish(current))!.version).toBe(1)
    const snapshot = await repo.readSnapshot([first, second])
    expect(snapshot.profiles.get(first.userId)!.earned.level).toBe('noob')
    expect(snapshot.profiles.get(second.userId)!.earned.courseAccess.entry).toEqual([
      'primeiros-passos-2d',
    ])
    expect((await repo.listHistory())[0]).toMatchObject({
      actorKind: 'system',
      actorId: null,
      version: 1,
      previousVersion: 0,
      cohortHash: current.cohortHash,
    })
    expect((await repo.initializeSeed()).version).toBe(1)
    expect(await repo.createSeedPreparation()).toBeNull()
    const [count] = await conn.sql`select count(*)::int as value from members.kids_journey_earned`
    expect(count!.value).toBe(2)
  })

  test('admission always materializes a no-XP child and recurring capture includes it once', async () => {
    const subject = owner()
    expect((await repo.initializeProfile(subject))!.version).toBe(1)
    expect((await repo.initializeProfile(subject))!.version).toBe(1)
    const [count] =
      await conn.sql`select count(*)::int as value from members.kids_journey_earned where user_id=${subject.userId}`
    expect(count!.value).toBe(1)
    const pending = await repo.createPreparation({
      expectedVersion: 1,
      candidatePolicy: initialKidsJourneyPolicy(),
      actor: { kind: 'user', id: actorId },
      reason: 'Inclui sem XP',
    })
    expect(pending!.status).toBe('capturing')
    const first = await repo.advanceCapture(
      pending!.id,
      pending!.captureStage,
      pending!.captureCursor,
    )
    expect(first!.captureCursor).toBe(subject.userId)
    expect(
      await repo.advanceCapture(pending!.id, pending!.captureStage, pending!.captureCursor),
    ).toBeNull()
    const captured = await capture(first!)
    const progress = await repo.advancePreparation(captured.id, null)
    if (progress.status !== 'advanced') throw new Error('Expected profile without XP in baseline')
    expect(progress.preparation).toMatchObject({ processed: 1, status: 'ready' })
  })

  test('admission captures owner before lock wait and cannot resurrect after purge', async () => {
    const first = owner(),
      second = owner()
    const input = { ...first }
    await withHeldLock(`members-account:${first.accountId}`, async (release) => {
      const pending = repo.initializeProfile(input)
      await waitForBlockedAdvisory()
      Object.assign(input, second)
      release()
      expect((await pending)!.version).toBe(1)
    })
    const [count] =
      await conn.sql`select count(*)::int as value from members.kids_journey_earned where user_id=${second.userId}`
    expect(count!.value).toBe(0)
    await purge(first)
    expect(await repo.initializeProfile(first)).toBeNull()
  })

  test('bootstrap owner conflict and oversized batch fail without advancing the capture cursor', async () => {
    await conn.sql`truncate members.kids_journey_policy, members.kids_journey_preparations, members.kids_journey_revisions cascade`
    await repo.initializeSeed()
    const prep = (await repo.createSeedPreparation())!
    const subject = owner()
    await profile(subject, false)
    await refusal(() => repo.appendSeedOwners(prep.id, [{ ...subject, accountId: randomUUID() }]))
    await refusal(() => repo.appendSeedOwners(prep.id, Array.from({ length: 201 }, owner)))
    expect((await repo.getPreparation(prep.id))!.captureCursor).toBeNull()
  })

  test('bootstrap Auth owner qualifies historical XP without a gamification or earned row', async () => {
    await conn.sql`truncate members.kids_journey_policy, members.kids_journey_preparations, members.kids_journey_revisions cascade`
    await repo.initializeSeed()
    const initial = (await repo.createSeedPreparation())!
    const subject = owner(),
      courseId = randomUUID()
    expect(await repo.appendSeedOwners(initial.id, [subject])).toBe(true)
    await milestone(subject, courseId, 'course_complete')
    await milestone(subject, courseId, 'course_showcased')
    const sealed = (await repo.sealSeedOwners(initial.id))!
    const captured = await capture(sealed)
    const ready = await baseline(captured)
    expect(ready).toMatchObject({ status: 'ready', processed: 1 })
    expect((await publish(ready))!.version).toBe(1)
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toMatchObject(
      { level: 'coder', capabilities: ['studio', 'pinta'] },
    )
    const [profiles] =
      await conn.sql`select count(*)::int as value from members.gamification_profiles`
    expect(profiles!.value).toBe(0)
  })

  test('bootstrap rejects late Gamma or earned owner conflicts without advancing capture', async () => {
    await conn.sql`truncate members.kids_journey_policy, members.kids_journey_preparations, members.kids_journey_revisions cascade`
    await repo.initializeSeed()
    const initial = (await repo.createSeedPreparation())!
    const subject = owner(),
      wrongAccount = randomUUID()
    await repo.appendSeedOwners(initial.id, [subject])
    await profile({ ...subject, accountId: wrongAccount }, false)
    const sealed = (await repo.sealSeedOwners(initial.id))!
    await refusal(() => repo.advanceCapture(sealed.id, sealed.captureStage, sealed.captureCursor))
    expect((await repo.getPreparation(initial.id))!.captureCursor).toBeNull()
    await conn.sql`delete from members.gamification_profiles where user_id=${subject.userId}`
    await conn.sql`insert into members.kids_journey_earned(user_id,account_id,level,capabilities,policy_version,updated_at)
      values (${subject.userId},${wrongAccount},'noob','[]'::jsonb,0,now())`
    await refusal(() => repo.advanceCapture(sealed.id, sealed.captureStage, sealed.captureCursor))
    expect((await repo.getPreparation(initial.id))!.captureCursor).toBeNull()
  })

  test('course-access union is monotonic across stale writers and rejects expanded without entry', async () => {
    const subject = owner()
    const first = {
      level: 'noob' as const,
      capabilities: [],
      courseAccess: {
        entry: ['iniciante-2d'] as const,
        expanded: ['iniciante-2d'] as const,
        reward: [],
      },
    }
    const second = {
      level: 'noob' as const,
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: ['avancado-3d'] as const },
    }
    expect(
      await Promise.all([
        repo.freezeEarned(subject, 1, first),
        repo.freezeEarned(subject, 1, second),
      ]),
    ).toEqual(['frozen', 'frozen'])
    const earned = (await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned
    expect(earned.courseAccess).toEqual({
      entry: ['iniciante-2d'],
      expanded: ['iniciante-2d'],
      reward: ['avancado-3d'],
    })
    await refusal(() =>
      repo.freezeEarned(subject, 1, {
        ...first,
        courseAccess: { ...first.courseAccess, entry: [] },
      }),
    )
  })

  test('V1 profile offline during liberal V2 keeps all course rights after restrictive V3', async () => {
    const foundationId = randomUUID(),
      extraId = randomUUID()
    await conn.sql`insert into members.courses(id,slug,title,audience,level,track,career_slot,journey_role,status,created_at,updated_at)
      values (${foundationId},${foundationId},'Base','kids','iniciante','2d',1,'positioned','published',now(),now()),
      (${extraId},${extraId},'Alternativa','kids','primeiros-passos','2d',null,'extra','published',now(),now())`
    const subject = owner()
    await repo.initializeProfile(subject)
    const old = (await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned
    expect(old.courseAccess.entry).not.toContain('iniciante-2d')
    expect(old.courseAccess.expanded).not.toContain('iniciante-2d')
    expect(old.courseAccess.reward).not.toContain('iniciante-2d')
    const seed = initialKidsJourneyPolicy()
    const liberal: KidsJourneyPolicy = {
      ...seed,
      steps: seed.steps.map((step) => ({
        ...step,
        requirements: [{ kind: 'course', courseId: extraId, milestone: 'complete' }],
      })),
      tierAccess: seed.tierAccess.map((rule) =>
        rule.tier === 'iniciante-2d'
          ? {
              ...rule,
              opensAt: 'noob',
              completedAt: 'noob',
              foundation: { slot: 1, milestone: 'complete', whenMissing: 'locked' },
            }
          : rule,
      ),
    }
    expect((await publish(await baseline(await prepare(1, liberal))))!.version).toBe(2)
    // No GET/reconciliation by this profile under V2; this read is deliberately read-only.
    expect((await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned).toEqual(old)
    const restrictive: KidsJourneyPolicy = {
      ...liberal,
      tierAccess: liberal.tierAccess.map((rule) =>
        rule.tier === 'iniciante-2d'
          ? {
              ...rule,
              opensAt: 'god',
              completedAt: 'god',
              foundation: { slot: 1, milestone: 'showcase', whenMissing: 'locked' },
            }
          : rule,
      ),
    }
    const ready = await baseline(await prepare(2, restrictive))
    const frozen = (await repo.readSnapshot([subject])).profiles.get(subject.userId)!.earned
    expect(frozen.level).toBe('noob')
    expect(frozen.capabilities).toEqual([])
    for (const tiers of Object.values(frozen.courseAccess)) expect(tiers).toContain('iniciante-2d')
    expect((await publish(ready))!.version).toBe(3)
    const snapshot = await repo.readSnapshot([subject])
    const base = snapshot.catalog.find((course) => course.id === foundationId)!
    for (const course of [
      base,
      { ...base, id: randomUUID(), slot: 2 },
      { ...base, id: randomUUID(), slot: null, journeyRole: 'reward' as const },
    ]) {
      expect(
        resolveKidsJourneyCourseLock({
          policy: snapshot.policy.policy,
          policyVersion: 3,
          milestones: [],
          earned: frozen,
          catalog: snapshot.catalog,
          course,
        }).locked,
      ).toBe(false)
    }
    const newcomer = owner()
    await repo.initializeProfile(newcomer)
    const newEarned = (await repo.readSnapshot([newcomer])).profiles.get(newcomer.userId)!.earned
    for (const tiers of Object.values(newEarned.courseAccess))
      expect(tiers).not.toContain('iniciante-2d')
  })

  test('the QA harness refuses reuse while a client is connected', async () => {
    await refusal(() => openKidsJourneyTestDatabase(target!))
    expect((await conn.sql`select 1 as alive`)[0]!.alive).toBe(1)
  })
})
