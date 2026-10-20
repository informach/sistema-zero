import { expect, spyOn, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioLiveProBuildRequestSchema } from '@sistemazero/core/studio/live-pro-runtime'
import { AuthorizeLiveRuntimeService } from '../../src/application/studio/authorize-live-runtime.service'
import { studioLiveRuntimeFixture } from '../fakes/studio-live-runtime'

async function setup() {
  const f = await studioLiveRuntimeFixture('pro', 'javascript')
  const request = { context: f.request.context, expectedWorkspaceRevision: 0 }
  return { ...f, proRequest: request }
}

test('saved JS Pro is read-only, exact and authorized by the current writer', async () => {
  const f = await setup()
  const before = structuredClone(f.records.records.get(f.claimed.id))
  if (!before) throw new Error('The fixture must contain its saved workspace')
  const result = await f.service.proSnapshot(f.child, f.proRequest)
  expect(result.project).toEqual(before.project)
  expect(result.projectSha256).toBe(await sha256Hex(canonicalJson(before.project)))
  expect(result.workspaceRevision).toBe(0)
  expect(result.templateId).toBe('vanilla-js')
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  expect(f.records.revisions.size).toBe(0)
})

test('observers, wrong accounts/devices/epochs/revisions/blocks and expired leases cannot read build sources', async () => {
  const f = await setup()
  const before = structuredClone(f.records.records.get(f.claimed.id))
  const find = spyOn(f.records, 'find')
  for (const [actor, request] of [
    [f.teacher, f.proRequest],
    [{ ...f.child, accountId: crypto.randomUUID() }, f.proRequest],
    [f.child, { ...f.proRequest, expectedWorkspaceRevision: 1 }],
    ...['deviceId', 'blockId', 'sessionId'].map(
      (field) =>
        [
          f.child,
          { ...f.proRequest, context: { ...f.proRequest.context, [field]: crypto.randomUUID() } },
        ] as const,
    ),
    [f.child, { ...f.proRequest, context: { ...f.proRequest.context, writerEpoch: 0 } }],
  ] as const) {
    const error = await f.service.proSnapshot(actor, request).then(
      () => null,
      (error) => error,
    )
    expect(error).toBeInstanceOf(Error)
  }
  f.advance(30_000)
  expect(
    await f.service.proSnapshot(f.child, f.proRequest).then(
      () => null,
      (error) => error,
    ),
  ).toBeInstanceOf(Error)
  expect(find).not.toHaveBeenCalled()
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  find.mockRestore()
})

test('source read is fenced against a writer change while the repository awaits', async () => {
  const f = await setup()
  const original = f.records.find.bind(f.records)
  const find = spyOn(f.records, 'find').mockImplementation(async (id) => {
    const result = await original(id)
    const stored = f.records.records.get(id)
    if (!stored) throw new Error('Missing fixture')
    stored.writerEpoch++
    return result
  })
  expect(
    await f.service.proSnapshot(f.child, f.proRequest).then(
      () => null,
      (error) => error,
    ),
  ).toBeInstanceOf(Error)
  expect(f.records.records.get(f.claimed.id)?.revision).toBe(0)
  expect(f.records.revisions.size).toBe(0)
  find.mockRestore()
})

test('JS legacy does not require a fabricated runtime, but v3 cannot bypass missing/revoked policy', async () => {
  const f = await setup()
  const noPolicy = new AuthorizeLiveRuntimeService(f.workspace, undefined, () =>
    Date.parse('2026-11-07T17:00:00Z'),
  )
  expect(
    await noPolicy.proSnapshot(f.child, f.proRequest).then(
      () => null,
      (error) => error,
    ),
  ).toBeInstanceOf(Error)
  const rejectPolicy = new AuthorizeLiveRuntimeService(f.workspace, {
    authorize() {
      throw new Error('Revoked release')
    },
    authorizeProBuild() {
      throw new Error('Revoked release')
    },
  })
  expect(
    await rejectPolicy.proSnapshot(f.child, f.proRequest).then(
      () => null,
      (error) => error,
    ),
  ).toBeInstanceOf(Error)

  // Continuation keeps the same saved legacy document, without a v3 lesson binding.
  const record = f.records.records.get(f.claimed.id)
  if (!record) throw new Error('Missing fixture')
  const { runtime: _runtime, programmingLanguage: _language, ...legacy } = record.project
  record.project = { ...legacy, formatVersion: 2 }
  f.continuation.available = true
  const request = {
    ...f.proRequest,
    context: { ...f.proRequest.context, sessionId: null, blockId: null },
  }
  const before = structuredClone(record)
  const result = await noPolicy.proSnapshot(f.child, request)
  expect(result.project).toEqual(before.project)
  expect(result.project.runtime).toBeUndefined()
  expect(f.records.records.get(record.id)).toEqual(before)
})

test('Python and classic snapshots are not accepted by the JS Pro operation', async () => {
  for (const [language, kind] of [
    ['python', 'pro'],
    ['javascript', 'classic'],
  ] as const) {
    const f = await studioLiveRuntimeFixture(kind, language)
    expect(
      await f.service
        .proSnapshot(f.child, {
          context: f.request.context,
          expectedWorkspaceRevision: 0,
        })
        .then(
          () => null,
          (error) => error,
        ),
    ).toBeInstanceOf(Error)
  }
})

test('public request is compact and cannot carry sources, grants or a template', () => {
  const input = {
    context: {
      kind: 'live',
      workspaceId: crypto.randomUUID(),
      sessionId: null,
      blockId: null,
      deviceId: crypto.randomUUID(),
      writerEpoch: 1,
    },
    expectedWorkspaceRevision: 0,
  }
  expect(StudioLiveProBuildRequestSchema.safeParse(input).success).toBe(true)
  for (const field of ['project', 'templateId', 'capabilities', 'runtimeUrl'])
    expect(StudioLiveProBuildRequestSchema.safeParse({ ...input, [field]: 'forged' }).success).toBe(
      false,
    )
})

test('accepted help authorizes the teacher until the owner revokes it, without renewing it', async () => {
  const f = await setup()
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'start' })
  await f.live.join(f.teacher, f.session.id, { deviceId: crypto.randomUUID(), takeover: false })
  await f.live.join(f.child, f.session.id, {
    deviceId: f.request.context.deviceId,
    takeover: false,
  })
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'admit', learnerId: f.child.id })
  const room = f.workspace.forSession(f.session.id)
  const pending = await room.requestAssistance(f.teacher, f.claimed.id)
  if (!pending.assistance) throw new Error('Expected request')
  await room.acceptAssistance(f.child, f.claimed.id, pending.assistance.id, {
    deviceId: f.request.context.deviceId,
    writerEpoch: f.claimed.writerEpoch,
    expectedRevision: 0,
    mutationId: crypto.randomUUID(),
    project: f.claimed.project,
  })
  const deviceId = crypto.randomUUID()
  const helping = await room.attachTeacher(f.teacher, f.claimed.id, deviceId)
  const request = {
    expectedWorkspaceRevision: helping.revision,
    context: { ...f.request.context, writerEpoch: helping.writerEpoch, deviceId },
  }
  const before = structuredClone(f.records.records.get(f.claimed.id))
  expect((await f.service.proSnapshot(f.teacher, request)).actor.userId).toBe(f.teacher.id)
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  await room.revoke(f.child, f.claimed.id, f.request.context.deviceId)
  expect(
    await f.service.proSnapshot(f.teacher, request).then(
      () => null,
      (error) => error,
    ),
  ).toBeInstanceOf(Error)
})
