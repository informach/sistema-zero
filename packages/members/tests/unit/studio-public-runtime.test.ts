import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioPublicRuntimeDecisionSchema,
  type StudioPublicRuntimeRequest,
  StudioPublicRuntimeRequestSchema,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { Elysia } from 'elysia'
import { AuthorizePublicRuntimeService } from '../../src/application/studio/authorize-public-runtime.service'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { studioPublicRuntimeRoutes } from '../../src/interfaces/http/routes/studio-public-runtime.routes'
import { silentLogger } from '../fakes/in-memory'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function setup(
  kind: 'classic' | 'pro' = 'classic',
  status: 'active' | 'retired' | 'revoked' = 'active',
) {
  const f = await authoringFixture('python', kind)
  f.configuration.releases[0]!.status = status
  const service = new AuthorizePublicRuntimeService(
    await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, [
        { runtime: f.project.runtime, origin: 'https://runtime.test' },
      ]),
    ),
    () => 100_000,
  )
  const input: StudioPublicRuntimeRequest = {
    context: { kind: 'public', playId: crypto.randomUUID(), publicationRevision: 'b'.repeat(64) },
    operation: 'execute',
    subject: studioRuntimeSubject(f.project),
    revision: 'c'.repeat(64),
  }
  return { ...f, input, service }
}

for (const kind of ['classic', 'pro'] as const)
  test(`anonymous ${kind} authorization binds publication/runtime and grants only execution`, async () => {
    const f = await setup(kind)
    const result = await f.service.execute(f.input)
    expect(result.actor).toBeNull()
    expect(result.context).toEqual(f.input.context)
    expect(result.revision).toBe(f.input.revision)
    expect(result.subjectSha256).toBe(await sha256Hex(canonicalJson(f.input.subject)))
    expect(result.capabilities).toEqual(['execute'])
    expect(result.blockIds).toEqual([])
    expect(result.expiresAt - result.issuedAt).toBe(30_000)
    expect(
      StudioPublicRuntimeDecisionSchema.safeParse({ ...result, capabilities: ['edit'] }).success,
    ).toBe(false)
    expect(
      StudioPublicRuntimeDecisionSchema.safeParse({
        ...result,
        actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() },
      }).success,
    ).toBe(false)
  })

test('public execution rejects revoked/unknown runtime, unauthorized extension and external requirements; retired revisions remain playable', async () => {
  const retired = await setup('pro', 'retired')
  expect((await retired.service.execute(retired.input)).releaseStatus).toBe('retired')
  const revoked = await setup('pro', 'revoked')
  await expect(revoked.service.execute(revoked.input)).rejects.toThrow('revogado')
  const f = await setup()
  await expect(new AuthorizePublicRuntimeService(undefined).execute(f.input)).rejects.toThrow(
    'não está disponível',
  )
  await expect(
    f.service.execute({
      ...f.input,
      subject: {
        ...f.input.subject,
        runtime: { ...f.input.subject.runtime, releaseId: 'unknown' },
      },
    }),
  ).rejects.toThrow()
  await expect(
    f.service.execute({
      ...f.input,
      subject: { ...f.input.subject, installedExtensions: [{ id: 'unknown', version: '1.0.0' }] },
    }),
  ).rejects.toThrow()
  if (f.input.subject.programmingLanguage !== 'python') throw new Error('Python fixture')
  await expect(
    f.service.execute({ ...f.input, subject: { ...f.input.subject, requirements: 'pygame-ce' } }),
  ).rejects.toThrow()
  for (const operation of ['analyze', 'python-repl', 'install-dependencies'])
    expect(StudioPublicRuntimeRequestSchema.safeParse({ ...f.input, operation }).success).toBe(
      false,
    )
})

test('public runtime HTTP requires internal token and authenticated member-shell consumer, no user identity or client authority fields', async () => {
  const f = await setup('pro')
  const app = new Elysia()
    .onError(({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(studioPublicRuntimeRoutes({ service: f.service, internalToken: 'internal-test-token' }))
  const call = (body: unknown = f.input, headers: Record<string, string> = {}) =>
    app.handle(
      new Request('http://localhost/members/internal/studio/public-runtime', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    )
  const trusted = { 'x-internal-token': 'internal-test-token', 'x-consumer-id': 'member-shell' }
  const deniedHeaders: Record<string, string>[] = [
    {},
    { 'x-auth-user-id': crypto.randomUUID() },
    { ...trusted, 'x-internal-token': 'wrong' },
    { ...trusted, 'x-consumer-id': 'hub' },
  ]
  for (const headers of deniedHeaders) expect((await call(f.input, headers)).status).toBe(401)
  const allowed = await call(f.input, trusted)
  expect(allowed.status).toBe(200)
  expect(allowed.headers.get('cache-control')).toBe('private, no-store')
  expect(StudioPublicRuntimeDecisionSchema.parse(await allowed.json()).actor).toBeNull()
  for (const fields of [
    { actor: { userId: crypto.randomUUID() } },
    { capabilities: ['edit'] },
    { frame: { url: 'https://attacker.test' } },
    { operation: 'analyze' },
  ])
    expect((await call({ ...f.input, ...fields }, trusted)).status).toBe(400)
})
