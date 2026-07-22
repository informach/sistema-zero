import { describe, expect, mock, spyOn, test } from 'bun:test'

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
  templateId: 'vanilla-js',
  files: { 'index.html': '<main>Oi</main>', 'src/main.js': "console.log('oi')" },
}

interface SandboxCall {
  command: string
  cwd?: string
}

function setup(
  options: { rateAllowed?: boolean; buildSuccess?: boolean; throwBuild?: boolean } = {},
) {
  const calls: SandboxCall[] = []
  let factoryCalls = 0
  const sandbox = {
    mkdir: async () => undefined,
    writeFile: async () => undefined,
    readFile: async () => ({ content: '<!doctype html><main>Pronto</main>' }),
    exec: async (command: string, execOptions?: { cwd?: string }) => {
      calls.push({ command, cwd: execOptions?.cwd })
      if (command.startsWith('ln -s')) {
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
  const factory = (() => {
    factoryCalls += 1
    return sandbox
  }) as unknown as SandboxFactory
  const env = {
    ProBuildSandbox: {} as Env['ProBuildSandbox'],
    BUILD_RATE_LIMITER: {
      limit: async () => ({ success: options.rateAllowed ?? true }),
    },
    INTERNAL_TOKEN: TOKEN,
  } satisfies Env
  return {
    handler: createStudioRuntimeHandler(factory),
    env,
    calls,
    factoryCalls: () => factoryCalls,
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

async function execute(setupResult: ReturnType<typeof setup>, input: Request): Promise<Response> {
  type WorkerRequest = Parameters<NonNullable<typeof setupResult.handler.fetch>>[0]
  return setupResult.handler.fetch!(
    input as unknown as WorkerRequest,
    setupResult.env,
    {} as ExecutionContext,
  )
}

describe('handler do Studio Runtime', () => {
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

  test('build válido devolve HTML e sempre limpa a pasta temporária', async () => {
    const context = setup()
    const response = await execute(context, request(validBody))
    const body = (await response.json()) as { ok: boolean; html: string }

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, html: '<!doctype html><main>Pronto</main>' })
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
