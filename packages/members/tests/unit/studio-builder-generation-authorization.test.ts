import { expect, test } from 'bun:test'
import {
  applyStudioProChange,
  type StudioProBuilderClaim,
  type StudioProBuilderCommand,
  type StudioProBuilderRepository,
} from '@sistemazero/core/studio'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { StudioBuilderService } from '../../src/application/studio-pro/studio-builder.service'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function fixture(repair = false) {
  const { project, configuration } = await authoringFixture('python', 'pro')
  const runtimeRelease = configuration.catalog.releases[0]
  if (!runtimeRelease) throw new Error('Missing fixture release')
  const payload = await capturePythonProRevisionPayload(project)
  const change = {
    baseHash: payload.base.hash,
    summary: 'Adicionar função',
    patches: [{ path: 'src/new.py', before: null, content: 'value = 2\n' }],
  }
  const revision = repair
    ? (await applyStudioProChange(payload.base, change)).revision
    : payload.base
  let now = new Date('2026-10-19T13:00:00Z')
  const claim: StudioProBuilderClaim = {
    token: null,
    binaries: payload.binaries,
    generationLease: { revisionHash: revision.hash, parentOrigin: 'https://kids.test' },
    job: {
      id: crypto.randomUUID(),
      projectId: project.id,
      objective: 'Adicionar função',
      model: 'qa/model',
      base: payload.base,
      phase: 'generating',
      version: 2,
      modelCalls: 1,
      validationCalls: 0,
      createdAt: now.toISOString(),
      deadlineAt: new Date(now.getTime() + 300_000).toISOString(),
      expiresAt: new Date(now.getTime() + 600_000).toISOString(),
      leaseUntil: new Date(now.getTime() + 30_000).toISOString(),
      result: repair
        ? { change, revisionHash: revision.hash, plan: ['Adicionar função'], evidence: [] }
        : null,
      error: null,
      cost: null,
      notes: [],
    },
  }
  const command: Extract<StudioProBuilderCommand, { operation: 'authorize-generation' }> = {
    operation: 'authorize-generation',
    id: claim.job.id,
    projectId: project.id,
    token: crypto.randomUUID(),
    version: claim.job.version,
    revisionHash: revision.hash,
  }
  const actor = { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false }
  const events: string[] = []
  let onRead = (_reads: number) => {},
    onPolicy = () => {},
    reads = 0
  const repository: StudioProBuilderRepository = {
    list: async () => ({ jobs: [], nextCursor: null }),
    purgeExpired: async () => 0,
    execute: async (_actor, received) => {
      expect(received).toEqual(command)
      events.push('sql')
      onRead(++reads)
      return structuredClone(claim)
    },
  }
  const service = new StudioBuilderService(
    repository,
    () => now,
    true,
    false,
    async (_actor, base, metadata, operation) => {
      events.push('policy')
      expect(operation).toBe('analyze')
      expect(base.hash).toBe(revision.hash)
      expect(metadata.configuration).toEqual(
        (await prepareStudioPythonProExecution(revision, payload.binaries)).metadata.configuration,
      )
      onPolicy()
      return { runtimeRelease }
    },
  )
  return {
    service,
    actor,
    command,
    claim,
    revision,
    payload,
    runtimeRelease,
    events,
    read(fn: typeof onRead) {
      onRead = fn
    },
    policy(fn: typeof onPolicy) {
      onPolicy = fn
    },
    advance(ms: number) {
      now = new Date(now.getTime() + ms)
    },
  }
}

test.each([
  false,
  true,
])('generation authorizes the exact working revision (repair=%s) without exposing materials', async (repair) => {
  const f = await fixture(repair)
  const expected = await prepareStudioPythonProExecution(f.revision, f.payload.binaries)
  const initial = structuredClone(f.claim)
  const result = await f.service.execute(f.actor, f.command)
  expect(f.events).toEqual(['sql', 'policy', 'sql'])
  expect(result?.authorization).toEqual({
    policy: { runtimeRelease: f.runtimeRelease },
    revisionHash: f.revision.hash,
    executionRevision: expected.metadata.revision,
    parentOrigin: 'https://kids.test',
  })
  expect(result?.token).toBeNull()
  expect(result).not.toHaveProperty('binaries')
  expect(result).not.toHaveProperty('generationLease')
  expect(f.claim).toEqual(initial)
})

test.each([
  'initial-lease',
  'final-lease',
  'final-deadline',
  'final-retention',
  'cancelled',
  'version',
  'scope',
  'parent-origin',
])('generation refuses a stale %s after awaited reads', async (mode) => {
  const f = await fixture()
  f.read((read) => {
    if (mode === 'initial-lease' && read === 1) f.advance(30_001)
    if (read !== 2) return
    if (mode === 'final-lease') f.advance(30_001)
    if (mode === 'final-deadline') f.claim.job.deadlineAt = f.claim.job.createdAt
    if (mode === 'final-retention') f.claim.job.expiresAt = f.claim.job.createdAt
    if (mode === 'cancelled') f.claim.job.phase = 'cancelled'
    if (mode === 'version') f.claim.job.version++
    if (mode === 'scope') f.claim.generationLease!.revisionHash = 'f'.repeat(64)
    if (mode === 'parent-origin') f.claim.generationLease!.parentOrigin = 'https://foreign.test'
  })
  await expect(f.service.execute(f.actor, f.command)).rejects.toThrow()
  expect(f.events).toEqual(mode === 'initial-lease' ? ['sql'] : ['sql', 'policy', 'sql'])
})

test('generation rejects owner cancellation after policy without accepting metadata', async () => {
  const f = await fixture()
  const controller = new AbortController()
  f.policy(() => controller.abort(new DOMException('Retirada', 'AbortError')))
  await expect(f.service.execute(f.actor, f.command, controller.signal)).rejects.toThrow('Retirada')
  expect(f.events).toEqual(['sql', 'policy'])
})

test('generation rejects metadata and a runtime operation supplied with the command', async () => {
  const f = await fixture()
  for (const added of [{ policy: {} }, { runtimeRelease: {} }, { runtimeOperation: 'execute' }])
    await expect(f.service.execute(f.actor, { ...f.command, ...added })).rejects.toThrow('Comando')
  expect(f.events).toEqual([])
})
