import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { creations, xpEvents } from '../../src/infrastructure/persistence/drizzle/schema'
import { nativePensa } from './pensa-native-fixture'

const enabled = Boolean(process.env.PENSA_TEST_DATABASE_URL)
test.skipIf(!enabled)(
  'adult Pensa persists on the account; projects, teams, creations and rewards stay in the adult audience',
  async () => {
    const f = await nativePensa('pensa_adult_parity', false, false, 'adult')
    try {
      expect(f.actor.profileId).toBe(f.actor.accountId)
      expect((await f.repo.get(f.actor, f.projectId)).project.audience).toBe('adult')
      const kidsActor = {
        profileId: f.actor.profileId,
        accountId: f.actor.accountId,
        privileged: false,
      }
      expect(await f.repo.list(kidsActor, 'active')).toEqual([])
      let denied = false
      try {
        await f.repo.get(kidsActor, f.projectId)
      } catch {
        denied = true
      }
      expect(denied).toBe(true)
      await f.accept()
      const saved = await f.savedGame()
      const rows = await f.conn.db
        .select()
        .from(creations)
        .where(eq(creations.userId, f.actor.profileId))
      expect(rows.map((row) => row.audience)).toEqual(['adult'])
      expect(rows[0]?.storageRef).toContain('creations/adult/')
      const shared = await f.team.share(f.actor, f.projectId, randomUUID(), true)
      if (!shared.shareCode) throw new Error('No share code')
      denied = false
      try {
        await f.team.join(kidsActor, randomUUID(), shared.shareCode)
      } catch {
        denied = true
      }
      expect(denied).toBe(true)
      await f.complete(f.featureId, saved)
      await f.rewards.work()
      const events = await f.conn.db
        .select()
        .from(xpEvents)
        .where(eq(xpEvents.userId, f.actor.profileId))
      expect(events.length).toBeGreaterThan(0)
      expect(events.every((row) => row.audience === 'adult')).toBe(true)
    } finally {
      await f.conn.close()
    }
  },
  30000,
)
