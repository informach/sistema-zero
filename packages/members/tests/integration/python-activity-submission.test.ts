import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '22222222-2222-4222-8222-222222222222'

// Delivery and objective evaluation are separate. HTTP, access, baseline and persistence
// are real; no compiler is configured, and delivery must never invent an approval.
async function setup() {
  const { project } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro required')
  const env = buildApp()
  const course = seedSampleCourse(env.courses, 'python-delivery', 'published', 'kids')
  const lessonId = course.lessonIds[0],
    blockId = randomUUID()
  project.id = lessonStudioProjectId(blockId, USER)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 20,
    contentRevision: 'a'.repeat(32),
    content: { kind: 'studio', initialProject: project },
  })
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const request = (suffix: string, body?: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/${suffix}`, {
        method: 'POST',
        headers: { 'x-auth-user-id': USER, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const preparation = await request('studio-context')
  expect(preparation.status).toBe(200)
  const baseline = (await preparation.json()) as { id: string }
  expect(
    (
      await request('studio-context', {
        confirm: {
          baselineId: baseline.id,
          environment: studioProjectContinuityReference(project),
        },
      })
    ).status,
  ).toBe(200)
  const submit = (candidate: unknown = project, extra: Record<string, unknown> = {}) =>
    request('studio-submission', { project: candidate, ...extra })
  return {
    ...env,
    project,
    blockId,
    lessonId,
    submit,
    saved: () => env.studioSubmissions.getOne(USER, blockId),
  }
}

test('Python delivery preserves the project and returns a receipt without running or grading code', async () => {
  const f = await setup()
  const response = await f.submit()
  expect(response.status).toBe(200)
  const receipt = await response.json()
  expect(receipt).toEqual({ submittedAt: expect.any(String) })
  expect(await f.saved()).toMatchObject({ project: f.project, submittedAt: expect.any(Date) })
  expect(await f.saved()).not.toHaveProperty('passedAt')
  f.project.name = 'Nova versão'
  expect((await f.submit()).status).toBe(200)
  expect((await f.saved())?.project).toMatchObject({ name: 'Nova versão' })
})

test('browser-provided check results cannot create approval on the submission endpoint', async () => {
  const f = await setup()
  const response = await f.submit(f.project, { results: [{ checkId: 'loop', passed: true }] })
  expect(response.status).toBe(200)
  expect(await response.json()).not.toHaveProperty('passed')
  expect(f.learningRepository.sectionProgress.size).toBe(0)
})

test('a foreign project or incompatible runtime cannot replace the bound Python delivery', async () => {
  for (const mode of ['identity', 'runtime'] as const) {
    const f = await setup(),
      candidate = structuredClone(f.project)
    if (mode === 'identity') candidate.id = 'another-project'
    else candidate.runtime.manifestSha256 = 'f'.repeat(64)
    expect((await f.submit(candidate)).status).toBe(mode === 'identity' ? 409 : 400)
    expect(await f.saved()).toBeNull()
  }
})

test('submission snapshots source before its first asynchronous access read', async () => {
  const f = await setup()
  const original = f.courses.findLessonWithContent.bind(f.courses)
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let reads = 0
  f.courses.findLessonWithContent = async (...args) => {
    if (++reads === 1) {
      entered.resolve()
      await release.promise
    }
    return original(...args)
  }
  const before = structuredClone(f.project)
  const pending = f.submitStudio.execute(USER, f.lessonId, f.blockId, f.project)
  try {
    await entered.promise
    f.project.name = 'Mutação posterior'
    release.resolve()
    await pending
    expect((await f.saved())?.project).toEqual(before)
  } finally {
    release.resolve()
    await pending
  }
})

test('withdrawn lesson or entitlement cannot accept a Python delivery', async () => {
  for (const mode of ['lesson', 'entitlement'] as const) {
    const f = await setup()
    if (mode === 'lesson')
      f.courses.lessons.find(({ id }) => id === f.lessonId)!.isPublished = false
    else f.entitlements.byId.clear()
    expect((await f.submit()).status).toBe(mode === 'lesson' ? 404 : 403)
    expect(await f.saved()).toBeNull()
  }
})
