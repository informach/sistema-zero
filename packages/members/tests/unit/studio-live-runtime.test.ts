import { expect, test } from 'bun:test'
import { StudioLiveRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { studioLiveRuntimeFixture } from '../fakes/studio-live-runtime'

for (const kind of ['classic', 'pro'] as const) {
  test(`live ${kind} authorizes the actual writer and original curation without changing saved work`, async () => {
    const f = await studioLiveRuntimeFixture(kind)
    const before = structuredClone(f.records.records.get(f.claimed.id))
    const decision = await f.service.execute(f.child, f.request)
    expect(decision.context).toEqual(f.request.context)
    expect(decision.workspaceRevision).toBe(0)
    expect(decision.baselineId).toHaveLength(64)
    expect(decision.curation.pythonLevel).toBe(2)
    expect(decision.capabilities).toEqual(['edit', 'execute', 'export-source', 'assist'])
    expect(decision.expiresAt).toBe(Date.parse(f.claimed.leaseExpiresAt ?? ''))
    expect(f.records.records.get(f.claimed.id)).toEqual(before)
    expect(f.records.revisions.size).toBe(0)
    expect(f.continuation.calls).toBe(0)
    f.block.studio = { pythonLevel: 3 }
    expect((await f.service.execute(f.child, f.request)).curation.pythonLevel).toBe(2)
  })
}

test('runtime rejects observers, a different account, device, epoch, revision and unrelated block', async () => {
  const f = await studioLiveRuntimeFixture()
  const before = structuredClone(f.records.records.get(f.claimed.id))
  await expect(f.service.execute(f.teacher, f.request)).rejects.toThrow()
  await expect(
    f.service.execute({ ...f.child, accountId: crypto.randomUUID() }, f.request),
  ).rejects.toThrow()
  for (const context of [
    { ...f.request.context, deviceId: crypto.randomUUID() },
    { ...f.request.context, writerEpoch: 0 },
    { ...f.request.context, blockId: crypto.randomUUID() },
    { ...f.request.context, sessionId: crypto.randomUUID() },
  ])
    await expect(f.service.execute(f.child, { ...f.request, context })).rejects.toThrow()
  await expect(
    f.service.execute(f.child, { ...f.request, expectedWorkspaceRevision: 7 }),
  ).rejects.toThrow()
  await expect(
    f.service.execute(f.child, {
      ...f.request,
      subject: { ...f.request.subject, id: crypto.randomUUID() },
    }),
  ).rejects.toThrow()
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
})

test('runtime follows autosave revisions but does not renew a lease or authorize old callbacks', async () => {
  const f = await studioLiveRuntimeFixture('pro')
  await f.workspace.commit(f.child, f.claimed.id, {
    project: { ...f.claimed.project, name: 'Editado' },
    expectedRevision: 0,
    writerEpoch: f.claimed.writerEpoch,
    deviceId: f.request.context.deviceId,
    mutationId: crypto.randomUUID(),
  })
  await expect(f.service.execute(f.child, f.request)).rejects.toThrow('revisão mais recente')
  f.request.expectedWorkspaceRevision = 1
  expect((await f.service.execute(f.child, f.request)).workspaceRevision).toBe(1)
  f.advance(20_000)
  expect(
    (await f.service.execute(f.child, f.request)).expiresAt - Date.parse('2026-11-07T17:00:20Z'),
  ).toBe(10_000)
  f.advance(10_000)
  await expect(f.service.execute(f.child, f.request)).rejects.toThrow('autoria mudou')
})

test('an assigned observer can analyze a live project without edit, execution, REPL or a writer lease', async () => {
  const f = await studioLiveRuntimeFixture()
  const request = {
    ...f.request,
    operation: 'analyze' as const,
    context: { ...f.request.context, deviceId: crypto.randomUUID() },
  }
  const before = structuredClone(f.records.records.get(f.claimed.id))
  const decision = await f.service.execute(f.teacher, request)
  // Observers keep only the release-declared assistance, never edit, execute or REPL.
  expect(decision.capabilities).toEqual(['assist'])
  expect(decision.operation).toBe('analyze')
  expect(decision.curation.pythonLevel).toBe(2)
  expect(decision.expiresAt - decision.issuedAt).toBe(30_000)
  for (const operation of ['execute', 'python-repl'] as const)
    await expect(f.service.execute(f.teacher, { ...request, operation })).rejects.toThrow()
  await expect(
    f.service.execute({ ...f.teacher, id: crypto.randomUUID() }, request),
  ).rejects.toThrow()
  await expect(
    f.service.execute(f.teacher, { ...request, context: { ...request.context, writerEpoch: 0 } }),
  ).rejects.toThrow()
  await expect(
    f.service.execute(f.teacher, {
      ...request,
      context: { ...request.context, blockId: crypto.randomUUID() },
    }),
  ).rejects.toThrow()
  await expect(
    f.service.execute(f.teacher, {
      ...request,
      context: { ...request.context, sessionId: null, blockId: null },
    }),
  ).rejects.toThrow()
  f.advance(35_000)
  expect((await f.service.execute(f.teacher, request)).capabilities).toEqual(['assist'])
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
})

test('a lease left over after access expires grants only the owner library analysis', async () => {
  const f = await studioLiveRuntimeFixture()
  const aggregate = f.rooms.cohorts.get(f.cohort.id)
  if (!aggregate?.grants[0]) throw new Error('Expected grant')
  aggregate.grants[0].revokedAt = '2026-11-07T17:00:00Z'
  const before = structuredClone(f.records.records.get(f.claimed.id))
  expect((await f.workspace.get(f.child, f.claimed.id)).readOnly).toBe(true)
  const request = {
    ...f.request,
    operation: 'analyze' as const,
    context: { ...f.request.context, sessionId: null, blockId: null },
  }
  expect((await f.service.execute(f.child, request)).capabilities).toEqual(['assist'])
  for (const operation of ['execute', 'python-repl'] as const)
    await expect(f.service.execute(f.child, { ...request, operation })).rejects.toThrow()
  await expect(
    f.service.execute(f.child, { ...request, context: f.request.context }),
  ).rejects.toThrow()
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
})

test('ending a supervised help session preserves teacher analysis without extending writer rights', async () => {
  const f = await studioLiveRuntimeFixture()
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'start' })
  await f.live.join(f.teacher, f.session.id, { deviceId: crypto.randomUUID(), takeover: false })
  await f.live.join(f.child, f.session.id, {
    deviceId: f.request.context.deviceId,
    takeover: false,
  })
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'admit', learnerId: f.child.id })
  const pending = await f.workspace
    .forSession(f.session.id)
    .requestAssistance(f.teacher, f.claimed.id)
  if (!pending.assistance) throw new Error('Expected assistance')
  await f.workspace
    .forSession(f.session.id)
    .acceptAssistance(f.child, f.claimed.id, pending.assistance.id, {
      deviceId: f.request.context.deviceId,
      writerEpoch: f.claimed.writerEpoch,
      expectedRevision: 0,
      mutationId: crypto.randomUUID(),
      project: f.claimed.project,
    })
  const deviceId = crypto.randomUUID()
  const helping = await f.workspace
    .forSession(f.session.id)
    .attachTeacher(f.teacher, f.claimed.id, deviceId)
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'end' })
  const before = structuredClone(f.records.records.get(f.claimed.id))
  const request = {
    ...f.request,
    operation: 'analyze' as const,
    expectedWorkspaceRevision: helping.revision,
    context: { ...f.request.context, writerEpoch: helping.writerEpoch, deviceId },
  }
  expect((await f.workspace.forSession(f.session.id).get(f.teacher, f.claimed.id)).id).toBe(
    f.claimed.id,
  )
  expect((await f.service.execute(f.teacher, request)).capabilities).toEqual(['assist'])
  for (const operation of ['execute', 'python-repl'] as const)
    await expect(f.service.execute(f.teacher, { ...request, operation })).rejects.toThrow()
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
})

test('accepted teacher help is bound to presence, device and epoch; returning it revokes execution', async () => {
  const f = await studioLiveRuntimeFixture('pro')
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'start' })
  await f.live.join(f.teacher, f.session.id, { deviceId: crypto.randomUUID(), takeover: false })
  await f.live.join(f.child, f.session.id, {
    deviceId: f.request.context.deviceId,
    takeover: false,
  })
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'admit', learnerId: f.child.id })
  const pending = await f.workspace
    .forSession(f.session.id)
    .requestAssistance(f.teacher, f.claimed.id)
  if (!pending.assistance) throw new Error('Expected request')
  await f.workspace
    .forSession(f.session.id)
    .acceptAssistance(f.child, f.claimed.id, pending.assistance.id, {
      deviceId: f.request.context.deviceId,
      writerEpoch: f.claimed.writerEpoch,
      expectedRevision: 0,
      mutationId: crypto.randomUUID(),
      project: f.claimed.project,
    })
  const teacherDevice = crypto.randomUUID()
  const helping = await f.workspace
    .forSession(f.session.id)
    .attachTeacher(f.teacher, f.claimed.id, teacherDevice)
  const request = {
    ...f.request,
    expectedWorkspaceRevision: helping.revision,
    context: { ...f.request.context, writerEpoch: helping.writerEpoch, deviceId: teacherDevice },
  }
  expect((await f.service.execute(f.teacher, request)).actor.userId).toBe(f.teacher.id)
  await expect(
    f.service.execute(f.teacher, {
      ...request,
      context: { ...request.context, sessionId: null, blockId: null },
    }),
  ).rejects.toThrow('biblioteca pertence')
  await expect(f.service.execute(f.child, f.request)).rejects.toThrow()
  await f.workspace
    .forSession(f.session.id)
    .revoke(f.child, f.claimed.id, f.request.context.deviceId)
  await expect(f.service.execute(f.teacher, request)).rejects.toThrow()
})

test('library continuation rechecks entitlement and writer after the product lookup', async () => {
  const f = await studioLiveRuntimeFixture()
  const aggregate = f.rooms.cohorts.get(f.cohort.id)
  if (!aggregate?.grants[0]) throw new Error('Expected grant')
  aggregate.grants[0].revokedAt = '2026-11-07T17:00:00Z'
  await expect(f.service.execute(f.child, f.request)).rejects.toThrow()
  const request = {
    ...f.request,
    context: { ...f.request.context, sessionId: null, blockId: null },
  }
  await expect(f.service.execute(f.child, request)).rejects.toThrow()
  f.continuation.available = true
  const decision = await f.service.execute(f.child, request)
  expect(decision.baselineId).toBeNull()
  expect(decision.curation).toEqual({})
  f.continuation.onCheck = async () => {
    const current = f.records.records.get(f.claimed.id)
    if (!current) throw new Error('Expected project')
    current.writerEpoch++
  }
  await expect(f.service.execute(f.child, request)).rejects.toThrow('autoria mudou')
})

test('live request refuses partial context and forged source/capability fields', async () => {
  const f = await studioLiveRuntimeFixture()
  for (const value of [
    { ...f.request, context: { ...f.request.context, blockId: null } },
    { ...f.request, capabilities: ['execute'] },
    { ...f.request, subject: { ...f.request.subject, files: { 'main.py': 'print(1)' } } },
  ])
    expect(StudioLiveRuntimeRequestSchema.safeParse(value).success).toBe(false)
})
