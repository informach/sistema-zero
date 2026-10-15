import { describe, expect, test } from 'bun:test'
import { createBlankProjectSnapshot as createEmptyProject } from '@sistemazero/studio/blank-project'
import type { LiveContext } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import { LiveAccessError, LiveNotFoundError } from '../../src/domain/live/live.errors'
import type { LiveStudioBlockRecord } from '../../src/domain/ports/live-course.port'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceRevision,
} from '../../src/domain/ports/live-workspace-repository.port'

const ids = {
  session: '00000000-0000-4000-8000-000000000001',
  child: '00000000-0000-4000-8000-000000000002',
  teacher: '00000000-0000-4000-8000-000000000003',
  account: '00000000-0000-4000-8000-000000000004',
  device: '00000000-0000-4000-8000-000000000005',
  teacherDevice: '00000000-0000-4000-8000-000000000006',
  course: '00000000-0000-4000-8000-000000000007',
  lesson: '00000000-0000-4000-8000-000000000008',
  block: '00000000-0000-4000-8000-000000000009',
}
function setup(
  continuation = false,
  recording?: { confirmPaused(occurrenceId: string): Promise<void> },
) {
  let now = new Date('2026-11-07T17:30:00Z')
  const child: LiveActor = { id: ids.child, accountId: ids.account, name: 'Alice', staff: false }
  const teacher: LiveActor = {
    id: ids.teacher,
    accountId: ids.teacher,
    name: 'Professora',
    staff: true,
  }
  const records = new Map<string, LiveWorkspaceRecord>()
  const revisions = new Map<string, LiveWorkspaceRevision>()
  /** Cohort loads: through the pool (outside locks) and through a write transaction. */
  const loads = { pool: 0, transaction: 0, continuationInsideLock: 0, continuation: 0 }
  let insideLock = false
  const context = {
    session: {
      id: ids.session,
      order: 0,
      cohortId: 'cohort',
      lessonId: ids.lesson,
      plan: { title: 'Cadê, Todo Mundo?', starterProjectId: null },
    },
    occurrence: {
      id: ids.session,
      state: 'live',
      startsAt: '2026-11-07T17:00:00Z',
      hardEndsAt: '2026-11-07T19:00:00Z',
      teachers: { [ids.teacher]: now.toISOString() },
      recording: { state: 'not_started' },
      participants: [{ learnerId: ids.child, deviceId: ids.device, admission: 'admitted' }],
    },
    aggregate: {
      cohort: { teacherIds: [ids.teacher], courseId: ids.course },
      enrollments: [
        { id: 'enrollment', learnerId: ids.child, accountId: ids.account, status: 'active' },
      ],
      grants: [
        {
          enrollmentId: 'enrollment',
          sessionId: ids.session,
          startsAt: '2026-11-07T17:00:00Z',
          endsAt: '2026-12-07T17:00:00Z',
          revokedAt: null,
        },
      ],
    },
  } as unknown as LiveContext
  context.aggregate.occurrences = [context.occurrence]
  context.aggregate.sessions = [context.session]
  /** Studio blocks of the published lessons (`lessonId:blockId`). */
  const blocks = new Map<string, LiveStudioBlockRecord>([
    [
      `${ids.lesson}:${ids.block}`,
      {
        blockId: ids.block,
        lessonId: ids.lesson,
        courseId: ids.course,
        chain: null,
        initialProject: null,
        studio: { level: 'iniciante', allowedModes: ['blocks'] },
      },
    ],
  ])
  const repository: LiveWorkspaceRepository = {
    find: async (id) => structuredClone(records.get(id) ?? null),
    listOwned: async (accountId, learnerId) =>
      [...records.values()]
        .filter((record) => record.accountId === accountId && record.learnerId === learnerId)
        .map((record) => structuredClone(record)),
    findByKey: async (learnerId, projectKey) =>
      structuredClone(
        [...records.values()].find(
          (record) => record.learnerId === learnerId && record.projectKey === projectKey,
        ) ?? null,
      ),
    ensureByKey: async (record) => {
      const previous = [...records.values()].find(
        (r) => r.projectKey === record.projectKey && r.learnerId === record.learnerId,
      )
      if (previous) return structuredClone(previous)
      records.set(record.id, structuredClone(record))
      return structuredClone(record)
    },
    linkLesson: async (id, input) => {
      const record = records.get(id)
      if (!record) throw new Error('Missing workspace')
      if (!record.lessonIds.includes(input.lessonId)) record.lessonIds.push(input.lessonId)
      return structuredClone(record)
    },
    transaction: async (id, mutate) => {
      const record = records.get(id)
      if (!record) throw new Error('Missing workspace')
      insideLock = true
      const workspace = structuredClone(record)
      const added: LiveWorkspaceRevision[] = []
      const result = await mutate({
        workspace,
        findMutation: async (mutation) => revisions.get(mutation) ?? null,
        appendRevision: async (revision) => {
          added.push(revision)
        },
        teacherHasActiveWorkspace: async () => false,
        loadCohort: async () => {
          loads.transaction++
          return context.aggregate
        },
      }).finally(() => {
        insideLock = false
      })
      records.set(id, workspace)
      for (const revision of added) revisions.set(revision.mutationId, revision)
      return result
    },
  }
  const service = new LiveWorkspaceService(
    repository,
    {
      cohortForSession: async () => {
        loads.pool++
        if (insideLock) throw new Error('Second pool connection while holding the locks')
        return context.aggregate
      },
      contextFor: (actor, aggregate, sessionId) => ({
        ...context,
        aggregate,
        session: aggregate.sessions.find((item) => item.id === sessionId) ?? context.session,
        role: actor.id === ids.teacher ? 'teacher' : 'learner',
        grant: aggregate.grants.find((item) => item.sessionId === sessionId)!,
      }),
      studioBlock: async (lessonId, blockId) =>
        structuredClone(blocks.get(`${lessonId}:${blockId}`) ?? null),
    },
    () => now,
    recording,
    {
      canContinue: async () => {
        loads.continuation++
        if (insideLock) loads.continuationInsideLock++
        return continuation
      },
    },
  )
  return {
    service,
    child,
    teacher,
    records,
    revisions,
    context,
    blocks,
    loads,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms)
      context.occurrence.teachers[ids.teacher] = now.toISOString()
    },
  }
}

describe('live project writer ownership', () => {
  test('declining a pending request preserves the child writer and pending commit epoch', async () => {
    const { service, child, teacher } = setup()
    const opened = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const claimed = await service.claim(child, opened.id, ids.device, false)
    await service.requestAssistance(teacher, opened.id)
    const declined = await service.revoke(child, opened.id, ids.device)
    expect(declined.assistance).toBeNull()
    expect(declined.writerEpoch).toBe(claimed.writerEpoch)
    expect(declined.writerDeviceId).toBe(ids.device)
    const saved = await service.commit(child, opened.id, {
      deviceId: ids.device,
      expectedRevision: 0,
      writerEpoch: claimed.writerEpoch,
      mutationId: crypto.randomUUID(),
      project: { ...claimed.project, name: 'Minha edição recente' },
    })
    expect(saved.project.name).toBe('Minha edição recente')
  })
  test('the requesting teacher can cancel only the matching pending request', async () => {
    const { service, child, teacher } = setup()
    const opened = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const claimed = await service.claim(child, opened.id, ids.device, false)
    const requested = await service.requestAssistance(teacher, opened.id)
    await expect(
      service.cancelAssistance(teacher, opened.id, crypto.randomUUID()),
    ).rejects.toThrow()
    const cancelled = await service.cancelAssistance(teacher, opened.id, requested.assistance!.id)
    expect(cancelled.assistance).toBeNull()
    expect(cancelled.writerEpoch).toBe(claimed.writerEpoch)
    const next = await service.requestAssistance(teacher, opened.id)
    await expect(
      service.cancelAssistance(teacher, opened.id, requested.assistance!.id),
    ).rejects.toThrow()
    expect((await service.get(teacher, opened.id)).assistance?.id).toBe(next.assistance!.id)
  })
  test('unanswered requests expire without changing child authorship', async () => {
    const { service, child, teacher, advance } = setup()
    const opened = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const claimed = await service.claim(child, opened.id, ids.device, false)
    await service.requestAssistance(teacher, opened.id)
    advance(60_001)
    const expired = await service.get(child, opened.id)
    expect(expired.assistance).toBeNull()
    expect(expired.writerEpoch).toBe(claimed.writerEpoch)
  })
  test('reopening on the same device fences pending commits from the earlier editor instance', async () => {
    const { service, child } = setup()
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const first = await service.claim(child, workspace.id, ids.device, false)
    const reopened = await service.claim(child, workspace.id, ids.device, false)
    expect(reopened.writerEpoch).toBeGreaterThan(first.writerEpoch)
    await expect(
      service.commit(child, workspace.id, {
        deviceId: ids.device,
        expectedRevision: 0,
        writerEpoch: first.writerEpoch,
        mutationId: crypto.randomUUID(),
        project: first.project,
      }),
    ).rejects.toThrow('autoria mudou')
  })
  test('after hard end an abandoned live state does not lock the replay project to its old device', async () => {
    const { service, child, advance, context } = setup()
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    await service.claim(child, workspace.id, ids.device, false)
    advance(2 * 60 * 60 * 1000)
    expect(context.occurrence.state).toBe('live')
    const claimed = await service.claim(child, workspace.id, ids.teacherDevice, false)
    expect(claimed.writerDeviceId).toBe(ids.teacherDevice)
  })
  test('poll omits unchanged project assets but keeps authorization on every request', async () => {
    const { service, child } = setup()
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const unchanged = await service.poll(child, workspace.id, 0)
    expect(unchanged.project).toBeUndefined()
    const claimed = await service.claim(child, workspace.id, ids.device, false)
    await service.commit(child, workspace.id, {
      deviceId: ids.device,
      expectedRevision: 0,
      writerEpoch: claimed.writerEpoch,
      mutationId: crypto.randomUUID(),
      project: claimed.project,
    })
    expect((await service.poll(child, workspace.id, 0)).project?.id).toBe(workspace.id)
    await expect(
      service.poll({ ...child, accountId: ids.teacher }, workspace.id, 1),
    ).rejects.toThrow()
  })
  test('subscription continues the same expired workspace without reopening a lesson or another family', async () => {
    const { service, child, advance } = setup(true)
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    advance(31 * 24 * 60 * 60 * 1000)
    expect((await service.get(child, workspace.id)).id).toBe(workspace.id)
    expect((await service.listOwned(child)).workspaces[0]?.canEdit).toBe(true)
    const claimed = await service.claim(child, workspace.id, ids.device, false)
    expect(
      (
        await service.commit(child, workspace.id, {
          deviceId: ids.device,
          expectedRevision: 0,
          writerEpoch: claimed.writerEpoch,
          mutationId: crypto.randomUUID(),
          project: claimed.project,
        })
      ).revision,
    ).toBe(1)
    // Through the closed lesson the project only opens to read (the library keeps editing).
    expect((await service.openForBlock(child, ids.session, ids.block, ids.child)).readOnly).toBe(
      true,
    )
    await expect(service.get({ ...child, accountId: ids.teacher }, workspace.id)).rejects.toThrow()
    expect((await service.listOwned({ ...child, accountId: ids.teacher })).workspaces).toEqual([])
  })
  test('without a subscription expiry keeps the project readable (view/export) but never writable', async () => {
    const { service, child, teacher, advance } = setup()
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const claimed = await service.claim(child, workspace.id, ids.device, false)
    advance(31 * 24 * 60 * 60 * 1000)
    const readable = await service.get(child, workspace.id)
    expect(readable.readOnly).toBe(true)
    expect(readable.project.id).toBe(workspace.id)
    expect((await service.poll(child, workspace.id, 0)).readOnly).toBe(true)
    // The assigned teacher can still review it; another family cannot.
    expect((await service.get(teacher, workspace.id)).readOnly).toBe(true)
    await expect(service.get({ ...child, accountId: ids.teacher }, workspace.id)).rejects.toThrow()
    await expect(
      service.get({ ...teacher, id: crypto.randomUUID() }, workspace.id),
    ).rejects.toThrow()
    // An explicit lesson context never turns into a read-only bypass for the child.
    await expect(service.forSession(ids.session).get(child, workspace.id)).rejects.toThrow()
    // Every write path stays closed.
    await expect(service.claim(child, workspace.id, ids.device, true)).rejects.toThrow()
    await expect(
      service.renew(child, workspace.id, ids.device, claimed.writerEpoch),
    ).rejects.toThrow()
    await expect(
      service.commit(child, workspace.id, {
        deviceId: ids.device,
        expectedRevision: 0,
        writerEpoch: claimed.writerEpoch,
        mutationId: crypto.randomUUID(),
        project: claimed.project,
      }),
    ).rejects.toThrow()
    await expect(service.requestAssistance(teacher, workspace.id)).rejects.toThrow()
    await expect(service.showcaseSnapshot(child, workspace.id, 1)).rejects.toThrow()
    expect((await service.listOwned(child)).workspaces[0]).toMatchObject({
      canEdit: false,
      readOnly: true,
    })
  })
  test('writes read the cohort through their own transaction and ask the subscription outside it', async () => {
    const { service, child, advance, loads } = setup(true)
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    const before = { ...loads }
    const claimed = await service.claim(child, workspace.id, ids.device, false)
    await service.commit(child, workspace.id, {
      deviceId: ids.device,
      expectedRevision: 0,
      writerEpoch: claimed.writerEpoch,
      mutationId: crypto.randomUUID(),
      project: claimed.project,
    })
    // One cohort read per write transaction (cached across the checks), none through the pool.
    expect(loads.pool).toBe(before.pool)
    expect(loads.transaction - before.transaction).toBe(2)
    // After the lesson window the subscription decides, but never while the locks are held.
    advance(31 * 24 * 60 * 60 * 1000)
    const renewed = await service.claim(child, workspace.id, ids.device, true)
    expect(renewed.writerId).toBe(ids.child)
    expect(loads.continuation).toBeGreaterThan(0)
    expect(loads.continuationInsideLock).toBe(0)
  })
  test('an unchanged poll reuses a recent authorization instead of reloading the cohort', async () => {
    const { service, child, advance, loads } = setup()
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    await service.poll(child, workspace.id, 0)
    const after = loads.pool
    await service.poll(child, workspace.id, 0)
    await service.forSession().poll(child, workspace.id, 0)
    expect(loads.pool).toBe(after)
    // A different identity is never served from another one's authorization.
    await expect(
      service.poll({ ...child, accountId: ids.teacher }, workspace.id, 0),
    ).rejects.toThrow()
    advance(5_001)
    await service.poll(child, workspace.id, 0)
    expect(loads.pool).toBeGreaterThan(after + 1)
  })
  test('subscription does not bypass the active room device or publish another revision', async () => {
    const { service, child, teacher } = setup(true)
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    await expect(service.claim(child, workspace.id, ids.teacherDevice, true)).rejects.toThrow(
      'outro aparelho',
    )
    const claimed = await service.claim(child, workspace.id, ids.device, false)
    await service.commit(child, workspace.id, {
      deviceId: ids.device,
      expectedRevision: 0,
      writerEpoch: claimed.writerEpoch,
      mutationId: crypto.randomUUID(),
      project: claimed.project,
    })
    expect((await service.showcaseSnapshot(child, workspace.id, 1)).project.id).toBe(workspace.id)
    await expect(service.showcaseSnapshot(child, workspace.id, 2)).rejects.toThrow(
      'Guarde o projeto',
    )
    await expect(service.showcaseSnapshot(teacher, workspace.id, 1)).rejects.toThrow()
    await expect(
      service.showcaseSnapshot({ ...child, accountId: ids.teacher }, workspace.id, 1),
    ).rejects.toThrow()
  })
  test('child consent commits a durable checkpoint and fences old autosave', async () => {
    const { service, child, teacher, revisions } = setup()
    let workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    workspace = await service.claim(child, workspace.id, ids.device, false)
    const oldEpoch = workspace.writerEpoch
    workspace = await service.requestAssistance(teacher, workspace.id)
    expect(workspace.writerId).toBe(ids.child)
    workspace = await service.acceptAssistance(child, workspace.id, workspace.assistance!.id, {
      deviceId: ids.device,
      writerEpoch: oldEpoch,
      expectedRevision: 0,
      mutationId: crypto.randomUUID(),
      project: workspace.project,
    })
    expect(revisions.size).toBe(1)
    expect(workspace.writerId).toBe(ids.teacher)
    await expect(
      service.commit(child, workspace.id, {
        deviceId: ids.device,
        writerEpoch: oldEpoch,
        expectedRevision: 1,
        mutationId: crypto.randomUUID(),
        project: workspace.project,
      }),
    ).rejects.toThrow('autoria mudou')
    workspace = await service.attachTeacher(teacher, workspace.id, ids.teacherDevice)
    workspace = await service.returnAuthorship(teacher, workspace.id, {
      deviceId: ids.teacherDevice,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: workspace.revision,
      mutationId: crypto.randomUUID(),
      project: workspace.project,
    })
    expect(workspace.assistance?.status).toBe('returning')
    await expect(service.acknowledgeReturn(child, workspace.id, 0, ids.device)).rejects.toThrow(
      'revisão final',
    )
    workspace = await service.acknowledgeReturn(child, workspace.id, workspace.revision, ids.device)
    expect(workspace.writerId).toBe(ids.child)
    expect(workspace.assistance).toBeNull()
  })
  test('failed recording does not authorize a handoff', async () => {
    const { service, child, teacher, context } = setup()
    let workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    workspace = await service.claim(child, workspace.id, ids.device, false)
    workspace = await service.requestAssistance(teacher, workspace.id)
    context.occurrence.recording.state = 'failed'
    await expect(
      service.acceptAssistance(child, workspace.id, workspace.assistance!.id, {
        deviceId: ids.device,
        writerEpoch: workspace.writerEpoch,
        expectedRevision: 0,
        mutationId: crypto.randomUUID(),
        project: workspace.project,
      }),
    ).rejects.toThrow('pausa da gravação')
    expect((await service.get(child, workspace.id)).writerId).toBe(ids.child)
  })
  test('finalized recording requires receiver confirmation before a later assistance', async () => {
    let confirmed = false
    let checks = 0
    const { service, child, teacher, context } = setup(false, {
      async confirmPaused(occurrenceId) {
        expect(occurrenceId).toBe(ids.session)
        checks++
        if (!confirmed) throw new Error('Receiver unavailable')
      },
    })
    let workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    workspace = await service.claim(child, workspace.id, ids.device, false)
    workspace = await service.requestAssistance(teacher, workspace.id)
    context.occurrence.recording.state = 'review'
    const input = {
      deviceId: ids.device,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: 0,
      mutationId: crypto.randomUUID(),
      project: workspace.project,
    }
    await expect(
      service.acceptAssistance(child, workspace.id, workspace.assistance!.id, input),
    ).rejects.toThrow('Receiver unavailable')
    expect((await service.get(child, workspace.id)).writerId).toBe(ids.child)
    confirmed = true
    const active = await service.acceptAssistance(
      child,
      workspace.id,
      workspace.assistance!.id,
      input,
    )
    expect(active.writerId).toBe(ids.teacher)
    expect(active.assistance?.checkpointRevision).toBe(1)
    expect(context.occurrence.recording.state).toBe('review')
    expect(checks).toBe(2)
  })
  test('expired leases, cross-family access and stale revisions cannot write', async () => {
    const { service, child, advance } = setup()
    let workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    await expect(service.get({ ...child, accountId: ids.teacher }, workspace.id)).rejects.toThrow()
    workspace = await service.claim(child, workspace.id, ids.device, false)
    const input = {
      deviceId: ids.device,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: 0,
      mutationId: crypto.randomUUID(),
      project: workspace.project,
    }
    const saved = await service.commit(child, workspace.id, input)
    expect((await service.commit(child, workspace.id, input)).revision).toBe(saved.revision)
    await expect(
      service.commit(child, workspace.id, { ...input, mutationId: crypto.randomUUID() }),
    ).rejects.toThrow('revisão mais recente')
    advance(30_001)
    await expect(
      service.renew(child, workspace.id, ids.device, workspace.writerEpoch),
    ).rejects.toThrow('autoria mudou')
  })
  test('self-contained starter projects stay isolated per learner', async () => {
    const { service, child } = setup()
    const workspace = await service.openForBlock(child, ids.session, ids.block, ids.child)
    expect(workspace.project.id).toBe(workspace.id)
    expect(workspace.project.formatVersion).toEqual(
      createEmptyProject(workspace.id, 'Example').formatVersion,
    )
    expect((await service.openForBlock(child, ids.session, ids.block, ids.child)).id).toBe(
      workspace.id,
    )
  })
})

describe('projeto ao vivo por bloco Estúdio da aula publicada', () => {
  test('semente do bloco, curadoria na view, um projeto por bloco e nada fora da aula', async () => {
    const { service, child, teacher, blocks, records } = setup()
    const seed = createEmptyProject(crypto.randomUUID(), 'Cenário da fase')
    const other = {
      blockId: crypto.randomUUID(),
      lessonId: ids.lesson,
      courseId: ids.course,
      chain: null,
      initialProject: { ...seed, files: { ...seed.files, 'script.js': '// pronto' } },
      studio: { allowBlocks: ['move_steps'] },
    }
    blocks.set(`${ids.lesson}:${other.blockId}`, other)
    const first = await service.openForBlock(child, ids.session, ids.block)
    expect(first.studio).toEqual({ level: 'iniciante', allowedModes: ['blocks'] })
    const second = await service.openForBlock(child, ids.session, other.blockId)
    expect(second.id).not.toBe(first.id)
    expect(second.project.id).toBe(second.id)
    expect(second.project.name).toBe('Cenário da fase')
    expect((second.project.files as Record<string, string>)['script.js']).toBe('// pronto')
    expect(second.studio).toEqual({ allowBlocks: ['move_steps'] })
    // The wire view never carries the internal key nor the linked lessons.
    expect(second).not.toHaveProperty('projectKey')
    expect(second).not.toHaveProperty('lessonIds')
    expect(records.get(second.id)?.projectKey).toBe(`course:${ids.course}:block:${other.blockId}`)
    // A block that is not a Studio block of the published lesson does not open anything.
    await expect(
      service.openForBlock(child, ids.session, crypto.randomUUID()),
    ).rejects.toBeInstanceOf(LiveNotFoundError)
    // The teacher opens the child's project; a child never opens a classmate's.
    expect((await service.openForBlock(teacher, ids.session, ids.block, ids.child)).id).toBe(
      first.id,
    )
    await expect(
      service.openForBlock(child, ids.session, ids.block, ids.teacher),
    ).rejects.toBeInstanceOf(LiveAccessError)
  })

  test('depois do prazo: o projeto existente só para ver; nenhum projeto novo', async () => {
    const { service, child, blocks, advance } = setup()
    const opened = await service.openForBlock(child, ids.session, ids.block)
    const later = { ...blocks.get(`${ids.lesson}:${ids.block}`)!, blockId: crypto.randomUUID() }
    blocks.set(`${ids.lesson}:${later.blockId}`, later)
    advance(31 * 24 * 60 * 60 * 1000)
    const readable = await service.openForBlock(child, ids.session, ids.block)
    expect(readable.id).toBe(opened.id)
    expect(readable.readOnly).toBe(true)
    expect(readable.studio).toEqual({ level: 'iniciante', allowedModes: ['blocks'] })
    await expect(service.openForBlock(child, ids.session, later.blockId)).rejects.toBeInstanceOf(
      LiveAccessError,
    )
  })
})

test('the chain of the block makes one project across lessons, each with its own window', async () => {
  const { service, child, context, blocks, records, advance } = setup()
  blocks.get(`${ids.lesson}:${ids.block}`)!.chain = 'meu-jogo'
  const opened = await service.openForBlock(child, ids.session, ids.block)
  const lesson = crypto.randomUUID()
  const second = { ...context.session, id: crypto.randomUUID(), order: 1, lessonId: lesson }
  context.aggregate.sessions.push(second)
  context.aggregate.grants.push({
    ...context.aggregate.grants[0]!,
    sessionId: second.id,
    startsAt: '2026-12-08T17:00:00Z',
    endsAt: '2027-01-07T17:00:00Z',
  })
  const block = { ...blocks.get(`${ids.lesson}:${ids.block}`)!, blockId: crypto.randomUUID() }
  block.lessonId = lesson
  blocks.set(`${lesson}:${block.blockId}`, block)
  // Before the second lesson opens, its encounter does not link (nor edit through) the project.
  const early = await service.openForBlock(child, second.id, block.blockId)
  expect(early.id).toBe(opened.id)
  expect(early.readOnly).toBe(true)
  expect(records.get(opened.id)?.lessonIds).toEqual([ids.lesson])
  await expect(service.forSession(second.id).get(child, opened.id)).rejects.toThrow()
  advance(31 * 86400_000)
  const continued = await service.openForBlock(child, second.id, block.blockId)
  expect(continued.id).toBe(opened.id)
  expect(continued.contextSessionId).toBe(second.id)
  expect(continued.readOnly).toBeUndefined()
  expect(records.get(opened.id)?.lessonIds).toEqual([ids.lesson, lesson])
  // The first lesson's window is over: its explicit context no longer edits the project.
  await expect(service.forSession(ids.session).get(child, opened.id)).rejects.toThrow()
  await expect(service.forSession(crypto.randomUUID()).get(child, opened.id)).rejects.toThrow()
  await expect(
    service.openForBlock({ ...child, accountId: crypto.randomUUID() }, second.id, block.blockId),
  ).rejects.toThrow()
})
