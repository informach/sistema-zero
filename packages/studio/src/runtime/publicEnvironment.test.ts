import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioPublicRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { createPublicPythonRuntimeEnvironment } from './publicEnvironment'
import { preparePythonExecutionSnapshot } from './python/snapshot'
import { assertStudioRuntimeExecutionAccess } from './registry'

async function setup() {
  const { project, environment: approved } = await pythonEnvironmentFixture('pro')
  const snapshot = await preparePythonExecutionSnapshot(project)
  const playId = crypto.randomUUID()
  const publicationRevision = 'a'.repeat(64)
  const controller = new AbortController()
  let now = 100
  const calls: unknown[] = []
  const decision = StudioPublicRuntimeDecisionSchema.parse({
    version: 1,
    actor: null,
    context: { kind: 'public', playId, publicationRevision },
    projectId: project.id,
    revision: snapshot.revision,
    subjectSha256: await sha256Hex(canonicalJson(studioRuntimeSubject(project))),
    runtime: project.runtime,
    releaseStatus: 'active',
    operation: 'execute',
    capabilities: ['execute'],
    grantedExtensionIds: [],
    catalog: approved.catalog,
    blockIds: [],
    curation: { pythonLevel: 3 },
    frame: {
      url: `https://runtime.test/v1/runtimes/${project.runtime.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.test'],
    },
    issuedAt: 1_000_000,
    expiresAt: 1_030_000,
  })
  let respond = async (): Promise<unknown> => decision
  const options = {
    project,
    playId,
    publicationRevision,
    signal: controller.signal,
    clock: () => now,
    request: async (input: unknown) => {
      calls.push(input)
      return respond()
    },
  }
  return {
    project,
    snapshot,
    options,
    controller,
    decision,
    calls,
    advance: (ms: number) => {
      now += ms
    },
    respond: (handler: typeof respond) => {
      respond = handler
    },
  }
}

test('public environment requests only publication identity, never editor source/actor, and grants no authoring/REPL', async () => {
  const f = await setup()
  const environment = await createPublicPythonRuntimeEnvironment(f.options)
  expect(environment.createPythonLanguage).toBeUndefined()
  expect(environment.requestPythonAssistance).toBeUndefined()
  expect(f.calls).toEqual([
    { playId: f.options.playId, publicationRevision: f.options.publicationRevision },
  ])
  expect(environment.access(f.project).grantedCapabilities).toEqual(['execute'])
  expect(() =>
    assertStudioRuntimeExecutionAccess({
      project: f.project,
      catalog: environment.catalog,
      access: environment.access(f.project),
    }),
  ).not.toThrow()
  await environment.authorize?.({
    project: f.project,
    operation: 'execute',
    revision: f.snapshot.revision,
    signal: f.controller.signal,
  })
  expect(f.calls).toHaveLength(1)
  await environment.authorize?.({
    project: f.project,
    operation: 'execute',
    revision: f.snapshot.revision,
    signal: f.controller.signal,
  })
  expect(f.calls).toHaveLength(2)
  for (const operation of ['analyze', 'python-repl'] as const)
    await expect(
      environment.authorize?.({
        project: f.project,
        operation,
        revision: f.snapshot.revision,
        signal: f.controller.signal,
      }),
    ).rejects.toThrow('somente jogar')
  await expect(environment.resolvePythonAnalysis(f.project, f.controller.signal)).rejects.toThrow(
    'não está disponível',
  )
})

test('public decision binds actual source digest, runtime, anonymous actor, context and approved frame', async () => {
  for (const change of [
    { actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() } },
    { revision: 'f'.repeat(64) },
    { subjectSha256: 'f'.repeat(64) },
    {
      context: { kind: 'public', playId: crypto.randomUUID(), publicationRevision: 'a'.repeat(64) },
    },
    {
      frame: { url: 'https://attacker.test/frame.html', allowedOrigins: ['https://attacker.test'] },
    },
    { capabilities: ['edit', 'execute'] },
  ]) {
    const f = await setup()
    f.respond(async () => ({ ...f.decision, ...change }))
    await expect(createPublicPythonRuntimeEnvironment(f.options)).rejects.toThrow()
  }
  const f = await setup()
  if (f.project.kind !== 'pro') throw new Error('Pro fixture')
  f.project.tree[f.project.python.entrypoint] = { kind: 'file', content: 'print("changed")' }
  await expect(createPublicPythonRuntimeEnvironment(f.options)).rejects.toThrow('não corresponde')
})

test('public initial grant expires, every restart rechecks visibility and revocation closes the authority', async () => {
  const f = await setup()
  const environment = await createPublicPythonRuntimeEnvironment(f.options)
  f.advance(30_001)
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
  f.respond(async () => {
    throw Object.assign(new Error('Hidden publication'), { status: 404 })
  })
  await expect(
    environment.authorize?.({
      project: f.project,
      operation: 'execute',
      revision: f.snapshot.revision,
      signal: f.controller.signal,
    }),
  ).rejects.toThrow('Hidden')
  expect(f.calls).toHaveLength(2)
  expect(environment.signal?.aborted).toBe(true)
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
  await expect(
    environment.authorize?.({
      project: f.project,
      operation: 'execute',
      revision: f.snapshot.revision,
      signal: f.controller.signal,
    }),
  ).rejects.toThrow()
  expect(f.calls).toHaveLength(2)
})
