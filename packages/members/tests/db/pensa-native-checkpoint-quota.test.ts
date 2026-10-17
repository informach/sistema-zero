import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { PENSA_LIMITS } from '@sistemazero/core/pensa'
import { eq } from 'drizzle-orm'
import { DrizzleCreationCleanupRepository } from '../../src/infrastructure/persistence/drizzle/creation-cleanup.repository'
import { pensaCheckpoints } from '../../src/infrastructure/persistence/drizzle/schema'
import { nativePensa } from './pensa-native-fixture'

test.skipIf(!process.env.PENSA_TEST_DATABASE_URL)(
  'failed checkpoint copies occupy quota until cleanup, then a fresh request can protect again',
  async () => {
    const f = await nativePensa('pensa_native_checkpoint_quota_test')
    try {
      const view = await f.accept()
      await f.savedGame()
      const baseRevisionId = view.revision!.id
      let firstId = ''
      for (let i = 0; i < PENSA_LIMITS.checkpointCount; i++) {
        const id = randomUUID()
        if (i === 0) firstId = id
        await f.checkpoints.protect(
          f.actor,
          f.projectId,
          { type: 'prepare', id, baseRevisionId, saveRevision: '1' },
          f.capabilities,
        )
        await f.checkpoints.protect(f.actor, f.projectId, { type: 'abort', id }, f.capabilities)
      }
      const fresh = {
        type: 'prepare' as const,
        id: randomUUID(),
        baseRevisionId,
        saveRevision: '1',
      }
      let full: unknown
      try {
        await f.checkpoints.protect(f.actor, f.projectId, fresh, f.capabilities)
      } catch (error) {
        full = error
      }
      expect(full).toMatchObject({ code: 'QUOTA_EXCEEDED' })
      const [failed] = await f.conn.db
        .select()
        .from(pensaCheckpoints)
        .where(eq(pensaCheckpoints.id, firstId))
      const cleanupId = failed?.manifest.cleanupId
      if (typeof cleanupId !== 'string')
        throw new Error('Failed copy has no durable cleanup identity')
      expect(
        await new DrizzleCreationCleanupRepository(f.conn.db).complete(cleanupId, new Date()),
      ).toBe(true)
      let reuse: unknown
      try {
        await f.checkpoints.protect(f.actor, f.projectId, { ...fresh, id: firstId }, f.capabilities)
      } catch (error) {
        reuse = error
      }
      expect(reuse).toMatchObject({ code: 'REVISION_CONFLICT' })
      expect(
        (await f.checkpoints.protect(f.actor, f.projectId, fresh, f.capabilities)).files,
      ).toHaveLength(1)
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'commit', id: fresh.id },
        f.capabilities,
      )
      expect(
        (await f.checkpoints.list(f.actor, f.projectId)).map((checkpoint) => checkpoint.id),
      ).toEqual([fresh.id])
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)
