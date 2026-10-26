import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioMasteryReviewRuntimeDecisionSchema,
  type StudioMasteryReviewRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { createMasteryReviewPythonRuntimeEnvironment } from './masteryReviewEnvironment'
import { preparePythonExecutionSnapshot } from './python/snapshot'

async function setup() {
  const { project, environment } = await pythonEnvironmentFixture('pro')
  const snapshot = await preparePythonExecutionSnapshot(project)
  const userId = crypto.randomUUID()
  const submissionId = crypto.randomUUID()
  const controller = new AbortController()
  const calls: unknown[] = []
  let now = 0
  const decision = StudioMasteryReviewRuntimeDecisionSchema.parse({
    version: 1,
    actor: { userId, accountId: userId },
    context: { kind: 'mastery-review', submissionId },
    projectId: project.id,
    revision: snapshot.revision,
    subjectSha256: await sha256Hex(canonicalJson(studioRuntimeSubject(project))),
    runtime: project.runtime,
    releaseStatus: 'active',
    operation: 'execute',
    capabilities: ['execute'],
    grantedExtensionIds: [],
    catalog: environment.catalog,
    blockIds: [],
    curation: { pythonLevel: 3 },
    frame: {
      url: `https://runtime.test/v1/runtimes/${project.runtime.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.test'],
    },
    issuedAt: 100_000,
    expiresAt: 130_000,
  })
  let respond = async (input: StudioMasteryReviewRuntimeRequest): Promise<unknown> => ({
    ...decision,
    operation: input.operation ?? 'execute',
    capabilities: input.operation === 'analyze' ? [] : decision.capabilities,
  })
  const options = {
    project,
    userId,
    submissionId,
    signal: controller.signal,
    clock: () => now,
    request: async (input: StudioMasteryReviewRuntimeRequest) => {
      calls.push(input)
      return respond(input)
    },
  }
  return {
    project,
    snapshot,
    decision,
    options,
    calls,
    controller,
    advance: () => {
      now += 30_001
    },
    respond: (next: typeof respond) => {
      respond = next
    },
  }
}

test('immutable review allows snapshot inspection without language/assistance/export/REPL', async () => {
  const f = await setup()
  const environment = await createMasteryReviewPythonRuntimeEnvironment(f.options)
  expect(f.calls).toEqual([
    { context: { kind: 'mastery-review', submissionId: f.options.submissionId } },
  ])
  expect(environment.createPythonLanguage).toBeUndefined()
  expect(environment.requestPythonAssistance).toBeUndefined()
  expect(environment.resolvePythonWebExport).toBeUndefined()
  expect(environment.access(f.project).grantedCapabilities).toEqual(['execute'])
  for (const operation of ['python-repl'] as const)
    await expect(
      environment.authorize?.({
        project: f.project,
        operation,
        revision: f.snapshot.revision,
        signal: f.controller.signal,
      }),
    ).rejects.toThrow('somente executar')
  expect((await environment.resolvePythonAnalysis(f.project, f.controller.signal)).url).toContain(
    '/analysis.html',
  )
  expect(f.calls[1]).toEqual({
    context: { kind: 'mastery-review', submissionId: f.options.submissionId },
    operation: 'analyze',
  })
  expect(environment.createPythonLanguage).toBeUndefined()
  expect(environment.access(f.project).grantedCapabilities).not.toContain('edit')
  expect(environment.access(f.project).grantedCapabilities).not.toContain('export-source')
})

test('review checks actual source, reviewer identity, submission identity, capabilities and receipt lifetime', async () => {
  for (const change of [
    { actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() } },
    { revision: 'e'.repeat(64) },
    { subjectSha256: 'e'.repeat(64) },
    { context: { kind: 'mastery-review', submissionId: crypto.randomUUID() } },
    { capabilities: ['execute', 'edit'] },
    { expiresAt: 130_001 },
  ]) {
    const f = await setup()
    f.respond(async () => ({ ...f.decision, ...change }))
    await expect(createMasteryReviewPythonRuntimeEnvironment(f.options)).rejects.toThrow()
  }
  const f = await setup()
  if (f.project.kind !== 'pro') throw new Error('Expected pro fixture')
  f.project.tree[f.project.python.entrypoint] = {
    kind: 'file',
    content: 'print("different source")',
  }
  await expect(createMasteryReviewPythonRuntimeEnvironment(f.options)).rejects.toThrow(
    'não corresponde',
  )
})

test('snapshot inspection refuses changed source even when its project and runtime identities match', async () => {
  const f = await setup()
  const environment = await createMasteryReviewPythonRuntimeEnvironment(f.options)
  if (f.project.kind !== 'pro') throw new Error('Expected pro')
  const changed = structuredClone(f.project)
  changed.tree[changed.python.entrypoint] = {
    kind: 'file',
    content: 'print("altered after review")',
  }
  await expect(environment.resolvePythonAnalysis(changed, f.controller.signal)).rejects.toThrow(
    'não corresponde',
  )
  expect(environment.createPythonLanguage).toBeUndefined()
})

test('expired review restarts reauthorize; revoked staff access stops the interpreter authority', async () => {
  const f = await setup()
  const environment = await createMasteryReviewPythonRuntimeEnvironment(f.options)
  f.advance()
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
  f.respond(async () => {
    throw Object.assign(new Error('Acesso revogado'), { status: 403 })
  })
  await expect(
    environment.authorize?.({
      project: f.project,
      operation: 'execute',
      revision: f.snapshot.revision,
      signal: f.controller.signal,
    }),
  ).rejects.toThrow('revogado')
  expect(environment.signal?.aborted).toBe(true)
  expect(environment.access(f.project).grantedCapabilities).toEqual([])
  expect(f.calls).toHaveLength(2)
})
