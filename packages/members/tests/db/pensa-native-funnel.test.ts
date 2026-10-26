import { expect, test } from 'bun:test'
import { DrizzlePensaFunnelRepository } from '../../src/infrastructure/persistence/drizzle/pensa-funnel.repository'
import { nativePensa } from './pensa-native-fixture'

test.skipIf(!process.env.PENSA_TEST_DATABASE_URL)(
  'the funnel distinguishes preparation, construction and final verification without counting setup as a feature',
  async () => {
    const f = await nativePensa('pensa_native_funnel_test', true)
    try {
      await f.accept()
      const ref = await f.savedGame()
      const reader = new DrizzlePensaFunnelRepository(f.conn.db)
      const count = () => reader.funnel(new Date('2026-10-15'), new Date('2026-10-17'))
      expect(await count()).toMatchObject({
        projects: 1,
        planAccepted: 1,
        setupCompleted: 0,
        constructionCompleted: 0,
        projectCompleted: 0,
      })
      expect(
        (await reader.funnel(new Date('2026-10-15'), new Date('2026-10-17'), 'kids')).projects,
      ).toBe(1)
      expect(
        (await reader.funnel(new Date('2026-10-15'), new Date('2026-10-17'), 'adult')).projects,
      ).toBe(0)
      await f.complete(f.setupId, ref, true)
      expect(await count()).toMatchObject({
        setupCompleted: 1,
        firstMissionCompleted: 0,
        constructionCompleted: 0,
        projectCompleted: 0,
      })
      await f.complete(f.featureId, ref)
      expect(await count()).toMatchObject({
        setupCompleted: 1,
        firstMissionCompleted: 1,
        constructionCompleted: 1,
        projectCompleted: 0,
      })
      await f.complete(f.finalId, ref)
      expect(await count()).toMatchObject({
        setupCompleted: 1,
        firstMissionCompleted: 1,
        constructionCompleted: 1,
        projectCompleted: 1,
      })
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)
