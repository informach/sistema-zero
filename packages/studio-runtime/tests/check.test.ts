import { describe, expect, mock, test } from 'bun:test'
import { memoryArtifactBucket } from './artifact-bucket'

mock.module('@cloudflare/sandbox', () => ({
  getSandbox: () => {
    throw new Error('O teste precisa fornecer o sandbox.')
  },
  Sandbox: class {},
}))

const { createStudioRuntimeHandler } = await import('../src/index')
const { parseCheckRequest, proCheckEntry, proCheckModules, withCheckEntry, CHECK_ENTRY_PATH } =
  await import('../src/check')
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
  options: {
    compiled?: boolean
    silentBuild?: boolean
    ran?: boolean
    observations?: unknown[]
    rate?: boolean
  } = {},
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
          stderr:
            options.compiled === false
              ? options.silentBuild
                ? ''
                : 'error during build:\nsrc/main.ts: erro de sintaxe'
              : '',
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
  test('directional observation remains conclusive only with its complete official idle/action evidence', async () => {
    const body = {
      ...classicBody,
      objectives: [
        {
          id: 'subir',
          rule: {
            type: 'behavior',
            observation: { type: 'idleBeforeAction', idleMs: 80 },
            steps: [{ action: 'press', key: 'ArrowUp', holdMs: 80 }],
            expect: {
              target: { kind: 'spritePosition', path: 'avatar', axis: 'y' },
              compare: 'decreased',
            },
          },
        },
      ],
    }
    const sample = (y: number, frame: number) => ({
      x: 50,
      y,
      frame,
      generation: 0,
      errors: 0,
      paused: false,
    })
    const observed = (delta: number) => ({
      id: 'subir',
      type: 'behavior',
      initial: { found: true, value: 70 },
      final: { found: true, value: 70 + delta },
      motion: {
        baselineInitial: sample(70, 1),
        baselineFinal: sample(70, 4),
        actionInitial: sample(70, 5),
        actionFinal: sample(70 + delta, 8),
      },
    })
    for (const delta of [-2, 0, 2]) {
      const context = setup({ observations: [observed(delta)] })
      const response = await context.call(body)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        ok: true,
        results: [{ id: 'subir', passed: delta < 0 }],
      })
    }
    const earlyError = observed(-2)
    earlyError.motion.baselineInitial.errors = 1
    const noFrames = observed(-2)
    noFrames.motion.actionFinal.frame = noFrames.motion.actionInitial.frame
    for (const observation of [
      earlyError,
      noFrames,
      { id: 'subir', type: 'behavior', error: 'O personagem foi destruído.' },
    ]) {
      const context = setup({ observations: [observation] })
      const response = await context.call(body)
      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ ok: false, code: 'CHECK_FAILED' })
      expect(context.destroyed()).toBe(1)
    }
  })

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
    const response = await context.call({ ...classicBody, screenshots: true })
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
      screenshots: true,
    })
    expect(context.commands.some((command) => command.includes('vite'))).toBe(false)
    // Um contêiner por teste, destruído no fim.
    expect(context.identities[0]).toStartWith('check-')
    expect(context.destroyed()).toBe(1)
  })

  test('relatório ausente é indisponibilidade, nunca reprovação guardável', async () => {
    const context = setup({ observations: [] })
    const response = await context.call(classicBody)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false, code: 'CHECK_FAILED' })
  })

  test('leitura truncada/erro é indisponível, mas valor divergente observado reprova', async () => {
    for (const final of [
      { found: true, value: { $sz: 'large' } },
      { found: true, value: 2, error: 'leitura incompleta' },
    ]) {
      const context = setup({ observations: [{ id: 'anda', type: 'behavior', final }] })
      const response = await context.call(classicBody)
      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ ok: false, code: 'CHECK_FAILED' })
    }
    const context = setup({
      observations: [
        {
          id: 'anda',
          type: 'behavior',
          initial: { found: true, value: 2 },
          final: { found: true, value: 2 },
        },
      ],
    })
    const response = await context.call(classicBody)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      results: [{ id: 'anda', passed: false }],
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

  test('a verificação da criança não pede captura', async () => {
    const context = setup({ observations: [] })
    await context.call(classicBody)
    expect(JSON.parse(context.written.get('check-options.json') ?? '{}').screenshots).toBe(false)
  })

  test('objetivo que o navegador não conseguiu testar é falha do executor, não "não passou"', async () => {
    const context = setup({
      observations: [{ id: 'anda', type: 'behavior', error: 'page.goto: Timeout 15000ms' }],
    })
    const response = await context.call(classicBody)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false, code: 'CHECK_FAILED' })
  })

  test('Pro que falha sem erro do Vite (tempo esgotado) é falha do executor', async () => {
    const context = setup({ compiled: false, silentBuild: true })
    const response = await context.call(proBody)
    expect(response.status).toBe(500)
    expect(context.commands.some((c) => c.includes('check-objectives.mjs'))).toBe(false)
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
  test('movimento oficial é admitido no clássico e recusado no Pro antes de abrir o jogo', () => {
    const objective = {
      id: 'subir',
      rule: {
        type: 'behavior',
        observation: { type: 'idleBeforeAction', idleMs: 80 },
        steps: [{ action: 'press', key: 'ArrowUp', holdMs: 80 }],
        expect: {
          target: { kind: 'spritePosition', path: 'avatar', axis: 'y' },
          compare: 'decreased',
        },
      },
    }
    expect(parseCheckRequest({ ...classicBody, objectives: [objective] }).objectives).toHaveLength(
      1,
    )
    expect(() => parseCheckRequest({ ...proBody, objectives: [objective] })).toThrow(
      'Movimento de sprite só vale no Jogo 2D clássico JavaScript.',
    )
  })

  test.each([
    'clickTarget',
    'approachSprite',
  ])('%s é admitido no clássico e recusado no Pro antes de abrir o jogo', (action) => {
    const objective = {
      id: 'alvo',
      rule: {
        type: 'behavior',
        steps: [
          action === 'clickTarget'
            ? { action, target: { kind: 'outsideGroup', path: 'esconderijos' } }
            : { action, actorPath: 'personagem', targetPath: 'chave', timeoutMs: 7500 },
        ],
        expect: { target: { kind: 'text' }, compare: 'contains', value: 'Achados' },
      },
    }
    expect(parseCheckRequest({ ...classicBody, objectives: [objective] }).objectives).toHaveLength(
      1,
    )
    expect(() => parseCheckRequest({ ...proBody, objectives: [objective] })).toThrow(
      'Jogo 2D clássico JavaScript',
    )
  })

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

  test('navegação 3D é recusada no Pro antes de reservar o executor', () => {
    const objective = {
      id: 'alvo-3d',
      rule: {
        type: 'behavior',
        steps: [
          {
            action: 'approachObject3d',
            actorPath: 'personagem',
            targetPath: 'chave',
            timeoutMs: 7000,
            walkable: [{ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }],
          },
        ],
        expect: { target: { kind: 'text' }, compare: 'contains', value: 'Chave recolhida' },
      },
    }
    expect(parseCheckRequest({ ...classicBody, objectives: [objective] }).objectives).toHaveLength(
      1,
    )
    expect(() => parseCheckRequest({ ...proBody, objectives: [objective] })).toThrow(
      'Jogo 3D clássico JavaScript',
    )
  })

  test('a regra em JavaScript vale no clássico e no Pro e só passa com true', async () => {
    const regra = {
      id: 'regra',
      rule: { type: 'script', steps: [{ action: 'wait', ms: 100 }], code: 'return jogo.score > 0' },
    }
    expect(parseCheckRequest({ ...classicBody, objectives: [regra] }).objectives).toHaveLength(1)
    expect(parseCheckRequest({ ...proBody, objectives: [regra] }).objectives).toHaveLength(1)
    const { judgeCheck } = await import('../src/check')
    expect(
      judgeCheck(
        [regra as never],
        [{ id: 'regra', type: 'script', verdict: true, returned: 'true' }],
      ),
    ).toEqual([{ id: 'regra', passed: true }])
    expect(
      judgeCheck(
        [regra as never],
        [{ id: 'regra', type: 'script', verdict: false, scriptError: 'x is not defined' }],
      )[0],
    ).toEqual({
      id: 'regra',
      passed: false,
      detail: 'A regra em JavaScript deu erro: x is not defined',
    })
  })

  test('a entrada do Pro importa cada módulo uma vez e guarda no escopo sorteado', () => {
    const entry = proCheckEntry(SCOPE, ['src/a.ts', 'src/b.ts'])
    expect(entry).toContain('import * as m1 from "./src/b.ts"')
    expect(entry).toContain(`Object.defineProperty(globalThis, "${SCOPE}"`)
    expect(withCheckEntry('<main></main>')).toEndWith(`src="./${CHECK_ENTRY_PATH}"></script>`)
  })
})

test('Pro observes an explicitly exported value from an existing project module', () => {
  const value = {
    id: 'position',
    rule: {
      type: 'behavior',
      steps: [],
      expect: {
        target: { kind: 'moduleValue', module: 'src/regras.ts', path: 'jogador.position.z' },
        compare: 'decreased',
      },
    },
  } as const
  const request = parseCheckRequest({ ...proBody, objectives: [value, dobro] })
  expect(request.mode).toBe('pro')
  expect(proCheckModules(request.objectives)).toEqual(['src/regras.ts'])
  expect(() => parseCheckRequest({ ...classicBody, objectives: [value] })).toThrow('Pro')
  expect(() =>
    parseCheckRequest({
      ...proBody,
      objectives: [
        {
          ...value,
          rule: {
            ...value.rule,
            expect: {
              ...value.rule.expect,
              target: { ...value.rule.expect.target, module: 'src/foreign.ts' },
            },
          },
        },
      ],
    }),
  ).toThrow('arquivo do projeto')
})
