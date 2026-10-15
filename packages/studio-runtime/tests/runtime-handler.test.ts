import { describe, expect, mock, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import validation from '../runtime/validation-profile.json' with { type: 'json' }
import { memoryArtifactBucket } from './artifact-bucket'

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
  const env = {
    ProBuildSandbox: {} as Env['ProBuildSandbox'],
    BUILD_RATE_LIMITER: {
      limit: async () => ({ success: options.rateAllowed ?? true }),
    },
    INTERNAL_TOKEN: TOKEN,
    PRO_ARTIFACTS: memoryArtifactBucket().bucket,
  } satisfies Env
  return {
    handler: createStudioRuntimeHandler(factory),
    env,
    calls,
    factoryCalls: () => factoryCalls,
    destroyed: () => destroyed,
    identities,
  }
}

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
      packageJson: '{"devDependencies":{"vite":"8.0.16"}}',
    }
    expect((await execute(context, dependencies(body, 'wrong'))).status).toBe(401)
    const response = await execute(context, dependencies(body))
    expect(response.status).toBe(200)
    expect(
      JSON.parse(((await response.json()) as { packageLock: string }).packageLock).packages[
        'node_modules/vite'
      ].version,
    ).toBe('8.0.16')
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
