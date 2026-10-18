import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  applyStudioProChange,
  createStudioProRevision,
  STUDIO_PRO_BUILDER_LIMITS as limits,
} from '@sistemazero/core/studio'
import { StudioBuilderService } from '../../src/application/studio-pro/studio-builder.service'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioAiUsageRepository } from '../../src/infrastructure/persistence/drizzle/studio-ai-usage.repository'
import { DrizzleStudioBuilderRepository } from '../../src/infrastructure/persistence/drizzle/studio-builder.repository'
import { openStudioReviewDatabase } from './studio-review-database'

const url = process.env.STUDIO_REVIEW_DATABASE_URL
describe.skipIf(!url)('Studio builder — durable concurrency in Postgres', () => {
  let connection: DbConnection, service: StudioBuilderService
  let now = new Date('2026-10-15T18:00:00Z')
  const accountId = randomUUID(),
    userId = randomUUID(),
    actor = { accountId, userId, privileged: false }
  beforeAll(async () => {
    connection = await openStudioReviewDatabase(url!)
    service = new StudioBuilderService(
      new DrizzleStudioBuilderRepository(connection.db),
      () => now,
      true,
      true,
    )
  })
  afterAll(async () => {
    if (!connection) return
    await connection.sql`delete from members.studio_builder_jobs where account_id = ${accountId}`
    await connection.sql`delete from members.studio_builder_project_deletions where account_id = ${accountId}`
    await connection.sql`delete from members.adult_studio_builder_project_deletions where account_id = ${accountId}`
    await connection.sql`delete from members.account_deletion_fences where account_id = ${accountId}`
    await connection.sql`delete from members.studio_ai_accounts where account_id = ${accountId}`
    await connection.close()
  })
  async function create(projectId = randomUUID()) {
    const base = await createStudioProRevision({
      projectId,
      templateId: 'vanilla-vite',
      devScript: 'dev',
      files: { 'index.html': '<main>Play</main>' },
      directories: [],
      assets: '{"version":1,"assets":[]}',
      assetFiles: {},
    })
    const command = {
      operation: 'create' as const,
      parentOrigin: 'https://kids.test',
      id: randomUUID(),
      objective: 'Adicionar placar',
      model: 'provider/model',
      binaries: {},
      base,
    }
    return { command, state: (await service.execute(actor, command))! }
  }
  test('execution context is immutable, private and rediscovered after a repository restart', async () => {
    const { command, state } = await create()
    const repo = new DrizzleStudioBuilderRepository(connection.db)
    const pending = await repo.pendingExecutions(now, 20)
    expect(pending.find((job) => job.id === state.job.id)).toEqual({
      id: command.id,
      projectId: command.base.projectId,
      parentOrigin: command.parentOrigin,
      actor,
    })
    expect(Object.keys(state.job)).not.toContain('execution')
    for (const [owner, changed] of [
      [actor, { ...command, parentOrigin: 'https://other.test' }],
      [{ ...actor, privileged: true }, command],
    ] as const) {
      const [result] = await Promise.allSettled([service.execute(owner, changed)])
      expect(result?.status).toBe('rejected')
    }
    await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    })
    expect((await repo.pendingExecutions(now, 20)).some((job) => job.id === state.job.id)).toBe(
      false,
    )
    const expired = new Date(now.getTime() + limits.leaseMs + 1)
    expect((await repo.pendingExecutions(expired, 20)).some((job) => job.id === state.job.id)).toBe(
      true,
    )
    await service.execute(actor, {
      operation: 'cancel',
      id: state.job.id,
      projectId: state.job.projectId,
    })
  })
  test('terminal jobs remain pending until their reserved usage is finished, without another model dispatch', async () => {
    const { state } = await create(),
      repo = new DrizzleStudioBuilderRepository(connection.db)
    const usage = new DrizzleStudioAiUsageRepository(connection.db)
    await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    })
    expect(
      await usage.reserve({
        actor,
        now,
        day: now.toISOString().slice(0, 10),
        estimateMicroUsd: 20,
        expiresAt: new Date(now.getTime() + 300_000),
        externalAvailable: false,
        request: {
          runId: state.job.id,
          projectId: state.job.projectId,
          purpose: 'builder',
          model: 'provider/model',
          inputBytes: 1000,
          maxOutputTokens: 100,
          maxAttempts: 3,
        },
        limits: {
          dailyLimit: 50,
          monthlyLimit: 500,
          dailyMicroUsd: 1000,
          monthlyMicroUsd: 10_000,
          maxConcurrent: 2,
          externalDailyRuns: 200,
          priceCaps: { prompt: 1, completion: 4, request: 0 },
        },
      }),
    ).toMatchObject({ allowed: true })
    await service.execute(actor, {
      operation: 'cancel',
      id: state.job.id,
      projectId: state.job.projectId,
    })
    expect((await repo.pendingExecutions(now, 20)).some((job) => job.id === state.job.id)).toBe(
      true,
    )
    await usage.finish(actor, state.job.id, now)
    expect((await repo.pendingExecutions(now, 20)).some((job) => job.id === state.job.id)).toBe(
      false,
    )
  })
  test('one active job per owner/project survives racing creates; retries preserve structured request identity', async () => {
    const first = await create()
    await service.execute(actor, {
      operation: 'cancel',
      id: first.command.id,
      projectId: first.command.base.projectId,
    })
    const request = {
      version: 1 as const,
      intent: 'change' as const,
      scope: 'part' as const,
      criteria: ['Preservar controles'],
    }
    const commands = Array.from({ length: 6 }, () => ({
      ...first.command,
      id: randomUUID(),
      request,
    }))
    const results = await Promise.allSettled(
      commands.map((command) => service.execute(actor, command)),
    )
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const winnerIndex = results.findIndex((result) => result.status === 'fulfilled')
    const winner = commands[winnerIndex]!
    const replay = await service.execute(actor, winner)
    expect(replay?.job.assistance?.request).toEqual(request)
    await expect(
      service.execute(actor, {
        ...winner,
        request: { ...request, criteria: ['Trocar controles'] },
      }),
    ).rejects.toThrow()
    await service.execute(actor, {
      operation: 'cancel',
      id: winner.id,
      projectId: winner.base.projectId,
    })
    const page = await service.list(actor, { projectId: winner.base.projectId })
    expect(page.jobs).toHaveLength(2)
    const job = page.jobs.find((job) => job.id === winner.id)!
    const discarded = await service.execute(actor, {
      operation: 'discard',
      id: job.id,
      projectId: job.projectId,
      version: job.version,
    })
    expect(discarded?.job.assistance?.disposition).toBe('discarded')
    expect(discarded?.job.assistance?.events.map((event) => event.kind)).toEqual([
      'created',
      'cancelled',
      'discarded',
    ])
    expect(
      (await service.list({ ...actor, userId: randomUUID() }, { projectId: job.projectId })).jobs,
    ).toEqual([])
    expect(discarded?.job.modelCalls).toBe(0)
  })
  test('project removal deletes retained sources and fences late creates/checkpoints without affecting another profile', async () => {
    const first = await create()
    const projectId = first.command.base.projectId
    const claim = (await service.execute(actor, {
      operation: 'claim',
      id: first.command.id,
      projectId,
    }))!
    const other = { ...actor, userId: randomUUID() }
    const second = await service.execute(other, { ...first.command, id: randomUUID() })
    await service.execute(actor, { operation: 'remove-project', projectId })
    await service.execute(actor, { operation: 'remove-project', projectId })
    expect((await service.list(actor, { projectId })).jobs).toEqual([])
    expect((await service.list(other, { projectId })).jobs[0]?.id).toBe(second?.job.id)
    expect(
      await service.execute(actor, {
        operation: 'checkpoint',
        id: first.command.id,
        projectId,
        token: claim.token,
        version: claim.job.version,
        phase: 'failed',
        result: null,
        cost: null,
        error: 'late',
        notes: [],
      }),
    ).toBeNull()
    await expect(service.execute(actor, { ...first.command, id: randomUUID() })).rejects.toThrow(
      'excluído',
    )
    const [row] =
      await connection.sql`select count(*)::int as total from members.studio_builder_jobs where account_id = ${accountId} and user_id = ${userId} and project_id = ${projectId}`
    expect(row?.total).toBe(0)
  })
  test('source selection and editor baseline must match the immutable base, including canonical tutor hashes', async () => {
    const first = await create()
    await service.execute(actor, {
      operation: 'cancel',
      id: first.command.id,
      projectId: first.command.base.projectId,
    })
    const source = first.command.base.files['index.html']!
    const sourceHash = `sha256-${Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))).toString('base64')}`
    const request = {
      version: 1,
      intent: 'change',
      scope: 'selection',
      criteria: [],
      selection: { path: 'index.html', startLine: 1, endLine: 1, sourceHash },
      baseline: {
        revisionHash: first.command.base.hash,
        source: 'typescript',
        diagnostics: [{ path: 'index.html', line: 1, sourceHash, message: 'Observação do editor' }],
      },
    }
    const created = await service.execute(actor, { ...first.command, id: randomUUID(), request })
    expect(created?.job.assistance?.request.selection?.sourceHash).toBe(sourceHash)
    await expect(
      service.execute(actor, {
        ...first.command,
        id: randomUUID(),
        request: { ...request, selection: { ...request.selection, sourceHash: 'a'.repeat(64) } },
      }),
    ).rejects.toThrow('revisão-base')
    await expect(
      service.execute(actor, {
        ...first.command,
        id: randomUUID(),
        request: { ...request, baseline: { ...request.baseline, revisionHash: 'b'.repeat(64) } },
      }),
    ).rejects.toThrow('revisão-base')
  })
  test('idempotent creation and one-use lease; another profile/project/account cannot read or cancel it', async () => {
    const { command, state } = await create()
    expect((await service.execute(actor, command))!.job.id).toBe(state.job.id)
    const candidates = await Promise.all(
      Array.from({ length: 8 }, () =>
        service.execute(actor, {
          operation: 'claim',
          id: state.job.id,
          projectId: state.job.projectId,
        }),
      ),
    )
    expect(candidates.filter((candidate) => candidate?.token)).toHaveLength(1)
    expect(candidates.every((candidate) => candidate?.job.modelCalls === 1)).toBe(true)
    for (const other of [
      { ...actor, userId: randomUUID() },
      { ...actor, accountId: randomUUID() },
    ]) {
      expect(
        await service.execute(other, {
          operation: 'get',
          id: state.job.id,
          projectId: state.job.projectId,
        }),
      ).toBeNull()
      expect(
        await service.execute(other, {
          operation: 'cancel',
          id: state.job.id,
          projectId: state.job.projectId,
        }),
      ).toBeNull()
    }
    expect(
      await service.execute(actor, { operation: 'get', id: state.job.id, projectId: 'other' }),
    ).toBeNull()
    await expect(service.execute(actor, { ...command, objective: 'Different' })).rejects.toThrow()
  })
  test('cancel invalidates a late response; expired model lease never dispatches again', async () => {
    const { state } = await create()
    const claim = (await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    }))!
    await service.execute(actor, {
      operation: 'cancel',
      id: state.job.id,
      projectId: state.job.projectId,
    })
    await expect(
      service.execute(actor, {
        operation: 'checkpoint',
        id: state.job.id,
        projectId: state.job.projectId,
        token: claim.token,
        version: claim.job.version,
        phase: 'failed',
        result: null,
        cost: null,
        notes: [],
        error: 'Late response',
      }),
    ).rejects.toThrow()
    const second = await create()
    await service.execute(actor, {
      operation: 'claim',
      id: second.state.job.id,
      projectId: second.state.job.projectId,
    })
    now = new Date(now.getTime() + limits.leaseMs + 1)
    const expired = (await service.execute(actor, {
      operation: 'claim',
      id: second.state.job.id,
      projectId: second.state.job.projectId,
    }))!
    expect(expired.token).toBeNull()
    expect(expired.job.phase).toBe('failed')
    expect(expired.job.modelCalls).toBe(1)
  })
  test('validation can resume with a new lease, old worker cannot checkpoint, review requires every proof', async () => {
    const { state } = await create()
    const claim = (await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    }))!
    const change = {
      baseHash: state.job.base.hash,
      summary: 'Adicionar placar',
      patches: [{ path: 'score.ts', before: null, content: 'export const score = 0' }],
    }
    const result = {
      change,
      revisionHash: (await applyStudioProChange(state.job.base, change)).revision.hash,
      plan: ['Adicionar placar'],
      evidence: [],
    }
    await service.execute(actor, {
      operation: 'checkpoint',
      id: state.job.id,
      projectId: state.job.projectId,
      token: claim.token,
      version: claim.job.version,
      phase: 'validating',
      result,
      error: null,
      cost: null,
      notes: [],
    })
    const validation = (await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    }))!
    await expect(
      service.execute(actor, {
        operation: 'checkpoint',
        id: state.job.id,
        projectId: state.job.projectId,
        token: validation.token,
        version: validation.job.version,
        phase: 'review',
        result,
        error: null,
        cost: null,
        notes: [],
      }),
    ).rejects.toThrow()
    now = new Date(now.getTime() + limits.leaseMs + 1)
    const retry = (await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    }))!
    expect(retry.token).not.toBe(validation.token)
    expect(retry.job.modelCalls).toBe(1)
    expect(retry.job.validationCalls).toBe(2)
    const complete = {
      ...result,
      evidence: (['types', 'build', 'playtest', 'capture'] as const).map((kind) => ({
        kind,
        status: 'passed' as const,
        detail: 'Controlled fixture',
      })),
    }
    await expect(
      service.execute(actor, {
        operation: 'checkpoint',
        id: state.job.id,
        projectId: state.job.projectId,
        token: validation.token,
        version: validation.job.version,
        phase: 'review',
        result: complete,
        error: null,
        cost: null,
        notes: [],
      }),
    ).rejects.toThrow()
    const ready = await service.execute(actor, {
      operation: 'checkpoint',
      id: state.job.id,
      projectId: state.job.projectId,
      token: retry.token,
      version: retry.job.version,
      phase: 'review',
      result: complete,
      error: null,
      cost: null,
      notes: [],
    })
    expect(ready!.job.phase).toBe('review')
    const query = { id: state.job.id, projectId: state.job.projectId }
    const previewClaim = (await service.execute(actor, { operation: 'preview-claim', ...query }))!
    const duplicate = await service.execute(actor, { operation: 'preview-claim', ...query })
    expect(duplicate?.token).toBeNull()
    expect(previewClaim.job.modelCalls).toBe(1)
    expect(previewClaim.job.validationCalls).toBe(2)
    await service.execute(actor, {
      operation: 'preview-release',
      ...query,
      token: previewClaim.token,
      version: previewClaim.job.version,
      error: 'Preview indisponível',
    })
    const refreshedClaim = (await service.execute(actor, { operation: 'preview-claim', ...query }))!
    expect(refreshedClaim.job.assistance?.previewError).toBeUndefined()
    const artifact = {
      id: 'a'.repeat(64),
      sha256: 'b'.repeat(64),
      url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
      expiresAt: now.getTime() + 60000,
    }
    const preview = {
      artifact,
      revisionHash: result.revisionHash,
      validation: { profileVersion: 1, runtimeFingerprint: 'c'.repeat(64) },
    }
    const evidence = complete.evidence.map((item) =>
      item.kind === 'capture'
        ? { ...item, artifactUrl: new URL('__studio-proof.png', artifact.url).href }
        : item,
    )
    await expect(
      service.execute(actor, {
        operation: 'preview-checkpoint',
        ...query,
        token: refreshedClaim.token,
        version: refreshedClaim.job.version,
        preview: { ...preview, revisionHash: 'd'.repeat(64) },
        evidence,
      }),
    ).rejects.toThrow('prévia')
    const refreshed = await service.execute(actor, {
      operation: 'preview-checkpoint',
      ...query,
      token: refreshedClaim.token,
      version: refreshedClaim.job.version,
      preview,
      evidence,
    })
    expect(refreshed?.job.result?.preview?.revisionHash).toBe(result.revisionHash)
    expect(refreshed?.job.assistance?.events.at(-1)?.kind).toBe('preview')
    const third = (await service.execute(actor, { operation: 'preview-claim', ...query }))!
    await service.execute(actor, { operation: 'discard', ...query, version: third.job.version })
    await expect(
      service.execute(actor, {
        operation: 'preview-checkpoint',
        ...query,
        token: third.token,
        version: third.job.version,
        preview,
        evidence,
      }),
    ).rejects.toThrow()
    await expect(service.execute(actor, { operation: 'preview-claim', ...query })).rejects.toThrow()
  })
  test('history cursor orders equal timestamps deterministically and never returns private base/binaries/notes', async () => {
    const projectId = randomUUID()
    const ids: string[] = []
    for (let index = 0; index < 6; index++) {
      const created = await create(projectId)
      ids.push(created.state.job.id)
      await service.execute(actor, { operation: 'cancel', id: created.state.job.id, projectId })
    }
    const first = await service.list(actor, { projectId })
    const second = await service.list(actor, { projectId, before: first.nextCursor })
    expect(first.jobs).toHaveLength(5)
    expect(second.jobs).toHaveLength(1)
    expect([...first.jobs, ...second.jobs].map((job) => job.id)).toEqual(ids.sort().reverse())
    expect(second.nextCursor).toBeNull()
    expect(Object.keys(first.jobs[0]!)).not.toContain('base')
    expect(Object.keys(first.jobs[0]!)).not.toContain('binaries')
    expect(Object.keys(first.jobs[0]!)).not.toContain('notes')
  })
  test('late checkpoint commits expiry instead of rolling it back or accepting a stale worker', async () => {
    const { state } = await create()
    const claim = (await service.execute(actor, {
      operation: 'claim',
      id: state.job.id,
      projectId: state.job.projectId,
    }))!
    now = new Date(now.getTime() + limits.leaseMs + 1)
    const late = await service.execute(actor, {
      operation: 'checkpoint',
      id: state.job.id,
      projectId: state.job.projectId,
      token: claim.token,
      version: claim.job.version,
      phase: 'queued',
      result: null,
      cost: null,
      notes: [],
      error: null,
    })
    expect(late!.job.phase).toBe('failed')
    const [persisted] =
      await connection.sql`select phase, lease_token from members.studio_builder_jobs where id = ${state.job.id}`
    expect(persisted).toMatchObject({ phase: 'failed', lease_token: null })
  })
  test('retention physically removes expired snapshots without deleting a current job', async () => {
    const old = await create()
    now = new Date(now.getTime() + limits.retentionMs + 1)
    // Create directly through the same service after purging, avoiding its per-account eviction.
    expect(await service.purgeExpired()).toBeGreaterThan(0)
    expect(
      await service.execute(actor, {
        operation: 'get',
        id: old.state.job.id,
        projectId: old.state.job.projectId,
      }),
    ).toBeNull()
    const fresh = await create()
    expect(await service.purgeExpired()).toBe(0)
    expect(
      (await service.execute(actor, {
        operation: 'get',
        id: fresh.state.job.id,
        projectId: fresh.state.job.projectId,
      }))!.job.id,
    ).toBe(fresh.state.job.id)
    const [count] =
      await connection.sql`select count(*)::int as total from members.studio_builder_jobs where account_id = ${accountId}`
    expect(count!.total).toBe(1)
  })
  test('deadline includes queue time and account deletion prevents resurrection', async () => {
    const { state } = await create()
    now = new Date(now.getTime() + limits.deadlineMs + 1)
    expect(
      (await service.execute(actor, {
        operation: 'claim',
        id: state.job.id,
        projectId: state.job.projectId,
      }))!.job.phase,
    ).toBe('failed')
    await connection.sql`insert into members.account_deletion_fences (account_id, created_at) values (${accountId}, ${now.toISOString()}::timestamptz)`
    await expect(create()).rejects.toThrow()
  })
  test('adult history, worker identity and deletion fence cannot affect the same Kids project', async () => {
    const isolatedAccountId = randomUUID()
    const kidsActor = { accountId: isolatedAccountId, userId: randomUUID(), privileged: false }
    const base = await createStudioProRevision({
      projectId: randomUUID(),
      templateId: 'vanilla-vite',
      devScript: 'dev',
      files: { 'index.html': '<main>Play</main>' },
      directories: [],
      assets: '{"version":1,"assets":[]}',
      assetFiles: {},
    })
    const kids = {
      command: {
        operation: 'create' as const,
        parentOrigin: 'https://kids.test',
        id: randomUUID(),
        objective: 'Adicionar placar',
        model: 'provider/model',
        binaries: {},
        base,
      },
    }
    await service.execute(kidsActor, kids.command)
    const adult = {
      accountId: isolatedAccountId,
      userId: isolatedAccountId,
      privileged: false,
      audience: 'adult' as const,
    }
    const command = { ...kids.command, id: randomUUID() }
    const saved = await service.execute(adult, command)
    expect(saved?.job.id).toBe(command.id)
    const repo = new DrizzleStudioBuilderRepository(connection.db)
    const pending = await repo.pendingExecutions(now, 100)
    expect(pending.find((item) => item.id === command.id)?.actor).toEqual(adult)
    expect(
      (await service.list(adult, { projectId: command.base.projectId })).jobs.map(
        (item) => item.id,
      ),
    ).toEqual([command.id])
    expect(
      (await service.list(kidsActor, { projectId: command.base.projectId })).jobs.map(
        (item) => item.id,
      ),
    ).toEqual([kids.command.id])
    await service.execute(adult, { operation: 'remove-project', projectId: command.base.projectId })
    expect(
      await service.execute(kidsActor, {
        operation: 'get',
        id: kids.command.id,
        projectId: command.base.projectId,
      }),
    ).not.toBeNull()
    expect(
      await service.execute(adult, {
        operation: 'get',
        id: command.id,
        projectId: command.base.projectId,
      }),
    ).toBeNull()
    await connection.sql`delete from members.studio_builder_jobs where account_id = ${isolatedAccountId}`
    await connection.sql`delete from members.adult_studio_builder_project_deletions where account_id = ${isolatedAccountId}`
  })
})
