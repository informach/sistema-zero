import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const SIBLING = '22222222-2222-2222-2222-222222222222'
type Context = Awaited<
  ReturnType<
    import('../../src/application/studio/open-lesson-studio.service').OpenLessonStudioService['execute']
  >
>

function setup() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses, 'curso-demo', 'published', 'kids')
  const lessonId = course.lessonIds[0]
  const blockId = randomUUID()
  const initial = createBlankProjectSnapshot(blockId, 'Projeto da aula')
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 20,
    content: {
      kind: 'studio',
      initialProject: initial,
      level: 'iniciante',
      allowedModes: ['blocks'],
    },
  })
  const headers = { 'content-type': 'application/json', 'x-auth-user-id': USER }
  const request = (
    suffix = 'studio-context',
    body?: unknown,
    extra?: Record<string, string>,
    targetLesson = lessonId,
  ) =>
    env.app.handle(
      new Request(`http://localhost/members/lessons/${targetLesson}/blocks/${blockId}/${suffix}`, {
        method: 'POST',
        headers: { ...headers, ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  return { ...env, ...course, lessonId, blockId, initial, request }
}

test('HTTP binds original authoring, permits its submissions after publication and isolates learners', async () => {
  const env = setup()
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  grantLifetime(env.entitlements, { userId: SIBLING, courseRef: env.slug })
  const first = await env.request()
  expect(first.status).toBe(200)
  const baseline = (await first.json()) as Context
  expect(baseline.bound).toBe(false)
  expect(env.studioBindings.rows.size).toBe(0)
  expect(
    (
      await env.request('studio-context', {
        confirm: {
          baselineId: baseline.id,
          environment: studioProjectContinuityReference(env.initial),
        },
      })
    ).status,
  ).toBe(200)
  expect(baseline.configuration.initialProject.name).toBe('Projeto da aula')
  const block = env.courses.blocks.find((item) => item.id === env.blockId)!
  block.content = {
    kind: 'studio',
    initialProject: { ...documentFixture('python', 'pro'), assets: [] },
    allowedModes: ['code'],
  }
  expect(await (await env.request()).json()).toEqual({ ...baseline, bound: true })
  const sibling = await env.request('studio-context', undefined, { 'x-auth-user-id': SIBLING })
  expect(sibling.status).toBe(200)
  expect(((await sibling.json()) as Context).configuration.initialProject.programmingLanguage).toBe(
    'python',
  )
  expect(
    (
      await env.request('studio-submission', {
        project: { ...env.initial, name: 'Trabalho salvo' },
      })
    ).status,
  ).toBe(200)
  expect(
    (await env.request('studio-submission', { project: documentFixture('python', 'pro') })).status,
  ).toBe(400)
  expect((await env.studioSubmissions.getOne(USER, env.blockId))?.project).toMatchObject({
    name: 'Trabalho salvo',
  })
})

test.each([
  'classic',
  'pro',
] as const)('HTTP accepts a Python %s v3 submission in its bound environment', async (kind) => {
  const env = setup()
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  const project = {
    ...documentFixture('python', kind),
    id: lessonStudioProjectId(env.blockId, USER),
    assets: [],
  }
  env.courses.blocks.find((item) => item.id === env.blockId)!.content = {
    kind: 'studio',
    initialProject: project,
  }
  const prepared = (await (await env.request()).json()) as Context
  expect(
    (
      await env.request('studio-context', {
        confirm: {
          baselineId: prepared.id,
          environment: studioProjectContinuityReference(project),
        },
      })
    ).status,
  ).toBe(200)
  const submitted = await env.request('studio-submission', { project })
  expect({ status: submitted.status, body: await submitted.json() }).toMatchObject({ status: 200 })
  expect((await env.studioSubmissions.getOne(USER, env.blockId))?.project).toEqual(project)
})

test('HTTP refuses missing access, unpublished/wrong lessons and locked sections without creating a binding', async () => {
  const env = setup()
  expect((await env.request()).status).toBe(403)
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  const lesson = env.courses.lessons.find((item) => item.id === env.lessonId)!
  lesson.isPublished = false
  expect((await env.request()).status).toBe(404)
  lesson.isPublished = true
  expect((await env.request('studio-context', undefined, undefined, env.lessonIds[1])).status).toBe(
    404,
  )
  const firstBlock = env.courses.blocks.find(
    (item) => item.lessonId === env.lessonId && item.kind === 'video',
  )!
  env.learningRepository.structures.set(env.lessonId, {
    revision: randomUUID(),
    sections: [
      {
        ...defaultLessonSection(randomUUID(), 'Primeiro', [firstBlock.id]),
        completion: { version: 1, blockIds: [firstBlock.id] },
      },
      defaultLessonSection(randomUUID(), 'Projeto', [env.blockId]),
    ],
  })
  expect((await env.request()).status).toBe(423)
  expect(env.studioBindings.rows.size).toBe(0)
})

test('read-only support resolves authoring without binding a learner to a new project', async () => {
  const env = setup()
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  expect(
    (await env.request('studio-context', undefined, { 'x-auth-impersonator-id': SIBLING })).status,
  ).toBe(200)
  expect(env.studioBindings.rows.size).toBe(0)
})

test('a refused legacy admission cannot pin the new environment, and stale confirmations cannot bind', async () => {
  const env = setup()
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  const block = env.courses.blocks.find((item) => item.id === env.blockId)!
  block.content = {
    kind: 'studio',
    initialProject: { ...documentFixture('python', 'classic'), assets: [] },
  }
  const python = (await (await env.request()).json()) as Context
  expect(env.studioBindings.rows.size).toBe(0)
  const failed = await env.request('studio-context', {
    confirm: {
      baselineId: python.id,
      environment: studioProjectContinuityReference(env.initial),
    },
  })
  expect(failed.status).toBe(409)
  expect(env.studioBindings.rows.size).toBe(0)
  block.content = { kind: 'studio', initialProject: env.initial }
  const restored = (await (await env.request()).json()) as Context
  expect(restored.configuration.initialProject.programmingLanguage ?? 'javascript').toBe(
    'javascript',
  )
  expect(
    (
      await env.request('studio-context', {
        confirm: {
          baselineId: python.id,
          environment: studioProjectContinuityReference(python.configuration.initialProject),
        },
      })
    ).status,
  ).toBe(409)
  expect(env.studioBindings.rows.size).toBe(0)
  expect(
    (
      await env.request('studio-context', {
        confirm: {
          baselineId: restored.id,
          environment: studioProjectContinuityReference(env.initial),
        },
      })
    ).status,
  ).toBe(200)
  expect(env.studioBindings.rows.size).toBe(1)
})
