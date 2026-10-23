import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { studioPublishDaySourceId } from '../../src/domain/gamification/source-id'
import type { AwardInput } from '../../src/domain/ports/gamification-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import {
  accountDeletionFences,
  coinEvents,
  creationCleanupJobs,
  gamificationProfiles,
  roomInventory,
  userBadges,
  xpEvents,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { silentLogger } from '../fakes/in-memory'
import { openStudioReviewDatabase } from './studio-review-database'

// Publication and purge exercise the complete schema, not the shared sparse repository fixtures.
const url = process.env.STUDIO_REVIEW_DATABASE_URL
if (url !== undefined && !url.trim())
  throw new Error('STUDIO_REVIEW_DATABASE_URL is explicitly empty')

describe.skipIf(!url)('durable standalone publication awards in PostgreSQL', () => {
  let connection: DbConnection, repository: DrizzleGamificationRepository
  const owners: string[] = []
  beforeAll(async () => {
    connection = await openStudioReviewDatabase(url!)
    repository = new DrizzleGamificationRepository(connection.db)
  })
  afterEach(async () => {
    if (!owners.length) return
    await connection.db
      .delete(creationCleanupJobs)
      .where(inArray(creationCleanupJobs.accountId, owners))
    await connection.db
      .delete(accountDeletionFences)
      .where(inArray(accountDeletionFences.accountId, owners))
    for (const table of [coinEvents, xpEvents, roomInventory, userBadges, gamificationProfiles])
      await connection.db.delete(table).where(inArray(table.userId, owners))
    owners.length = 0
  })
  afterAll(async () => {
    await connection?.close()
  })
  function publication(
    userId: string = randomUUID(),
    playId: string = randomUUID(),
    today = '2026-06-02',
  ): AwardInput {
    if (!owners.includes(userId)) owners.push(userId)
    return {
      userId,
      accountId: userId,
      audience: 'kids',
      standalonePublicationId: playId,
      events: [
        { sourceType: 'studio_published', sourceId: playId, amount: 0 },
        {
          sourceType: 'studio_publish_day',
          sourceId: studioPublishDaySourceId(today),
          amount: 25,
          coins: 15,
        },
      ],
      today,
      now: new Date(`${today}T12:00:00Z`),
      privileged: false,
    }
  }
  test('concurrent replay with a new day still awards one durable publication, without delivery-id storage', async () => {
    const first = publication()
    const second = publication(first.userId, first.standalonePublicationId, '2026-08-03')
    const results = await Promise.all([repository.award(first), repository.award(second)])
    expect(results.reduce((total, result) => total + result.xpAwarded, 0)).toBe(25)
    const rows = await connection.db
      .select()
      .from(xpEvents)
      .where(eq(xpEvents.userId, first.userId))
    expect(rows).toHaveLength(2)
    expect(rows.filter((event) => event.sourceType === 'studio_published')).toHaveLength(1)
    expect(
      (
        await repository.award(
          publication(first.userId, first.standalonePublicationId, '2026-09-04'),
        )
      ).xpAwarded,
    ).toBe(0)
  })
  test('an existing legacy marker suppresses a later daily award; a failed batch leaves no marker', async () => {
    const input = publication()
    await connection.db.insert(xpEvents).values({
      id: randomUUID(),
      userId: input.userId,
      audience: input.audience,
      sourceType: 'studio_published',
      sourceId: input.standalonePublicationId!,
      amount: 0,
      createdAt: input.now,
    })
    expect((await repository.award(input)).newEvents).toHaveLength(0)
    const other = publication()
    const outcome = await repository
      .award({
        ...other,
        events: [
          ...other.events,
          { sourceType: 'studio_remix', sourceId: 'not-a-uuid', amount: 0 },
        ],
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(outcome).toBeInstanceOf(Error)
    expect(
      await connection.db.select().from(xpEvents).where(eq(xpEvents.userId, other.userId)),
    ).toHaveLength(0)
    expect((await repository.award(other)).xpAwarded).toBe(25)
  })
  test('an in-flight delivery drains before purge; late/replayed delivery is an inert acknowledgement', async () => {
    const input = publication()
    const blocker = await connection.sql.reserve()
    const qaKey = `qa-studio-delivery:${randomUUID()}`
    const name = `studio_award_hold_${randomUUID().replaceAll('-', '')}`
    const work: Promise<unknown>[] = []
    const errors: unknown[] = []
    let lockHeld = false
    try {
      await blocker`select pg_advisory_lock(hashtextextended(${qaKey}, 0))`
      lockHeld = true
      await connection.sql.unsafe(
        `CREATE FUNCTION members.${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id = '${input.userId}'::uuid THEN PERFORM pg_advisory_xact_lock(hashtextextended('${qaKey}', 0)); END IF; RETURN NEW; END $$`,
      )
      await connection.sql.unsafe(
        `CREATE TRIGGER ${name} BEFORE INSERT ON members.xp_events FOR EACH ROW EXECUTE FUNCTION members.${name}()`,
      )
      const waitForLock = async (key: string) => {
        const deadline = Date.now() + 2000
        while (Date.now() < deadline) {
          const [row] =
            await connection.sql`select exists(select 1 from pg_locks where locktype='advisory' and not granted and classid::bigint=((hashtextextended(${key},0)>>32)&4294967295) and objid::bigint=(hashtextextended(${key},0)&4294967295) and objsubid=1) as waiting`
          if (row?.waiting) return
        }
        throw new Error('Expected owned PostgreSQL lock waiter did not arrive')
      }
      const award = repository.award(input)
      work.push(award)
      await waitForLock(qaKey)
      const purge = new DrizzleUserDataPurgeRepository(connection.db).purgeForUser({
        userIds: [input.userId],
        accountId: input.accountId,
        cleanup: { id: randomUUID(), prefixes: [], createdAt: input.now, notBefore: input.now },
      })
      work.push(purge)
      await waitForLock(`members-account:${input.accountId}`)
      await blocker`select pg_advisory_unlock(hashtextextended(${qaKey},0))`
      lockHeld = false
      expect((await award).xpAwarded).toBe(25)
      await purge
      const service = new AwardGamificationService(
        repository,
        () => new Date('2026-09-04T12:00:00Z'),
        silentLogger,
      )
      const replay = await service.awardStudioStandalonePublished({
        userId: input.userId,
        accountId: input.accountId,
        audience: input.audience,
        playId: input.standalonePublicationId!,
        publishedAt: input.now,
      })
      expect(replay).not.toBeNull()
      expect(replay?.xpAwarded).toBe(0)
      expect(
        await connection.db.select().from(xpEvents).where(eq(xpEvents.userId, input.userId)),
      ).toHaveLength(0)
      expect(
        await connection.db
          .select()
          .from(gamificationProfiles)
          .where(eq(gamificationProfiles.userId, input.userId)),
      ).toHaveLength(0)
      expect(
        await connection.db.select().from(coinEvents).where(eq(coinEvents.userId, input.userId)),
      ).toHaveLength(0)
    } catch (error) {
      errors.push(error)
    } finally {
      if (lockHeld) {
        const released =
          await blocker`select pg_advisory_unlock(hashtextextended(${qaKey},0))`.then(
            () => null,
            (error: unknown) => error,
          )
        if (released) errors.push(released)
      }
      blocker.release()
      for (const result of await Promise.allSettled(work))
        if (result.status === 'rejected') errors.push(result.reason)
      for (const sql of [
        `DROP TRIGGER IF EXISTS ${name} ON members.xp_events`,
        `DROP FUNCTION IF EXISTS members.${name}()`,
      ]) {
        const failure = await connection.sql.unsafe(sql).then(
          () => null,
          (error: unknown) => error,
        )
        if (failure) errors.push(failure)
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Publication/purge causal proof failed')
  })
  test('late original-time events preserve newer profile dates/freezes and use historical wallet cap', async () => {
    const current = publication(randomUUID(), randomUUID(), '2026-08-03')
    const prior = publication(current.userId, randomUUID(), '2026-06-02')
    await repository.award({
      ...prior,
      standalonePublicationId: undefined,
      events: [{ sourceType: 'quiz_passed', sourceId: randomUUID(), amount: 1, coins: 95 }],
    })
    await repository.award(current)
    const [before] = await connection.db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.userId, current.userId))
    const past = publication(current.userId, randomUUID(), '2026-06-02')
    const delayed = await repository.award(past)
    expect(delayed.xpAwarded).toBe(25)
    expect(delayed.coinsAwarded).toBe(5)
    expect(delayed.coinsCapped).toBe(true)
    const [after] = await connection.db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.userId, current.userId))
    expect(after?.lastActivityDate).toBe(before?.lastActivityDate)
    expect(after?.streakCurrent).toBe(before?.streakCurrent)
    expect(after?.streakFreezes).toBe(before?.streakFreezes)
    expect(after?.freezeGrantedMonth).toBe(before?.freezeGrantedMonth)
    expect(after?.coinsEarnedDate).toBe(before?.coinsEarnedDate)
    expect(after?.coinsEarnedToday).toBe(before?.coinsEarnedToday)
    expect(after?.updatedAt).toEqual(before?.updatedAt)
    const [event] = await connection.db
      .select()
      .from(xpEvents)
      .where(eq(xpEvents.sourceId, past.standalonePublicationId!))
    expect(event?.createdAt).toEqual(past.now)
  })
})
