import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import {
  aiUsageDaily,
  creations,
  pensaExecutionEvents,
  pensaProjectRevisions,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { nativePensa } from './pensa-native-fixture'

const enabled = Boolean(process.env.PENSA_TEST_DATABASE_URL)
test.skipIf(!enabled)(
  'accepting a local functional change preserves identities and saved work, and fences affected progress atomically',
  async () => {
    const f = await nativePensa('pensa_native_revision_test')
    try {
      const original = await f.accept(),
        ref = await f.savedGame()
      await f.complete(f.featureId, ref)
      await f.complete(f.finalId, ref)
      f.definition.requirements[0]!.text = 'Encontrar seis pares e reiniciar a partida.'
      f.plan.missions[0]!.rules = [{ id: 'six-pairs', text: 'A partida tem seis pares.' }]
      await f.projects.message(f.actor, f.projectId, {
        requestId: randomUUID(),
        kind: 'planning',
        message: 'Quero aumentar para seis pares.',
        baseRevisionId: original.revision!.id,
        missionId: null,
        choice: null,
      })
      const generated = await f.generate(),
        draft = generated.draft!
      expect(draft.impact?.changedMissionIds).toContain(f.featureId)
      expect(draft.impact?.reviewMissionIds).toContain(f.finalId)
      const before = generated.progress.find((p) => p.missionId === f.featureId)!
      await f.projects.mission(
        f.actor,
        f.featureId,
        'note',
        {
          requestId: randomUUID(),
          expectedProgressRevision: before.progressRevision,
          note: 'Guardei a partida de quatro pares.',
        },
        f.capabilities,
      )
      const stale = {
        requestId: randomUUID(),
        draftId: draft.id,
        draftRevision: draft.revision,
        baseRevisionId: draft.baseRevisionId,
        affectedProgressVersions: draft.affectedProgressVersions,
      }
      let refused: unknown
      try {
        await f.projects.acceptDraft(f.actor, f.projectId, stale, f.capabilities)
      } catch (error) {
        refused = error
      }
      expect(refused).toMatchObject({ code: 'REVISION_CONFLICT' })
      expect((await f.repo.get(f.actor, f.projectId)).revision?.id).toBe(original.revision?.id)
      expect(await f.conn.db.select().from(pensaProjectRevisions)).toHaveLength(1)
      expect((await f.conn.db.select().from(aiUsageDaily))[0]?.used).toBe(1)
      const edited = await f.projects.editDraft(
        f.actor,
        f.projectId,
        {
          requestId: randomUUID(),
          expectedDraftRevision: draft.revision,
          baseRevisionId: draft.baseRevisionId,
          definition: f.definition,
          plan: f.plan,
        },
        f.capabilities,
      )
      const refreshed = edited.draft!
      const changed = await f.projects.acceptDraft(
        f.actor,
        f.projectId,
        {
          requestId: randomUUID(),
          draftId: refreshed.id,
          draftRevision: refreshed.revision,
          baseRevisionId: refreshed.baseRevisionId,
          affectedProgressVersions: refreshed.affectedProgressVersions,
        },
        f.capabilities,
      )
      expect(changed.revision?.plan.missions.map((m) => m.id)).toEqual(
        original.revision?.plan.missions.map((m) => m.id),
      )
      expect(
        changed.revision?.plan.missions.find((m) => m.id === f.featureId)?.contentRevision,
      ).toBe(2)
      expect(changed.progress.find((p) => p.missionId === f.featureId)).toMatchObject({
        status: 'completed',
        validity: 'needs_review',
        resumeNote: 'Guardei a partida de quatro pares.',
      })
      expect(changed.progress.find((p) => p.missionId === f.finalId)?.validity).toBe('needs_review')
      expect((await f.conn.db.select().from(creations))[0]?.revision).toBe(1)
      expect((await f.conn.db.select().from(aiUsageDaily))[0]?.used).toBe(2)
      expect(
        await f.conn.db
          .select()
          .from(pensaExecutionEvents)
          .where(eq(pensaExecutionEvents.kind, 'plan_accepted')),
      ).toHaveLength(1)
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)
