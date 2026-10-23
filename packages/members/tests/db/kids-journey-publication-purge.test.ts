import { afterAll, beforeAll, test as bunTest, describe, expect } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import { GetStudioUnlocksService } from '../../src/application/studio-unlocks/get-studio-unlocks.service'
import type { AwardInput } from '../../src/domain/ports/gamification-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { DrizzleStudioUnlockRepository } from '../../src/infrastructure/persistence/drizzle/studio-unlock.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { silentLogger } from '../fakes/in-memory'
import {
  kidsJourneyTestTarget,
  OwnedKidsJourneyTestWork,
  openKidsJourneyTestDatabase,
} from './kids-journey-database'

// A separate explicit target prevents this causal harness from sharing another suite's singleton.
const target = process.env.KIDS_JOURNEY_PUBLICATION_PURGE_TEST_DATABASE_URL
if (target !== undefined) kidsJourneyTestTarget(target)

describe.skipIf(!target)('merged Kids course award / earned / purge in PostgreSQL', () => {
  let conn: DbConnection
  let journey: DrizzleKidsJourneyRepository
  const ownedWork = new OwnedKidsJourneyTestWork()
  const courseId = randomUUID()
  const blockType = 'sz_js_var_create'

  beforeAll(
    () =>
      ownedWork.track(async () => {
        conn = await openKidsJourneyTestDatabase(target!)
        journey = new DrizzleKidsJourneyRepository(conn.db)
        const [existing] = await conn.sql`select (
          exists(select 1 from members.kids_journey_policy) or
          exists(select 1 from members.courses) or
          exists(select 1 from members.xp_events)
        ) as present`
        if (existing?.present) throw new Error('Use a fresh dedicated Kids award/purge QA database')
        const moduleId = randomUUID(),
          lessonId = randomUUID()
        await conn.sql`insert into members.courses
          (id,slug,title,audience,status,level,track,career_slot,journey_role,metadata,created_at,updated_at)
          values (${courseId},${courseId},'QA first course','kids','published','primeiros-passos','2d',1,
            'positioned',${JSON.stringify({ studioUnlockBlocks: [blockType] })}::jsonb,now(),now())`
        await conn.sql`insert into members.modules(id,course_id,title,created_at,updated_at)
          values (${moduleId},${courseId},'QA module',now(),now())`
        await conn.sql`insert into members.lessons
          (id,course_id,module_id,slug,title,is_published,created_at,updated_at)
          values (${lessonId},${courseId},${moduleId},${lessonId},'QA lesson',true,now(),now())`
        await conn.sql`insert into members.lesson_blocks(id,lesson_id,kind,sort_order,content)
          values (${randomUUID()},${lessonId},'studio',0,
            '{"kind":"studio","showcase":{"enabled":true}}'::jsonb)`

        // Real repository bootstrap, including capture and audit; never fabricate a published V1.
        await journey.initializeSeed()
        const initial = await journey.createSeedPreparation()
        if (!initial) throw new Error('Seed preparation missing')
        await journey.startSeedOwnerCapture(initial.id, null)
        let ready = await journey.sealSeedOwners(initial.id, null)
        if (!ready) throw new Error('Seed owner capture missing')
        for (let step = 0; ready.status === 'capturing' && step < 20; step++) {
          const next = await journey.advanceCapture(
            ready.id,
            ready.captureStage,
            ready.captureCursor,
          )
          if (!next) throw new Error('Seed capture conflicted')
          ready = next
        }
        if (ready.status !== 'ready' || !ready.cohortHash)
          throw new Error('Empty-cohort seed did not become ready')
        const published = await journey.publishPrepared({
          preparationId: ready.id,
          expectedVersion: ready.expectedVersion,
          draftHash: ready.draftHash,
          catalogHash: ready.catalogHash,
          cohortHash: ready.cohortHash,
          actor: { kind: 'system' },
        })
        if (published?.version !== 1) throw new Error('Seed publication failed')
      }),
    60_000,
  )

  afterAll(async () => {
    await ownedWork.drain()
    await conn?.close()
  })

  bunTest(
    'course ledger, curriculum grants and earned commit before purge; replay cannot resurrect any',
    () =>
      ownedWork.track(async () => {
        const owner = { userId: randomUUID(), accountId: randomUUID() }
        await journey.initializeProfile(owner)
        await conn.sql`insert into members.gamification_profiles
        (id,user_id,account_id,audience,created_at,updated_at)
        values (${randomUUID()},${owner.userId},${owner.accountId},'kids',now(),now())`
        const omittedGamma = randomUUID(),
          omittedEarned = randomUUID()
        const foreign = { userId: randomUUID(), accountId: randomUUID() }
        // Neither omitted profile is passed to purge. Each has a separate authoritative owner proof.
        await conn.sql`insert into members.gamification_profiles
          (id,user_id,account_id,audience,created_at,updated_at)
          values (${randomUUID()},${omittedGamma},${owner.accountId},'kids',now(),now()),
            (${randomUUID()},${foreign.userId},${foreign.accountId},'kids',now(),now())`
        await journey.initializeProfile({ userId: omittedEarned, accountId: owner.accountId })
        for (const userId of [omittedGamma, omittedEarned, foreign.userId])
          await conn.sql`insert into members.studio_block_grants
            (id,user_id,audience,course_id,blocks,granted_at)
            values (${randomUUID()},${userId},'kids',${courseId},${JSON.stringify([blockType])}::jsonb,now())`
        const grantScope = async () => {
          const [row] = await conn.sql`select
            (select count(*)::int from members.studio_block_grants where user_id=${owner.userId}) as explicit,
            (select count(*)::int from members.studio_block_grants where user_id=${omittedGamma}) as omitted_gamma,
            (select count(*)::int from members.studio_block_grants where user_id=${omittedEarned}) as omitted_earned,
            (select count(*)::int from members.studio_block_grants where user_id=${foreign.userId}) as foreign_account`
          return row!
        }
        const input: AwardInput = {
          ...owner,
          audience: 'kids',
          events: [
            { sourceType: 'course_complete', sourceId: courseId, amount: 0 },
            { sourceType: 'course_showcased', sourceId: courseId, amount: 0 },
          ],
          today: '2026-10-19',
          now: new Date('2026-10-19T12:00:00Z'),
          privileged: false,
        }
        const awardRepo = new DrizzleGamificationRepository(conn.db)
        const blocker = await conn.sql.reserve()
        const suffix = randomUUID().replaceAll('-', '')
        const awardKey = `qa-kids-award:${suffix}`,
          purgeKey = `qa-kids-purge:${suffix}`
        const awardTrigger = `kids_award_${suffix}`,
          purgeTrigger = `kids_purge_${suffix}`
        const work: Promise<unknown>[] = []
        const errors: unknown[] = []
        let awardHeld = false,
          purgeHeld = false
        const observed = async () => {
          const [counts] = await conn.sql`select
          (select count(*)::int from members.xp_events where user_id=${owner.userId}) as ledger,
          (select count(*)::int from members.studio_block_grants where user_id=${owner.userId}) as grants,
          (select count(*)::int from members.kids_journey_earned where user_id=${owner.userId}) as earned,
          (select count(*)::int from members.gamification_profiles where user_id=${owner.userId}) as profiles,
          (select count(*)::int from members.kids_journey_preparation_owners where user_id=${owner.userId}) as cohort`
          return counts!
        }
        const waitForLock = async (key: string) => {
          const deadline = Date.now() + 2000
          while (Date.now() < deadline) {
            const [row] = await conn.sql`select exists(select 1 from pg_locks
            where locktype='advisory' and not granted
            and classid::bigint=((hashtextextended(${key},0)>>32)&4294967295)
            and objid::bigint=(hashtextextended(${key},0)&4294967295) and objsubid=1) as waiting`
            if (row?.waiting) return
            await Bun.sleep(5)
          }
          throw new Error(`Owned PostgreSQL barrier not reached: ${key}`)
        }
        try {
          await blocker`select pg_advisory_lock(hashtextextended(${awardKey},0))`
          awardHeld = true
          await blocker`select pg_advisory_lock(hashtextextended(${purgeKey},0))`
          purgeHeld = true
          // AFTER INSERT proves the milestone statement reached PostgreSQL, before grants/reconcile.
          await conn.sql.unsafe(`CREATE FUNCTION members.${awardTrigger}() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN IF NEW.user_id='${owner.userId}'::uuid AND NEW.source_type='course_showcased'
          THEN PERFORM pg_advisory_xact_lock(hashtextextended('${awardKey}',0)); END IF; RETURN NEW; END $$`)
          await conn.sql.unsafe(`CREATE TRIGGER ${awardTrigger} AFTER INSERT ON members.xp_events
          FOR EACH ROW EXECUTE FUNCTION members.${awardTrigger}()`)
          // Pause purge before ledger deletion so a separate connection can inspect the committed award.
          await conn.sql.unsafe(`CREATE FUNCTION members.${purgeTrigger}() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN IF OLD.user_id='${owner.userId}'::uuid THEN
          PERFORM pg_advisory_xact_lock(hashtextextended('${purgeKey}',0)); END IF; RETURN OLD; END $$`)
          await conn.sql.unsafe(`CREATE TRIGGER ${purgeTrigger} BEFORE DELETE ON members.xp_events
          FOR EACH ROW EXECUTE FUNCTION members.${purgeTrigger}()`)

          const award = awardRepo.award(input)
          work.push(award)
          await waitForLock(awardKey)
          expect(await observed()).toMatchObject({ ledger: 0, grants: 0, earned: 1, profiles: 1 })
          expect(
            (await journey.readSnapshot([owner])).profiles.get(owner.userId)?.earned.level,
          ).toBe('noob')
          const purge = new DrizzleUserDataPurgeRepository(conn.db).purgeForUser({
            userIds: [owner.userId],
            accountId: owner.accountId,
            cleanup: { id: randomUUID(), prefixes: [], createdAt: input.now, notBefore: input.now },
          })
          work.push(purge)
          await waitForLock(`members-account:${owner.accountId}`)
          await blocker`select pg_advisory_unlock(hashtextextended(${awardKey},0))`
          awardHeld = false
          expect((await award).newEvents).toHaveLength(2)
          await waitForLock(purgeKey)
          expect(await observed()).toMatchObject({ ledger: 2, grants: 1, earned: 1, profiles: 1 })
          expect(await grantScope()).toEqual({
            explicit: 1,
            omitted_gamma: 1,
            omitted_earned: 1,
            foreign_account: 1,
          })
          const frozen = (await journey.readSnapshot([owner])).profiles.get(owner.userId)!.earned
          expect(frozen.level).toBe('coder')
          expect(frozen.capabilities).toEqual(['studio', 'pinta'])
          expect(frozen.courseAccess.entry).toContain('iniciante-2d')
          expect(frozen.courseAccess.expanded).toContain('primeiros-passos-2d')
          const grants = await conn.sql`select blocks from members.studio_block_grants
          where user_id=${owner.userId} and course_id=${courseId}`
          expect(grants[0]?.blocks).toEqual([blockType])
          await blocker`select pg_advisory_unlock(hashtextextended(${purgeKey},0))`
          purgeHeld = false
          await purge
          expect(await grantScope()).toEqual({
            explicit: 0,
            omitted_gamma: 0,
            omitted_earned: 0,
            foreign_account: 1,
          })
          expect(await observed()).toEqual({
            ledger: 0,
            grants: 0,
            earned: 0,
            profiles: 0,
            cohort: 0,
          })
          const replay = await awardRepo.award(input)
          expect(replay).toMatchObject({ xpAwarded: 0, totalXp: 0, coinsAwarded: 0, newEvents: [] })
          expect(await grantScope()).toEqual({
            explicit: 0,
            omitted_gamma: 0,
            omitted_earned: 0,
            foreign_account: 1,
          })
          expect(await observed()).toEqual({
            ledger: 0,
            grants: 0,
            earned: 0,
            profiles: 0,
            cohort: 0,
          })
          const [fence] = await conn.sql`select account_id from members.account_deletion_fences
          where account_id=${owner.accountId}`
          expect(fence?.account_id).toBe(owner.accountId)
        } catch (error) {
          errors.push(error)
        } finally {
          for (const [held, key] of [
            [awardHeld, awardKey],
            [purgeHeld, purgeKey],
          ] as const)
            if (held)
              await blocker`select pg_advisory_unlock(hashtextextended(${key},0))`.catch(
                (error: unknown) => errors.push(error),
              )
          blocker.release()
          for (const result of await Promise.allSettled(work))
            if (result.status === 'rejected') errors.push(result.reason)
          for (const [name, table] of [
            [awardTrigger, 'xp_events'],
            [purgeTrigger, 'xp_events'],
          ]) {
            await conn.sql
              .unsafe(`DROP TRIGGER IF EXISTS ${name} ON members.${table}`)
              .catch((error: unknown) => errors.push(error))
            await conn.sql
              .unsafe(`DROP FUNCTION IF EXISTS members.${name}()`)
              .catch((error: unknown) => errors.push(error))
          }
        }
        if (errors.length)
          throw new AggregateError(errors, 'Merged Kids milestone/purge causal proof failed')
      }),
  )

  bunTest(
    'a GET that read eligible curriculum before purge cannot freeze its stale grants afterward',
    () =>
      ownedWork.track(async () => {
        const owner = { userId: randomUUID(), accountId: randomUUID() }
        await journey.initializeProfile(owner)
        await conn.sql`insert into members.gamification_profiles
        (id,user_id,account_id,audience,created_at,updated_at)
        values (${randomUUID()},${owner.userId},${owner.accountId},'kids',now(),now())`
        for (const sourceType of ['course_complete', 'course_showcased'])
          await conn.sql`insert into members.xp_events
          (id,user_id,audience,source_type,source_id,amount,source_level,source_track,source_career_slot,created_at)
          values (${randomUUID()},${owner.userId},'kids',${sourceType},${courseId},0,'primeiros-passos','2d',1,now())`
        const grants = new DrizzleStudioUnlockRepository(conn.db)
        const entered = Promise.withResolvers<void>(),
          released = Promise.withResolvers<void>()
        const service = new GetStudioUnlocksService(
          new DrizzleGamificationRepository(conn.db),
          {
            listGrants: (userId, audience) => grants.listGrants(userId, audience),
            saveGrants: (userId, audience, captured) =>
              grants.saveGrants(userId, audience, captured),
            async freezeGrants(capturedOwner, audience, captured) {
              expect(capturedOwner).toEqual(owner)
              expect(captured).toEqual([{ courseId, blocks: [blockType] }])
              entered.resolve()
              await released.promise
              await grants.freezeGrants(capturedOwner, audience, captured)
            },
          },
          silentLogger,
        )
        const read = service.execute(owner.userId, 'kids', owner.accountId).then(
          (value) => ({ value }),
          (error) => ({ error }),
        )
        let enterTimeout: ReturnType<typeof setTimeout> | undefined
        try {
          await Promise.race([
            entered.promise,
            read.then(() => {
              throw new Error('GET ended before reaching the freeze barrier')
            }),
            new Promise<never>((_, reject) => {
              enterTimeout = setTimeout(
                () => reject(new Error('GET freeze barrier not reached')),
                2000,
              )
            }),
          ])
          clearTimeout(enterTimeout)
          await new DrizzleUserDataPurgeRepository(conn.db).purgeForUser({
            userIds: [owner.userId],
            accountId: owner.accountId,
            cleanup: {
              id: randomUUID(),
              prefixes: [],
              createdAt: new Date(),
              notBefore: new Date(),
            },
          })
          expect(await grants.listGrants(owner.userId, 'kids')).toEqual([])
          released.resolve()
          const outcome = await read
          expect(await grants.listGrants(owner.userId, 'kids')).toEqual([])
          expect('error' in outcome ? outcome.error : undefined).toBeInstanceOf(ForbiddenError)
        } finally {
          clearTimeout(enterTimeout)
          released.resolve()
          await read
        }
      }),
  )
})
