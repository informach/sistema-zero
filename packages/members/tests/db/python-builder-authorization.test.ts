import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { applyStudioProChange, type StudioProBuilderCommand } from '@sistemazero/core/studio'
import { StudioPythonBuilderPreviewSchema } from '@sistemazero/core/studio/python-builder-preview'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { StudioBuilderService } from '../../src/application/studio-pro/studio-builder.service'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioBuilderRepository } from '../../src/infrastructure/persistence/drizzle/studio-builder.repository'
import { controlledPythonBuilderReport } from '../fakes/python-builder-report'
import { authoringFixture } from '../fakes/studio-authoring-policy'

const url = process.env.STUDIO_BUILDER_TEST_DATABASE_URL
if (url !== undefined && !url.trim())
  throw new Error('STUDIO_BUILDER_TEST_DATABASE_URL is explicitly empty')
describe.skipIf(!url)('Python builder acceptance in the disposable full-schema database', () => {
  let connection: DbConnection
  const actor = { accountId: randomUUID(), userId: randomUUID(), privileged: false }
  let now = new Date('2026-10-18T13:00:00Z')
  let policy: NonNullable<ConstructorParameters<typeof StudioBuilderService>[4]> = async () => {}
  let service: StudioBuilderService
  beforeAll(() => {
    if (!url)
      throw new Error('STUDIO_BUILDER_TEST_DATABASE_URL must name a disposable local QA database')
    const target = new URL(url)
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      !/^\/sz_gallery_qa_[a-z0-9_]+$/.test(target.pathname)
    )
      throw new Error('Only the owned local full-schema QA database is allowed')
    connection = createDbConnection(url, { max: 4 })
    service = new StudioBuilderService(
      new DrizzleStudioBuilderRepository(connection.db, 'https://python.test', () => now),
      () => now,
      true,
      false,
      (...args) => policy(...args),
    )
  })
  afterEach(async () => {
    if (!connection) return
    await connection.sql`delete from members.studio_builder_jobs where account_id = ${actor.accountId}`
    await connection.sql`delete from members.studio_ai_accounts where account_id = ${actor.accountId}`
    policy = async () => {}
    now = new Date('2026-10-18T13:00:00Z')
  })
  afterAll(async () => {
    await connection?.close()
  })

  function gate() {
    let resolve!: () => void
    const promise = new Promise<void>((done) => {
      resolve = done
    })
    return { promise, resolve }
  }
  async function validation() {
    const { project } = await authoringFixture('python', 'pro')
    if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
      throw new Error('Python Pro expected')
    project.id = randomUUID()
    const payload = await capturePythonProRevisionPayload(project)
    const id = randomUUID(),
      projectId = project.id
    await service.execute(actor, {
      operation: 'create',
      id,
      ...payload,
      objective: 'Adicionar uma função',
      model: 'qa/model',
      parentOrigin: 'https://kids.test',
    })
    const generating = await service.execute(actor, { operation: 'claim', id, projectId })
    if (!generating?.token) throw new Error('Missing generation lease')
    const change = {
      baseHash: payload.base.hash,
      summary: 'Adicionar uma função',
      patches: [
        {
          path: 'src/proposta.py',
          before: null,
          content: 'def somar(a: int, b: int) -> int:\n    return a + b\n',
        },
      ],
    }
    const { revision } = await applyStudioProChange(payload.base, change)
    await service.execute(actor, {
      operation: 'checkpoint',
      id,
      projectId,
      token: generating.token,
      version: generating.job.version,
      phase: 'validating',
      result: { change, revisionHash: revision.hash, plan: ['Adicionar uma função'], evidence: [] },
      error: null,
      cost: null,
      notes: [],
    })
    const validating = await service.execute(actor, { operation: 'claim', id, projectId })
    if (!validating?.token) throw new Error('Missing validation lease')
    const command: Extract<StudioProBuilderCommand, { operation: 'authorize-validation' }> = {
      operation: 'authorize-validation',
      id,
      projectId,
      token: validating.token,
      version: validating.job.version,
      revisionHash: revision.hash,
      runtimeOperation: 'analyze',
    }
    return { command, revision, binaries: payload.binaries }
  }

  async function reviewCommand(f: Awaited<ReturnType<typeof validation>>) {
    const current = await service.execute(actor, {
      operation: 'get',
      id: f.command.id,
      projectId: f.command.projectId,
    })
    if (!current?.job.result) throw new Error('Expected persisted candidate')
    const { metadata: snapshot } = await prepareStudioPythonProExecution(f.revision, f.binaries)
    const preview = StudioPythonBuilderPreviewSchema.parse({
      kind: 'python',
      revisionHash: f.revision.hash,
      reference: {
        kind: 'python-preview',
        version: 1,
        id: 'c'.repeat(64),
        projectId: f.revision.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        url: `https://python.test/v1/python-previews/${'c'.repeat(64)}/index.html`,
        sha256: 'd'.repeat(64),
        expiresAt: now.getTime() + 60000,
      },
      validation: {
        profileVersion: 1,
        snapshot,
        report: controlledPythonBuilderReport(snapshot),
        types: {
          version: 1,
          revision: f.revision.hash,
          executionRevision: snapshot.revision,
          status: 'passed',
          diagnostics: [],
        },
      },
    })
    const command: Extract<StudioProBuilderCommand, { operation: 'checkpoint' }> = {
      operation: 'checkpoint',
      id: f.command.id,
      projectId: f.command.projectId,
      token: f.command.token,
      version: f.command.version,
      phase: 'review',
      error: null,
      notes: [],
      cost: null,
      result: {
        ...current.job.result,
        preview,
        evidence: (['types', 'build', 'playtest'] as const).map((kind) => ({
          kind,
          status: 'passed',
          detail: 'controlled receipt',
        })),
      },
    }
    return command
  }

  test('Python console preview persists controlled verified receipts with three real kinds, then refreshes without model use', async () => {
    const f = await validation(),
      command = await reviewCommand(f)
    let policyCalls = 0
    policy = async () => {
      policyCalls++
    }
    const reviewed = await service.execute(actor, command)
    expect(reviewed?.job.phase).toBe('review')
    expect(reviewed?.job.result?.preview).toEqual(command.result?.preview)
    expect(reviewed?.job.result?.evidence.map((item) => item.kind)).toEqual([
      'types',
      'build',
      'playtest',
    ])
    expect(policyCalls).toBe(1)
    const refreshed = await service.execute(actor, {
      operation: 'preview-claim',
      id: f.command.id,
      projectId: f.command.projectId,
    })
    if (!refreshed?.token || !command.result?.preview)
      throw new Error('Expected preview refresh lease')
    const accepted = await service.execute(actor, {
      operation: 'preview-checkpoint',
      id: f.command.id,
      projectId: f.command.projectId,
      token: refreshed.token,
      version: refreshed.job.version,
      preview: command.result.preview,
      evidence: command.result.evidence,
    })
    expect(accepted?.job.phase).toBe('review')
    expect(accepted?.job.modelCalls).toBe(reviewed?.job.modelCalls)
    expect(policyCalls).toBe(2)
  })

  test.each([
    'origin',
    'receipt',
    'snapshot',
    'fake-capture',
    'no-preview',
  ] as const)('Python SQL acceptance refuses %s and preserves the candidate', async (mode) => {
    const f = await validation(),
      command = await reviewCommand(f)
    if (command.result?.preview?.kind !== 'python') throw new Error('Expected Python receipt')
    if (mode === 'origin')
      command.result.preview.reference.url = `https://attacker.test/v1/python-previews/${'c'.repeat(64)}/index.html`
    else if (mode === 'receipt')
      command.result.preview.validation.report.inspection.files[0]!.sha256 = 'f'.repeat(64)
    else if (mode === 'snapshot')
      command.result.preview.validation.snapshot.files[0]!.sha256 = 'f'.repeat(64)
    else if (mode === 'fake-capture')
      command.result.evidence.push({
        kind: 'capture',
        status: 'passed',
        detail: 'invented',
        artifactUrl: 'https://attacker.test/capture.png',
      })
    else {
      delete command.result.preview
      command.result.evidence.push({ kind: 'capture', status: 'passed', detail: 'invented' })
    }
    const error = await service.execute(actor, command).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    const state = await service.execute(actor, {
      operation: 'get',
      id: f.command.id,
      projectId: f.command.projectId,
    })
    expect(state?.job.phase).toBe('validating')
    expect(state?.job.result?.preview).toBeUndefined()
    expect(state?.job.version).toBe(f.command.version)
  })

  async function proposal() {
    const f = await validation(),
      checkpoint = await reviewCommand(f),
      reviewed = await service.execute(actor, checkpoint)
    const preview = reviewed?.job.result?.preview
    if (!reviewed || preview?.kind !== 'python') throw new Error('Python review expected')
    const command: Extract<StudioProBuilderCommand, { operation: 'authorize-proposal' }> = {
      operation: 'authorize-proposal',
      id: f.command.id,
      projectId: f.command.projectId,
      version: reviewed.job.version,
      revisionHash: preview.revisionHash,
      purpose: 'preview',
      preview: { id: preview.reference.id, sha256: preview.reference.sha256 },
    }
    return { command, reviewed, preview }
  }

  test('review authorization owns exact bytes and fresh policy without borrowing or renewing a worker lease', async () => {
    const f = await proposal()
    let policies = 0
    policy = async () => {
      policies++
    }
    const authorized = await service.execute(actor, f.command)
    expect(authorized?.authorization).toMatchObject({
      revisionHash: f.command.revisionHash,
      parentOrigin: 'https://kids.test',
    })
    expect(authorized?.job.version).toBe(f.reviewed.job.version)
    expect(authorized?.job.leaseUntil).toBeNull()
    expect(authorized?.token).toBeNull()
    expect(authorized?.binaries).toBeUndefined()
    expect(authorized?.proposalScope).toBeUndefined()
    expect(policies).toBe(1)
    now = new Date(f.preview.reference.expiresAt + 1)
    const expired = await service.execute(actor, f.command).then(
      () => null,
      (error: Error) => error,
    )
    expect(expired).toBeInstanceOf(Error)
    const { preview: _preview, ...withoutPreview } = f.command
    const application = await service.execute(actor, { ...withoutPreview, purpose: 'apply' })
    expect(application?.authorization?.revisionHash).toBe(f.command.revisionHash)
    expect(application?.job.version).toBe(f.reviewed.job.version)
    expect(policies).toBe(2)
  })

  test.each([
    'version',
    'revision',
    'preview-id',
    'preview-sha',
    'missing-preview',
  ] as const)('review authorization refuses swapped %s before policy and preserves the job', async (mode) => {
    const f = await proposal(),
      command = structuredClone(f.command)
    if (mode === 'version') command.version++
    else if (mode === 'revision') command.revisionHash = 'f'.repeat(64)
    else if (mode === 'missing-preview') delete command.preview
    else if (command.preview)
      command.preview[mode === 'preview-id' ? 'id' : 'sha256'] = 'f'.repeat(64)
    let policies = 0
    policy = async () => {
      policies++
    }
    const error = await service.execute(actor, command).then(
      () => null,
      (error: Error) => error,
    )
    expect(error).toBeInstanceOf(Error)
    expect(policies).toBe(0)
    const current = await service.execute(actor, {
      operation: 'get',
      id: command.id,
      projectId: command.projectId,
    })
    expect(current?.job).toEqual(f.reviewed.job)
  })

  test.each([
    'revoked',
    'discarded-during-policy',
    'expired-during-policy',
  ] as const)('review authorization rejects %s after a valid initial read', async (mode) => {
    const f = await proposal()
    policy = async () => {
      if (mode === 'revoked') throw new Error('policy revoked')
      if (mode === 'expired-during-policy') now = new Date(f.preview.reference.expiresAt + 1)
      else
        await service.execute(actor, {
          operation: 'discard',
          id: f.command.id,
          projectId: f.command.projectId,
          version: f.command.version,
        })
    }
    const error = await service.execute(actor, f.command).then(
      () => null,
      (error: Error) => error,
    )
    expect(error).toBeInstanceOf(Error)
    const current = await service.execute(actor, {
      operation: 'get',
      id: f.command.id,
      projectId: f.command.projectId,
    })
    expect(current?.job.result?.preview).toEqual(f.preview)
    expect(current?.job.version).toBe(
      f.reviewed.job.version + (mode === 'discarded-during-policy' ? 1 : 0),
    )
  })

  test('revoked host policy rejects the final Python preview checkpoint before accepting receipts', async () => {
    const f = await validation(),
      command = await reviewCommand(f)
    policy = async () => {
      throw new Error('policy revoked')
    }
    const error = await service.execute(actor, command).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.message).toBe('policy revoked')
    const state = await service.execute(actor, {
      operation: 'get',
      id: f.command.id,
      projectId: f.command.projectId,
    })
    expect(state?.job.phase).toBe('validating')
  })

  test.each([
    'preview-expired',
    'owner-withdrawn',
  ] as const)('%s while final acceptance waits on PostgreSQL cannot dispatch an UPDATE', async (mode) => {
    const f = await validation(),
      command = await reviewCommand(f),
      lockAcquired = gate(),
      releaseLock = gate(),
      controller = new AbortController(),
      repo = new DrizzleStudioBuilderRepository(connection.db, 'https://python.test', () => now)
    let blocker: Promise<unknown> | undefined
    const guarded = new StudioBuilderService(
      {
        purgeExpired: (date) => repo.purgeExpired(date),
        list: (...args) => repo.list(...args),
        async execute(owner, operation, date, signal) {
          if (operation.operation === 'checkpoint' && operation.phase === 'review') {
            blocker = connection.sql.begin(async (tx) => {
              await tx`select pg_advisory_xact_lock(hashtextextended(${`members-account:${actor.accountId}`}, 0))`
              lockAcquired.resolve()
              await releaseLock.promise
            })
            await lockAcquired.promise
          }
          return repo.execute(owner, operation, date, signal)
        },
      },
      () => now,
      true,
      false,
      (...args) => policy(...args),
    )
    const pending = guarded.execute(actor, command, controller.signal).then(
      () => null,
      (reason: Error) => reason,
    )
    try {
      await lockAcquired.promise
      const deadline = performance.now() + 3000
      let blocked = false
      while (performance.now() < deadline) {
        const [row] =
          await connection.sql`select count(*)::integer as total from pg_stat_activity where datname=current_database() and wait_event='advisory'`
        if (row?.total === 1) {
          blocked = true
          break
        }
        await Bun.sleep(10)
      }
      expect(blocked).toBe(true)
      if (mode === 'owner-withdrawn')
        controller.abort(new DOMException('owner retired', 'AbortError'))
      else now = new Date(now.getTime() + 60001)
      releaseLock.resolve()
      await blocker
      const error = await pending
      expect(error).toBeInstanceOf(Error)
      if (mode === 'owner-withdrawn') expect(error?.name).toBe('AbortError')
      const state = await service.execute(actor, {
        operation: 'get',
        id: f.command.id,
        projectId: f.command.projectId,
      })
      expect(state?.job.phase).toBe('validating')
      expect(state?.job.version).toBe(f.command.version)
      expect(state?.job.result?.preview).toBeUndefined()
    } finally {
      releaseLock.resolve()
      await blocker
      await pending
    }
  })

  test('fresh Python policy binds the exact SQL lease and both identities without renewing it or exposing materials', async () => {
    const f = await validation(),
      calls: string[] = []
    const prepared = await prepareStudioPythonProExecution(f.revision, f.binaries)
    const [before] =
      await connection.sql`select version, lease_token, lease_until from members.studio_builder_jobs where id = ${f.command.id}`
    policy = async (owner, base, metadata, operation) => {
      expect(owner).toEqual(actor)
      expect(base.hash).toBe(f.revision.hash)
      expect(metadata).toEqual(prepared.metadata)
      calls.push(operation)
    }
    for (const runtimeOperation of ['analyze', 'execute'] as const) {
      const accepted = await service.execute(actor, { ...f.command, runtimeOperation })
      expect(accepted?.authorization).toEqual({
        revisionHash: f.revision.hash,
        executionRevision: prepared.metadata.revision,
        parentOrigin: 'https://kids.test',
      })
      expect(accepted).not.toHaveProperty('binaries')
      expect(accepted).not.toHaveProperty('validationLease')
      expect(accepted?.token).toBeNull()
    }
    expect(calls).toEqual(['analyze', 'execute'])
    const [after] =
      await connection.sql`select version, lease_token, lease_until from members.studio_builder_jobs where id = ${f.command.id}`
    expect(after).toEqual(before)
  })

  test('wrong owner, token, version and candidate are refused before host policy', async () => {
    const f = await validation()
    let calls = 0
    policy = async () => {
      calls++
    }
    for (const [owner, command] of [
      [{ ...actor, accountId: randomUUID() }, f.command],
      [{ ...actor, userId: randomUUID() }, f.command],
      [actor, { ...f.command, token: randomUUID() }],
      [actor, { ...f.command, version: f.command.version + 1 }],
      [actor, { ...f.command, revisionHash: 'f'.repeat(64) }],
    ] as const) {
      const error = await service.execute(owner, command).then(
        () => null,
        (reason: Error) => reason,
      )
      expect(error).toBeInstanceOf(Error)
    }
    expect(calls).toBe(0)
  })

  test('cancellation committed during the host policy read invalidates the subsequent authorization', async () => {
    const f = await validation(),
      entered = gate(),
      released = gate()
    policy = async () => {
      entered.resolve()
      await released.promise
    }
    const pending = service.execute(actor, f.command).then(
      () => null,
      (reason: Error) => reason,
    )
    try {
      await entered.promise
      const cancelled = await service.execute(actor, {
        operation: 'cancel',
        id: f.command.id,
        projectId: f.command.projectId,
      })
      expect(cancelled?.job.phase).toBe('cancelled')
      released.resolve()
      expect(await pending).toBeInstanceOf(Error)
    } finally {
      released.resolve()
      await pending
    }
  })

  test('lease expiry while host policy yields cannot create an approval', async () => {
    const f = await validation()
    policy = async () => {
      now = new Date(now.getTime() + 150001)
    }
    const error = await service.execute(actor, f.command).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
  })

  test('lease expiry while the final SQL read waits on the account lock cannot create an approval', async () => {
    const f = await validation(),
      lockAcquired = gate(),
      releaseLock = gate()
    let blocker: Promise<unknown> | undefined
    policy = async () => {
      blocker = connection.sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${`members-account:${actor.accountId}`}, 0))`
        lockAcquired.resolve()
        await releaseLock.promise
      })
      await lockAcquired.promise
    }
    const pending = service.execute(actor, f.command).then(
      () => null,
      (reason: Error) => reason,
    )
    try {
      await lockAcquired.promise
      const deadline = performance.now() + 3000
      let blocked = false
      while (performance.now() < deadline) {
        const [row] =
          await connection.sql`select count(*)::integer as total from pg_stat_activity where datname=current_database() and wait_event='advisory'`
        if (row?.total === 1) {
          blocked = true
          break
        }
        await Bun.sleep(10)
      }
      expect(blocked).toBe(true)
      // Advance the injected host clock only after observing a real blocked SQL read.
      now = new Date(now.getTime() + 150001)
      releaseLock.resolve()
      await blocker
      expect(await pending).toBeInstanceOf(Error)
    } finally {
      releaseLock.resolve()
      await blocker
      await pending
    }
  })

  test('owner withdrawal during non-cooperative host policy ends authorization and preserves the durable lease', async () => {
    const f = await validation(),
      entered = gate(),
      released = gate(),
      controller = new AbortController()
    policy = async () => {
      entered.resolve()
      await released.promise
    }
    const pending = service.execute(actor, f.command, controller.signal).then(
      () => null,
      (reason: Error) => reason,
    )
    try {
      await entered.promise
      controller.abort(new DOMException('owner retired', 'AbortError'))
      expect((await pending)?.name).toBe('AbortError')
      const [row] =
        await connection.sql`select version, phase from members.studio_builder_jobs where id = ${f.command.id}`
      expect(row).toEqual({ version: f.command.version, phase: 'validating' })
    } finally {
      released.resolve()
      await pending
    }
  })
})
