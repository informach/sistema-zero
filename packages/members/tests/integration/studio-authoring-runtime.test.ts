import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  StudioAuthoringRuntimeDecisionSchema,
  type StudioAuthoringRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, seedSampleCourse } from '../helpers'

const authorId = '11111111-1111-4111-8111-111111111111'
async function setup(status: 'active' | 'retired' | 'revoked' = 'active') {
  const fixture = await authoringFixture('python', 'pro')
  fixture.configuration.releases[0]!.status = status
  const runtimePolicy = await createStudioRuntimePolicy(
    fixture.configuration,
    createStudioRuntimeHosts(fixture.configuration.catalog, [
      { runtime: fixture.project.runtime, origin: 'https://runtime.example.test' },
    ]),
  )
  const env = buildApp({ studioRuntimePolicy: runtimePolicy })
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]
  const draft = await env.drafts.read(lessonId)
  const body: StudioAuthoringRuntimeRequest = {
    context: {
      kind: 'authoring',
      lessonId,
      draftRevision: draft.revision,
      blockId: null,
      purpose: 'authoring',
    },
    subject: studioRuntimeSubject(fixture.project),
    revision: 'a'.repeat(64),
    operation: 'execute',
  }
  const request = (input: unknown = body, headers: Record<string, string> = {}) =>
    env.app.handle(
      new Request('http://localhost/members/admin/studio/authoring-runtime', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': authorId,
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
          ...headers,
        },
        body: JSON.stringify(input),
      }),
    )
  return { ...env, fixture, draft, body, request }
}

test('analysis HTTP reuses active author and exact draft checks through its separate boundary', async () => {
  const f = await setup()
  const body = { ...f.body, operation: 'analyze' }
  const analyze = (input: unknown = body, headers: Record<string, string> = {}) =>
    f.app.handle(
      new Request('http://localhost/members/studio/python-analysis', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': authorId,
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
          ...headers,
        },
        body: JSON.stringify(input),
      }),
    )
  const response = await analyze()
  expect(response.status).toBe(200)
  const decision = StudioAuthoringRuntimeDecisionSchema.parse(await response.json())
  expect(decision.context).toEqual(f.body.context)
  expect(decision.operation).toBe('analyze')
  expect((await analyze(body, { 'x-auth-user-role': 'student' })).status).toBe(403)
  expect((await analyze(body, { 'x-auth-user-status': 'inactive' })).status).toBe(403)
  expect((await analyze(body, { 'x-auth-impersonator-id': authorId })).status).toBe(403)
  f.drafts.drafts.get(f.draft.lessonId)!.revision = randomUUID()
  expect((await analyze()).status).toBe(409)
})

test('active authors execute an unsaved Python candidate against their current unpublished lesson draft', async () => {
  const f = await setup()
  const saved = f.drafts.drafts.get(f.draft.lessonId)!
  saved.isPublished = false
  const before = structuredClone(saved)
  const response = await f.request()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const decision = StudioAuthoringRuntimeDecisionSchema.parse(await response.json())
  expect(decision.context).toEqual(f.body.context)
  expect(decision.actor.userId).toBe(authorId)
  expect(decision.capabilities).toEqual(['edit', 'execute', 'export-source', 'assist'])
  expect(decision.projectId).toBe(f.body.subject.id)
  expect(decision.expiresAt - decision.issuedAt).toBe(30_000)
  expect(f.drafts.drafts.get(f.draft.lessonId)).toEqual(before)
})

test('authoring can change a candidate environment before saving while rehearsal follows its stored block', async () => {
  const f = await setup()
  const js = await authoringFixture('javascript', 'classic')
  const blockId = randomUUID()
  const saved = f.drafts.drafts.get(f.draft.lessonId)!
  saved.document.blocks.push({
    id: blockId,
    content: { kind: 'studio', initialProject: js.project },
  })
  f.body.context.blockId = blockId
  expect((await f.request()).status).toBe(200)
  f.body.context.purpose = 'rehearsal'
  expect((await f.request()).status).toBe(400)
  saved.document.blocks.at(-1)!.content = {
    kind: 'studio',
    initialProject: f.fixture.project,
    pythonLevel: 2,
  }
  const response = await f.request()
  expect(response.status).toBe(200)
  expect(
    StudioAuthoringRuntimeDecisionSchema.parse(await response.json()).curation.pythonLevel,
  ).toBe(2)
  saved.document.blocks.pop()
  expect((await f.request()).status).toBe(400)
})

test('authoring authorization rechecks active staff, support state and draft revision on every operation', async () => {
  const f = await setup()
  const rejectedHeaders: Record<string, string>[] = [
    { 'x-auth-user-role': 'student' },
    { 'x-auth-user-status': 'inactive' },
    { 'x-auth-impersonator-id': authorId },
  ]
  for (const headers of rejectedHeaders) expect((await f.request(f.body, headers)).status).toBe(403)
  expect((await f.request()).status).toBe(200)
  f.drafts.drafts.get(f.draft.lessonId)!.revision = randomUUID()
  expect((await f.request()).status).toBe(409)
  f.body.context.draftRevision = f.drafts.drafts.get(f.draft.lessonId)!.revision
  expect((await f.request()).status).toBe(200)
  expect(
    (await f.request({ ...f.body, context: { ...f.body.context, blockId: randomUUID() } })).status,
  ).toBe(400)
})

test('draft execution rejects inactive distributions and injected authority', async () => {
  for (const status of ['retired', 'revoked'] as const) {
    const f = await setup(status)
    expect((await f.request()).status).toBe(403)
  }
  const f = await setup()
  expect((await f.request({ ...f.body, capabilities: ['terminal'] })).status).toBe(400)
  expect(
    (await f.request({ ...f.body, context: { ...f.body.context, purpose: 'rehearsal' } })).status,
  ).toBe(400)
})

test('runtime admission never recreates a missing draft from a client revision', async () => {
  const f = await setup()
  f.drafts.drafts.delete(f.draft.lessonId)
  expect((await f.request()).status).toBe(409)
  expect(f.drafts.drafts.has(f.draft.lessonId)).toBe(false)
})
