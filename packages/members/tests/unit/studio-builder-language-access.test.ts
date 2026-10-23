import { expect, test } from 'bun:test'
import {
  createStudioProRevision,
  type StudioProBuilderClaim,
  type StudioProBuilderCommand,
  type StudioProBuilderRepository,
} from '@sistemazero/core/studio'
import { Elysia } from 'elysia'
import { AccessCheckService } from '../../src/application/access-check/access-check.service'
import { StudioBuilderService } from '../../src/application/studio-pro/studio-builder.service'
import { AccessDeniedError } from '../../src/domain/entitlement/entitlement.errors'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { studioBuilderRoutes } from '../../src/interfaces/http/routes/studio-builder.routes'
import { InMemoryEntitlementRepository, silentLogger } from '../fakes/in-memory'

async function fixture() {
  const actor = {
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    audience: 'kids' as const,
    privileged: false,
  }
  const base = await createStudioProRevision({
    projectId: 'saved-js',
    templateId: 'vanilla-vite',
    devScript: 'dev',
    files: { 'index.html': '<p>Play</p>' },
    directories: [],
    assets: '[]',
    assetFiles: {},
  })
  const now = new Date('2026-10-22T12:00:00Z')
  const state: StudioProBuilderClaim = {
    token: null,
    job: {
      id: crypto.randomUUID(),
      projectId: base.projectId,
      base,
      objective: 'Melhorar',
      model: 'qa/model',
      phase: 'queued',
      version: 0,
      modelCalls: 0,
      validationCalls: 0,
      createdAt: now.toISOString(),
      deadlineAt: new Date(+now + 60000).toISOString(),
      expiresAt: new Date(+now + 120000).toISOString(),
      leaseUntil: null,
      result: null,
      error: null,
      cost: null,
      notes: [],
    },
  }
  const calls: StudioProBuilderCommand[] = []
  let allowed = true,
    policyCalls = 0,
    onPolicy = () => {}
  const repo: StudioProBuilderRepository = {
    list: async () => ({ jobs: [], nextCursor: null }),
    purgeExpired: async () => 0,
    execute: async (owner, command) => {
      calls.push(command)
      if (
        owner.userId !== actor.userId ||
        owner.accountId !== actor.accountId ||
        owner.audience !== actor.audience ||
        ('projectId' in command && command.projectId !== base.projectId)
      )
        return null
      return structuredClone(state)
    },
  }
  const service = new StudioBuilderService(
    repo,
    () => now,
    true,
    true,
    undefined,
    async (owner) => {
      expect(owner).toEqual(actor)
      policyCalls++
      onPolicy()
      if (!allowed) throw new AccessDeniedError('Conclua um curso JavaScript.')
    },
  )
  return {
    actor,
    base,
    state,
    calls,
    service,
    revoke() {
      allowed = false
    },
    policy(fn: () => void) {
      onPolicy = fn
    },
    get policyCalls() {
      return policyCalls
    },
  }
}

test('unavailable JavaScript authority refuses persisted execution while reads and cleanup remain available', async () => {
  const f = await fixture()
  f.revoke()
  for (const operation of ['claim', 'preview-claim'] as const) {
    await expect(
      f.service.execute(f.actor, { operation, id: f.state.job.id, projectId: f.base.projectId }),
    ).rejects.toThrow('curso JavaScript')
    expect(f.calls.some((call) => call.operation === operation)).toBe(false)
  }
  const checks = f.policyCalls
  for (const operation of [
    'get',
    'cancel',
    'preview-release',
    'discard',
    'remove-project',
  ] as const) {
    const command =
      operation === 'preview-release'
        ? {
            operation,
            id: f.state.job.id,
            projectId: f.base.projectId,
            token: crypto.randomUUID(),
            version: 0,
            error: 'cancelled',
          }
        : operation === 'discard'
          ? { operation, id: f.state.job.id, projectId: f.base.projectId, version: 0 }
          : operation === 'remove-project'
            ? { operation, projectId: f.base.projectId }
            : { operation, id: f.state.job.id, projectId: f.base.projectId }
    await f.service.execute(f.actor, command)
  }
  expect(f.policyCalls).toBe(checks)
})

test('JavaScript admission checks its canonical base before writing', async () => {
  const f = await fixture()
  const create = {
    operation: 'create',
    id: f.state.job.id,
    base: f.base,
    binaries: {},
    objective: 'Melhorar',
    model: 'qa/model',
    parentOrigin: 'https://kids.test',
  }
  f.revoke()
  await expect(f.service.execute(f.actor, create)).rejects.toThrow('curso JavaScript')
  expect(f.calls).toEqual([])
})

test('fresh dispatch authorization uses the persisted JavaScript job, not a claimed language', async () => {
  const f = await fixture()
  const command = {
    operation: 'authorize-javascript',
    id: f.state.job.id,
    projectId: f.base.projectId,
  }
  const before = structuredClone(f.state)
  expect(await f.service.execute(f.actor, command)).toEqual({ job: f.state.job, token: null })
  expect(f.state).toEqual(before)
  expect(f.calls.map((c) => c.operation)).toEqual(['authorize-javascript', 'authorize-javascript'])
  await expect(f.service.execute(f.actor, { ...command, language: 'python' })).rejects.toThrow(
    'Comando',
  )
  f.revoke()
  await expect(f.service.execute(f.actor, command)).rejects.toThrow('curso JavaScript')
  expect(await f.service.execute({ ...f.actor, userId: crypto.randomUUID() }, command)).toBeNull()
  expect(await f.service.execute({ ...f.actor, audience: 'adult' }, command)).toBeNull()
})

test('revocation or cancellation during an awaited policy never yields dispatch authorization', async () => {
  for (const failure of ['version', 'cancel', 'abort'] as const) {
    const f = await fixture()
    const controller = new AbortController()
    f.policy(() => {
      if (failure === 'version') f.state.job.version++
      else if (failure === 'cancel') f.state.job.phase = 'cancelled'
      else controller.abort()
    })
    const outcome = await f.service
      .execute(
        f.actor,
        { operation: 'authorize-javascript', id: f.state.job.id, projectId: f.base.projectId },
        controller.signal,
      )
      .then(
        () => 'allowed',
        () => 'denied',
      )
    expect(outcome).toBe('denied')
  }
})

test('an unconfigured JavaScript policy fails closed and does not persist admission', async () => {
  const f = await fixture()
  let writes = 0
  const service = new StudioBuilderService(
    {
      list: async () => ({ jobs: [], nextCursor: null }),
      purgeExpired: async () => 0,
      execute: async () => {
        writes++
        return null
      },
    },
    () => new Date(),
    true,
  )
  await expect(
    service.execute(f.actor, {
      operation: 'create',
      id: f.state.job.id,
      base: f.base,
      binaries: {},
      objective: 'Melhorar',
      model: 'qa/model',
      parentOrigin: 'https://kids.test',
    }),
  ).rejects.toThrow('JavaScript')
  expect(writes).toBe(0)
})

test('the HTTP boundary keeps owner reads and cleanup available after product access is lost', async () => {
  const f = await fixture()
  f.revoke()
  const app = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
    .use(
      studioBuilderRoutes({
        service: f.service,
        internalToken: 'qa-internal',
        accessCheck: new AccessCheckService(new InMemoryEntitlementRepository(), () => new Date()),
      }),
    )
  async function send(command: unknown, consumer = 'member-shell') {
    return app.handle(
      new Request('http://localhost/members/internal/studio-ai/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'qa-internal',
          'x-consumer-id': consumer,
        },
        body: JSON.stringify({ actor: f.actor, command }),
      }),
    )
  }
  for (const operation of ['get', 'cancel', 'discard', 'remove-project'] as const) {
    const command =
      operation === 'discard'
        ? { operation, id: f.state.job.id, projectId: f.base.projectId, version: 0 }
        : operation === 'remove-project'
          ? { operation, projectId: f.base.projectId }
          : { operation, id: f.state.job.id, projectId: f.base.projectId }
    expect((await send(command)).status).toBe(200)
  }
  expect(
    (
      await send({
        operation: 'authorize-javascript',
        id: f.state.job.id,
        projectId: f.base.projectId,
      })
    ).status,
  ).toBe(403)
  expect(
    (await send({ operation: 'claim', id: f.state.job.id, projectId: f.base.projectId })).status,
  ).toBe(403)
  expect(f.policyCalls).toBe(0)
})
