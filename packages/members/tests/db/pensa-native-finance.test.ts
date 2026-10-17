import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import {
  accountDeletionFences,
  coinEvents,
  gamificationProfiles,
  pensaDeletionJobs,
  pensaExecutionEvents,
  pensaOperations,
  pensaProjects,
  xpEvents,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { nativePensa } from './pensa-native-fixture'

const enabled = Boolean(process.env.PENSA_TEST_DATABASE_URL)
test.skipIf(!enabled)(
  'reward intentions survive project deletion, deliver once and cannot recreate an account after purge',
  async () => {
    const f = await nativePensa('pensa_native_finance_test')
    try {
      await f.accept()
      const ref = await f.savedGame()
      await f.complete(f.featureId, ref)
      await f.complete(f.finalId, ref)
      await f.repo.delete(f.actor, f.projectId, randomUUID())
      const pending = await f.conn.db
        .select()
        .from(pensaExecutionEvents)
        .where(eq(pensaExecutionEvents.rewardStatus, 'pending'))
      expect(pending).toHaveLength(4)
      expect(await f.rewards.work()).toEqual({ completed: 4, failed: 0 })
      expect(await f.rewards.work()).toEqual({ completed: 0, failed: 0 })
      expect(
        (await f.conn.db.select().from(xpEvents)).filter((e) =>
          pending.some((p) => p.id === e.sourceId),
        ),
      ).toHaveLength(4)
      expect(
        (await f.conn.db.select().from(coinEvents)).filter((e) =>
          pending.some((p) => p.id === e.sourceId),
        ),
      ).toHaveLength(4)
      const purge = new DrizzleUserDataPurgeRepository(f.conn.db)
      const now = new Date('2026-10-16T12:10:00.000Z')
      await purge.purgeForUser({
        userIds: [f.actor.profileId],
        accountId: f.actor.accountId,
        cleanup: {
          id: randomUUID(),
          prefixes: [`creations/${f.actor.profileId}/`],
          notBefore: now,
          createdAt: now,
        },
      })
      expect(
        await f.conn.db
          .select()
          .from(gamificationProfiles)
          .where(eq(gamificationProfiles.userId, f.actor.profileId)),
      ).toHaveLength(0)
      expect(
        await f.conn.db
          .select()
          .from(pensaExecutionEvents)
          .where(eq(pensaExecutionEvents.accountId, f.actor.accountId)),
      ).toHaveLength(0)
      expect(await f.rewards.work()).toEqual({ completed: 0, failed: 0 })
      expect(
        await f.conn.db
          .select()
          .from(accountDeletionFences)
          .where(eq(accountDeletionFences.accountId, f.actor.accountId)),
      ).toHaveLength(1)
      expect(await f.conn.db.select().from(pensaDeletionJobs)).toHaveLength(1)
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'two account purges with crossed project payers acquire one total lock order',
  async () => {
    const f = await nativePensa('pensa_native_crossed_purge_test')
    try {
      const other = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
      const second = await f.projects.create(other, {
        requestId: randomUUID(),
        message: 'Outro jogo.',
      })
      const firstInvite = await f.team.share(f.actor, f.projectId, randomUUID(), true)
      const secondInvite = await f.team.share(other, second.project.id, randomUUID(), true)
      await f.team.join(other, randomUUID(), firstInvite.shareCode!)
      await f.team.join(f.actor, randomUUID(), secondInvite.shareCode!)
      await f.operations.cancel(f.actor, f.projectId, f.operationId, randomUUID())
      await f.operations.cancel(other, second.project.id, second.operation!.id, randomUUID())
      await f.projects.message(other, f.projectId, {
        requestId: randomUUID(),
        baseRevisionId: null,
        kind: 'planning',
        message: 'Vou ajudar nesta ideia.',
        missionId: null,
        choice: null,
      })
      await f.projects.message(f.actor, second.project.id, {
        requestId: randomUUID(),
        baseRevisionId: null,
        kind: 'planning',
        message: 'Vou ajudar nesta outra ideia.',
        missionId: null,
        choice: null,
      })
      const purge = new DrizzleUserDataPurgeRepository(f.conn.db),
        now = new Date()
      await Promise.all(
        [f.actor, other].map((actor) =>
          purge.purgeForUser({
            userIds: [actor.profileId],
            accountId: actor.accountId,
            cleanup: {
              id: randomUUID(),
              prefixes: [`creations/${actor.profileId}/`],
              notBefore: now,
              createdAt: now,
            },
          }),
        ),
      )
      expect(await f.conn.db.select().from(pensaProjects)).toHaveLength(0)
      expect(await f.conn.db.select().from(pensaOperations)).toHaveLength(0)
      expect(await f.conn.db.select().from(accountDeletionFences)).toHaveLength(2)
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'account purge fences an active native project and pending reward delivery in the same race',
  async () => {
    const f = await nativePensa('pensa_native_purge_race_test')
    try {
      await f.accept()
      const purge = new DrizzleUserDataPurgeRepository(f.conn.db),
        now = new Date()
      await Promise.all([
        f.rewards.work(),
        purge.purgeForUser({
          userIds: [f.actor.profileId],
          accountId: f.actor.accountId,
          cleanup: {
            id: randomUUID(),
            prefixes: [`creations/${f.actor.profileId}/`],
            notBefore: now,
            createdAt: now,
          },
        }),
      ])
      expect(
        await f.conn.db
          .select()
          .from(gamificationProfiles)
          .where(eq(gamificationProfiles.userId, f.actor.profileId)),
      ).toHaveLength(0)
      expect(
        await f.conn.db
          .select()
          .from(pensaExecutionEvents)
          .where(eq(pensaExecutionEvents.accountId, f.actor.accountId)),
      ).toHaveLength(0)
      expect(await f.rewards.work()).toEqual({ completed: 0, failed: 0 })
      let error: unknown
      try {
        await f.projects.create(f.actor, { requestId: randomUUID(), message: 'Outra ideia.' })
      } catch (caught) {
        error = caught
      }
      expect(error).toMatchObject({ code: 'PROJECT_GONE' })
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)
