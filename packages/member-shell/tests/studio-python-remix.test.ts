import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { PYTHON_PROGRAMMING_CODECS } from '../../studio/src/python/blocks/catalog'
import {
  createPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from '../../studio/src/python/blocks/workspaceDraft'
import { preparePythonExecutionSnapshot } from '../../studio/src/runtime/python/snapshot'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import {
  authorizePythonImport,
  authorizePythonPrivateCopy,
  authorizePythonRemix,
  pythonRemixCapabilities,
} from '../src/lib/studio-python-remix'
import { remixRequirementFromSnapshot, studioRemixCovered } from '../src/lib/studio-tier'

async function fixture(kind: 'classic' | 'pro' = 'classic') {
  const f = await pythonEnvironmentFixture(kind)
  const viewerId = crypto.randomUUID()
  const options = {
    legacyJavaScript: true,
    canCreatePro: true,
    canCreateJavaScript: true,
    canCreatePython: true,
    pythonGrantedExtensionIds: ['python-turtle'],
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
          blockIds: ['sz_py_pass'],
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
      blockIds: ['sz_py_pass'],
      curation: options.pythonCuration,
      frame: { url: 'https://runtime.test/frame.html', allowedOrigins: ['https://runtime.test'] },
      issuedAt: now,
      expiresAt: now + 30_000,
    })
  }
  const signal = new AbortController().signal
  return { ...f, viewerId, options, requests, decision, signal }
}

test('Python copy discovery uses earned extensions, not every extension in the release', async () => {
  const f = await fixture()
  f.options.pythonGrantedExtensionIds = []
  const capabilities = await pythonRemixCapabilities(f.options)
  expect(capabilities).toHaveLength(2)
  expect(capabilities.every(({ allowedExtensions }) => allowedExtensions.length === 0)).toBe(true)
  f.options.pythonGrantedExtensionIds = ['python-turtle', 'unqualified-extension']
  expect((await pythonRemixCapabilities(f.options))[0]?.allowedExtensions).toEqual([
    'python-turtle',
  ])
})

test('Python Pro private import uses its own earned right; JavaScript grants never substitute for it', async () => {
  const f = await fixture('pro')
  const source = structuredClone(f.project)
  const input = {
    snapshot: f.project,
    viewerId: f.viewerId,
    audience: 'kids' as const,
    signal: f.signal,
    request: f.decision,
  }
  await expect(
    authorizePythonImport({ ...input, options: { ...f.options, canCreatePython: false } }),
  ).rejects.toThrow()
  expect(f.requests).toHaveLength(0)
  expect(f.project).toEqual(source)
  expect(
    await authorizePythonImport({
      ...input,
      options: { ...f.options, canCreateJavaScript: false },
    }),
  ).toEqual(source)
  expect(f.requests).toHaveLength(1)
  expect(f.project).toEqual(source)
})

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind} imports editable work without pretending it is executable`, async () => {
    const f = await fixture(kind)
    const project = structuredClone(f.project)
    if (project.kind === 'classic') {
      const draft = createPythonWorkspaceDraft(
        project,
        project.python.entrypoint,
        { blocks: { languageVersion: 0, blocks: [] } },
        [],
      )
      project.blocksState = updatePythonWorkspaceDraft(project, draft.path, draft)
    } else {
      project.tree['requirements.txt'] = {
        kind: 'file',
        content: '# Ainda estou editando as dependências\n',
      }
    }
    const original = structuredClone(project)
    const input = {
      snapshot: project,
      viewerId: f.viewerId,
      audience: 'kids' as const,
      signal: f.signal,
      options: f.options,
      request: f.decision,
    }
    const imported = await authorizePythonImport(input)
    expect(imported).toEqual(original)
    expect(project).toEqual(original)
    expect(f.requests).toHaveLength(1)
    expect(f.requests[0]?.revision).toBe(await sha256Hex(canonicalJson(imported)))
    await expect(preparePythonExecutionSnapshot(imported)).rejects.toThrow()
    await expect(authorizePythonPrivateCopy(input)).rejects.toThrow()
    await expect(
      authorizePythonImport({
        ...input,
        request: async (request) => ({ ...(await f.decision(request)), expiresAt: 1 }),
      }),
    ).rejects.toThrow()
    expect(project).toEqual(original)
  })

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind} remix validates the real source recipe and binds fresh authoring approval`, async () => {
    const f = await fixture(kind)
    const before = structuredClone(f.project)
    const python = await pythonRemixCapabilities(f.options)
    expect(
      studioRemixCovered(
        { javascript: true, pro: true, allowedExtensions: ['game-2d'], python },
        remixRequirementFromSnapshot(f.project),
      ),
    ).toBe(true)
    expect(
      studioRemixCovered(
        { javascript: true, pro: true, allowedExtensions: ['python-turtle'] },
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
      {
        javascript: true,
        pro: true,
        allowedExtensions: [],
        python: await pythonRemixCapabilities(f.options),
      },
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

const authoringBlockIds = PYTHON_PROGRAMMING_CODECS.map(({ id }) => id)

for (const [name, change] of [
  ['required block removed', { blockIds: authoringBlockIds.filter((id) => id !== 'sz_py_class') }],
  ['Ponte removed', { curation: { pythonLevel: 3, allowedModes: ['blocks'] } }],
  [
    'level lowered with reveal merely permitted',
    { curation: { pythonLevel: 1, allowLevelReveal: true } },
  ],
  [
    'explicit curation excludes the block',
    { curation: { pythonLevel: 3, allowBlocks: ['sz_py_print'] } },
  ],
] as const)
  test(`example authoring rejects a final decision with ${name}, despite approved discovery`, async () => {
    const f = await fixture()
    f.options.catalog.releases[0]!.blockIds = [...authoringBlockIds]
    await expect(
      authorizePythonPrivateCopy({
        snapshot: f.project,
        viewerId: f.viewerId,
        audience: 'kids',
        options: f.options,
        signal: f.signal,
        authoringRequirements: {
          requiredBlockIds: ['sz_py_class'],
          requiredModes: ['blocks', 'bridge'],
        },
        request: async (request) => {
          const admitted = { ...(await f.decision(request)), blockIds: authoringBlockIds }
          return { ...admitted, ...change }
        },
      }),
    ).rejects.toThrow('autoria')
    expect(f.requests).toHaveLength(1)
  })

test('example authoring uses explicit final curation and preserves the existing copy return contract', async () => {
  const f = await fixture()
  const project = await authorizePythonPrivateCopy({
    snapshot: f.project,
    viewerId: f.viewerId,
    audience: 'kids',
    options: f.options,
    signal: f.signal,
    authoringRequirements: {
      requiredBlockIds: ['sz_py_class'],
      requiredModes: ['blocks', 'bridge'],
    },
    request: async (request) => ({
      ...(await f.decision(request)),
      blockIds: authoringBlockIds,
      curation: {
        pythonLevel: 1,
        allowLevelReveal: false,
        allowBlocks: ['sz_py_class'],
        allowedModes: ['blocks', 'bridge'],
      },
    }),
  })
  expect(project).toEqual(f.project)
})

test('example authoring captures requirements before asynchronous preparation can mutate them', async () => {
  const f = await fixture()
  const authoringRequirements = {
    requiredBlockIds: ['sz_py_class'],
    requiredModes: ['blocks', 'bridge'] as ('blocks' | 'bridge')[],
  }
  await expect(
    authorizePythonPrivateCopy({
      snapshot: f.project,
      viewerId: f.viewerId,
      audience: 'kids',
      options: f.options,
      signal: f.signal,
      authoringRequirements,
      request: async (request) => {
        authoringRequirements.requiredBlockIds.length = 0
        authoringRequirements.requiredModes.length = 0
        return {
          ...(await f.decision(request)),
          blockIds: [],
          curation: { allowedModes: ['blocks'] },
        }
      },
    }),
  ).rejects.toThrow('autoria')
})

test('Pro example authorization needs its final code mode but no Classic palette', async () => {
  const f = await fixture('pro')
  const args = {
    snapshot: f.project,
    viewerId: f.viewerId,
    audience: 'kids' as const,
    options: f.options,
    signal: f.signal,
    authoringRequirements: { requiredBlockIds: [], requiredModes: ['code'] as const },
  }
  expect(
    await authorizePythonPrivateCopy({
      ...args,
      request: async (request) => ({
        ...(await f.decision(request)),
        blockIds: [],
        curation: { allowedModes: ['code'] },
      }),
    }),
  ).toEqual(f.project)
  await expect(
    authorizePythonPrivateCopy({
      ...args,
      request: async (request) => ({
        ...(await f.decision(request)),
        blockIds: [],
        curation: { allowedModes: ['blocks'] },
      }),
    }),
  ).rejects.toThrow('autoria')
})
