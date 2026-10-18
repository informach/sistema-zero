import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { awaitWithSignal } from '@sistemazero/core/http'
import { defaultLessonSection, type SectionProjectLiveContext } from '@sistemazero/core/learning'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import { createStudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { PythonActivityInspectionService } from '../../src/application/studio/python-activity-inspection.service'
import { stableJson } from '../../src/domain/shared/stable-json'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { studioLiveRuntimeFixture } from '../fakes/studio-live-runtime'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '22222222-2222-2222-2222-222222222222'

test.each([
  'checkProject',
  'submit',
  'gallery',
] as const)('withdrawn %s cannot settle a section after a late authorization read', async (operation) => {
  const env = await setup()
  const owner = { userId: USER, accountId: USER, privileged: false }
  const sectionRevision = createHash('md5')
    .update(
      stableJson({
        completion: env.section.completion,
        blocks: env.courses.blocks
          .filter(
            (block) =>
              block.lessonId === env.lessonId &&
              (env.section.blockIds.includes(block.id) ||
                block.id === env.section.workspaceBlockId),
          )
          .map((block) => [block.id, block.contentRevision]),
      }),
    )
    .digest('hex')
  env.learningRepository.sectionProgress.set(`${USER}:${USER}:${env.lessonId}`, [
    {
      sectionId: env.section.id,
      revision: sectionRevision,
      completedAt: null,
      projectPassed: true,
    },
  ])
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const originalRead = env.learningRepository.getSectionProgress.bind(env.learningRepository)
  const originalSave = env.learningRepository.saveSectionProgress.bind(env.learningRepository)
  let reads = 0,
    saves = 0
  env.learningRepository.getSectionProgress = async (...args) => {
    if (++reads === 1) {
      entered.resolve()
      await release.promise
    }
    return originalRead(...args)
  }
  env.learningRepository.saveSectionProgress = async (...args) => {
    saves++
    return originalSave(...args)
  }
  const controller = new AbortController()
  let submitBlockId = env.blockId
  if (operation === 'submit') {
    const block = env.courses.blocks.find((item) => item.id === env.blockId)
    if (block?.content.kind !== 'studio') throw new Error('Missing workspace')
    submitBlockId = randomUUID()
    const content = { ...block.content }
    delete content.purpose
    env.courses.blocks.push({ ...block, id: submitBlockId, sortOrder: 1, content })
    env.learningRepository.structures.get(env.lessonId)!.sections.push({
      ...defaultLessonSection(randomUUID(), 'Entrega', [submitBlockId]),
      intent: 'delivery',
      completion: { version: 1, blockIds: [submitBlockId] },
    })
  }
  const dispatched =
    operation === 'checkProject'
      ? env.learning.checkProject(owner, env.lessonId, env.section.id, env.revision, env.project, {
          signal: controller.signal,
        })
      : operation === 'submit'
        ? env.submitStudio.execute(USER, env.lessonId, submitBlockId, env.project, {
            signal: controller.signal,
            accountId: USER,
          })
        : env.gallery.prepare(
            owner,
            env.lessonId,
            env.blockId,
            {
              requestId: randomUUID(),
              revision: 'a'.repeat(32),
              items: [{ itemId: env.project.id, revision: 1 }],
            },
            { signal: controller.signal },
          )
  const pending = dispatched.then(
    () => 'accepted',
    (error: Error) => error.name,
  )
  try {
    await awaitWithSignal(() => entered.promise, AbortSignal.timeout(1500))
    controller.abort()
    expect(await pending).toBe('AbortError')
    expect(saves).toBe(0)
    release.resolve()
    await Bun.sleep(30)
    expect(env.inspected()).toBe(0)
    expect(saves).toBe(0)
    expect((await originalRead(owner, env.lessonId))[0]?.completedAt).toBeNull()
  } finally {
    release.resolve()
    controller.abort()
    await pending
  }
})

// Real services, HTTP, snapshots and exact-revision verification; controlled compiler transport.
async function setup(
  options: {
    loop?: boolean
    audience?: 'adult' | 'kids'
    unavailable?: boolean
    afterInspect?(): void
    live?: Awaited<ReturnType<typeof studioLiveRuntimeFixture>>
  } = {},
) {
  const live = options.live
  const { project, configuration } = live?.fixture ?? (await authoringFixture('python', 'pro'))
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Missing Python fixture')
  project.tree = {
    'main.py': { kind: 'file', content: 'while False:\n    pass\n' },
    'requirements.txt': { kind: 'file', content: '' },
  }
  project.python.entrypoint = 'main.py'
  const catalog = await createStudioRuntimeCatalog(configuration.catalog)
  const policy = await createStudioRuntimePolicy(
    configuration,
    createStudioRuntimeHosts(catalog, [
      { runtime: project.runtime, origin: 'https://runtime.example' },
    ]),
  )
  let inspections = 0
  const inspector = new PythonActivityInspectionService({
    runtimeUrl: 'https://runtime.example',
    runtimeToken: 's'.repeat(32),
    policy,
    inspect: async (input) => {
      inspections++
      const snapshot = await verifyStudioPythonExecutionMetadata(input.snapshot)
      expect(new TextDecoder().decode(await input.read('main.py', input.signal))).toBe(
        'while False:\n    pass\n',
      )
      const report = StudioPythonInspectionReportSchema.parse({
        version: 1,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        pythonVersion: '3.14.2',
        status: 'passed',
        files: snapshot.files
          .filter((file) => file.path.endsWith('.py'))
          .map((file) => ({
            path: file.path,
            sha256: file.sha256,
            status: 'passed',
            diagnostics: [],
            structure: {
              version: 1,
              nodesVisited: 1,
              usesLoop: options.loop ?? true,
              usesConditional: false,
              assignedNames: [],
              definedFunctions: [],
              callTargets: [],
            },
          })),
      })
      options.afterInspect?.()
      return report
    },
  })
  const env = buildApp({
    pythonActivities: options.unavailable ? undefined : inspector,
    sectionPythonLive: live?.workspace,
    ...(live ? { now: new Date('2026-11-07T17:00:00Z') } : {}),
  })
  const seeded = seedSampleCourse(
    env.courses,
    'curso-demo',
    'published',
    options.audience ?? 'kids',
  )
  const course = live
    ? {
        ...seeded,
        courseId: live.course.id,
        lessonIds: [live.block.lessonId, seeded.lessonIds[1]] as const,
      }
    : seeded
  if (live) {
    const seededCourse = env.courses.courses.find((item) => item.id === seeded.courseId)!
    seededCourse.id = live.course.id
    seededCourse.modality = 'live'
    for (const module of env.courses.modules) module.courseId = live.course.id
    for (const lesson of env.courses.lessons) {
      lesson.courseId = live.course.id
      if (lesson.id === seeded.lessonIds[0]) lesson.id = live.block.lessonId
    }
    env.liveLessonAccess.grant({
      learnerId: live.child.id,
      accountId: live.child.accountId,
      courseId: live.course.id,
      lessonId: live.block.lessonId,
      startsAt: new Date('2026-11-07T16:00:00Z'),
      endsAt: new Date('2026-11-07T18:00:00Z'),
    })
  }
  const lessonId = course.lessonIds[0]
  const blockId = live?.block.blockId ?? randomUUID()
  project.id = live?.claimed.id ?? lessonStudioProjectId(blockId, USER)
  const userId = live?.child.id ?? USER
  const accountId = live?.child.accountId ?? USER
  if (live)
    await live.workspace.forSession(live.session.id).commit(live.child, live.claimed.id, {
      project,
      expectedRevision: live.request.expectedWorkspaceRevision,
      writerEpoch: live.request.context.writerEpoch,
      deviceId: live.request.context.deviceId,
      mutationId: randomUUID(),
    })
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 0,
    contentRevision: 'a'.repeat(32),
    content: { kind: 'studio', purpose: 'experiment', initialProject: project },
  })
  const section = {
    ...defaultLessonSection(randomUUID(), 'Repita', [blockId]),
    intent: 'application' as const,
    workspaceBlockId: blockId,
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        {
          id: 'loop',
          label: 'Use uma repetição',
          programmingLanguage: 'python' as const,
          profileId: project.runtime.profileId,
          rule: { type: 'usesLoop' as const },
        },
      ],
    },
  }
  const revision = randomUUID()
  env.learningRepository.structures.set(lessonId, { revision, sections: [section] })
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const request = (path: string, body?: unknown, signal?: AbortSignal) =>
    env.app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/${path}?audience=${options.audience ?? 'kids'}`,
        {
          method: 'POST',
          signal,
          headers: {
            'x-auth-user-id': userId,
            'x-auth-account-id': accountId,
            'content-type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      ),
    )
  if (!live) {
    const prepared = await request(`blocks/${blockId}/studio-context`)
    expect(prepared.status).toBe(200)
    const baseline = (await prepared.json()) as { id: string }
    expect(
      (
        await request(`blocks/${blockId}/studio-context`, {
          confirm: {
            baselineId: baseline.id,
            environment: studioProjectContinuityReference(project),
          },
        })
      ).status,
    ).toBe(200)
  }
  const verify = (override: unknown = project, liveContext?: SectionProjectLiveContext) =>
    request(`sections/${section.id}/project-check`, {
      revision,
      project: override,
      ...(liveContext ? { liveContext } : {}),
    })
  const saved = () => env.learningRepository.getSectionProgress({ userId, accountId }, lessonId)
  return {
    ...env,
    course,
    lessonId,
    blockId,
    project,
    section,
    revision,
    verify,
    saved,
    inspected: () => inspections,
  }
}

test('Python section objectives use server-owned facts and persist only the authorized result', async () => {
  const env = await setup()
  const response = await env.verify()
  expect({ status: response.status, body: await response.json() }).toMatchObject({
    status: 200,
    body: {
      passed: true,
      results: [{ id: 'loop', passed: true }],
    },
  })
  expect(env.inspected()).toBe(1)
  expect(await env.saved()).toMatchObject([{ sectionId: env.section.id, projectPassed: true }])
})

test.each([
  'valid',
  'device',
  'epoch',
  'revision',
  'block',
  'session',
  'grant',
  'lease-before',
  'lease-during',
] as const)('live Python Pro section checks reauthorize the saved workspace: %s', async (mode) => {
  const live = await studioLiveRuntimeFixture('pro')
  const env = await setup({
    live,
    afterInspect:
      mode === 'grant'
        ? () => {
            const grant = live.rooms.cohorts.get(live.cohort.id)?.grants[0]
            if (!grant) throw new Error('Missing grant')
            grant.revokedAt = '2026-11-07T17:00:00Z'
          }
        : mode === 'lease-during'
          ? () => live.advance(30000)
          : undefined,
  })
  const context: SectionProjectLiveContext = {
    context: { ...live.request.context },
    expectedWorkspaceRevision: 1,
  }
  if (mode === 'device') context.context.deviceId = randomUUID()
  if (mode === 'epoch') context.context.writerEpoch++
  if (mode === 'revision') context.expectedWorkspaceRevision = 0
  if (mode === 'block') context.context.blockId = randomUUID()
  if (mode === 'session') context.context.sessionId = randomUUID()
  if (mode === 'lease-before') live.advance(30000)
  const response = await env.verify(env.project, context)
  expect(response.status).toBe(
    mode === 'valid' ? 200 : mode === 'session' ? 404 : mode === 'grant' ? 403 : 409,
  )
  if (mode === 'valid') {
    expect(await response.json()).toMatchObject({ passed: true })
    expect(env.inspected()).toBe(1)
    expect(await env.saved()).toMatchObject([{ projectPassed: true }])
  } else {
    expect(env.inspected()).toBe(mode === 'grant' || mode === 'lease-during' ? 1 : 0)
    expect(await env.saved()).toEqual([])
  }
})

test('absent compiler service, foreign project identity and missing structural facts do not approve a section', async () => {
  for (const mode of ['unavailable', 'foreign', 'no-loop'] as const) {
    const env = await setup({ unavailable: mode === 'unavailable', loop: mode !== 'no-loop' })
    const response = await env.verify(
      mode === 'foreign' ? { ...env.project, id: 'another-project' } : env.project,
    )
    if (mode === 'no-loop') {
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        passed: false,
        results: [{ id: 'loop', passed: false }],
      })
      expect((await env.saved()).every((record) => !record.projectPassed)).toBe(true)
    } else {
      expect(response.status).toBe(mode === 'unavailable' ? 503 : 409)
      expect(await env.saved()).toEqual([])
      expect(env.inspected()).toBe(0)
    }
  }
})

test.each([
  'publication',
  'criteria',
  'revision',
  'entitlement',
] as const)('withdrawing %s during inspection prevents section persistence', async (withdrawal) => {
  let withdraw = () => {}
  const env = await setup({ afterInspect: () => withdraw() })
  withdraw = () => {
    if (withdrawal === 'publication') {
      const lesson = env.courses.lessons.find((item) => item.id === env.lessonId)
      if (!lesson) throw new Error('Missing lesson')
      lesson.isPublished = false
    } else if (withdrawal === 'criteria')
      env.section.completion.projectChecks[0]!.label = 'Novo objetivo'
    else if (withdrawal === 'revision')
      env.learningRepository.structures.get(env.lessonId)!.revision = randomUUID()
    else env.entitlements.byId.clear()
  }
  const response = await env.verify()
  expect(response.status).toBe(
    withdrawal === 'publication' ? 404 : withdrawal === 'entitlement' ? 403 : 409,
  )
  expect(env.inspected()).toBe(1)
  expect(await env.saved()).toEqual([])
})

test('adult recorded Python baseline and section checks use the adult course without a Kids rank or free product', async () => {
  const f = await setup({ audience: 'adult' })
  const result = await f.verify()
  expect(result.status).toBe(200)
  expect(await result.json()).toMatchObject({
    passed: true,
    results: [{ id: 'loop', passed: true }],
  })
  expect(await f.saved()).toMatchObject([{ projectPassed: true }])
})
