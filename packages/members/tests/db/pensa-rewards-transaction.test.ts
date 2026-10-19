import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzlePensaRewardsRepository } from '../../src/infrastructure/persistence/drizzle/pensa-rewards.repository'
import { pensaExecutionEvents } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { silentLogger } from '../fakes/in-memory'
import {
  kidsJourneyTestTarget,
  OwnedKidsJourneyTestWork,
  openKidsJourneyTestDatabase,
} from './kids-journey-database'

// CI already supplies this guarded URL. Keep the transactional outbox tests in their own database.
const base = process.env.KIDS_JOURNEY_TEST_DATABASE_URL
const target = base ? kidsJourneyTestTarget(base) : null
if (target) {
  target.pathname += '_pensa_rewards'
  if (target.pathname.length > 64)
    throw new Error('Pensa reward QA database name exceeds PostgreSQL limit')
}
const now = new Date('2026-10-19T12:00:00Z')

describe.skipIf(!target)('Pensa outbox and awards share one PostgreSQL transaction', () => {
  let conn: DbConnection
  const owned = new OwnedKidsJourneyTestWork()
  type Transaction = Parameters<Parameters<DbConnection['db']['transaction']>[0]>[0]
  type Input = Parameters<DrizzleGamificationRepository['award']>[0]
  const rewards = (
    around?: (
      tx: Transaction,
      input: Input,
      award: () => Promise<Awaited<ReturnType<DrizzleGamificationRepository['award']>>>,
    ) => ReturnType<DrizzleGamificationRepository['award']>,
  ) => {
    const repo = new DrizzleGamificationRepository(conn.db)
    return new DrizzlePensaRewardsRepository(
      conn.db,
      (tx) =>
        new AwardGamificationService(
          {
            award: (input) =>
              around
                ? around(tx, input, () => repo.awardInTransaction(tx, input))
                : repo.awardInTransaction(tx, input),
          },
          () => now,
          silentLogger,
        ),
    )
  }
  const pending = async (audience: 'kids' | 'adult' = 'kids') => {
    const event = { id: randomUUID(), profileId: randomUUID(), accountId: randomUUID() }
    await conn.db.insert(pensaExecutionEvents).values({
      ...event,
      projectId: null,
      projectKey: randomUUID(),
      requestId: randomUUID(),
      requestHash: 'a'.repeat(64),
      kind: 'pensa_stage_complete',
      data: {},
      reward: { audience, xp: 10, coins: 5, privileged: false, sourceType: 'pensa_stage_complete' },
      rewardStatus: 'pending',
      createdAt: now,
    })
    return event
  }
  const state = async (event: Awaited<ReturnType<typeof pending>>) => {
    const [row] = await conn.sql`select
      (select count(*)::int from members.xp_events where user_id=${event.profileId}) as ledger,
      (select count(*)::int from members.coin_events where user_id=${event.profileId}) as coins,
      (select count(*)::int from members.gamification_profiles where user_id=${event.profileId}) as profiles,
      (select coin_balance from members.gamification_profiles where user_id=${event.profileId}) as balance,
      (select reward_status from members.pensa_execution_events where id=${event.id}) as status`
    return row
  }
  beforeAll(
    () =>
      owned.track(async () => {
        conn = await openKidsJourneyTestDatabase(target!.toString())
        const [row] =
          await conn.sql`select count(*)::int as pending from members.pensa_execution_events where reward_status='pending'`
        if (row?.pending)
          throw new Error('Unfinished Pensa rewards exist; select a fresh owned QA database')
      }),
    60_000,
  )
  afterAll(async () => {
    await owned.drain()
    await conn?.close()
  })

  for (const audience of ['kids', 'adult'] as const) {
    test(`${audience}: delivers once without a second connection waiting on its own account lock`, () =>
      owned.track(async () => {
        const event = await pending(audience)
        expect(await rewards().work()).toEqual({ completed: 1, failed: 0 })
        expect(await state(event)).toEqual({
          ledger: 1,
          coins: 1,
          profiles: 1,
          balance: 5,
          status: 'completed',
        })
        expect(await rewards().work()).toEqual({ completed: 0, failed: 0 })
        expect(await state(event)).toEqual({
          ledger: 1,
          coins: 1,
          profiles: 1,
          balance: 5,
          status: 'completed',
        })
      }))
  }

  test('fail-open null after a real award rolls back all writes; retry pays once', () =>
    owned.track(async () => {
      const event = await pending()
      expect(
        await rewards(async (_tx, _input, award) => {
          await award()
          throw new Error('Injected non-SQL failure after ledger writes')
        }).work(),
      ).toEqual({ completed: 0, failed: 1 })
      expect(await state(event)).toEqual({
        ledger: 0,
        coins: 0,
        profiles: 0,
        balance: null,
        status: 'pending',
      })
      expect(await rewards().work()).toEqual({ completed: 1, failed: 0 })
      expect(await state(event)).toEqual({
        ledger: 1,
        coins: 1,
        profiles: 1,
        balance: 5,
        status: 'completed',
      })
      expect(await rewards().work()).toEqual({ completed: 0, failed: 0 })
    }))

  test('SQL failure inside award returns fail-open null but rolls back the aborted transaction', () =>
    owned.track(async () => {
      const event = await pending()
      expect(
        await rewards(async (tx, _input, award) => {
          const result = await award()
          await tx.execute(sql`select 1 / 0`)
          return result
        }).work(),
      ).toEqual({ completed: 0, failed: 1 })
      expect(await state(event)).toEqual({
        ledger: 0,
        coins: 0,
        profiles: 0,
        balance: null,
        status: 'pending',
      })
      expect(await rewards().work()).toEqual({ completed: 1, failed: 0 })
      expect(await state(event)).toEqual({
        ledger: 1,
        coins: 1,
        profiles: 1,
        balance: 5,
        status: 'completed',
      })
      expect(await rewards().work()).toEqual({ completed: 0, failed: 0 })
    }))

  test('SQL failure marking the outbox completed rolls back award and remains retryable', () =>
    owned.track(async () => {
      const event = await pending()
      const name = `qa_pensa_${event.id.replaceAll('-', '')}`
      await conn.sql.unsafe(`create function members.${name}() returns trigger language plpgsql as $$ begin
      if NEW.id='${event.id}'::uuid and NEW.reward_status='completed' then raise exception 'QA outbox failure'; end if;
      return NEW; end $$`)
      try {
        await conn.sql.unsafe(
          `create trigger ${name} before update on members.pensa_execution_events for each row execute function members.${name}()`,
        )
        let failure: unknown
        try {
          await rewards().work()
        } catch (error) {
          failure = error
        }
        expect(failure).toBeInstanceOf(Error)
        expect((failure as Error & { cause: Error }).cause.message).toContain('QA outbox failure')
        expect(await state(event)).toEqual({
          ledger: 0,
          coins: 0,
          profiles: 0,
          balance: null,
          status: 'pending',
        })
      } finally {
        await conn.sql.unsafe(`drop trigger if exists ${name} on members.pensa_execution_events`)
        await conn.sql.unsafe(`drop function members.${name}()`)
      }
      expect(await rewards().work()).toEqual({ completed: 1, failed: 0 })
      expect(await state(event)).toEqual({
        ledger: 1,
        coins: 1,
        profiles: 1,
        balance: 5,
        status: 'completed',
      })
      expect(await rewards().work()).toEqual({ completed: 0, failed: 0 })
    }))

  test('purge waits for award/outbox commit; retry after the fence cannot recreate data', () =>
    owned.track(async () => {
      const event = await pending()
      let release!: () => void, reached!: () => void
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      const inserted = new Promise<void>((resolve) => {
        reached = resolve
      })
      const work = rewards(async (_tx, _input, award) => {
        const result = await award()
        reached()
        await held
        return result
      }).work()
      const tasks: Promise<unknown>[] = [work]
      // This timer only releases this test's barrier on failure; it never cancels another backend.
      const safety = setTimeout(release, 2000)
      try {
        await Promise.race([
          inserted,
          work.then(() => {
            throw new Error('Reward finished before reaching the post-award barrier')
          }),
        ])
        const purge = new DrizzleUserDataPurgeRepository(conn.db).purgeForUser({
          userIds: [event.profileId],
          accountId: event.accountId,
          cleanup: {
            id: randomUUID(),
            prefixes: [`creations/${event.profileId}/`],
            notBefore: now,
            createdAt: now,
          },
        })
        tasks.push(purge)
        let waiting = false
        const key = `members-account:${event.accountId}`
        const deadline = Date.now() + 1500
        while (!waiting && Date.now() < deadline) {
          const [row] =
            await conn.sql`select exists(select 1 from pg_locks where locktype='advisory' and not granted
          and classid::bigint=((hashtextextended(${key},0)>>32)&4294967295)
          and objid::bigint=(hashtextextended(${key},0)&4294967295) and objsubid=1) as waiting`
          waiting = row?.waiting === true
          if (!waiting) await Bun.sleep(5)
        }
        expect(waiting).toBe(true)
        release()
        expect(await work).toEqual({ completed: 1, failed: 0 })
        await purge
        expect(await state(event)).toEqual({
          ledger: 0,
          coins: 0,
          profiles: 0,
          balance: null,
          status: null,
        })
        expect(await rewards().work()).toEqual({ completed: 0, failed: 0 })
        // Replay the actual award after deletion, not only an empty outbox poll.
        const replay = await new AwardGamificationService(
          new DrizzleGamificationRepository(conn.db),
          () => now,
          silentLogger,
        ).awardPensaMilestone({
          userId: event.profileId,
          accountId: event.accountId,
          eventId: event.id,
          audience: 'kids',
          projectCompleted: false,
          xp: 10,
          coins: 5,
          privileged: false,
        })
        expect(replay?.xpAwarded).toBe(0)
        expect(replay?.coinsAwarded).toBe(0)
        expect(await state(event)).toEqual({
          ledger: 0,
          coins: 0,
          profiles: 0,
          balance: null,
          status: null,
        })
      } finally {
        clearTimeout(safety)
        release()
        await Promise.allSettled(tasks)
      }
    }))
})
