import { describe, expect, mock, test } from 'bun:test'
import { memoryArtifactBucket } from './artifact-bucket'

mock.module('@cloudflare/sandbox', () => ({
  getSandbox: () => {
    throw new Error('O teste precisa fornecer o sandbox.')
  },
  Sandbox: class {},
}))

const { createStudioRuntimeHandler } = await import('../src/index')
const { parseCheckRequest, proCheckEntry, withCheckEntry, CHECK_ENTRY_PATH } = await import(
  '../src/check'
)
type Env = import('../src/index').Env
type SandboxFactory = Parameters<typeof createStudioRuntimeHandler>[0]

const TOKEN = 'runtime-test-token-with-32-characters'
const SCOPE = '__sz0123456789abcdef01234567'
const anda = {
  id: 'anda',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'ArrowRight' }],
    expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
  },
}
const vitoria = {
  id: 'venceu',
  rule: {
    type: 'behavior',
    steps: [],
    expect: { target: { kind: 'game', field: 'phase' }, compare: 'equals', value: 'won' },
  },
}
const dobro = {
  id: 'dobro',
  rule: {
    type: 'functionReturns',
    name: 'dobro',
    module: 'src/regras.ts',
    cases: [{ args: [2], expected: 4 }],
  },
}
const classicBody = {
  mode: 'classic',
  executionId: 'check-1234567890abcdef',
  scope: SCOPE,
  document: '<!doctype html><title>jogo</title>',
  objectives: [anda],
}
const proBody = {
  mode: 'pro',
  executionId: 'check-1234567890abcdef',
  scope: SCOPE,
  templateId: 'canvas-puzzle',
  files: {
    'index.html': '<!doctype html><body><div id="app"></div></body>',
    'src/main.ts': "import './regras'",
    'src/regras.ts': 'export function dobro(n: number) { return n * 2 }',
  },
  objectives: [vitoria, dobro],
}

function setup(
  options: { compiled?: boolean; ran?: boolean; observations?: unknown[]; rate?: boolean } = {},
) {
  const written = new Map<string, string>()
  const commands: string[] = []
  const identities: string[] = []
  let destroyed = 0
  const sandbox = {
    destroy: async () => {
      destroyed++
    },
    mkdir: async () => undefined,
    writeFile: async (path: string, content: string) => {
      written.set(path.replace(/^\/workspace\/builds\/[a-f0-9]+\//, ''), content)
    },
    readFile: async (path: string) => {
      if (path.endsWith('check-result.json'))
        return { content: JSON.stringify({ observations: options.observations ?? [] }) }
      if (path.endsWith('check-shot-0.jpg'))
        return { content: Buffer.from('jpeg').toString('base64') }
      throw new Error(`arquivo inesperado: ${path}`)
    },
    exec: async (command: string) => {
      commands.push(command)
      if (command.includes('vite/bin/vite.js'))
        return {
          success: options.compiled ?? true,
          stdout: '',
          stderr: options.compiled === false ? 'src/main.ts: erro de sintaxe' : '',
        }
      if (command.includes('check-objectives.mjs'))
        return { success: options.ran ?? true, stdout: '', stderr: 'falhou' }
      return { success: true, stdout: '', stderr: '' }
    },
  }
  const factory = ((_namespace: unknown, identity: string) => {
    identities.push(identity)
    return sandbox
  }) as unknown as SandboxFactory
  const env = {
    ProBuildSandbox: {} as Env['ProBuildSandbox'],
    BUILD_RATE_LIMITER: { limit: async () => ({ success: options.rate ?? true }) },
    INTERNAL_TOKEN: TOKEN,
    PRO_ARTIFACTS: memoryArtifactBucket().bucket,
  } satisfies Env
  const handler = createStudioRuntimeHandler(factory)
  const call = async (body: unknown, token = TOKEN) => {
    type WorkerRequest = Parameters<NonNullable<typeof handler.fetch>>[0]
    return handler.fetch!(
      new Request('https://runtime.test/v1/check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }) as unknown as WorkerRequest,
      env,
      {} as ExecutionContext,
    )
  }
  return { call, written, commands, identities, destroyed: () => destroyed }
}

describe('POST /v1/check', () => {
  test('clássico: serve o documento, julga com a régua do core e devolve a captura', async () => {
    const context = setup({
      observations: [
        {
          id: 'anda',
          type: 'behavior',
          initial: { found: true, value: 10 },
          final: { found: true, value: 30 },
          screenshot: 'check-shot-0.jpg',
        },
      ],
    })
    const response = await context.call(classicBody)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      results: [{ id: 'anda', passed: true }],
      screenshots: { anda: Buffer.from('jpeg').toString('base64') },
    })
    expect(context.written.get('game.html')).toBe(classicBody.document)
    expect(JSON.parse(context.written.get('check-options.json') ?? '{}')).toMatchObject({
      mode: 'classic',
      scope: SCOPE,
      kit: false,
    })
    expect(context.commands.some((command) => command.includes('vite'))).toBe(false)
    // Um contêiner por teste, destruído no fim.
    expect(context.identities[0]).toStartWith('check-')
    expect(context.destroyed()).toBe(1)
  })

  test('o objetivo que o navegador não relatou não passa', async () => {
    const context = setup({ observations: [] })
    const body = (await (await context.call(classicBody)).json()) as {
      results: { id: string; passed: boolean; detail?: string }[]
    }
    expect(body.results[0]).toEqual({
      id: 'anda',
      passed: false,
      detail: 'O teste não relatou este objetivo.',
    })
  })

  test('Pro: compila com a entrada do teste e avisa o script que é kit', async () => {
    const context = setup({
      observations: [
        { id: 'venceu', type: 'behavior', final: { found: true, value: 'playing' } },
        { id: 'dobro', type: 'functionReturns', cases: [{ ok: true, value: 4 }] },
      ],
    })
    const body = (await (await context.call(proBody)).json()) as {
      results: { id: string; passed: boolean }[]
    }
    expect(body.results.map((r) => [r.id, r.passed])).toEqual([
      ['venceu', false],
      ['dobro', true],
    ])
    expect(context.written.get(CHECK_ENTRY_PATH)).toContain('import * as m0 from "./src/regras.ts"')
    expect(context.written.get('index.html')).toContain(
      `<script type="module" src="./${CHECK_ENTRY_PATH}"></script></body>`,
    )
    expect(JSON.parse(context.written.get('check-options.json') ?? '{}').kit).toBe(true)
  })

  test('Pro que não compila não cumpre nada (é resposta, não falha do executor)', async () => {
    const context = setup({ compiled: false })
    const response = await context.call(proBody)
    expect(response.status).toBe(200)
    const body = (await response.json()) as { results: { passed: boolean; detail: string }[] }
    expect(body.results.every((r) => !r.passed && r.detail.includes('não compilou'))).toBe(true)
    expect(context.commands.some((c) => c.includes('check-objectives.mjs'))).toBe(false)
    expect(context.destroyed()).toBe(1)
  })

  test('o executor que falha vira 500, nunca aprovação', async () => {
    const context = setup({ ran: false })
    const response = await context.call(classicBody)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false, code: 'CHECK_FAILED' })
    expect(context.destroyed()).toBe(1)
  })

  test('limite de frequência, token e pedido inválido', async () => {
    expect((await setup({ rate: false }).call(classicBody)).status).toBe(429)
    expect((await setup().call(classicBody, 'errado')).status).toBe(401)
    const context = setup()
    expect((await context.call({ ...classicBody, scope: 'window' })).status).toBe(400)
    expect(context.identities).toEqual([])
  })
})

describe('o pedido de teste', () => {
  test('recusa objetivo malformado, arquivo inexistente e caminho reservado', () => {
    expect(() => parseCheckRequest({ ...classicBody, objectives: [] })).toThrow()
    expect(() =>
      parseCheckRequest({
        ...classicBody,
        objectives: [{ ...anda, rule: { ...anda.rule, steps: [{ action: 'wait', ms: 60_000 }] } }],
      }),
    ).toThrow()
    expect(() =>
      parseCheckRequest({
        ...proBody,
        objectives: [{ ...dobro, rule: { ...dobro.rule, module: 'src/outro.ts' } }],
      }),
    ).toThrow('arquivo do projeto')
    expect(() =>
      parseCheckRequest({ ...proBody, files: { ...proBody.files, [CHECK_ENTRY_PATH]: 'x' } }),
    ).toThrow('reservado')
    expect(() => parseCheckRequest({ ...classicBody, objectives: [{ ...dobro }] })).toThrow('Pro')
  })

  test('a entrada do Pro importa cada módulo uma vez e guarda no escopo sorteado', () => {
    const entry = proCheckEntry(SCOPE, ['src/a.ts', 'src/b.ts'])
    expect(entry).toContain('import * as m1 from "./src/b.ts"')
    expect(entry).toContain(`Object.defineProperty(globalThis, "${SCOPE}"`)
    expect(withCheckEntry('<main></main>')).toEndWith(`src="./${CHECK_ENTRY_PATH}"></script>`)
  })
})
