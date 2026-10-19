import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { authorizePythonRemix, pythonRemixCapabilities } from '../src/lib/studio-python-remix'
import { remixRequirementFromSnapshot, studioRemixCovered } from '../src/lib/studio-tier'

async function fixture(kind: 'classic' | 'pro' = 'classic') {
  const f = await pythonEnvironmentFixture(kind)
  const viewerId = crypto.randomUUID()
  const options = {
    legacyJavaScript: true,
    canCreatePro: true,
    pythonCuration: {
      pythonLevel: 3,
      allowedModes: ['blocks', 'bridge', 'code'],
      allowLevelReveal: false,
    },
    catalog: {
      version: 1,
      catalog: f.environment.catalog,
      releases: [
        {
          runtime: f.project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds: ['py_print'],
          categoryIds: ['python-basics'],
        },
      ],
    },
  }
  const requests: StudioFreeRuntimeRequest[] = []
  const decision = async (request: StudioFreeRuntimeRequest) => {
    requests.push(request)
    const now = Date.now()
    return StudioFreeRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: viewerId, accountId: crypto.randomUUID() },
      context: request.context,
      projectId: request.subject.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(request.subject)),
      runtime: request.subject.runtime,
      releaseStatus: 'active',
      operation: request.operation,
      capabilities: ['edit', 'execute'],
      grantedExtensionIds: ['python-turtle'],
      catalog: f.environment.catalog,
      blockIds: ['py_print'],
      curation: options.pythonCuration,
      frame: { url: 'https://runtime.test/frame.html', allowedOrigins: ['https://runtime.test'] },
      issuedAt: now,
      expiresAt: now + 30_000,
    })
  }
  const signal = new AbortController().signal
  return { ...f, viewerId, options, requests, decision, signal }
}

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind} remix validates the real source recipe and binds fresh authoring approval`, async () => {
    const f = await fixture(kind)
    const before = structuredClone(f.project)
    const python = await pythonRemixCapabilities(f.options)
    expect(
      studioRemixCovered(
        { pro: true, allowedExtensions: ['game-2d'], python },
        remixRequirementFromSnapshot(f.project),
      ),
    ).toBe(true)
    expect(
      studioRemixCovered(
        { pro: true, allowedExtensions: ['python-turtle'] },
        remixRequirementFromSnapshot(f.project),
      ),
    ).toBe(false)
    const result = await authorizePythonRemix({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'kids',
      options: f.options,
      signal: f.signal,
      request: f.decision,
    })
    expect(result).toEqual(before)
    expect(f.requests).toHaveLength(1)
    expect(f.requests[0]?.operation).toBe('analyze')
    expect(f.requests[0]?.subject).not.toHaveProperty('files')
    expect(f.requests[0]?.subject).not.toHaveProperty('tree')
    expect(f.project).toEqual(before)
  })

test('adult Python remix requests adult authoring and rejects a Kids decision', async () => {
  const f = await fixture('pro')
  const adultRequest = async (request: StudioFreeRuntimeRequest) => {
    expect(request.context.audience).toBe('adult')
    return f.decision(request)
  }
  const project = await authorizePythonRemix({
    snapshot: f.project,
    viewerId: f.viewerId,
    audience: 'adult',
    options: f.options,
    signal: f.signal,
    request: adultRequest,
  })
  expect(project).toEqual(f.project)
  expect(f.requests[0]?.context.audience).toBe('adult')

  await expect(
    authorizePythonRemix({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'adult',
      options: f.options,
      signal: f.signal,
      request: async (request) => ({
        ...(await f.decision(request)),
        context: { ...request.context, audience: 'kids' },
      }),
    }),
  ).rejects.toThrow('acesso mudou')
})

test('new Python remix refuses retired, revoked, missing and mismatched environments before authorization', async () => {
  const f = await fixture('pro')
  for (const status of ['retired', 'revoked']) {
    const options = structuredClone(f.options)
    options.catalog.releases[0]!.status = status
    await expect(
      authorizePythonRemix({
        snapshot: f.project,
        viewerId: f.viewerId,
        audience: 'kids',
        options,
        signal: f.signal,
        request: f.decision,
      }),
    ).rejects.toThrow('disponível')
  }
  await expect(
    authorizePythonRemix({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'kids',
      options: { ...f.options, canCreatePro: false },
      signal: f.signal,
      request: f.decision,
    }),
  ).rejects.toThrow('disponível')
  await expect(
    authorizePythonRemix({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'kids',
      options: { ...f.options, catalog: null },
      signal: f.signal,
      request: f.decision,
    }),
  ).rejects.toThrow('disponível')
  const requirement = remixRequirementFromSnapshot({
    ...f.project,
    runtime: { ...f.project.runtime, releaseId: 'other' },
  })
  expect(
    studioRemixCovered(
      { pro: true, allowedExtensions: [], python: await pythonRemixCapabilities(f.options) },
      requirement,
    ),
  ).toBe(false)
  expect(f.requests).toHaveLength(0)
})

test('remix discards wrong actor, source, runtime, context, operation and expired/revoked decisions', async () => {
  const f = await fixture()
  const changes = [
    { actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() } },
    { subjectSha256: 'b'.repeat(64) },
    { revision: 'b'.repeat(64) },
    { projectId: 'other' },
    { runtime: { ...f.project.runtime, releaseId: 'other' } },
    { context: { kind: 'free', audience: 'kids', projectId: 'other' } },
    { operation: 'execute' },
    { releaseStatus: 'revoked' },
    { capabilities: [] },
    { issuedAt: 1, expiresAt: 30_001 },
    { issuedAt: Date.now() + 100_000, expiresAt: Date.now() + 130_000 },
  ]
  for (const change of changes)
    await expect(
      authorizePythonRemix({
        snapshot: f.project,
        viewerId: f.viewerId,
        audience: 'kids',
        options: f.options,
        signal: f.signal,
        request: async (request) => ({ ...(await f.decision(request)), ...change }),
      }),
    ).rejects.toThrow('acesso mudou')
})

test('an authorization denial or cancellation never yields an importable Python copy', async () => {
  const f = await fixture()
  await expect(
    authorizePythonRemix({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'kids',
      options: f.options,
      signal: f.signal,
      request: async () => {
        throw new Error('Acesso negado')
      },
    }),
  ).rejects.toThrow('Acesso negado')
  const controller = new AbortController()
  await expect(
    authorizePythonRemix({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'kids',
      options: f.options,
      signal: controller.signal,
      request: async (request) => {
        const decision = await f.decision(request)
        controller.abort()
        return decision
      },
    }),
  ).rejects.toThrow()
})
