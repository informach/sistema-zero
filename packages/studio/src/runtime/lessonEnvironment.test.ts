import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioLessonRuntimeDecisionSchema,
  type StudioLessonRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { createLessonRuntimeEnvironment } from './lessonEnvironment'
import { preparePythonExecutionSnapshot } from './python/snapshot'
import { assertStudioRuntimeExecutionAccess } from './registry'

async function setup() {
  const { project, environment: approved } = await pythonEnvironmentFixture('pro')
  const scope = {
    userId: '11111111-1111-4111-8111-111111111111',
    lessonId: '22222222-2222-4222-8222-222222222222',
    blockId: '33333333-3333-4333-8333-333333333333',
    baselineId: 'b'.repeat(64),
  }
  const controller = new AbortController()
  let now = 100
  const calls: StudioLessonRuntimeRequest[] = []
  async function response(input: StudioLessonRuntimeRequest) {
    return StudioLessonRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: scope.userId, accountId: scope.userId },
      context: {
        kind: 'lesson',
        lessonId: scope.lessonId,
        blockId: scope.blockId,
        baselineId: scope.baselineId,
      },
      projectId: input.subject.id,
      revision: input.revision,
      subjectSha256: await sha256Hex(canonicalJson(input.subject)),
      runtime: project.runtime,
      releaseStatus: 'active',
      operation: input.operation,
      capabilities:
        input.operation === 'analyze'
          ? ['edit', 'export-source']
          : ['edit', 'execute', 'export-source', 'python-repl'],
      grantedExtensionIds: approved.access(project).grantedExtensionIds,
      catalog: approved.catalog,
      blockIds: ['py_print'],
      curation: { pythonLevel: 2 },
      frame: {
        url: `https://runtime.test/v1/runtimes/${project.runtime.manifestSha256}/frame.html`,
        allowedOrigins: ['https://runtime.test'],
      },
      issuedAt: 1_000_000,
      expiresAt: 1_030_000,
    })
  }
  let respond: (input: StudioLessonRuntimeRequest) => Promise<unknown> = response
  const options = {
    project,
    scope,
    signal: controller.signal,
    clock: () => now,
    request: async (input: StudioLessonRuntimeRequest) => {
      calls.push(input)
      return respond(input)
    },
  }
  return {
    project,
    scope,
    controller,
    calls,
    response,
    options,
    respond: (handler: typeof respond) => {
      respond = handler
    },
    advance: (ms: number) => {
      now += ms
    },
  }
}

test('lesson environment verifies catalog and grants only the actual execution snapshot for a bounded duration', async () => {
  const f = await setup()
  const environment = await createLessonRuntimeEnvironment(f.options)
  // Editor hosts receive code analysis through the contextual wrapper.
  expect(typeof environment.createPythonLanguage).toBe('function')
  expect(typeof environment.requestPythonAssistance).toBe('function')
  expect(f.calls.length).toBe(1)
  expect(f.calls[0]!.operation).toBe('analyze')
  expect(JSON.stringify(f.calls[0]).length).toBeLessThan(2500)
  expect(environment.access(f.project).grantedCapabilities).toEqual(['edit', 'export-source'])
  expect(environment.pythonAuthoring?.[0]?.blockIds).toEqual(['py_print'])
  expect(await environment.resolvePythonAnalysis(f.project, f.controller.signal)).toEqual({
    url: `https://runtime.test/v1/runtimes/${f.project.runtime.manifestSha256}/analysis.html`,
    allowedOrigins: ['https://runtime.test'],
  })
  const snapshot = await preparePythonExecutionSnapshot(f.project)
  await environment.authorize?.({
    project: f.project,
    operation: 'execute',
    revision: snapshot.revision,
    signal: f.controller.signal,
  })
  expect(f.calls[1]!.revision).toBe(snapshot.revision)
  expect(() =>
    assertStudioRuntimeExecutionAccess({
      project: f.project,
      catalog: environment.catalog,
      access: environment.access(f.project),
    }),
  ).not.toThrow()
  const changed = { ...f.project, name: 'Documento editado' }
  expect(() =>
    assertStudioRuntimeExecutionAccess({
      project: changed,
      catalog: environment.catalog,
      access: environment.access(changed),
    }),
  ).toThrow()
  f.advance(30_001)
  expect(() =>
    assertStudioRuntimeExecutionAccess({
      project: f.project,
      catalog: environment.catalog,
      access: environment.access(f.project),
    }),
  ).toThrow()
  expect(environment.access(f.project).grantedCapabilities).toEqual(['edit', 'export-source'])
  await environment.authorize?.({
    project: f.project,
    operation: 'execute',
    revision: snapshot.revision,
    signal: f.controller.signal,
  })
  expect(environment.access(f.project).grantedCapabilities).toContain('execute')
  f.controller.abort()
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
  expect(environment.signal?.aborted).toBe(true)
})

test('mismatched context, subject, revision, deployment or catalog cannot bootstrap an executor', async () => {
  for (const change of ['actor', 'baseline', 'subject', 'revision', 'frame', 'catalog'] as const) {
    const f = await setup()
    f.respond(async (input) => {
      const result = await f.response(input)
      if (change === 'actor') result.actor.userId = f.scope.blockId
      if (change === 'baseline') result.context.baselineId = 'c'.repeat(64)
      if (change === 'subject') result.subjectSha256 = 'c'.repeat(64)
      if (change === 'revision') result.revision = 'c'.repeat(64)
      if (change === 'frame') result.frame.url = 'https://runtime.test/unpinned/frame.html'
      if (change === 'catalog')
        result.catalog.releases[0]!.manifest.artifacts[0]!.sha256 = 'c'.repeat(64)
      return result
    })
    await expect(createLessonRuntimeEnvironment(f.options)).rejects.toThrow()
  }
})

test('a newer access denial fences a late successful authorization without deleting local project data', async () => {
  const f = await setup()
  const environment = await createLessonRuntimeEnvironment(f.options)
  const before = JSON.stringify(f.project)
  const snapshot = await preparePythonExecutionSnapshot(f.project)
  let entered!: () => void
  let release!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  f.respond(async (input) => {
    if (input.operation === 'execute') {
      entered()
      await gate
      return f.response(input)
    }
    throw Object.assign(new Error('revogado'), { status: 403 })
  })
  const pending = environment.authorize!({
    project: f.project,
    operation: 'execute',
    revision: snapshot.revision,
    signal: f.controller.signal,
  })
  await started
  await expect(
    environment.authorize!({
      project: f.project,
      operation: 'analyze',
      revision: 'c'.repeat(64),
      signal: f.controller.signal,
    }),
  ).rejects.toThrow('revogado')
  release()
  await expect(pending).rejects.toThrow()
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
  expect(environment.signal?.aborted).toBe(true)
  const requestsBeforeRetry = f.calls.length
  f.respond(f.response)
  await expect(
    environment.authorize!({
      project: f.project,
      operation: 'execute',
      revision: snapshot.revision,
      signal: f.controller.signal,
    }),
  ).rejects.toThrow()
  expect(f.calls.length).toBe(requestsBeforeRetry)
  expect(JSON.stringify(f.project)).toBe(before)
})

test('scope cancellation and responses that used their entire lifetime never grant execution', async () => {
  for (const action of ['abort', 'expire'] as const) {
    const f = await setup()
    const environment = await createLessonRuntimeEnvironment(f.options)
    f.respond(async (input) => {
      if (action === 'abort') f.controller.abort()
      else f.advance(30_000)
      return f.response(input)
    })
    await expect(
      environment.authorize!({
        project: f.project,
        operation: 'execute',
        revision: 'c'.repeat(64),
        signal: f.controller.signal,
      }),
    ).rejects.toThrow()
    expect(environment.access(f.project).grantedCapabilities).not.toContain('execute')
  }
})

test('web export asks fresh permission for its exact snapshot and refuses loss of source permission', async () => {
  const f = await setup()
  const environment = await createLessonRuntimeEnvironment(f.options)
  const snapshot = await preparePythonExecutionSnapshot(f.project)
  const input = { project: f.project, revision: snapshot.revision, signal: f.controller.signal }
  const first = await environment.resolvePythonWebExport!(input)
  expect(first).toEqual({
    metadataURL: `https://runtime.test/v1/runtime-deployments/${f.project.runtime.manifestSha256}`,
    directoryURL: `https://runtime.test/v1/runtimes/${f.project.runtime.manifestSha256}/`,
  })
  await environment.resolvePythonWebExport!(input)
  expect(f.calls.slice(1).map((request) => [request.operation, request.revision])).toEqual([
    ['execute', snapshot.revision],
    ['execute', snapshot.revision],
  ])
  f.respond(async (request) => {
    const decision = await f.response(request)
    decision.capabilities = ['edit', 'execute']
    return decision
  })
  await expect(environment.resolvePythonWebExport!(input)).rejects.toThrow('exportação web')
  f.controller.abort()
  const before = f.calls.length
  await expect(environment.resolvePythonWebExport!(input)).rejects.toThrow()
  expect(f.calls.length).toBe(before)
})

test('fresh receipts publish effective authority, not TTL or revision changes, and denial revokes it', async () => {
  const f = await setup()
  const environment = await createLessonRuntimeEnvironment(f.options)
  const registry = environment.registry
  const authority = environment.authority!
  const first = authority.getSnapshot()
  let notices = 0
  authority.subscribe(() => notices++)
  await environment.authorize!({
    project: f.project,
    operation: 'analyze',
    revision: 'c'.repeat(64),
    signal: f.controller.signal,
  })
  expect(authority.getSnapshot()).toBe(first)
  expect(notices).toBe(0)
  f.respond(async (input) => ({
    ...(await f.response(input)),
    blockIds: ['sz_py_pass'],
    grantedExtensionIds: [],
    curation: { pythonLevel: 1, allowBlocks: ['sz_py_pass'] },
    releaseStatus: 'retired',
  }))
  await environment.authorize!({
    project: f.project,
    operation: 'analyze',
    revision: 'd'.repeat(64),
    signal: f.controller.signal,
  })
  expect(environment.pythonAuthoring?.[0]?.blockIds).toEqual(['sz_py_pass'])
  expect(authority.getSnapshot().curation).toMatchObject({
    pythonLevel: 1,
    allowBlocks: ['sz_py_pass'],
  })
  expect(authority.getSnapshot().grantedExtensionIds).toEqual([])
  expect(authority.getSnapshot().releaseStatus).toBe('retired')
  expect(notices).toBe(1)
  expect(environment.registry).toBe(registry)
  f.respond(async () => {
    throw Object.assign(new Error('revogado'), { status: 403 })
  })
  await expect(
    environment.authorize!({
      project: f.project,
      operation: 'analyze',
      revision: 'e'.repeat(64),
      signal: f.controller.signal,
    }),
  ).rejects.toThrow('revogado')
  expect(authority.getSnapshot().available).toBe(false)
  expect(authority.getSnapshot().pythonAuthoring[0]?.blockIds).toEqual([])
  expect(authority.getSnapshot().capabilities).toEqual([])
  expect(notices).toBe(2)
})

test('an older successful receipt cannot restore a newer reduced authority or execution grant', async () => {
  const f = await setup()
  const environment = await createLessonRuntimeEnvironment(f.options)
  let release!: () => void
  let entered!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  f.respond(async (input) => {
    if (input.operation === 'execute') {
      entered()
      await gate
    }
    return {
      ...(await f.response(input)),
      blockIds: input.operation === 'execute' ? ['sz_py_integer'] : ['sz_py_pass'],
    }
  })
  const old = environment.authorize!({
    project: f.project,
    operation: 'execute',
    revision: 'a'.repeat(64),
    signal: f.controller.signal,
  })
  await started
  await environment.authorize!({
    project: f.project,
    operation: 'analyze',
    revision: 'b'.repeat(64),
    signal: f.controller.signal,
  })
  const latest = environment.authority!.getSnapshot()
  release()
  await expect(old).rejects.toThrow()
  expect(environment.authority!.getSnapshot()).toBe(latest)
  expect(environment.pythonAuthoring?.[0]?.blockIds).toEqual(['sz_py_pass'])
  expect(environment.access(f.project).grantedCapabilities).not.toContain('execute')
})

test('authority subscribers see installed execution state and can retire it before dispatch', async () => {
  const f = await setup()
  const environment = await createLessonRuntimeEnvironment(f.options)
  const seen: boolean[] = []
  environment.authority!.subscribe(() => {
    const snapshot = environment.authority!.getSnapshot()
    if (!snapshot.available) return
    seen.push(environment.access(f.project).grantedCapabilities?.includes('execute') ?? false)
    f.controller.abort()
  })
  await expect(
    environment.authorize!({
      project: f.project,
      operation: 'execute',
      revision: 'a'.repeat(64),
      signal: f.controller.signal,
    }),
  ).rejects.toThrow()
  expect(seen).toEqual([true])
  expect(environment.authority!.getSnapshot().available).toBe(false)
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
})
