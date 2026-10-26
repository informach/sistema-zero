import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { studioUnlockRevision } from '../../src/domain/gamification/studio-unlock-revision'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { kidsJourneyPolicy } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioUnlockRepository } from '../../src/infrastructure/persistence/drizzle/studio-unlock.repository'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.CREATOR_REWARDS_TEST_DATABASE_URL
describe.skipIf(!target)(
  'completion rewards for accessible archived courses (real migrations)',
  () => {
    let connection: DbConnection
    beforeAll(async () => {
      connection = await openKidsJourneyTestDatabase(target!)
      await connection.db
        .insert(kidsJourneyPolicy)
        .values({
          id: 'kids',
          phase: 'published',
          version: 1,
          policy: initialKidsJourneyPolicy(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
    }, 60000)
    afterAll(async () => {
      await connection?.close()
    })

    for (const audience of ['kids', 'adult'] as const) {
      test(`${audience}: first completion after archival freezes blocks without a Mural event`, async () => {
        const userId = randomUUID()
        const accountId = audience === 'adult' ? userId : randomUUID()
        const courseId = randomUUID()
        await connection.sql`insert into members.courses
        (id,slug,title,status,audience,level,track,modality,metadata,created_at,updated_at)
        values (${courseId},${courseId},'Curso adquirido','archived',${audience},'iniciante','2d','recorded',
        '{"studioUnlockBlocks":["sz_on_start"]}'::jsonb,now(),now())`
        if (audience === 'kids')
          await new DrizzleKidsJourneyRepository(connection.db).initializeProfile({
            userId,
            accountId,
          })
        const repository = new DrizzleGamificationRepository(connection.db)
        const frozen = new DrizzleStudioUnlockRepository(connection.db)
        const result = await repository.award({
          userId,
          accountId,
          audience,
          privileged: false,
          today: '2026-10-26',
          now: new Date('2026-10-26T12:00:00Z'),
          events: [{ sourceType: 'course_complete', sourceId: courseId, amount: 0 }],
        })
        expect(result.newEvents).toHaveLength(1)
        const expected = [{ courseId, blocks: ['sz_on_start'] }]
        expect(await frozen.listGrants(userId, audience)).toEqual(expected)
        expect(await repository.listStudioUnlocksByCourse(userId, audience)).toEqual(expected)
        expect(await repository.getStudioUnlockRevision(userId, audience)).not.toBe(
          studioUnlockRevision([]),
        )
        expect(
          await repository.listStudioUnlocksByCourse(
            userId,
            audience === 'kids' ? 'adult' : 'kids',
          ),
        ).toEqual([])
        // A draft cannot originate new grants; previously earned blocks remain durable.
        await connection.sql`update members.courses set status='draft' where id=${courseId}`
        expect(await repository.listStudioUnlocksByCourse(userId, audience)).toEqual([])
        expect(await frozen.listGrants(userId, audience)).toEqual(expected)
      })
    }
  },
)
