import { expect, mock, spyOn, test } from 'bun:test'
import {
  createStudioProRevision,
  type StudioProBuilderClaim,
  studioProDigest,
} from '@sistemazero/core/studio'
import { StudioBuilderService } from '../../members/src/application/studio-pro/studio-builder.service'
import { createDbConnection } from '../../members/src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioBuilderRepository } from '../../members/src/infrastructure/persistence/drizzle/studio-builder.repository'
import { pythonBuilderNetworkFixture } from '../../members/tests/fakes/python-builder-network'

mock.module('server-only', () => ({}))
const { runStudioPythonBuilderValidation } = await import('../src/server/studio-python-builder')
const target = process.env.STUDIO_BUILDER_TEST_DATABASE_URL
if (!target) throw new Error('A disposable full-schema SQL target is required')
const url = new URL(target)
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  !/^\/sz_gallery_qa_[a-z0-9_]+$/.test(url.pathname)
)
  throw new Error('Only the owned full-schema QA database is allowed')

test.each([
  'validating',
  'review',
] as const)('lost reply before a late real SQL %s checkpoint preserves its eventual preview', async (phase) => {
  const network = await pythonBuilderNetworkFixture('passed'),
    connection = createDbConnection(target, { max: 4 }),
    actor = { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false },
    id = crypto.randomUUID(),
    revision = network.options.revision,
    projectId = revision.projectId,
    entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>(),
    warn = spyOn(console, 'warn').mockImplementation(() => {})
  const repository = new DrizzleStudioBuilderRepository(
    connection.db,
    new URL(network.options.runtime.url).origin,
  )
  let delayed = false
  const service = new StudioBuilderService(
    {
      purgeExpired: (now) => repository.purgeExpired(now),
      list: (...args) => repository.list(...args),
      async execute(...args) {
        const command = args[1]
        if (
          delayed &&
          (command.operation === 'preview-checkpoint' ||
            (command.operation === 'checkpoint' && command.phase === 'review'))
        ) {
          entered.resolve()
          await release.promise
        }
        return repository.execute(...args)
      },
    },
    () => new Date(),
    true,
    false,
    async () => {},
  )
  let late: Promise<StudioProBuilderClaim | null> | undefined
  try {
    const base = await createStudioProRevision({
        ...revision,
        files: { ...revision.files, 'src/main.py': 'print(1)\n' },
      }),
      change = {
        baseHash: base.hash,
        summary: 'Editar programa',
        patches: [
          {
            path: 'src/main.py',
            before: await studioProDigest(base.files['src/main.py']!),
            content: revision.files['src/main.py']!,
          },
        ],
      }
    await service.execute(actor, {
      operation: 'create',
      id,
      base,
      binaries: network.options.binaries,
      objective: 'Editar programa',
      model: 'qa/model',
      parentOrigin: 'https://kids.test',
    })
    const generating = await service.execute(actor, { operation: 'claim', id, projectId })
    if (!generating?.token) throw new Error('Generation lease missing')
    await service.execute(actor, {
      operation: 'checkpoint',
      id,
      projectId,
      token: generating.token,
      version: generating.job.version,
      phase: 'validating',
      result: { change, revisionHash: revision.hash, plan: ['Editar'], evidence: [] },
      error: null,
      cost: null,
      notes: [],
    })
    let claimed = await service.execute(actor, { operation: 'claim', id, projectId })
    if (!claimed?.token || !claimed.job.result) throw new Error('Validation lease missing')
    if (phase === 'review') {
      const initial = claimed
      await runStudioPythonBuilderValidation({
        actor,
        job: initial.job,
        token: initial.token!,
        revision,
        binaries: network.options.binaries,
        parentOrigin: 'https://kids.test',
        signal: new AbortController().signal,
        runtime: {
          runtimeUrl: network.options.runtime.url,
          runtimeToken: network.options.runtime.token,
          languageUrl: network.options.serviceUrl,
          languageToken: network.options.serviceToken,
          allowLocalHttp: true,
        },
        members: {
          async studioBuilder(owner, command, signal) {
            return { status: 200, body: { state: await service.execute(owner, command, signal) } }
          },
        },
        async accept(outcome) {
          if (!initial.job.result) throw new Error('Candidate missing')
          return (
            (
              await service.execute(actor, {
                operation: 'checkpoint',
                id,
                projectId,
                token: initial.token!,
                version: initial.job.version,
                phase: 'review',
                result: {
                  ...initial.job.result,
                  preview: outcome.preview,
                  evidence: outcome.evidence,
                },
                error: null,
                cost: null,
                notes: [],
              })
            )?.job ?? null
          )
        },
      })
      claimed = await service.execute(actor, { operation: 'preview-claim', id, projectId })
      if (!claimed?.token || !claimed.job.result) throw new Error('Refresh lease missing')
    }
    const current = claimed,
      token = current.token
    if (!token) throw new Error('Lease missing')
    delayed = true
    const result = await runStudioPythonBuilderValidation({
      actor,
      job: current.job,
      token,
      revision,
      binaries: network.options.binaries,
      parentOrigin: 'https://kids.test',
      signal: new AbortController().signal,
      runtime: {
        runtimeUrl: network.options.runtime.url,
        runtimeToken: network.options.runtime.token,
        languageUrl: network.options.serviceUrl,
        languageToken: network.options.serviceToken,
        allowLocalHttp: true,
      },
      members: {
        async studioBuilder(owner, command, signal) {
          return { status: 200, body: { state: await service.execute(owner, command, signal) } }
        },
      },
      async accept(outcome) {
        if (!current.job.result) throw new Error('Candidate missing')
        late = service.execute(
          actor,
          phase === 'review'
            ? {
                operation: 'preview-checkpoint',
                id,
                projectId,
                token,
                version: current.job.version,
                preview: outcome.preview,
                evidence: outcome.evidence,
              }
            : {
                operation: 'checkpoint',
                id,
                projectId,
                token,
                version: current.job.version,
                phase: 'review',
                result: {
                  ...current.job.result,
                  preview: outcome.preview,
                  evidence: outcome.evidence,
                },
                error: null,
                cost: null,
                notes: [],
              },
        )
        await entered.promise
        throw new Error('lost reply before SQL write')
      },
    }).then(
      () => null,
      (error: Error) => error,
    )
    expect(result?.message).toBe('lost reply before SQL write')
    const before = await service.execute(actor, { operation: 'get', id, projectId })
    expect(before?.job.phase).toBe(phase)
    expect(before?.job.version).toBe(current.job.version)
    expect(before?.job.leaseUntil).not.toBeNull()
    release.resolve()
    const committed = await late
    expect(committed?.job.phase).toBe('review')
    expect(committed?.job.version).toBe(current.job.version + 1)
    expect(committed?.job.result?.preview?.kind).toBe('python')
    if (phase === 'review') {
      const oldPreview = before?.job.result?.preview,
        newPreview = committed?.job.result?.preview
      expect(oldPreview?.kind).toBe('python')
      if (oldPreview?.kind !== 'python' || newPreview?.kind !== 'python')
        throw new Error('Distinct Python previews expected')
      expect(newPreview.reference.id).not.toBe(oldPreview.reference.id)
    }
    const after = await service.execute(actor, { operation: 'get', id, projectId })
    expect(after?.job.result?.preview).toEqual(committed?.job.result?.preview)
    expect(network.requests).not.toContain('POST /v1/python/previews/remove')
    expect(warn).toHaveBeenCalledWith('[studio-python-builder] preview receipt recovery pending', {
      jobId: id,
    })
  } finally {
    release.resolve()
    await late
    await connection.sql`delete from members.studio_builder_jobs where account_id = ${actor.accountId}`
    await connection.sql`delete from members.studio_ai_accounts where account_id = ${actor.accountId}`
    await connection.close()
    network.stop()
    warn.mockRestore()
  }
}, 15000)
