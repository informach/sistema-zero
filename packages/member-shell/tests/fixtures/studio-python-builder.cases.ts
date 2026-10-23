import { expect, mock, spyOn, test } from 'bun:test'
import {
  applyStudioProChange,
  createStudioProRevision,
  type StudioProBuilderJob,
  studioProDigest,
} from '@sistemazero/core/studio'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import type { StudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { providedPythonRelease } from '../../../core/tests/fixtures/python-provided-release'
import { pythonBuilderNetworkFixture } from '../../../members/tests/fakes/python-builder-network'

mock.module('server-only', () => ({}))
const { runStudioPythonBuilderValidation } = await import('../../src/server/studio-python-builder')

async function fixture(runtimeRelease?: StudioRuntimeRelease) {
  const network = await pythonBuilderNetworkFixture('passed', runtimeRelease),
    revision = network.options.revision
  const original = await createStudioProRevision({
    ...revision,
    files: { ...revision.files, 'src/main.py': 'print(1)\n' },
  })
  const change = {
    baseHash: original.hash,
    summary: 'Editar programa',
    patches: [
      {
        path: 'src/main.py',
        before: await studioProDigest(original.files['src/main.py']!),
        content: revision.files['src/main.py']!,
      },
    ],
  }
  expect((await applyStudioProChange(original, change)).revision.hash).toBe(revision.hash)
  const metadata = (await prepareStudioPythonProExecution(revision, network.options.binaries))
    .metadata
  const actor = { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false },
    token = crypto.randomUUID()
  const job: StudioProBuilderJob = {
    id: crypto.randomUUID(),
    projectId: revision.projectId,
    base: original,
    objective: 'Editar programa',
    model: 'qa/model',
    phase: 'validating',
    version: 3,
    modelCalls: 1,
    validationCalls: 1,
    createdAt: new Date().toISOString(),
    deadlineAt: new Date(Date.now() + 300000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    leaseUntil: new Date(Date.now() + 150000).toISOString(),
    result: { change, revisionHash: revision.hash, plan: ['Editar programa'], evidence: [] },
    cost: null,
    error: null,
    notes: [],
  }
  let persisted: StudioProBuilderJob | null = null,
    unavailable = false
  let authorizations = 0,
    recoveries = 0
  const input: Parameters<typeof runStudioPythonBuilderValidation>[0] = {
    actor,
    job,
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
        signal?.throwIfAborted()
        expect(owner).toEqual(actor)
        if (command.operation === 'authorize-validation') {
          authorizations++
          expect(command).toMatchObject({
            id: job.id,
            projectId: job.projectId,
            token,
            version: job.version,
            revisionHash: revision.hash,
          })
          return {
            status: 200,
            body: {
              state: {
                job,
                token: null,
                authorization: {
                  policy: { runtimeRelease: network.runtimeRelease },
                  revisionHash: revision.hash,
                  executionRevision: metadata.revision,
                  parentOrigin: 'https://kids.test',
                },
              },
            },
          }
        }
        if (command.operation !== 'get') throw new Error('Unexpected member operation')
        recoveries++
        return unavailable
          ? { status: 503, body: { state: null } }
          : { status: 200, body: { state: persisted ? { job: persisted, token: null } : null } }
      },
    },
    async accept(outcome) {
      if (!job.result) throw new Error('Expected candidate')
      persisted = {
        ...job,
        phase: 'review',
        leaseUntil: null,
        version: job.version + 1,
        result: { ...job.result, preview: outcome.preview, evidence: outcome.evidence },
      }
      return persisted
    },
  }
  return {
    network,
    input,
    persisted: () => persisted,
    authorizations: () => authorizations,
    recoveries: () => recoveries,
    setUnavailable: () => {
      unavailable = true
    },
  }
}

test('owned preview transfers to an acknowledged job with exact revision, bytes and fresh phase authorizations', async () => {
  const f = await fixture()
  try {
    const pending = runStudioPythonBuilderValidation(f.input)
    f.input.revision.files['src/main.py'] = 'print("changed")'
    Object.values(f.input.binaries)[0]!.base64 = Buffer.from('changed').toString('base64')
    const result = await pending
    expect(result.status).toBe('checkpointed')
    expect(f.persisted()?.phase).toBe('review')
    expect(f.authorizations()).toBeGreaterThan(6)
    expect(f.recoveries()).toBe(0)
    expect(f.network.requests).not.toContain('POST /v1/python/previews/remove')
  } finally {
    f.network.stop()
  }
})

test('private Members metadata reaches the actual Builder Open and keeps the source revision pinned', async () => {
  const release = await providedPythonRelease()
  const f = await fixture(release)
  try {
    expect((await runStudioPythonBuilderValidation(f.input)).status).toBe('checkpointed')
    expect(f.network.opened).toHaveLength(1)
    expect(f.network.opened[0]).toMatchObject({ runtimeRelease: release })
  } finally {
    f.network.stop()
  }
})

test.each([
  'missing-policy',
  'foreign-release',
  'unknown-field',
] as const)('private Builder authorization refuses %s before allocating Language or execution', async (mode) => {
  const f = await fixture()
  const member = f.input.members.studioBuilder
  const foreign = await providedPythonRelease()
  f.input.members.studioBuilder = async (owner, command, signal) => {
    const response = await member(owner, command, signal)
    const authorization = response.body?.state?.authorization
    if (authorization) {
      if (mode === 'missing-policy') Reflect.deleteProperty(authorization, 'policy')
      else if (mode === 'foreign-release') authorization.policy = { runtimeRelease: foreign }
      else Reflect.set(authorization.policy, 'providedModules', [])
    }
    return response
  }
  try {
    await expect(runStudioPythonBuilderValidation(f.input)).rejects.toThrow()
    expect(f.network.requests).toEqual([])
    expect(f.persisted()).toBeNull()
  } finally {
    f.network.stop()
  }
})

test('lost checkpoint reply recovers the persisted receipt and preserves its playable preview', async () => {
  const f = await fixture(),
    accept = f.input.accept
  f.input.accept = async (outcome) => {
    await accept(outcome)
    throw new Error('lost reply')
  }
  try {
    const result = await runStudioPythonBuilderValidation(f.input)
    expect(result.status).toBe('checkpointed')
    expect(f.recoveries()).toBe(1)
    expect(f.network.requests).not.toContain('POST /v1/python/previews/remove')
  } finally {
    f.network.stop()
  }
})

test('confirmed refusal retires the preview once', async () => {
  const f = await fixture()
  f.input.accept = async () => null
  try {
    expect(await runStudioPythonBuilderValidation(f.input)).toEqual({
      status: 'checkpointed',
      job: null,
    })
    expect(
      f.network.requests.filter((path) => path === 'POST /v1/python/previews/remove'),
    ).toHaveLength(1)
  } finally {
    f.network.stop()
  }
})

test('failed checkpoint with a recovered absent job retires the preview', async () => {
  const f = await fixture()
  f.input.accept = async () => {
    throw new Error('checkpoint failed')
  }
  try {
    const error = await runStudioPythonBuilderValidation(f.input).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.message).toBe('checkpoint failed')
    expect(f.recoveries()).toBe(1)
    expect(
      f.network.requests.filter((path) => path === 'POST /v1/python/previews/remove'),
    ).toHaveLength(1)
  } finally {
    f.network.stop()
  }
})

test('uncertain checkpoint recovery preserves runtime TTL ownership and emits bounded telemetry', async () => {
  const f = await fixture(),
    warn = spyOn(console, 'warn').mockImplementation(() => {})
  f.setUnavailable()
  f.input.accept = async () => {
    throw new Error('lost reply')
  }
  try {
    const error = await runStudioPythonBuilderValidation(f.input).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.message).toBe('lost reply')
    expect(f.network.requests).not.toContain('POST /v1/python/previews/remove')
    expect(warn).toHaveBeenCalledWith('[studio-python-builder] preview receipt recovery pending', {
      jobId: f.input.job.id,
    })
  } finally {
    warn.mockRestore()
    f.network.stop()
  }
})

test('withdrawal after confirmed acceptance rejects the old owner while retaining the persisted preview', async () => {
  const f = await fixture(),
    controller = new AbortController(),
    accept = f.input.accept
  f.input.signal = controller.signal
  f.input.accept = async (outcome) => {
    const accepted = await accept(outcome)
    controller.abort(new DOMException('owner retired', 'AbortError'))
    return accepted
  }
  try {
    const error = await runStudioPythonBuilderValidation(f.input).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.name).toBe('AbortError')
    expect(f.persisted()?.phase).toBe('review')
    expect(f.network.requests).not.toContain('POST /v1/python/previews/remove')
  } finally {
    f.network.stop()
  }
})

test.each([
  'validating',
  'review',
] as const)('lost reply with the original %s lease preserves a preview that can still commit', async (phase) => {
  const f = await fixture(),
    accept = f.input.accept,
    member = f.input.members.studioBuilder,
    release = Promise.withResolvers<void>(),
    warn = spyOn(console, 'warn').mockImplementation(() => {})
  f.input.job.phase = phase
  let late: Promise<StudioProBuilderJob | null> | undefined,
    recoveries = 0
  f.input.members.studioBuilder = async (owner, command, signal) => {
    if (command.operation !== 'get') return member(owner, command, signal)
    recoveries++
    return { status: 200, body: { state: { job: structuredClone(f.input.job), token: null } } }
  }
  f.input.accept = async (outcome) => {
    if (phase === 'review' && f.input.job.result)
      f.input.job.result.preview = {
        ...outcome.preview,
        reference: {
          ...outcome.preview.reference,
          id: '1'.repeat(64),
          sha256: '2'.repeat(64),
          url: new URL(
            `/v1/python-previews/${'1'.repeat(64)}/index.html`,
            outcome.preview.reference.url,
          ).href,
        },
      }
    // Recovery may run before this request acquires the account lock. A get
    // that sees the old active lease cannot prevent this same CAS committing.
    late = (async () => {
      await release.promise
      return accept(outcome)
    })()
    throw new Error('reply lost before the in-flight checkpoint acquires its SQL lock')
  }
  try {
    const error = await runStudioPythonBuilderValidation(f.input).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.message).toContain('reply lost')
    expect(recoveries).toBe(1)
    expect(f.persisted()).toBeNull()
    expect(late).toBeDefined()
    release.resolve()
    await late
    expect(f.persisted()?.phase).toBe('review')
    expect(f.persisted()?.result?.preview?.kind).toBe('python')
    expect(f.network.requests).not.toContain('POST /v1/python/previews/remove')
  } finally {
    release.resolve()
    await late
    warn.mockRestore()
    f.network.stop()
  }
})

test.each([
  'missing-state',
  'missing-job',
  'foreign-id',
  'foreign-project',
] as const)('lost reply with %s recovery evidence keeps retirement ownership uncertain', async (mode) => {
  const f = await fixture(),
    member = f.input.members.studioBuilder,
    warn = spyOn(console, 'warn').mockImplementation(() => {})
  f.input.members.studioBuilder = async (owner, command, signal) => {
    if (command.operation !== 'get') return member(owner, command, signal)
    const body = { state: { job: structuredClone(f.input.job), token: null } }
    // Model invalid decoded wire envelopes without weakening the production port type.
    if (mode === 'missing-state') Reflect.deleteProperty(body, 'state')
    else if (mode === 'missing-job') Reflect.deleteProperty(body.state, 'job')
    else if (mode === 'foreign-id') body.state.job.id = crypto.randomUUID()
    else body.state.job.projectId = 'another-project'
    return { status: 200, body }
  }
  f.input.accept = async () => {
    throw new Error('lost reply')
  }
  try {
    const error = await runStudioPythonBuilderValidation(f.input).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.message).toBe('lost reply')
    expect(f.network.requests).not.toContain('POST /v1/python/previews/remove')
    expect(warn).toHaveBeenCalledWith('[studio-python-builder] preview receipt recovery pending', {
      jobId: f.input.job.id,
    })
  } finally {
    warn.mockRestore()
    f.network.stop()
  }
})
