import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import * as P from '@sistemazero/core/pensa'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  aiUsageDaily,
  aiUsageReservations,
  creations,
  pensaCheckpoints,
  pensaDeletionJobs,
  pensaExecutionEvents,
  pensaOperations,
  pensaProviderUsage,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { nativePensa } from './pensa-native-fixture'

async function rejected(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected this operation to reject')
}

const enabled = Boolean(process.env.PENSA_TEST_DATABASE_URL)
const errorBody = z.object({ error: z.object({ code: z.string() }) })
function internalRequest(f: Awaited<ReturnType<typeof nativePensa>>, path: string, body: object) {
  return f.app.handle(
    new Request(`http://localhost/members/internal/pensa${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': f.deps.internalToken,
        'x-consumer-id': 'member-shell',
      },
      body: JSON.stringify({ actor: f.actor, capabilities: f.capabilities, ...body }),
    }),
  )
}

test.skipIf(!enabled)(
  'native planning publishes only after review and charges the accepted delivery once',
  async () => {
    const f = await nativePensa('pensa_native_planning_test')
    try {
      const state = await f.generate()
      expect(state.revision).toBeNull()
      expect(state.draft?.status).toBe('ready')
      const draft = state.draft!
      const input = {
        requestId: randomUUID(),
        draftId: draft.id,
        draftRevision: draft.revision,
        baseRevisionId: draft.baseRevisionId,
        affectedProgressVersions: draft.affectedProgressVersions,
      }
      const view = await f.projects.acceptDraft(f.actor, f.projectId, input, f.capabilities)
      const replay = await f.projects.acceptDraft(f.actor, f.projectId, input, f.capabilities)
      expect(replay.revision?.id).toBe(view.revision?.id)
      expect(view.nextAction.type).toBe('mission')
      expect(view.revision?.plan.missions.map((m) => m.id)).toEqual(
        f.plan.missions.map((m) => m.id),
      )
      const [usage] = await f.conn.db
        .select()
        .from(aiUsageDaily)
        .where(eq(aiUsageDaily.accountId, f.actor.accountId))
      const [provider] = await f.conn.db
        .select()
        .from(pensaProviderUsage)
        .where(eq(pensaProviderUsage.accountId, f.actor.accountId))
      expect(usage?.used).toBe(1)
      expect(provider?.calls).toBe(4)
      expect((await f.conn.db.select().from(aiUsageReservations))[0]?.status).toBe('committed')
      let failure: unknown
      try {
        await f.projects.acceptDraft(
          f.actor,
          f.projectId,
          { ...input, draftRevision: draft.revision + 1 },
          f.capabilities,
        )
      } catch (error) {
        failure = error
      }
      expect(failure).toMatchObject({ code: 'REVISION_CONFLICT' })
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'native progress uses saved ownership and CAS, reopens dependents, and never repeats rewards',
  async () => {
    const f = await nativePensa('pensa_native_progress_test')
    try {
      const view = await f.accept()
      const ref = await f.savedGame()
      expect(await rejected(f.complete(f.finalId, ref))).toMatchObject({
        code: 'DEPENDENCY_PENDING',
      })
      expect(
        await rejected(f.complete(f.featureId, { ...ref, profileId: randomUUID() })),
      ).toMatchObject({ code: 'CREATION_CHANGED' })
      const first = await f.complete(f.featureId, ref)
      expect(first.progress.status).toBe('completed')
      await f.complete(f.finalId, ref)
      expect((await f.projects.list(f.actor, 'active'))[0]?.lifecycle).toBe('completed')
      const request = {
        requestId: randomUUID(),
        baseRevisionId: view.revision!.id,
        contentRevision: first.mission.contentRevision,
        expectedProgressRevision: first.progress.progressRevision,
      }
      const results = await Promise.allSettled([
        f.projects.mission(f.actor, f.featureId, 'reopen', request, f.capabilities),
        f.projects.mission(
          f.actor,
          f.featureId,
          'reopen',
          { ...request, requestId: randomUUID() },
          f.capabilities,
        ),
      ])
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      const after = await f.projects.get(f.actor, f.projectId, f.capabilities)
      expect(after.progress.find((p) => p.missionId === f.finalId)?.validity).toBe('needs_review')
      expect(after.nextAction.type).toBe('mission')
      await f.complete(f.featureId, ref)
      await f.complete(f.finalId, ref)
      const rewards = await f.conn.db
        .select()
        .from(pensaExecutionEvents)
        .where(eq(pensaExecutionEvents.rewardStatus, 'pending'))
      expect(rewards.map((e) => e.kind).sort()).toEqual([
        'construction_complete',
        'first_feature',
        'plan_accepted',
        'project_verified',
      ])
      await f.repo.delete(f.actor, f.projectId, randomUUID())
      expect(await f.conn.db.select().from(creations)).toHaveLength(1)
      expect(
        (
          await f.conn.db
            .select()
            .from(pensaExecutionEvents)
            .where(eq(pensaExecutionEvents.rewardStatus, 'pending'))
        ).every((e) => e.projectId === null && JSON.stringify(e.data) === '{}'),
      ).toBe(true)
      expect((await f.conn.db.select().from(pensaDeletionJobs))[0]?.prefixes).toEqual([
        `creations/${f.actor.profileId}/pensa/${f.projectId}/`,
      ])
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'native claim leases fence publication and unit failure preserves draft and provider budget',
  async () => {
    const f = await nativePensa('pensa_native_claim_test')
    try {
      const lease = randomUUID()
      const claims = await Promise.all([
        f.operations.claim(f.actor, f.projectId, f.operationId, lease, f.capabilities),
        f.operations.claim(f.actor, f.projectId, f.operationId, randomUUID(), f.capabilities),
      ])
      expect(claims.filter(Boolean)).toHaveLength(1)
      expect(
        await rejected(
          f.operations.publish(
            f.actor,
            f.projectId,
            f.operationId,
            randomUUID(),
            { type: 'step', step: 'outline', output: {} },
            f.capabilities,
          ),
        ),
      ).toMatchObject({ code: 'REVISION_CONFLICT' })
      await f.operations.fail(
        f.actor,
        f.projectId,
        f.operationId,
        claims.find(Boolean)!.leaseId,
        'O recurso mudou. Sua ideia está guardada.',
      )
      const nextLease = randomUUID()
      expect(
        await f.operations.claim(f.actor, f.projectId, f.operationId, nextLease, f.capabilities),
      ).not.toBeNull()
      await f.operations.fail(f.actor, f.projectId, f.operationId, nextLease)
      expect(
        await rejected(
          f.operations.claim(f.actor, f.projectId, f.operationId, randomUUID(), f.capabilities),
        ),
      ).toMatchObject({ code: 'QUOTA_EXCEEDED' })
      const [operation] = await f.conn.db
        .select()
        .from(pensaOperations)
        .where(eq(pensaOperations.id, f.operationId))
      expect(operation?.status).toBe('failed')
      expect(operation?.error).toContain('limite')
      expect((await f.conn.db.select().from(aiUsageReservations))[0]?.status).toBe('released')
      await f.projects.message(f.actor, f.projectId, {
        requestId: randomUUID(),
        baseRevisionId: null,
        missionId: null,
        kind: 'planning',
        message: 'Quero cartas azuis.',
        choice: null,
      })
      const resumed = await f.operations.claim(
        f.actor,
        f.projectId,
        f.operationId,
        randomUUID(),
        f.capabilities,
      )
      expect(resumed?.budget.dialogueCalls).toBe(3)
      expect(resumed?.budget.roundCalls).toBe(1)
      await f.operations.publish(
        f.actor,
        f.projectId,
        f.operationId,
        resumed!.leaseId,
        {
          type: 'step',
          step: 'outline',
          output: { files: [{ destination: 'creations/another-profile/studio/keep.gz' }] },
        },
        f.capabilities,
      )
      await f.repo.delete(f.actor, f.projectId, randomUUID())
      expect((await f.conn.db.select().from(pensaDeletionJobs))[0]?.prefixes).toEqual([
        `creations/${f.actor.profileId}/pensa/${f.projectId}/`,
      ])
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'a paused project preserves its draft until the owner resumes it',
  async () => {
    const f = await nativePensa('pensa_native_paused_draft_test')
    try {
      const state = await f.generate()
      await f.projects.metadata(f.actor, f.projectId, {
        requestId: randomUUID(),
        expectedMetadataRevision: 0,
        paused: true,
      })
      const draft = state.draft!
      const input = {
        requestId: randomUUID(),
        draftId: draft.id,
        draftRevision: draft.revision,
        baseRevisionId: null,
        affectedProgressVersions: draft.affectedProgressVersions,
      }
      expect(
        await rejected(f.projects.acceptDraft(f.actor, f.projectId, input, f.capabilities)),
      ).toMatchObject({ code: 'MISSION_UNAVAILABLE' })
      expect((await f.repo.get(f.actor, f.projectId)).revision).toBeNull()
      await f.projects.metadata(f.actor, f.projectId, {
        requestId: randomUUID(),
        expectedMetadataRevision: 1,
        paused: false,
      })
      expect(
        (await f.projects.acceptDraft(f.actor, f.projectId, input, f.capabilities)).revision,
      ).not.toBeNull()
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'retry is durably queued before returning and preserves the consumed budget',
  async () => {
    const f = await nativePensa('pensa_native_retry_test', false, true)
    try {
      const work = await f.operations.claim(
        f.actor,
        f.projectId,
        f.operationId,
        randomUUID(),
        f.capabilities,
      )
      await f.operations.fail(f.actor, f.projectId, f.operationId, work!.leaseId)
      const input = { requestId: randomUUID() }
      const path = `/projects/${f.projectId}/operations/${f.operationId}/retry`
      const retry = await internalRequest(f, path, input)
      expect(retry.status).toBe(200)
      const queued = await f.projects.get(f.actor, f.projectId, f.capabilities)
      expect(queued.operation?.status).toBe('queued')
      expect(queued.operation?.calls).toBe(1)
      expect((await internalRequest(f, path, input)).status).toBe(200)
      const next = await f.operations.claim(
        f.actor,
        f.projectId,
        f.operationId,
        randomUUID(),
        f.capabilities,
      )
      expect(next?.budget.dialogueCalls).toBe(2)
      expect(next?.calls).toBe(2)
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'native checkpoints reject changed progress, abort copies and restore atomically with monotonic save revision',
  async () => {
    const f = await nativePensa('pensa_native_restore_test')
    try {
      const view = await f.accept(),
        ref = await f.savedGame()
      const baseRevisionId = view.revision!.id,
        staleId = randomUUID()
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'prepare', id: staleId, baseRevisionId, saveRevision: '1' },
        f.capabilities,
      )
      await f.complete(f.featureId, ref)
      expect(
        await rejected(
          f.checkpoints.protect(
            f.actor,
            f.projectId,
            { type: 'commit', id: staleId },
            f.capabilities,
          ),
        ),
      ).toMatchObject({ code: 'REVISION_CONFLICT' })
      expect(
        (await f.conn.db.select().from(pensaCheckpoints).where(eq(pensaCheckpoints.id, staleId)))[0]
          ?.status,
      ).toBe('failed')
      const targetId = randomUUID()
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'prepare', id: targetId, baseRevisionId, saveRevision: '1' },
        f.capabilities,
      )
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'commit', id: targetId },
        f.capabilities,
      )
      await f.savedGame(2)
      const currentId = randomUUID()
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'prepare', id: currentId, baseRevisionId, saveRevision: '2' },
        f.capabilities,
      )
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'commit', id: currentId },
        f.capabilities,
      )
      const abortedId = randomUUID()
      const ticket = await f.checkpoints.protect(
        f.actor,
        f.projectId,
        {
          type: 'restore_prepare',
          id: abortedId,
          checkpointId: targetId,
          baseRevisionId,
          saveRevision: '2',
        },
        f.capabilities,
      )
      expect(ticket.files).toHaveLength(1)
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        { type: 'abort', id: abortedId },
        f.capabilities,
      )
      expect(
        await rejected(
          f.checkpoints.protect(
            f.actor,
            f.projectId,
            { type: 'restore_commit', id: abortedId },
            f.capabilities,
          ),
        ),
      ).toMatchObject({ code: 'REVISION_CONFLICT' })
      expect((await f.conn.db.select().from(creations))[0]?.revision).toBe(2)
      const restoreId = randomUUID()
      await f.checkpoints.protect(
        f.actor,
        f.projectId,
        {
          type: 'restore_prepare',
          id: restoreId,
          checkpointId: targetId,
          baseRevisionId,
          saveRevision: '2',
        },
        f.capabilities,
      )
      const committed = await internalRequest(f, `/projects/${f.projectId}/protect`, {
        action: { type: 'restore_commit', id: restoreId },
        capabilities: {
          ...f.capabilities,
          observedGame: {
            creation: { ...ref, saveRevision: '2' },
            authoring: 'code',
            dimension: '2d',
            runtimeExtensionId: null,
            installedExtensionIds: [],
          },
        },
      })
      expect(committed.status).toBe(200)
      expect(
        z.object({ gameCreation: P.PensaCreationRefSchema }).parse(await committed.json())
          .gameCreation.saveRevision,
      ).toBe('4')
      const after = await f.projects.get(f.actor, f.projectId, f.capabilities)
      expect(after.project.paused).toBe(view.project.paused)
      expect(after.project.metadataRevision).toBe(view.project.metadataRevision)
      expect(after.revision?.number).toBe(2)
      expect(after.restoredSaveRevision).toBe('4')
      expect(after.progress.find((p) => p.missionId === f.finalId)?.validity).toBe('needs_review')
      expect((await f.conn.db.select().from(creations))[0]?.revision).toBe(4)
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'observed saved configuration invalidates setup and descendants until explicit reconfirmation',
  async () => {
    const f = await nativePensa('pensa_native_configuration_test', true)
    try {
      await f.accept()
      const ref = await f.savedGame()
      await f.complete(f.setupId, ref, true)
      await f.complete(f.featureId, ref)
      await f.complete(f.finalId, ref)
      const nextRef = await f.savedGame(2)
      const missing: P.PensaCapabilities = {
        ...f.capabilities,
        observedGame: {
          creation: nextRef,
          authoring: 'blocks',
          dimension: '2d',
          runtimeExtensionId: null,
          installedExtensionIds: [],
        },
      }
      const after = await f.projects.get(f.actor, f.projectId, missing)
      expect(after.progress.every((p) => p.validity === 'needs_review')).toBe(true)
      const restored: P.PensaCapabilities = {
        ...missing,
        observedGame: {
          ...missing.observedGame!,
          runtimeExtensionId: 'game-2d-advanced',
          installedExtensionIds: ['game-2d-advanced'],
        },
      }
      expect(
        (await f.projects.get(f.actor, f.projectId, restored)).progress.every(
          (p) => p.validity === 'needs_review',
        ),
      ).toBe(true)
      expect(
        await f.conn.db
          .select()
          .from(pensaExecutionEvents)
          .where(eq(pensaExecutionEvents.kind, 'configuration_invalidated')),
      ).toHaveLength(1)
      const stale: P.PensaCapabilities = {
        ...missing,
        observedGame: { ...missing.observedGame!, creation: ref },
      }
      expect(await rejected(f.projects.get(f.actor, f.projectId, stale))).toMatchObject({
        code: 'RESOURCES_CHANGED',
      })
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'native HTTP verifies setup from saved identity, tolerates fingerprint provenance and rejects stale saves',
  async () => {
    const f = await nativePensa('pensa_native_http_setup_test', true)
    try {
      const view = await f.accept(),
        ref = await f.savedGame()
      const input = {
        requestId: randomUUID(),
        baseRevisionId: view.revision!.id,
        contentRevision: 1,
        expectedProgressRevision: 0,
        confirmed: true,
        note: '',
        deliveries: [{ assetSlotId: null, creation: ref }],
      }
      const completed = await internalRequest(f, `/missions/${f.setupId}/complete`, {
        input,
        inspection: {
          creation: { ...ref, contentFingerprint: 'hash-from-validated-file' },
          installedExtensionIds: ['game-2d-advanced'],
        },
      })
      expect(completed.status).toBe(200)
      expect(
        P.PensaMissionHandoffSchema.parse(await completed.json()).progress.verification?.source,
      ).toBe('saved_configuration')
      const handoff = await f.projects.handoff(f.actor, f.setupId, f.capabilities)
      await f.projects.mission(
        f.actor,
        f.setupId,
        'reopen',
        {
          requestId: randomUUID(),
          baseRevisionId: view.revision!.id,
          contentRevision: 1,
          expectedProgressRevision: handoff.progress.progressRevision,
        },
        f.capabilities,
      )
      await f.savedGame(2)
      const stale = await internalRequest(f, `/missions/${f.setupId}/complete`, {
        input: {
          ...input,
          requestId: randomUUID(),
          expectedProgressRevision: handoff.progress.progressRevision + 1,
        },
        inspection: { creation: ref, installedExtensionIds: ['game-2d-advanced'] },
      })
      expect(stale.status).toBe(409)
      expect(errorBody.parse(await stale.json()).error.code).toBe('CREATION_CHANGED')
      const ticketId = randomUUID()
      const prepared = await internalRequest(f, `/projects/${f.projectId}/protect`, {
        action: {
          type: 'prepare',
          id: ticketId,
          baseRevisionId: view.revision!.id,
          saveRevision: '2',
        },
      })
      expect(prepared.status).toBe(200)
      const committed = await internalRequest(f, `/projects/${f.projectId}/protect`, {
        action: { type: 'commit', id: ticketId },
      })
      expect(committed.status).toBe(200)
      expect(
        z.object({ project: P.PensaProjectMetadataSchema }).parse(await committed.json()).project
          .id,
      ).toBe(f.projectId)
      const unauthorized = await f.app.handle(
        new Request(`http://localhost/members/internal/pensa/projects/${f.projectId}/view`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-token': f.deps.internalToken },
          body: JSON.stringify({ actor: f.actor, capabilities: f.capabilities }),
        }),
      )
      expect(unauthorized.status).toBe(401)
      await f.projects.message(f.actor, f.projectId, {
        requestId: randomUUID(),
        kind: 'help',
        message: 'Como retomo meu jogo?',
        baseRevisionId: view.revision!.id,
        missionId: null,
        choice: null,
      })
      const messagePage = z.object({
        items: z.array(P.PensaMessageSchema),
        nextCursor: z.uuid().nullable(),
      })
      const publicHeaders = {
        'x-internal-token': f.deps.internalToken,
        'x-auth-user-id': f.actor.profileId,
        'x-auth-account-id': f.actor.accountId,
      }
      const page = messagePage.parse(
        await (
          await f.app.handle(
            new Request(`http://localhost/members/pensa/projects/${f.projectId}/messages?limit=1`, {
              headers: publicHeaders,
            }),
          )
        ).json(),
      )
      expect(page.items).toHaveLength(1)
      expect(page.nextCursor).not.toBeNull()
      const previous = messagePage.parse(
        await (
          await f.app.handle(
            new Request(
              `http://localhost/members/pensa/projects/${f.projectId}/messages?limit=1&cursor=${page.nextCursor}`,
              { headers: publicHeaders },
            ),
          )
        ).json(),
      )
      expect(previous.items).toHaveLength(1)
      expect(previous.items[0]?.id).not.toBe(page.items[0]?.id)
      expect(previous.nextCursor).toBeNull()
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'draft editing authorizes existing assets against current owner, kind and saved revision',
  async () => {
    const f = await nativePensa('pensa_native_existing_asset_test')
    try {
      const state = await f.generate(),
        slotId = randomUUID(),
        creationId = 'existing-sprite'
      const foreign = {
        tool: 'pinta' as const,
        profileId: randomUUID(),
        creationId,
        saveRevision: '1',
        contentFingerprint: null,
      }
      const definition: P.PensaGameDefinition = {
        ...f.definition,
        assetSlots: [
          {
            id: slotId,
            name: 'Carta',
            kind: 'sprite',
            description: 'Desenho das cartas.',
            source: 'existing',
            existing: foreign,
          },
        ],
      }
      const plan: P.PensaPlan = {
        ...f.plan,
        missions: f.plan.missions.map((m) =>
          m.id === f.featureId
            ? { ...m, kind: 'integration', destination: 'studio', assetSlotIds: [slotId] }
            : m,
        ),
      }
      const input = {
        requestId: randomUUID(),
        baseRevisionId: null,
        expectedDraftRevision: state.draft!.revision,
        definition,
        plan,
      }
      const unauthorized = await internalRequest(f, `/projects/${f.projectId}/draft/edit`, {
        input,
      })
      expect(unauthorized.status).toBe(409)
      expect(errorBody.parse(await unauthorized.json()).error.code).toBe('CREATION_CHANGED')
      await f.conn.db.insert(creations).values({
        id: randomUUID(),
        userId: f.actor.profileId,
        accountId: f.actor.accountId,
        tool: 'pinta',
        itemId: creationId,
        name: 'Carta',
        kind: 'pixel-sprite',
        itemUpdatedAt: new Date(),
        revision: 1,
        lastReservedRevision: 1,
        formatVersion: 1,
        bytes: 10,
        storageRef: `creations/${f.actor.profileId}/pinta/${creationId}/1.gz`,
        syncedAt: new Date(),
        createdAt: new Date(),
      })
      definition.assetSlots[0]!.existing = { ...foreign, profileId: f.actor.profileId }
      const valid = await internalRequest(f, `/projects/${f.projectId}/draft/edit`, {
        input: { ...input, requestId: randomUUID() },
      })
      expect(valid.status).toBe(200)
      const edited = P.PensaProjectViewSchema.parse(await valid.json())
      const stale = await internalRequest(f, `/projects/${f.projectId}/draft/edit`, {
        input: {
          ...input,
          requestId: randomUUID(),
          expectedDraftRevision: edited.draft!.revision,
          definition: {
            ...definition,
            assetSlots: [
              {
                ...definition.assetSlots[0]!,
                existing: { ...definition.assetSlots[0]!.existing!, saveRevision: '2' },
              },
            ],
          },
        },
      })
      expect(stale.status).toBe(409)
      expect(errorBody.parse(await stale.json()).error.code).toBe('CREATION_CHANGED')
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'leaving artist invalidates undownloadable deliveries and integration without losing independent work',
  async () => {
    const f = await nativePensa('pensa_native_team_exit_test')
    try {
      const artist = { profileId: randomUUID(), accountId: randomUUID(), privileged: false },
        assetId = randomUUID(),
        slotId = randomUUID(),
        integrationId = randomUUID()
      const share = await f.team.share(f.actor, f.projectId, randomUUID(), true)
      expect(await f.team.join(artist, randomUUID(), share.shareCode!)).toEqual({
        projectId: f.projectId,
      })
      const team = await f.team.team(f.actor, f.projectId)
      await f.team.setRoles(f.actor, f.projectId, {
        requestId: randomUUID(),
        expectedTeamRevision: team.memberCount + 1,
        programmerProfileId: f.actor.profileId,
        artistProfileIds: [artist.profileId],
      })
      f.capabilities.participants.push({
        ...f.capabilities.participants[0]!,
        profileId: artist.profileId,
      })
      f.definition.assetSlots.push({
        id: slotId,
        name: 'Carta',
        kind: 'sprite',
        description: 'Um desenho para as cartas.',
        source: 'create',
        existing: null,
      })
      const feature = f.plan.missions[0]!,
        final = f.plan.missions[1]!
      const asset: P.PensaMission = {
        ...feature,
        id: assetId,
        position: 1,
        kind: 'asset',
        destination: 'pinta',
        title: 'Desenhe a carta',
        objective: 'Faça o desenho da carta.',
        assetSlotIds: [slotId],
        dependencyIds: [],
      }
      const integration: P.PensaMission = {
        ...feature,
        id: integrationId,
        position: 2,
        kind: 'integration',
        destination: 'studio',
        title: 'Use a carta no jogo',
        objective: 'Mostre o desenho nas cartas.',
        assetSlotIds: [slotId],
        dependencyIds: [feature.id, assetId],
      }
      f.plan.missions = [
        feature,
        asset,
        integration,
        { ...final, position: 3, dependencyIds: [integrationId] },
      ]
      f.technical.missionResources = f.plan.missions.map((m) => ({
        missionId: m.id,
        blockIds: [],
        extensionIds: [],
        moldaToolIds: [],
        manualIds: [],
      }))
      // Team changes fence the old generation request; a new child message captures current roles.
      await f.projects.message(f.actor, f.projectId, {
        requestId: randomUUID(),
        kind: 'planning',
        message: 'Vamos desenhar a carta em equipe.',
        baseRevisionId: null,
        missionId: null,
        choice: null,
      })
      const view = await f.accept(),
        ref = await f.savedGame()
      await f.complete(f.featureId, ref)
      const artRef: P.PensaCreationRef = {
        tool: 'pinta',
        profileId: artist.profileId,
        creationId: 'carta-equipe',
        saveRevision: '1',
        contentFingerprint: null,
      }
      await f.conn.db.insert(creations).values({
        id: randomUUID(),
        userId: artist.profileId,
        accountId: artist.accountId,
        tool: 'pinta',
        itemId: artRef.creationId,
        name: 'Carta',
        kind: 'pixel-sprite',
        itemUpdatedAt: new Date(),
        revision: 1,
        lastReservedRevision: 1,
        formatVersion: 1,
        bytes: 10,
        storageRef: 'private/artist-sprite.gz',
        syncedAt: new Date(),
        createdAt: new Date(),
      })
      await f.projects.mission(
        artist,
        assetId,
        'complete',
        {
          requestId: randomUUID(),
          baseRevisionId: view.revision!.id,
          contentRevision: 1,
          expectedProgressRevision: 0,
          confirmed: true,
          note: '',
          deliveries: [{ assetSlotId: slotId, creation: artRef }],
        },
        f.capabilities,
      )
      expect((await f.team.art(f.actor, f.projectId)).items).toHaveLength(1)
      await f.team.remove(f.actor, f.projectId, artist.profileId, randomUUID())
      f.capabilities.participants = f.capabilities.participants.filter(
        (p) => p.profileId !== artist.profileId,
      )
      const after = await f.projects.get(f.actor, f.projectId, f.capabilities)
      expect(after.progress.find((p) => p.missionId === assetId)?.validity).toBe('needs_review')
      expect(after.progress.find((p) => p.missionId === f.featureId)?.validity).toBe('current')
      expect(after.availability.find((m) => m.missionId === integrationId)?.reason).toBe(
        'dependency_pending',
      )
      expect((await f.team.art(f.actor, f.projectId)).items).toHaveLength(0)
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'a saved conversion to Pro excludes setup from lifecycle without completing it',
  async () => {
    const f = await nativePensa('pensa_native_pro_conversion_test', true)
    try {
      await f.accept()
      const ref = await f.savedGame()
      await f.conn.db
        .update(creations)
        .set({ kind: 'pro' })
        .where(eq(creations.itemId, ref.creationId))
      f.capabilities.participants[0]!.studioAuthoring = 'code'
      f.capabilities.observedGame = {
        creation: ref,
        authoring: 'code',
        dimension: '2d',
        runtimeExtensionId: null,
        installedExtensionIds: [],
      }
      await f.complete(f.featureId, ref)
      await f.complete(f.finalId, ref)
      const state = await f.projects.get(f.actor, f.projectId, f.capabilities)
      expect(state.nextAction.type).toBe('completed')
      expect(state.progress.find((p) => p.missionId === f.setupId)?.status).toBe('planned')
      expect((await f.projects.list(f.actor, 'active'))[0]).toMatchObject({
        lifecycle: 'completed',
        completedMissions: 2,
        totalMissions: 2,
      })
    } finally {
      await f.conn.close()
    }
  },
  60_000,
)

for (const departure of ['leave', 'purge'] as const)
  test.skipIf(!enabled)(
    `${departure}: a departing owner of an existing asset invalidates its integration and final test`,
    async () => {
      const f = await nativePensa(`pensa_native_existing_asset_${departure}_test`)
      try {
        const artist = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
        const share = await f.team.share(f.actor, f.projectId, randomUUID(), true)
        await f.team.join(artist, randomUUID(), share.shareCode!)
        const slotId = randomUUID()
        f.definition.assetSlots.push({
          id: slotId,
          name: 'Carta já desenhada',
          kind: 'sprite',
          description: 'A carta guardada pela colega.',
          source: 'existing',
          existing: {
            tool: 'pinta',
            profileId: artist.profileId,
            creationId: 'carta',
            saveRevision: '1',
            contentFingerprint: null,
          },
        })
        await f.conn.db.insert(creations).values({
          id: randomUUID(),
          userId: artist.profileId,
          accountId: artist.accountId,
          tool: 'pinta',
          itemId: 'carta',
          name: 'Carta',
          kind: 'pixel-sprite',
          itemUpdatedAt: new Date(),
          revision: 1,
          lastReservedRevision: 1,
          formatVersion: 1,
          bytes: 10,
          storageRef: 'private/existing-carta.gz',
          syncedAt: new Date(),
          createdAt: new Date(),
        })
        f.plan.missions = f.plan.missions.map((mission) =>
          mission.id === f.featureId
            ? { ...mission, kind: 'integration', destination: 'studio', assetSlotIds: [slotId] }
            : mission,
        )
        await f.projects.message(f.actor, f.projectId, {
          requestId: randomUUID(),
          kind: 'planning',
          message: 'Use a carta da colega.',
          baseRevisionId: null,
          missionId: null,
          choice: null,
        })
        await f.accept()
        const ref = await f.savedGame()
        await f.complete(f.featureId, ref)
        await f.complete(f.finalId, ref)
        if (departure === 'leave')
          await f.team.remove(f.actor, f.projectId, artist.profileId, randomUUID())
        else {
          const now = new Date()
          await new DrizzleUserDataPurgeRepository(f.conn.db).purgeForUser({
            userIds: [artist.profileId],
            accountId: artist.accountId,
            cleanup: {
              id: randomUUID(),
              prefixes: [`creations/${artist.profileId}/`],
              notBefore: now,
              createdAt: now,
            },
          })
        }
        const after = await f.projects.get(f.actor, f.projectId, f.capabilities)
        expect(after.progress.find((p) => p.missionId === f.featureId)?.validity).toBe(
          'needs_review',
        )
        expect(after.progress.find((p) => p.missionId === f.finalId)?.validity).toBe('needs_review')
        const saved = await f.conn.db.select().from(creations)
        expect(saved.some((creation) => creation.userId === artist.profileId)).toBe(
          departure === 'leave',
        )
        expect(
          saved.some(
            (creation) => creation.userId === f.actor.profileId && creation.tool === 'studio',
          ),
        ).toBe(true)
        expect(
          (await f.conn.db.select().from(pensaExecutionEvents)).filter(
            (event) => event.kind === 'first_feature',
          ),
        ).toHaveLength(1)
      } finally {
        await f.conn.close()
      }
    },
    60_000,
  )
