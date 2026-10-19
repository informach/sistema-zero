import { afterAll, beforeAll, test as bunTest, describe, expect } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { UpdateProfileDetailsService } from '../../src/application/profiles/update-profile.service'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import { ProfileNotFoundError } from '../../src/domain/profile/profile.errors'
import { ParentReauthenticationRequiredError } from '../../src/domain/study-access/errors'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import type { Database, DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleProfileCohortRepository } from '../../src/infrastructure/persistence/drizzle/profile-cohort.repository'
import { DrizzleProfileRepository } from '../../src/infrastructure/persistence/drizzle/profile.repository'
import { DrizzleProfileAdmissionRepository } from '../../src/infrastructure/persistence/drizzle/profile-admission.repository'
import {
  profileAdmissions,
  profiles,
  profileVoiceInputEvents,
  users,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserRepository } from '../../src/infrastructure/persistence/drizzle/user.repository'
import {
  OwnedProfileAdmissionTestWork,
  openProfileAdmissionTestDatabase,
  profileAdmissionTestTarget,
} from './profile-admission-database'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
const target = process.env.PROFILE_ADMISSION_TEST_DATABASE_URL
if (target !== undefined) profileAdmissionTestTarget(target)
const now = new Date('2026-10-18T12:00:00Z')

describe.skipIf(!target)('Auth profile admission / real migrations and stale writes', () => {
  let conn: DbConnection
  let repository: DrizzleProfileRepository
  let admissions: DrizzleProfileAdmissionRepository
  let accounts: DrizzleUserRepository
  let legacy: { users: (typeof users.$inferSelect)[]; profiles: (typeof profiles.$inferSelect)[] }
  const legacyAccount = randomUUID()
  const legacyActive = randomUUID()
  const legacyArchived = randomUUID()
  const owned = new OwnedProfileAdmissionTestWork()
  const test = (name: string, run: () => Promise<void>) => bunTest(name, () => owned.track(run))

  beforeAll(
    () =>
      owned.track(async () => {
        conn = await openProfileAdmissionTestDatabase(target!, async (db) => {
          await db.sql`insert into auth.users(id,email,password_hash,first_name,last_name,role,status,created_at,updated_at)
        values(${legacyAccount},'legacy-admission@example.test','unused','Responsavel','Teste','customer','active',${now.toISOString()},${now.toISOString()})`
          await db.sql`insert into auth.profiles(id,account_user_id,name,status,sort_order,created_at,updated_at)
        values(${legacyActive},${legacyAccount},'Antes ativo','active',0,${now.toISOString()},${now.toISOString()}),
        (${legacyArchived},${legacyAccount},'Antes arquivado','archived',1,${now.toISOString()},${now.toISOString()})`
        })
        repository = new DrizzleProfileRepository(conn.db)
        admissions = new DrizzleProfileAdmissionRepository(conn.db)
        accounts = new DrizzleUserRepository(conn.db)
        legacy = {
          users: await conn.db.select().from(users),
          profiles: await conn.db.select().from(profiles),
        }
      }),
    60_000,
  )
  // Each case owns a new account/profile UUID; no per-case TRUNCATE or shared row reset.
  afterAll(async () => {
    await owned.drain()
    await conn?.close()
  })

  async function pending(ready = false, voice = false) {
    const account = UserAggregate.register({
      id: randomUUID(),
      email: Email.create(`${randomUUID()}@example.test`),
      passwordHash: 'unused',
      firstName: 'Parent',
      lastName: 'Test',
    })
    await accounts.create(account)
    const profile = ProfileAggregate.create({
      id: randomUUID(),
      accountUserId: account.id,
      name: 'Sofia',
      birthDate: '2015-04-10',
      now,
    })
    profile.setPublicProfileEnabled(true, now)
    if (voice) profile.setVoiceInputEnabled(true, { kind: 'parent' }, now)
    const requestId = randomUUID()
    const created = await repository.createWithinLimit(profile, 1, {
      requestId,
      requestHash: 'a'.repeat(64),
    })
    if (created.outcome !== 'created') throw new Error('Fixture profile was not created')
    if (ready) {
      const job = await admissions.claimProfile(
        profile.id,
        account.id,
        now,
        new Date(now.getTime() + 30_000),
      )
      if (!job || (await admissions.complete(job, now)) !== 'ready')
        throw new Error('Fixture profile was not admitted')
    }
    return { profile, account, requestId }
  }

  async function waitForBlocked() {
    const deadline = Date.now() + 2_000
    do {
      const [state] =
        await conn.sql`select exists(select 1 from pg_stat_activity where datname=current_database() and wait_event_type='Lock') as blocked`
      if (state!.blocked) return
    } while (Date.now() < deadline)
    throw new Error('Expected the profile writer to block on the held row')
  }

  function holdTransaction(
    lock: (tx: Transaction) => Promise<unknown>,
    mutate: (tx: Transaction) => Promise<void> = async () => {},
  ) {
    let locked!: () => void, rejectLock!: (error: unknown) => void, release!: () => void
    const acquired = new Promise<void>((resolve, reject) => {
      locked = resolve
      rejectLock = reject
    })
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    const done = conn.db.transaction(async (tx) => {
      await lock(tx)
      locked()
      await released
      await mutate(tx)
    })
    // Observe failures immediately, including an error before the barrier was acquired.
    void done.catch(rejectLock)
    return { acquired, done, release }
  }

  async function afterConcurrentMutation(
    profileId: string,
    invoke: () => Promise<unknown>,
    mutate: (tx: Transaction) => Promise<void>,
  ) {
    const held = holdTransaction(
      (tx) =>
        tx
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.id, profileId))
          .for('update'),
      mutate,
    )
    let observed: Promise<{ value: unknown; error: unknown }> | undefined
    try {
      await held.acquired
      observed = invoke().then(
        (value) => ({ value, error: null }),
        (error: unknown) => ({ value: null, error }),
      )
      await waitForBlocked()
      held.release()
      await held.done
      return await observed
    } finally {
      held.release()
      await Promise.allSettled([held.done, ...(observed ? [observed] : [])])
    }
  }

  async function archive(tx: Transaction, profileId: string) {
    await tx
      .update(profiles)
      .set({ status: 'archived', updatedAt: now })
      .where(eq(profiles.id, profileId))
    const [job] = await tx
      .select()
      .from(profileAdmissions)
      .where(eq(profileAdmissions.profileId, profileId))
    if (job?.status === 'pending')
      await tx
        .update(profileAdmissions)
        .set({ status: 'cancelled', completedAt: now, leaseId: null, leaseUntil: null })
        .where(eq(profileAdmissions.profileId, profileId))
  }

  test('generated expand preserves active/archived ready rows; future default is pending', async () => {
    expect(legacy.profiles.map((profile) => [profile.id, profile.admissionState]).sort()).toEqual(
      [
        [legacyActive, 'ready'],
        [legacyArchived, 'ready'],
      ].sort(),
    )
    const account = legacy.users[0]!
    const [created] = await conn.db
      .insert(profiles)
      .values({
        id: randomUUID(),
        accountUserId: account.id,
        name: 'Futuro',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    expect(created!.admissionState).toBe('pending')
    expect(await repository.listActiveByIds([created!.id])).toEqual([])
  })

  for (const ready of [false, true])
    for (const voice of [false, true]) {
      test(`stale ${voice ? 'voice' : 'details'} cannot reopen archived ${ready ? 'ready' : 'pending'} profile`, async () => {
        const f = await pending(ready, voice)
        const edit = new UpdateProfileDetailsService(repository, () => now)
        const result = await afterConcurrentMutation(
          f.profile.id,
          () =>
            edit.execute({
              accountUserId: f.account.id,
              profileId: f.profile.id,
              name: 'Sofia Nova',
              ...(voice ? { voiceInputEnabled: false } : {}),
            }),
          (tx) => archive(tx, f.profile.id),
        )
        expect(result.error).toBeInstanceOf(ProfileNotFoundError)
        const current = await repository.findById(f.profile.id)
        expect(current!.isArchived).toBe(true)
        const [job] = await conn.db
          .select()
          .from(profileAdmissions)
          .where(eq(profileAdmissions.profileId, f.profile.id))
        expect(job!.status).toBe(ready ? 'completed' : 'cancelled')
      })
    }

  test('a stale name edit preserves public opt-out and the newer birth date', async () => {
    const f = await pending(true)
    const edit = new UpdateProfileDetailsService(repository, () => now)
    const result = await afterConcurrentMutation(
      f.profile.id,
      () =>
        edit.execute({
          accountUserId: f.account.id,
          profileId: f.profile.id,
          name: 'Sofia Nova',
          parentAuthRecent: false,
        }),
      async (tx) => {
        await tx
          .update(profiles)
          .set({ publicProfileEnabled: false, birthDate: '2015-05-20' })
          .where(eq(profiles.id, f.profile.id))
      },
    )
    expect(result.error).toBeNull()
    const current = await repository.findById(f.profile.id)
    expect(current!.name).toBe('Sofia Nova')
    expect(current!.publicProfileEnabled).toBe(false)
    expect(current!.birthDate).toBe('2015-05-20')
  })

  test('sensitive fields revalidate authorization against the locked current state', async () => {
    const f = await pending(true)
    const edit = new UpdateProfileDetailsService(repository, () => now)
    const result = await afterConcurrentMutation(
      f.profile.id,
      () =>
        edit.execute({
          accountUserId: f.account.id,
          profileId: f.profile.id,
          name: 'Sofia Nova',
          publicProfileEnabled: true,
          birthDate: '2015-04-10',
          parentAuthRecent: false,
        }),
      async (tx) => {
        await tx
          .update(profiles)
          .set({ publicProfileEnabled: false, birthDate: '2015-05-20' })
          .where(eq(profiles.id, f.profile.id))
      },
    )
    expect(result.error).toBeInstanceOf(ParentReauthenticationRequiredError)
    const current = await repository.findById(f.profile.id)
    expect(current!.publicProfileEnabled).toBe(false)
    expect(current!.birthDate).toBe('2015-05-20')
  })

  test('an old pending read cannot overwrite a completed admission', async () => {
    const f = await pending()
    const edit = new UpdateProfileDetailsService(repository, () => now)
    const result = await afterConcurrentMutation(
      f.profile.id,
      () =>
        edit.execute({ accountUserId: f.account.id, profileId: f.profile.id, name: 'Sofia Nova' }),
      async (tx) => {
        await tx
          .update(profiles)
          .set({ admissionState: 'ready' })
          .where(eq(profiles.id, f.profile.id))
        await tx
          .update(profileAdmissions)
          .set({ status: 'completed', completedAt: now, leaseId: null, leaseUntil: null })
          .where(eq(profileAdmissions.profileId, f.profile.id))
      },
    )
    expect(result.error).toBeNull()
    expect((await repository.findById(f.profile.id))!.admissionState).toBe('ready')
  })

  test('a name-only write preserves voice revocation, timestamp and the single consent event', async () => {
    const f = await pending(true, true)
    const edit = new UpdateProfileDetailsService(repository, () => now)
    const result = await afterConcurrentMutation(
      f.profile.id,
      () =>
        edit.execute({ accountUserId: f.account.id, profileId: f.profile.id, name: 'Sofia Nova' }),
      async (tx) => {
        await tx
          .update(profiles)
          .set({ voiceInputEnabled: false, voiceInputEnabledAt: null })
          .where(eq(profiles.id, f.profile.id))
        await tx.insert(profileVoiceInputEvents).values({
          profileId: f.profile.id,
          accountUserId: f.account.id,
          enabled: false,
          actor: 'parent',
          impersonatorId: null,
          createdAt: now,
        })
      },
    )
    expect(result.error).toBeNull()
    const current = await repository.findById(f.profile.id)
    expect(current!.voiceInputEnabled).toBe(false)
    expect(current!.toSnapshot().voiceInputEnabledAt).toBeNull()
    const events = await conn.db
      .select()
      .from(profileVoiceInputEvents)
      .where(eq(profileVoiceInputEvents.profileId, f.profile.id))
    expect(events).toHaveLength(2)
  })

  test('reclaimed lease rejects the old ACK; the current lease alone may become ready', async () => {
    const f = await pending()
    const first = await admissions.claimProfile(
      f.profile.id,
      f.account.id,
      now,
      new Date(now.getTime() + 1_000),
    )
    const later = new Date(now.getTime() + 2_000)
    const second = await admissions.claimProfile(
      f.profile.id,
      f.account.id,
      later,
      new Date(later.getTime() + 1_000),
    )
    expect(second!.leaseId).not.toBe(first!.leaseId)
    expect(await admissions.complete(first!, later)).toBe('lost')
    expect((await repository.findById(f.profile.id))!.admissionState).toBe('pending')
    expect(await admissions.complete(second!, later)).toBe('ready')
  })

  test('request replay keeps one profile/job/consent at a full quota; a changed hash conflicts', async () => {
    const f = await pending(false, true)
    const request = { requestId: f.requestId, requestHash: 'a'.repeat(64) }
    const replay = await repository.createWithinLimit(f.profile, 1, request)
    expect(replay.outcome).toBe('reused')
    if (replay.outcome !== 'reused') throw new Error('Expected the original profile')
    expect(replay.profile.id).toBe(f.profile.id)
    expect(
      (
        await repository.createWithinLimit(f.profile, 1, {
          ...request,
          requestHash: 'b'.repeat(64),
        })
      ).outcome,
    ).toBe('request_conflict')
    expect(await repository.listForParent(f.account.id)).toHaveLength(1)
    expect(
      await conn.db
        .select()
        .from(profileAdmissions)
        .where(eq(profileAdmissions.accountUserId, f.account.id)),
    ).toHaveLength(1)
    expect(
      await conn.db
        .select()
        .from(profileVoiceInputEvents)
        .where(eq(profileVoiceInputEvents.profileId, f.profile.id)),
    ).toHaveLength(1)
  })

  test('concurrent creates share the quota lock and persist only the winning job/consent', async () => {
    const account = UserAggregate.register({
      id: randomUUID(),
      email: Email.create(`${randomUUID()}@example.test`),
      passwordHash: 'unused',
      firstName: 'Parent',
      lastName: 'Test',
    })
    await accounts.create(account)
    const candidates = ['Alice', 'Bianca'].map((name) => {
      const profile = ProfileAggregate.create({
        id: randomUUID(),
        accountUserId: account.id,
        name,
        now,
      })
      profile.setVoiceInputEnabled(true, { kind: 'parent' }, now)
      return profile
    })
    const outcomes = await Promise.all(
      candidates.map((profile) =>
        repository.createWithinLimit(profile, 1, {
          requestId: randomUUID(),
          requestHash: 'a'.repeat(64),
        }),
      ),
    )
    expect(outcomes.map((outcome) => outcome.outcome).sort()).toEqual(['created', 'limit_reached'])
    expect(await repository.listForParent(account.id)).toHaveLength(1)
    expect(
      await conn.db
        .select()
        .from(profileAdmissions)
        .where(eq(profileAdmissions.accountUserId, account.id)),
    ).toHaveLength(1)
    expect(
      await conn.db
        .select()
        .from(profileVoiceInputEvents)
        .where(eq(profileVoiceInputEvents.accountUserId, account.id)),
    ).toHaveLength(1)
  })

  test('archiveOwned cancels the pending job and later edits/ACK cannot restore the profile', async () => {
    const f = await pending()
    const job = await admissions.claimProfile(
      f.profile.id,
      f.account.id,
      now,
      new Date(now.getTime() + 30_000),
    )
    expect(
      await repository.archiveOwned({ profileId: f.profile.id, accountUserId: f.account.id }, now),
    ).toBe(true)
    expect(await admissions.complete(job!, now)).toBe('lost')
    const edit = new UpdateProfileDetailsService(repository, () => now)
    await expect(
      edit.execute({ accountUserId: f.account.id, profileId: f.profile.id, name: 'Outra Sofia' }),
    ).rejects.toBeInstanceOf(ProfileNotFoundError)
    const [jobRow] = await conn.db
      .select()
      .from(profileAdmissions)
      .where(eq(profileAdmissions.profileId, f.profile.id))
    expect(jobRow!.status).toBe('cancelled')
    expect((await repository.findById(f.profile.id))!.isArchived).toBe(true)
  })

  test('account deletion preparation between initialization and ACK prevents ready and physical purge removes the job', async () => {
    const f = await pending(false, true)
    const job = await admissions.claimProfile(
      f.profile.id,
      f.account.id,
      now,
      new Date(now.getTime() + 30_000),
    )
    expect((await accounts.prepareDeletion(f.account.id))!.profileIds).toEqual([f.profile.id])
    expect(await admissions.complete(job!, now)).toBe('cancelled')
    expect((await repository.findById(f.profile.id))!.admissionState).toBe('pending')
    expect(
      await repository.editDetails({ profileId: f.profile.id, accountUserId: f.account.id }, () => {
        throw new Error('Inactive account must not reach authorization')
      }),
    ).toBeNull()
    await accounts.deleteById(f.account.id)
    expect(await repository.findById(f.profile.id)).toBeNull()
    expect(await admissions.complete(job!, now)).toBe('lost')
    expect(
      await conn.db
        .select()
        .from(profileAdmissions)
        .where(eq(profileAdmissions.profileId, f.profile.id)),
    ).toHaveLength(0)
    expect(
      await conn.db
        .select()
        .from(profileVoiceInputEvents)
        .where(eq(profileVoiceInputEvents.profileId, f.profile.id)),
    ).toHaveLength(0)
  })

  test('an owned edit captures owner identity before the row lock waits', async () => {
    const a = await pending()
    const b = await pending()
    const owner = { profileId: a.profile.id, accountUserId: a.account.id }
    const result = await afterConcurrentMutation(
      a.profile.id,
      () =>
        repository.editDetails(owner, () => ({
          changes: { name: 'Alice Atualizada' },
          voiceActor: { kind: 'parent' },
          now,
        })),
      async () => {
        owner.profileId = b.profile.id
        owner.accountUserId = b.account.id
      },
    )
    expect(result.error).toBeNull()
    expect((await repository.findById(a.profile.id))!.name).toBe('Alice Atualizada')
    expect((await repository.findById(b.profile.id))!.name).toBe('Sofia')
  })

  test('the application captures requested fields before awaiting a fresh authorization decision', async () => {
    const f = await pending()
    const cmd = {
      profileId: f.profile.id,
      accountUserId: f.account.id,
      name: 'Nome Capturado',
      publicProfileEnabled: false,
    }
    const edit = new UpdateProfileDetailsService(repository, () => now)
    const result = await afterConcurrentMutation(
      f.profile.id,
      () => edit.execute(cmd),
      async () => {
        cmd.name = 'Nome Mutado'
        cmd.publicProfileEnabled = true
      },
    )
    expect(result.error).toBeNull()
    expect((await repository.findById(f.profile.id))!.name).toBe('Nome Capturado')
    expect((await repository.findById(f.profile.id))!.publicProfileEnabled).toBe(false)
  })

  test('a job held by another transaction is skipped without taking profile/account locks', async () => {
    const f = await pending()
    const held = holdTransaction((tx) =>
      tx
        .select()
        .from(profileAdmissions)
        .where(eq(profileAdmissions.profileId, f.profile.id))
        .for('update'),
    )
    try {
      await held.acquired
      expect(
        await admissions.claimProfile(
          f.profile.id,
          f.account.id,
          now,
          new Date(now.getTime() + 30_000),
        ),
      ).toBeNull()
    } finally {
      held.release()
      await held.done
    }
    expect(
      await admissions.claimProfile(
        f.profile.id,
        f.account.id,
        now,
        new Date(now.getTime() + 30_000),
      ),
    ).not.toBeNull()
  })

  test('the real Auth cohort includes archived/ready and blocked-account pending profiles without XP', async () => {
    const f = await pending()
    await accounts.prepareDeletion(f.account.id)
    const page = await new DrizzleProfileCohortRepository(conn.db).readPage({ kind: 'start', limit: 200 })
    expect(page.done).toBe(true)
    expect(page.owners).toContainEqual({ profileId: legacyActive, accountUserId: legacyAccount })
    expect(page.owners).toContainEqual({ profileId: legacyArchived, accountUserId: legacyAccount })
    expect(page.owners).toContainEqual({ profileId: f.profile.id, accountUserId: f.account.id })
    expect(page.owners.every((owner) => Object.keys(owner).sort().join(',') === 'accountUserId,profileId')).toBe(true)
  })

  test('UUID pages are work bounds, and late profiles behind the cursor remain pending and unselectable', async () => {
    const f = await pending()
    const cohort = new DrizzleProfileCohortRepository(conn.db)
    const start = await cohort.readPage({ kind: 'start', limit: 1 })
    const above = ProfileAggregate.create({ id: 'ffffffff-ffff-4fff-bfff-ffffffffffff', accountUserId: f.account.id, name: 'Depois do limite', now })
    const behind = ProfileAggregate.create({ id: '00000000-0000-4000-8000-000000000000', accountUserId: f.account.id, name: 'Antes do cursor', now })
    expect(above.id > start.upperBound!).toBe(true)
    expect(behind.id < start.cursor!).toBe(true)
    for (const candidate of [above, behind]) {
      expect((await repository.createWithinLimit(candidate, 3, { requestId: randomUUID(), requestHash: 'a'.repeat(64) })).outcome).toBe('created')
    }
    const next = await cohort.readPage({ kind: 'continue', upperBound: start.upperBound!, cursor: start.cursor, limit: 200 })
    expect(next.upperBound).toBe(start.upperBound)
    expect(next.owners.some((owner) => owner.profileId === above.id || owner.profileId === behind.id)).toBe(false)
    expect(await repository.listActiveByIds([above.id, behind.id])).toEqual([])
    expect((await repository.findById(behind.id))!.admissionState).toBe('pending')
    expect(await conn.db.select().from(profileAdmissions).where(eq(profileAdmissions.profileId, behind.id))).toHaveLength(1)
  })

})
