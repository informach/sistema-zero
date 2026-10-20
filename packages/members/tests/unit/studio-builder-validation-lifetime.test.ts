import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  applyStudioProChange,
  type StudioProBuilderClaim,
  type StudioProBuilderRepository,
} from '@sistemazero/core/studio'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { StudioBuilderService } from '../../src/application/studio-pro/studio-builder.service'
import { authoringFixture } from '../fakes/studio-authoring-policy'

test.each([
  'initial-lease',
  'final-lease',
  'final-deadline',
  'review-after-deadline',
  'abort-final-gap',
])('fresh lease fence covers %s', async (mode) => {
  const { project } = await authoringFixture('python', 'pro')
  const payload = await capturePythonProRevisionPayload(project)
  const change = {
    baseHash: payload.base.hash,
    summary: 'add',
    patches: [{ path: 'src/new.py', before: null, content: 'n = 1\n' }],
  }
  const candidate = await applyStudioProChange(payload.base, change)
  let now = new Date('2026-10-18T13:00:00Z')
  const leaseUntil = new Date(now.getTime() + (mode === 'final-deadline' ? 600000 : 1000)),
    id = randomUUID(),
    token = randomUUID()
  const actor = { accountId: randomUUID(), userId: randomUUID(), privileged: false }
  const claim: StudioProBuilderClaim = {
    token: null,
    binaries: payload.binaries,
    validationLease: { revisionHash: candidate.revision.hash, parentOrigin: 'https://kids.test' },
    job: {
      id,
      projectId: project.id,
      objective: 'add',
      model: 'qa/model',
      base: payload.base,
      phase: 'validating',
      version: 3,
      modelCalls: 1,
      validationCalls: 1,
      createdAt: now.toISOString(),
      deadlineAt: new Date(now.getTime() + 300000).toISOString(),
      expiresAt: new Date(now.getTime() + 86400000).toISOString(),
      leaseUntil: leaseUntil.toISOString(),
      result: { change, revisionHash: candidate.revision.hash, plan: ['add'], evidence: [] },
      error: null,
      cost: null,
      notes: [],
    },
  }
  if (mode === 'final-deadline') claim.job.deadlineAt = new Date(now.getTime() + 1000).toISOString()
  if (mode === 'review-after-deadline') {
    claim.job.phase = 'review'
    claim.job.deadlineAt = new Date(now.getTime() - 1).toISOString()
  }
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let reads = 0,
    policies = 0
  const controller = new AbortController()
  const repository: StudioProBuilderRepository = {
    purgeExpired: async () => 0,
    list: async () => ({ jobs: [], nextCursor: null }),
    execute: async (_owner, _command, capturedNow) => {
      // Same comparison as the SQL adapter: its `now` argument was captured before I/O.
      if (leaseUntil <= capturedNow) throw new Error('expired')
      if (++reads === (mode === 'initial-lease' ? 1 : 2)) {
        entered.resolve()
        await release.promise
      }
      // Abort after the owned helper settles but before its caller resumes. No clock side effect.
      if (mode === 'abort-final-gap' && reads === 2)
        queueMicrotask(() =>
          queueMicrotask(() =>
            queueMicrotask(() =>
              controller.abort(new DOMException('withdrawn after SQL settlement', 'AbortError')),
            ),
          ),
        )
      return structuredClone(claim)
    },
  }
  const service = new StudioBuilderService(
    repository,
    () => now,
    true,
    false,
    async () => {
      policies++
      return {}
    },
  )
  const pending = service
    .execute(
      actor,
      {
        operation: 'authorize-validation',
        id,
        projectId: project.id,
        token,
        version: 3,
        revisionHash: candidate.revision.hash,
        runtimeOperation: 'execute',
      },
      controller.signal,
    )
    .then(
      (value) => ({ value }),
      (error: Error) => ({ error }),
    )
  try {
    await entered.promise
    if (mode !== 'review-after-deadline' && mode !== 'abort-final-gap')
      now = new Date(
        mode === 'final-deadline' ? Date.parse(claim.job.deadlineAt) + 1 : leaseUntil.getTime() + 1,
      )
    release.resolve()
    const outcome = await pending
    expect(reads).toBe(mode === 'initial-lease' ? 1 : 2)
    expect(policies).toBe(mode === 'initial-lease' ? 0 : 1)
    if (mode === 'abort-final-gap') expect(controller.signal.aborted).toBe(true)
    expect('error' in outcome).toBe(mode !== 'review-after-deadline')
  } finally {
    release.resolve()
    await pending
  }
})
