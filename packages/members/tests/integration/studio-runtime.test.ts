import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import { resolvePythonLearningLevel } from '@sistemazero/core/studio/python-learning'
import { StudioLessonRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-4111-8111-111111111111'
const SIBLING = '22222222-2222-4222-8222-222222222222'

async function setup(
  kind: 'classic' | 'pro' = 'pro',
  status: 'active' | 'retired' | 'revoked' = 'active',
) {
  const fixture = await authoringFixture('python', kind)
  fixture.configuration.releases[0]!.status = status
  const hosts = createStudioRuntimeHosts(fixture.configuration.catalog, [
    { runtime: fixture.project.runtime, origin: 'https://runtime.example.test' },
  ])
  const env = buildApp({
    studioRuntimePolicy: await createStudioRuntimePolicy(fixture.configuration, hosts),
  })
  const course = seedSampleCourse(env.courses, 'curso-demo', 'published', 'kids')
  const lessonId = course.lessonIds[0]
  const blockId = randomUUID()
  const project = { ...fixture.project, id: lessonStudioProjectId(blockId, USER) }
  const block = {
    id: blockId,
    lessonId,
    kind: 'studio' as const,
    sortOrder: 20,
    content: {
      kind: 'studio' as const,
      initialProject: fixture.project,
      pythonLevel: resolvePythonLearningLevel(2),
    },
  }
  env.courses.blocks.push(block)
  const request = (suffix: string, body?: unknown, headers: Record<string, string> = {}) =>
    env.app.handle(
      new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/${suffix}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-auth-user-id': USER, ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const bind = async () => {
    const prepared = await request('studio-context')
    expect(prepared.status).toBe(200)
    const baseline = await prepared.json()
    if (
      !baseline ||
      typeof baseline !== 'object' ||
      !('id' in baseline) ||
      typeof baseline.id !== 'string'
    )
      throw new Error('baseline inválida')
    const confirmed = await request('studio-context', {
      confirm: {
        baselineId: baseline.id,
        environment: studioProjectContinuityReference(project),
      },
    })
    expect(confirmed.status).toBe(200)
    return baseline.id
  }
  return { ...env, ...course, lessonId, blockId, project, block, request, bind }
}

for (const kind of ['classic', 'pro'] as const)
  test(`analysis endpoint binds the real ${kind} lesson baseline and rechecks access without admitting work`, async () => {
    const f = await setup(kind)
    const subscriptionId = randomUUID()
    grantLifetime(f.entitlements, { userId: USER, courseRef: f.slug, subscriptionId })
    const baselineId = await f.bind()
    const rows = structuredClone([...f.studioBindings.rows.values()])
    const body = {
      operation: 'analyze',
      revision: 'a'.repeat(64),
      subject: studioRuntimeSubject(f.project),
      context: { kind: 'lesson' as const, lessonId: f.lessonId, blockId: f.blockId, baselineId },
    }
    const analyze = (input: unknown = body) =>
      f.app.handle(
        new Request('http://localhost/members/studio/python-analysis', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
          body: JSON.stringify(input),
        }),
      )
    const response = await analyze()
    expect(response.status).toBe(200)
    const decision = StudioLessonRuntimeDecisionSchema.parse(await response.json())
    expect(decision.operation).toBe('analyze')
    expect(decision.context).toEqual(body.context)
    expect(decision.projectId).toBe(f.project.id)
    expect(
      (await analyze({ ...body, context: { ...body.context, baselineId: 'f'.repeat(64) } })).status,
    ).toBe(409)
    expect(
      (await analyze({ ...body, subject: { ...body.subject, id: 'other-project' } })).status,
    ).toBe(400)
    expect((await analyze({ ...body, operation: 'execute' })).status).toBe(400)
    await f.entitlements.revokeBySubscriptionId(subscriptionId, new Date())
    expect((await analyze()).status).toBe(403)
    expect([...f.studioBindings.rows.values()]).toEqual(rows)
  })

for (const kind of ['classic', 'pro'] as const)
  test(`HTTP authorizes scoped Python ${kind}, rechecks access and preserves the original baseline`, async () => {
    const env = await setup(kind)
    const subscriptionId = randomUUID()
    grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug, subscriptionId })
    const baselineId = await env.bind()
    const body = {
      baselineId,
      operation: 'execute',
      subject: studioRuntimeSubject(env.project),
      revision: 'a'.repeat(64),
    }
    const response = await env.request('studio-runtime', body)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const decision = StudioLessonRuntimeDecisionSchema.parse(await response.json())
    expect(decision.context).toEqual({
      kind: 'lesson',
      lessonId: env.lessonId,
      blockId: env.blockId,
      baselineId,
    })
    expect(decision.actor).toEqual({ userId: USER, accountId: USER })
    expect(decision.projectId).toBe(env.project.id)
    expect(decision.curation.pythonLevel).toBe(2)
    expect(decision.expiresAt - decision.issuedAt).toBe(30_000)
    expect(decision.capabilities).toEqual(['edit', 'execute', 'export-source'])
    expect(decision.frame.url).toBe(
      `https://runtime.example.test/v1/runtimes/${env.project.runtime.manifestSha256}/frame.html`,
    )
    expect(decision.frame.allowedOrigins).toEqual(['https://runtime.example.test'])
    const rows = structuredClone([...env.studioBindings.rows.values()])
    // Reauthoring the lesson must not silently reconfigure an admitted learner.
    env.block.content.pythonLevel = 1
    const repeated = StudioLessonRuntimeDecisionSchema.parse(
      await (await env.request('studio-runtime', body)).json(),
    )
    expect(repeated.curation.pythonLevel).toBe(2)
    expect(repeated.subjectSha256).toBe(decision.subjectSha256)
    expect(repeated.revision).toBe(body.revision)
    const changed = await env.request('studio-runtime', {
      ...body,
      revision: 'b'.repeat(64),
    })
    expect(changed.status).toBe(200)
    expect(StudioLessonRuntimeDecisionSchema.parse(await changed.json()).revision).toBe(
      'b'.repeat(64),
    )
    expect((await env.request('studio-runtime', { ...body, operation: 'analyze' })).status).toBe(
      200,
    )
    // The inert fixture has no REPL implementation; Pro alone cannot create that capability.
    expect(
      (await env.request('studio-runtime', { ...body, operation: 'python-repl' })).status,
    ).toBe(403)
    await env.entitlements.revokeBySubscriptionId(subscriptionId, new Date())
    expect((await env.request('studio-runtime', body)).status).toBe(403)
    expect([...env.studioBindings.rows.values()]).toEqual(rows)
  })

test('HTTP rejects borrowed identities, stale or absent bindings, wrong environments and injected grants', async () => {
  const env = await setup()
  const body = {
    baselineId: 'a'.repeat(64),
    operation: 'execute',
    subject: studioRuntimeSubject(env.project),
    revision: 'a'.repeat(64),
  }
  expect((await env.request('studio-runtime', body)).status).toBe(403)
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  expect((await env.request('studio-runtime', body)).status).toBe(409)
  expect(env.studioBindings.rows.size).toBe(0)
  body.baselineId = await env.bind()
  const rows = structuredClone([...env.studioBindings.rows.values()])
  expect(
    (await env.request('studio-runtime', { ...body, baselineId: 'b'.repeat(64) })).status,
  ).toBe(409)
  expect((await env.request('studio-runtime', body, { 'x-auth-user-id': SIBLING })).status).toBe(
    403,
  )
  grantLifetime(env.entitlements, { userId: SIBLING, courseRef: env.slug })
  expect((await env.request('studio-runtime', body, { 'x-auth-user-id': SIBLING })).status).toBe(
    409,
  )
  expect(
    (await env.request('studio-runtime', body, { 'x-auth-impersonator-id': SIBLING })).status,
  ).toBe(403)
  expect(
    (
      await env.request('studio-runtime', {
        ...body,
        subject: { ...body.subject, id: lessonStudioProjectId(env.blockId, SIBLING) },
      })
    ).status,
  ).toBe(400)
  expect(
    (
      await env.request('studio-runtime', {
        ...body,
        subject: { ...body.subject, runtime: { ...env.project.runtime, releaseId: 'other' } },
      })
    ).status,
  ).toBe(409)
  expect(
    (await env.request('studio-runtime', { ...body, grantedCapabilities: ['execute'] })).status,
  ).toBe(400)
  env.courses.lessons.find((lesson) => lesson.id === env.lessonId)!.isPublished = false
  expect((await env.request('studio-runtime', body)).status).toBe(404)
  expect([...env.studioBindings.rows.values()]).toEqual(rows)
})

test('HTTP permits a retired pinned release and denies a revoked one without uploading source or assets', async () => {
  for (const status of ['retired', 'revoked'] as const) {
    const env = await setup('pro', status)
    grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
    const baselineId = await env.bind()
    if (env.project.programmingLanguage !== 'python' || env.project.kind !== 'pro')
      throw new Error('fixture')
    env.project.tree['main.py'] = {
      kind: 'file',
      content: `# ${'a'.repeat(2_100_000)}\nprint(1)\n`,
    }
    const subject = studioRuntimeSubject(env.project)
    expect(JSON.stringify(subject).length).toBeLessThan(2000)
    for (const operation of ['execute', 'analyze'])
      expect(
        (
          await env.request('studio-runtime', {
            baselineId,
            operation,
            subject,
            revision: 'a'.repeat(64),
          })
        ).status,
      ).toBe(status === 'retired' ? 200 : 403)
  }
})

test('HTTP analysis permits pending requirements but cannot grant execution or install them', async () => {
  const env = await setup('pro')
  grantLifetime(env.entitlements, { userId: USER, courseRef: env.slug })
  const baselineId = await env.bind()
  if (env.project.programmingLanguage !== 'python' || env.project.kind !== 'pro')
    throw new Error('fixture')
  for (const requirements of ['# anotação ainda sem lock atualizado\n', 'requests==2.0.0\n']) {
    env.project.tree['requirements.txt'] = { kind: 'file', content: requirements }
    const body = {
      baselineId,
      subject: studioRuntimeSubject(env.project),
      revision: 'a'.repeat(64),
    }
    const result = await env.request('studio-runtime', { ...body, operation: 'analyze' })
    expect(result.status).toBe(200)
    expect(StudioLessonRuntimeDecisionSchema.parse(await result.json()).capabilities).toEqual([
      'edit',
      'export-source',
    ])
    expect((await env.request('studio-runtime', { ...body, operation: 'execute' })).status).toBe(
      400,
    )
  }
})
