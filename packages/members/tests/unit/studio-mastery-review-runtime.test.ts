import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioMasteryReviewRuntimeDecisionSchema,
  StudioMasteryReviewRuntimeRequestSchema,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/server-python-snapshot'
import { Elysia } from 'elysia'
import { AuthorizeMasteryReviewRuntimeService } from '../../src/application/studio/authorize-mastery-review-runtime.service'
import type { MasterySubmissionRecord } from '../../src/domain/ports/mastery-repository.port'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { masteryRoutes } from '../../src/interfaces/http/routes/mastery.routes'
import { galleryPythonSourceFixture } from '../fakes/gallery-python-source'
import { silentLogger } from '../fakes/in-memory'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function setup(
  kind: 'classic' | 'pro' = 'classic',
  status: 'active' | 'retired' | 'revoked' = 'active',
) {
  const f = await authoringFixture('python', kind)
  f.configuration.releases[0]!.status = status
  const submissionId = crypto.randomUUID()
  const learner = crypto.randomUUID()
  const staff = crypto.randomUUID()
  const submission: MasterySubmissionRecord = {
    id: submissionId,
    userId: learner,
    accountId: learner,
    audience: 'adult',
    masteryId: 'python2d',
    level: 1,
    areaTitle: 'Python 2D',
    policyVersion: 1,
    message: null,
    submittedAt: new Date(),
    definition: {
      level: 1,
      title: 'I',
      nucleusCourseIds: [],
      workshops: [],
      rubric: { version: 1, criteria: [{ id: 'logic', title: 'Lógica' }] },
    },
    evidence: {
      id: crypto.randomUUID(),
      lessonId: crypto.randomUUID(),
      title: 'Meu jogo',
      kind: 'studio',
      revision: 'retained',
      createdAt: new Date(),
      payload: { project: f.project },
    },
  }
  let retained: MasterySubmissionRecord | null = submission
  let reads = 0
  const service = new AuthorizeMasteryReviewRuntimeService(
    {
      findSubmission: async (id) => {
        reads++
        return id === submissionId ? retained : null
      },
    },
    await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, [
        { runtime: f.project.runtime, origin: 'https://runtime.test' },
      ]),
    ),
    () => 100_000,
  )
  const actor = { userId: staff, accountId: staff, privileged: true, readOnly: false }
  const input = { context: { kind: 'mastery-review' as const, submissionId } }
  return {
    ...f,
    service,
    actor,
    input,
    submission,
    remove: () => {
      retained = null
    },
    reads: () => reads,
  }
}

for (const kind of ['classic', 'pro'] as const)
  test(`review ${kind} derives source digest and runtime only from retained evidence`, async () => {
    const f = await setup(kind)
    const decision = await f.service.execute(f.actor, f.input)
    const snapshot = await preparePythonExecutionSnapshot(f.project)
    expect(decision.revision).toBe(snapshot.revision)
    expect(decision.subjectSha256).toBe(
      await sha256Hex(canonicalJson(studioRuntimeSubject(f.project))),
    )
    expect(decision.actor.userId).toBe(f.actor.userId)
    expect(decision.context).toEqual(f.input.context)
    expect(decision.capabilities).toEqual(['execute'])
    expect(decision.blockIds).toEqual([])
    expect(decision.expiresAt - decision.issuedAt).toBe(30_000)
    expect(
      StudioMasteryReviewRuntimeDecisionSchema.safeParse({ ...decision, capabilities: ['edit'] })
        .success,
    ).toBe(false)
    await f.service.execute(f.actor, f.input)
    expect(f.reads()).toBe(2)
    f.remove()
    await expect(f.service.execute(f.actor, f.input)).rejects.toThrow('não encontrada')
  })

test('review refuses learner/supervised identities, revoked runtime and client-substituted authority', async () => {
  const f = await setup()
  for (const changes of [
    { privileged: false },
    { readOnly: true },
    { accountId: crypto.randomUUID() },
  ])
    await expect(f.service.execute({ ...f.actor, ...changes }, f.input)).rejects.toThrow(
      'própria conta',
    )
  expect(f.reads()).toBe(0)
  for (const extra of [
    { operation: 'python-repl' },
    { subject: studioRuntimeSubject(f.project) },
    { revision: 'a'.repeat(64) },
    { capabilities: ['edit'] },
  ])
    expect(
      StudioMasteryReviewRuntimeRequestSchema.safeParse({ ...f.input, ...extra }).success,
    ).toBe(false)
  const revoked = await setup('pro', 'revoked')
  await expect(revoked.service.execute(revoked.actor, revoked.input)).rejects.toThrow('revogado')
  const retired = await setup('pro', 'retired')
  expect((await retired.service.execute(retired.actor, retired.input)).releaseStatus).toBe(
    'retired',
  )
})

test('review analysis is bound to the full retained snapshot and grants no authoring, execution or language services', async () => {
  const f = await setup('classic')
  const decision = await f.service.execute(f.actor, { ...f.input, operation: 'analyze' })
  expect(decision.operation).toBe('analyze')
  expect(decision.revision).toBe((await preparePythonExecutionSnapshot(f.project)).revision)
  expect(decision.capabilities).toEqual([])
  expect(decision.blockIds).toEqual([])
  expect(
    StudioMasteryReviewRuntimeDecisionSchema.safeParse({ ...decision, capabilities: ['execute'] })
      .success,
  ).toBe(false)
})

for (const kind of ['classic', 'pro'] as const)
  test(`gallery review ${kind} materializes the exact preserved source and image parts before authorization`, async () => {
    const f = await setup(kind)
    const gallery = await galleryPythonSourceFixture(kind, true)
    try {
      const submission = {
        ...f.submission,
        evidence: {
          ...f.submission.evidence,
          payload: {
            project: {
              kind: 'gallery-delivery',
              version: 1,
              requestId: crypto.randomUUID(),
              tool: 'studio',
              items: [gallery.item],
            },
          },
        },
      }
      const service = new AuthorizeMasteryReviewRuntimeService(
        { findSubmission: async () => submission },
        await createStudioRuntimePolicy(
          gallery.configuration,
          createStudioRuntimeHosts(gallery.configuration.catalog, [
            { runtime: gallery.project.runtime, origin: 'https://runtime.test' },
          ]),
        ),
        () => 100_000,
        gallery.service,
      )
      await expect(service.execute(f.actor, f.input)).rejects.toThrow('cópia preservada')
      await expect(
        service.execute(f.actor, {
          ...f.input,
          gallerySource: { ...gallery.reference, itemId: 'different-project' },
        }),
      ).rejects.toThrow('não corresponde')
      expect(gallery.requests).toHaveLength(0)
      const decision = await service.execute(f.actor, {
        ...f.input,
        gallerySource: gallery.reference,
      })
      expect(decision.revision).toBe(
        (await preparePythonExecutionSnapshot(gallery.project)).revision,
      )
      expect(gallery.requests).toHaveLength(2)
      const inspected = await service.execute(f.actor, {
        ...f.input,
        operation: 'analyze',
        gallerySource: gallery.reference,
      })
      expect(inspected.revision).toBe(decision.revision)
      expect(inspected.capabilities).toEqual([])
    } finally {
      gallery.close()
    }
  })

test('review HTTP requires own active staff and internal authentication; rejects body authority', async () => {
  const f = await setup('pro')
  const unreachable = async (): Promise<never> => {
    throw new Error('Unexpected mastery operation')
  }
  const app = new Elysia()
    .onError(({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(
      masteryRoutes({
        runtime: f.service,
        internalToken: 'test-token',
        service: {
          get: unreachable,
          evidence: unreachable,
          submit: unreachable,
          queue: unreachable,
          detail: unreachable,
          review: unreachable,
        },
      }),
    )
  const headers = {
    'content-type': 'application/json',
    'x-internal-token': 'test-token',
    'x-auth-user-id': f.actor.userId,
    'x-auth-user-role': 'staff',
    'x-auth-user-status': 'active',
  }
  const call = (change: Record<string, string> = {}, body: unknown = f.input) =>
    app.handle(
      new Request('http://localhost/members/admin/studio/mastery-review-runtime', {
        method: 'POST',
        headers: { ...headers, ...change },
        body: JSON.stringify(body),
      }),
    )
  const deniedHeaders: ReadonlyArray<Record<string, string>> = [
    { 'x-auth-user-role': 'user' },
    { 'x-auth-user-status': 'inactive' },
    { 'x-auth-account-id': f.actor.userId },
    { 'x-auth-impersonator-id': crypto.randomUUID() },
    { 'x-auth-kids-context': 'student' },
  ]
  for (const change of deniedHeaders) expect((await call(change)).status).toBe(403)
  expect((await call({ 'x-internal-token': 'wrong' })).status).toBe(401)
  expect((await call({}, { ...f.input, revision: 'b'.repeat(64) })).status).toBe(400)
  const response = await call()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
})
