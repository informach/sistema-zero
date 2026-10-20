import { describe, expect, mock, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'
import validation from '../runtime/validation-profile.json' with { type: 'json' }
import { storePythonRuntimeConfiguration } from '../src/python-configuration-storage'
import { memoryArtifactBucket } from './artifact-bucket'
import { pythonDistributionFixture } from './python-distribution-fixture'
import { pythonInputFixture } from './python-input-fixture'

mock.module('@cloudflare/sandbox', () => ({
  getSandbox: () => {
    throw new Error('O teste precisa fornecer o sandbox.')
  },
  Sandbox: class {},
}))

const { createStudioRuntimeHandler } = await import('../src/index')
type Env = import('../src/index').Env
type SandboxFactory = Parameters<typeof createStudioRuntimeHandler>[0]

const TOKEN = 'runtime-test-token-with-32-characters'
const validBody = {
  executionId: 'lesson-1234567890abcdef',
  parentOrigin: 'https://kids.test',
  templateId: 'vanilla-js',
  files: { 'index.html': '<main>Oi</main>', 'src/main.js': "console.log('oi')" },
}

interface SandboxCall {
  command: string
  cwd?: string
}

function setup(
  options: {
    rateAllowed?: boolean
    buildSuccess?: boolean
    throwBuild?: boolean
    typeSuccess?: boolean
    playSuccess?: boolean
    duplicateProof?: boolean
    captureBytes?: number
    staleValidation?: boolean
  } = {},
) {
  const calls: SandboxCall[] = []
  let factoryCalls = 0
  let destroyed = 0
  const identities: string[] = []
  const sandbox = {
    destroy: async () => {
      destroyed++
    },
    mkdir: async () => undefined,
    writeFile: async () => undefined,
    readFile: async (path: string) => ({
      content: path.endsWith('typecheck-result.json')
        ? JSON.stringify({
            status: 'passed',
            files: 1,
            typescript: '5.9.3',
            checkJs: false,
            validation: options.staleValidation
              ? { ...validation, runtimeFingerprint: '0'.repeat(64) }
              : validation,
          })
        : path.endsWith('playtest-result.json')
          ? JSON.stringify({
              screenshot: '__studio-proof.png',
              evidence: (options.duplicateProof
                ? ['playtest', 'playtest']
                : ['playtest', 'capture']
              ).map((kind) => ({ kind, status: 'passed', detail: 'Browser fixture' })),
            })
          : path.endsWith('__studio-proof.png')
            ? Buffer.alloc(options.captureBytes ?? 8, 0).toString('base64')
            : path.endsWith('artifact-manifest.json')
              ? JSON.stringify({
                  version: 1,
                  files: [
                    {
                      path: 'index.html',
                      bytes: Buffer.byteLength('<!doctype html><main>Pronto</main>'),
                      sha256: createHash('sha256')
                        .update('<!doctype html><main>Pronto</main>')
                        .digest('hex'),
                    },
                  ],
                })
              : Buffer.from('<!doctype html><main>Pronto</main>').toString('base64'),
    }),
    exec: async (command: string, execOptions?: { cwd?: string }) => {
      calls.push({ command, cwd: execOptions?.cwd })
      if (command.includes('check-project.mjs'))
        return { success: options.typeSuccess ?? true, stdout: '', stderr: 'type fixture' }
      if (command.includes('playtest.mjs'))
        return { success: options.playSuccess ?? true, stdout: '', stderr: 'play fixture' }
      if (command.includes('vite/bin/vite.js')) {
        if (options.throwBuild) throw new Error('tempo esgotado')
        return {
          success: options.buildSuccess ?? true,
          stdout: options.buildSuccess === false ? '' : 'build ok',
          stderr: options.buildSuccess === false ? 'erro TS' : '',
        }
      }
      return { success: true, stdout: '', stderr: '' }
    },
  }
  const factory = ((_namespace: unknown, identity: string) => {
    factoryCalls += 1
    identities.push(identity)
    return sandbox
  }) as unknown as SandboxFactory
  const env: Env = {
    ProBuildSandbox: {} as Env['ProBuildSandbox'],
    BUILD_RATE_LIMITER: {
      limit: async () => ({ success: options.rateAllowed ?? true }),
    },
    INTERNAL_TOKEN: TOKEN,
    PRO_ARTIFACTS: memoryArtifactBucket().bucket,
    STUDIO_PYTHON_DISTRIBUTIONS_SHA256: undefined,
  }
  return {
    handler: createStudioRuntimeHandler(factory),
    env,
    calls,
    factoryCalls: () => factoryCalls,
    destroyed: () => destroyed,
    identities,
  }
}

test('scheduled cleanup drains Kids and adult publication queues with the worker token', async () => {
  const context = setup()
  context.env.PUBLICATION_CLEANUP_URL = 'https://kids.test/api/internal/studio-publication-cleanup'
  context.env.PUBLICATION_CLEANUP_ADULT_URL =
    'https://adults.test/api/internal/studio-publication-cleanup'
  const called: Array<{
    url: string
    authorization: string | null
    redirect: RequestRedirect | undefined
  }> = []
  const pending: Promise<unknown>[] = []
  const fetched = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        called.push({
          url: String(input),
          authorization: new Headers(init?.headers).get('Authorization'),
          redirect: init?.redirect,
        })
        return new Response(null, { status: 204 })
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  try {
    await context.handler.scheduled!({} as ScheduledEvent, context.env, {
      waitUntil: (promise: Promise<unknown>) => {
        pending.push(promise)
      },
    } as unknown as ExecutionContext)
    await Promise.all(pending)
    expect(called).toEqual([
      {
        url: context.env.PUBLICATION_CLEANUP_URL,
        authorization: `Bearer ${TOKEN}`,
        redirect: 'manual',
      },
      {
        url: context.env.PUBLICATION_CLEANUP_ADULT_URL,
        authorization: `Bearer ${TOKEN}`,
        redirect: 'manual',
      },
    ])
  } finally {
    fetched.mockRestore()
  }
})

test('reservation retirement authenticates before storage and validates its immutable identity', async () => {
  const context = setup()
  const body = {
    operation: 'retire-reservation',
    playId: crypto.randomUUID(),
    owner: 'a'.repeat(64),
    snapshotHash: 'b'.repeat(64),
    retirementHash: 'c'.repeat(64),
  }
  const send = (payload: unknown, token = TOKEN) =>
    execute(
      context,
      new Request('https://runtime.test/v1/publications', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    )
  const bucket = context.env.PRO_ARTIFACTS!
  const get = spyOn(bucket, 'get')
  try {
    expect((await send(body, 'invalid-token')).status).toBe(401)
    expect(get).not.toHaveBeenCalled()
    expect((await send({ ...body, snapshotHash: 'invalid' })).status).toBe(400)
    expect(get).not.toHaveBeenCalled()
    const response = await send(body)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ deleted: true })
    expect(await (await bucket.get(`publications/${body.playId}/state.json`))!.text()).toContain(
      body.retirementHash,
    )
    expect(context.factoryCalls()).toBe(0)
  } finally {
    get.mockRestore()
  }
})

test('default handler wires only configured approved Python distributions and invalidates changed configuration', async () => {
  const f = await pythonDistributionFixture()
  await f.store()
  const context = setup()
  const originalBucket = context.env.PRO_ARTIFACTS
  context.env.PRO_ARTIFACTS = {
    ...originalBucket,
    async get(key: string) {
      const object = await f.bucket.get(key)
      return object
        ? {
            ...object,
            etag: 'fixture',
            text: async () => new TextDecoder().decode(f.objects.get(key)!.bytes),
          }
        : null
    },
  }
  const request = () => new Request(`${f.url}frame.html`)
  expect((await execute(context, request())).status).toBe(404)
  const configuration = async (status: 'active' | 'retired' | 'revoked') =>
    (
      await storePythonRuntimeConfiguration({
        bucket: f.bucket,
        configuration: {
          version: 1,
          parentOrigins: ['https://app.example'],
          deployments: [{ status, deployment: f.deployment }],
        },
      })
    ).sha256
  for (const status of ['active', 'retired'] as const) {
    context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = await configuration(status)
    const response = await execute(context, request())
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(new TextDecoder().decode(f.contents.get('frame.html')))
    expect(
      response.headers
        .get('Content-Security-Policy')
        ?.split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('frame-ancestors ')),
    ).toBe("frame-ancestors 'self' https://app.example")
  }
  context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = await configuration('revoked')
  expect((await execute(context, request())).status).toBe(404)
  context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = '{invalid'
  expect((await execute(context, request())).status).toBe(404)
  context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = await configuration('active')
  expect((await execute(context, request())).status).toBe(200)
  expect(context.factoryCalls()).toBe(0)
})

test('Python internal routes authenticate before reading metadata or binary bodies', async () => {
  const context = setup()
  context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = 'a'.repeat(64)
  const get = spyOn(context.env.PRO_ARTIFACTS, 'get')
  for (const path of ['inputs', `files/${'a'.repeat(64)}`, 'inspect', 'inputs/remove']) {
    let reads = 0
    const response = await execute(
      context,
      new Request(`https://runtime.test/v1/python/${path}`, {
        method: 'POST',
        body: new ReadableStream<Uint8Array>(
          {
            pull() {
              reads++
            },
          },
          { highWaterMark: 0 },
        ),
      }),
    )
    expect(response.status).toBe(401)
    expect(reads).toBe(0)
  }
  expect(context.factoryCalls()).toBe(0)
  expect(get).not.toHaveBeenCalled()
  get.mockRestore()
})

test('JavaScript and health routes never load a configured Python catalog', async () => {
  const context = setup()
  context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = 'a'.repeat(64)
  const get = spyOn(context.env.PRO_ARTIFACTS, 'get')
  try {
    expect((await execute(context, new Request('https://runtime.test/healthz'))).status).toBe(200)
    expect((await execute(context, request(validBody))).status).toBe(200)
    expect(get).not.toHaveBeenCalled()
  } finally {
    get.mockRestore()
  }
})

test('public Python serving rejects digest/bucket changes or cancellation during catalog and artifact awaits', async () => {
  for (const stage of ['catalog', 'artifact']) {
    for (const change of ['digest', 'bucket', 'abort']) {
      const f = await pythonDistributionFixture()
      await f.store()
      const catalog = await storePythonRuntimeConfiguration({
        bucket: f.bucket,
        configuration: {
          version: 1,
          parentOrigins: ['https://app.example'],
          deployments: [{ status: 'active', deployment: f.deployment }],
        },
      })
      const context = setup()
      const controller = new AbortController()
      const reads: string[] = []
      context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = catalog.sha256
      context.env.PRO_ARTIFACTS = {
        ...context.env.PRO_ARTIFACTS,
        async get(key) {
          reads.push(key)
          const object = await f.bucket.get(key)
          if (key === (stage === 'catalog' ? catalog.key : `${f.prefix}files/frame.html`)) {
            if (change === 'digest') context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = '0'.repeat(64)
            if (change === 'bucket') context.env.PRO_ARTIFACTS = { ...context.env.PRO_ARTIFACTS }
            if (change === 'abort') controller.abort(new Error('request retired'))
          }
          return object ? { ...object, etag: 'fixture', text: async () => '' } : null
        },
      }
      const response = await execute(
        context,
        new Request(`${f.url}frame.html`, { signal: controller.signal }),
      )
      expect(response.status).toBe(404)
      expect(context.factoryCalls()).toBe(0)
      if (stage === 'catalog') expect(reads).toEqual([catalog.key])
      else expect(f.counts().cancellations).toBeGreaterThanOrEqual(2)
    }
  }
})

test('default Python input handler uses approved config, private storage and stable owner quotas', async () => {
  const context = setup()
  const f = await pythonInputFixture()
  const runtime = await pythonDistributionFixture()
  await runtime.store()
  context.env.PYTHON_INPUTS = {
    ...f.bucket,
    async list() {
      return { objects: [], truncated: false }
    },
  }
  const quotas: string[] = []
  const cancelled: unknown[] = []
  context.env.PythonInspectionJobs = {
    getByName() {
      return {
        async inspect() {
          throw new Error('Input-only test must not start an inspection')
        },
        async cancel(input) {
          cancelled.push(input)
          return { retired: true, cleanupConfirmed: true }
        },
      }
    },
  }
  context.env.PYTHON_UPLOAD_RATE_LIMITER = {
    async limit({ key }) {
      quotas.push(key)
      return { success: true }
    },
  }
  context.env.BUILD_RATE_LIMITER = {
    async limit({ key }) {
      quotas.push(key)
      return { success: true }
    },
  }
  const previous = context.env.PRO_ARTIFACTS
  context.env.PRO_ARTIFACTS = {
    ...previous,
    async get(key) {
      const object = await runtime.bucket.get(key)
      return object
        ? {
            ...object,
            etag: 'fixture',
            text: async () => new TextDecoder().decode(runtime.objects.get(key)!.bytes),
          }
        : null
    },
  }
  context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = (
    await storePythonRuntimeConfiguration({
      bucket: runtime.bucket,
      configuration: {
        version: 1,
        parentOrigins: ['https://app.example'],
        deployments: [{ status: 'active', deployment: runtime.deployment }],
      },
    })
  ).sha256
  const input = structuredClone(f.request)
  input.snapshot.configuration.runtime = {
    profileId: runtime.deployment.release.profileId,
    releaseId: runtime.deployment.release.releaseId,
    manifestSha256: runtime.deployment.release.manifestSha256,
  }
  input.snapshot.configuration.python.dependencyLock.runtimeManifestSha256 =
    runtime.deployment.release.manifestSha256
  input.snapshot.revision = await studioPythonExecutionRevision({
    version: input.snapshot.version,
    configuration: input.snapshot.configuration,
    directories: input.snapshot.directories,
    files: input.snapshot.files,
  })
  const response = await execute(
    context,
    new Request('https://runtime.test/v1/python/inputs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(input),
    }),
  )
  expect(response.status).toBe(200)
  const raw: unknown = await response.json()
  if (!raw || typeof raw !== 'object' || !('input' in raw))
    throw new Error('Input response missing')
  const reference = StudioPythonInputReferenceSchema.parse(raw.input)
  expect(reference.projectId).toBe(input.snapshot.projectId)
  expect(reference.owner).toBe(input.owner)
  expect(quotas).toEqual([`python-job-${input.owner}`])
  expect(context.factoryCalls()).toBe(0)
  const configured = context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256
  for (const configuration of [undefined, '{malformed', configured]) {
    context.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = configuration
    const removed = await execute(
      context,
      new Request('https://runtime.test/v1/python/inputs/remove', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(reference),
      }),
    )
    expect(removed.status).toBe(200)
  }
  expect(cancelled).toEqual([reference, reference, reference])
  expect(quotas).toEqual([
    `python-job-${input.owner}`,
    ...Array.from({ length: 3 }, () => `python-transfer-${input.owner}`),
  ])
})

function request(body: unknown, token = TOKEN): Request {
  return new Request('https://runtime.test/v1/build', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function oversizedRequest(token = TOKEN): Request {
  return new Request('https://runtime.test/v1/build', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // O Worker precisa rejeitar pelo header ANTES de materializar o JSON.
      'Content-Length': '2000001',
    },
    body: JSON.stringify(validBody),
  })
}

async function execute(setupResult: ReturnType<typeof setup>, input: Request): Promise<Response> {
  type WorkerRequest = Parameters<NonNullable<typeof setupResult.handler.fetch>>[0]
  return setupResult.handler.fetch!(
    input as unknown as WorkerRequest,
    setupResult.env,
    {} as ExecutionContext,
  )
}

describe('handler do Studio Runtime', () => {
  test('an outdated image cannot label validation as current or publish an artifact', async () => {
    const context = setup({ staleValidation: true })
    const response = await execute(context, request({ ...validBody, validate: true }))
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(context.calls.some((call) => call.command.includes('vite/bin/vite.js'))).toBe(false)
    expect(context.calls.some((call) => call.command.includes('pack-artifact.mjs'))).toBe(false)
    expect(context.destroyed()).toBe(1)
  })
  test('preflight uses build paths, dependencies and binary hashes without allocating a sandbox', async () => {
    const context = setup()
    const check = (body: unknown, token = TOKEN) =>
      new Request('https://runtime.test/v1/preflight', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    const good = await execute(context, check(validBody))
    expect(good.status).toBe(200)
    expect(await good.json()).toHaveProperty('capabilities.protocol', 1)
    expect((await execute(context, check(validBody, 'wrong'))).status).toBe(401)
    expect(
      (
        await execute(
          context,
          check({ ...validBody, files: { ...validBody.files, 'src/code.py': 'print(1)' } }),
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await execute(
          context,
          check({
            ...validBody,
            files: {
              ...validBody.files,
              'package.json': JSON.stringify({ dependencies: { unknown: '1.0.0' } }),
            },
          }),
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await execute(
          context,
          check({
            ...validBody,
            binaries: { 'public/a.png': { base64: 'aGk=', sha256: '0'.repeat(64) } },
          }),
        )
      ).status,
    ).toBe(400)
    expect(context.factoryCalls()).toBe(0)
    expect(context.calls).toHaveLength(0)
  })
  test('dependency preparation is authenticated, bounded and does not boot a container', async () => {
    const context = setup()
    const dependencies = (body: unknown, token = TOKEN) =>
      new Request('https://runtime.test/v1/dependencies', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
    const body = {
      executionId: validBody.executionId,
      packageJson: '{"devDependencies":{"vite":"8.1.6"}}',
    }
    expect((await execute(context, dependencies(body, 'wrong'))).status).toBe(401)
    const response = await execute(context, dependencies(body))
    expect(response.status).toBe(200)
    expect(
      JSON.parse(((await response.json()) as { packageLock: string }).packageLock).packages[
        'node_modules/vite'
      ].version,
    ).toBe('8.1.6')
    expect(
      (
        await execute(
          context,
          dependencies({ ...body, packageJson: '{"dependencies":{"unknown":"1"}}' }),
        )
      ).status,
    ).toBe(400)
    expect(
      (await execute(context, dependencies({ ...body, packageJson: 'x'.repeat(33_000) }))).status,
    ).toBe(413)
    expect(context.factoryCalls()).toBe(0)
  })
  test('validation owns an isolated container and includes exactly four proofs and one pack', async () => {
    const context = setup()
    const response = await execute(context, request({ ...validBody, validate: true }))
    const body = (await response.json()) as {
      evidence: { kind: string; artifactUrl?: string }[]
      artifact: { url: string }
    }
    expect(response.status).toBe(200)
    expect(body.evidence.map((item) => item.kind)).toEqual([
      'types',
      'build',
      'playtest',
      'capture',
    ])
    expect(body.evidence[3]!.artifactUrl).toBe(
      new URL('__studio-proof.png', body.artifact.url).href,
    )
    expect(context.identities[0]).toMatch(/^check-[a-f0-9]{32}$/)
    expect(context.destroyed()).toBe(1)
    expect(context.calls.filter((call) => call.command.includes('pack-artifact.mjs'))).toHaveLength(
      1,
    )
    expect(context.calls.some((call) => call.command.startsWith('rm -rf'))).toBe(false)
  })
  test('a failed typecheck prevents build; a failed playtest prevents artifact publication; both destroy the container', async () => {
    for (const options of [{ typeSuccess: false }, { playSuccess: false }]) {
      const context = setup(options)
      const response = await execute(context, request({ ...validBody, validate: true }))
      const body = (await response.json()) as { code: string; artifact?: unknown }
      expect(response.status).toBe(422)
      expect(body.code).toBe(options.typeSuccess === false ? 'TYPECHECK_FAILED' : 'PLAYTEST_FAILED')
      expect(body.artifact).toBeUndefined()
      if (options.typeSuccess === false)
        expect(context.calls.some((call) => call.command.includes('vite/bin'))).toBe(false)
      expect(context.destroyed()).toBe(1)
    }
  })
  test('duplicate browser proofs and oversized capture cannot produce a review artifact', async () => {
    const errors = spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      for (const options of [{ duplicateProof: true }, { captureBytes: 2_500_001 }]) {
        const context = setup(options)
        const response = await execute(context, request({ ...validBody, validate: true }))
        expect(response.status).toBe(options.duplicateProof ? 500 : 413)
        expect(context.destroyed()).toBe(1)
      }
    } finally {
      errors.mockRestore()
    }
  })
  test('health check é público e token inválido não cria sandbox', async () => {
    const context = setup()
    const health = await execute(context, new Request('https://runtime.test/healthz'))
    const unauthorized = await execute(context, request(validBody, 'token-incorreto'))

    expect(health.status).toBe(200)
    expect(unauthorized.status).toBe(401)
    expect(context.factoryCalls()).toBe(0)
  })

  test('rate limit responde 429 antes de criar sandbox', async () => {
    const context = setup({ rateAllowed: false })
    const response = await execute(context, request(validBody))

    expect(response.status).toBe(429)
    expect(context.factoryCalls()).toBe(0)
  })

  test('rejeita corpo maior que o contrato antes de criar sandbox', async () => {
    const context = setup()
    const response = await execute(context, oversizedRequest())

    expect(response.status).toBe(413)
    expect(context.factoryCalls()).toBe(0)
  })

  test('build válido devolve um artefato e sempre limpa a pasta temporária', async () => {
    const context = setup()
    const response = await execute(context, request(validBody))
    const body = (await response.json()) as { ok: boolean; artifact: { url: string } }

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.artifact.url).toMatch(
      /^https:\/\/runtime.test\/v1\/artifacts\/[a-f0-9]{64}\/index.html$/,
    )
    expect(context.calls.some((call) => call.command.startsWith('rm -rf'))).toBe(true)
  })

  test('erro de compilação responde 422 e ainda limpa a pasta', async () => {
    const context = setup({ buildSuccess: false })
    const response = await execute(context, request(validBody))

    expect(response.status).toBe(422)
    expect(context.calls.some((call) => call.command.startsWith('rm -rf'))).toBe(true)
  })

  test('falha do sandbox responde 500 e tenta limpar a pasta', async () => {
    const context = setup({ throwBuild: true })
    const errorLog = spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await execute(context, request(validBody)).finally(() =>
      errorLog.mockRestore(),
    )

    expect(response.status).toBe(500)
    expect(context.calls.some((call) => call.command.startsWith('rm -rf'))).toBe(true)
  })
})
