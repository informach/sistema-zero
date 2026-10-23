import { describe, expect, test } from 'bun:test'
import { createEmptyProject } from '@sistemazero/studio/project'
import {
  ProjectCheckBusyError,
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
} from '../../src/domain/learning/learning.errors'
import { createStudioRuntimeChecker } from '../../src/infrastructure/gateways/studio-runtime-checker'

const objective = {
  id: 'anda',
  rule: {
    type: 'behavior' as const,
    steps: [],
    expect: { target: { kind: 'text' as const }, compare: 'truthy' as const },
  },
}
const project = createEmptyProject('p1', 'Jogo')

function setup(reply: (body: Record<string, unknown>) => Response | Promise<Response>) {
  const bodies: Record<string, unknown>[] = []
  let clock = 0
  const checker = createStudioRuntimeChecker({
    runtimeUrl: 'https://runtime.test/',
    runtimeToken: 'token-with-enough-length',
    now: () => clock,
    fetchImpl: async (url, init) => {
      expect(String(url)).toBe('https://runtime.test/v1/check')
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      bodies.push(body)
      return reply(body)
    },
  })
  const run = (screenshots?: boolean) =>
    checker.check({
      requester: 'u1',
      project,
      kind: 'classic',
      objectives: [objective],
      ...(screenshots ? { screenshots } : {}),
    })
  return { run, bodies, advance: (ms: number) => (clock += ms) }
}
const ok = (passed = true) =>
  Response.json({ ok: true, results: [{ id: 'anda', passed, detail: 'viu' }] })

describe('o adaptador do studio-runtime', () => {
  test('clássico vai como documento de prévia com o escopo sorteado', async () => {
    const ctx = setup(() => ok())
    expect(await ctx.run()).toEqual({ results: [{ id: 'anda', passed: true, detail: 'viu' }] })
    const body = ctx.bodies[0] ?? {}
    expect(body.mode).toBe('classic')
    expect(String(body.scope)).toMatch(/^__sz[a-f0-9]{24}$/)
    expect(String(body.document)).toContain('<!doctype html>')
    expect(String(body.executionId)).toMatch(/^check-[a-f0-9]{40}$/)
    expect(String(body.executionId)).not.toContain('u1')
  })

  test('o mesmo projeto com as mesmas regras reaproveita o resultado; depois do prazo, não', async () => {
    const ctx = setup(() => ok())
    await ctx.run()
    await ctx.run()
    expect(ctx.bodies).toHaveLength(1)
    ctx.advance(11 * 60_000)
    await ctx.run()
    expect(ctx.bodies).toHaveLength(2)
  })

  test('dois pedidos iguais ao mesmo tempo dividem uma ida', async () => {
    let release: (() => void) | undefined
    const ctx = setup(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(ok())
        }),
    )
    const both = Promise.all([ctx.run(), ctx.run()])
    await Bun.sleep(5)
    release?.()
    await both
    expect(ctx.bodies).toHaveLength(1)
  })

  test('falha nunca aprova: rede, 5xx, resposta incompleta', async () => {
    await expect(
      setup(() => {
        throw new Error('rede')
      }).run(),
    ).rejects.toBeInstanceOf(ProjectCheckUnavailableError)
    await expect(
      setup(() =>
        Response.json({ ok: false, code: 'CHECK_FAILED', message: 'x' }, { status: 500 }),
      ).run(),
    ).rejects.toBeInstanceOf(ProjectCheckUnavailableError)
    await expect(
      setup(() => Response.json({ ok: true, results: [] })).run(),
    ).rejects.toBeInstanceOf(ProjectCheckUnavailableError)
  })

  test('falha não fica no cache: a próxima tentativa vai de novo', async () => {
    let first = true
    const ctx = setup(() => {
      if (first) {
        first = false
        return new Response('', { status: 502 })
      }
      return ok()
    })
    await expect(ctx.run()).rejects.toBeInstanceOf(ProjectCheckUnavailableError)
    expect((await ctx.run()).results[0]?.passed).toBe(true)
  })

  test.each([
    ['item nulo', [null]],
    ['veredito ausente', [{ id: 'anda' }]],
    ['veredito texto', [{ id: 'anda', passed: 'false' }]],
    [
      'IDs duplicados',
      [
        { id: 'anda', passed: false },
        { id: 'anda', passed: true },
      ],
    ],
    [
      'ID extra não solicitado',
      [
        { id: 'anda', passed: true },
        { id: 'estranho', passed: true },
      ],
    ],
    ['motivo fora do contrato', [{ id: 'anda', passed: false, detail: 7 }]],
  ])('Runtime200 com %s é indisponível, não falso nem cache', async (_name, results) => {
    const ctx = setup(() => Response.json({ ok: true, results }))
    for (let attempt = 0; attempt < 2; attempt++) {
      const failure = await ctx.run().then(
        () => undefined,
        (error: unknown) => error,
      )
      expect(failure).toBeInstanceOf(ProjectCheckUnavailableError)
    }
    expect(ctx.bodies).toHaveLength(2)
  })

  test('false boolean continua conclusivo e pode ser reutilizado sem uma nova execução', async () => {
    const ctx = setup(() => ok(false))
    expect((await ctx.run()).results).toEqual([{ id: 'anda', passed: false, detail: 'viu' }])
    expect((await ctx.run()).results[0]?.passed).toBe(false)
    expect(ctx.bodies).toHaveLength(1)
  })

  test('muitos testes seguidos e pedido recusado têm frases próprias', async () => {
    await expect(
      setup(() =>
        Response.json({ ok: false, code: 'RATE_LIMITED', message: 'x' }, { status: 429 }),
      ).run(),
    ).rejects.toBeInstanceOf(ProjectCheckBusyError)
    // A recusa é de autoria: a criança lê a frase de sempre e a equipe recebe o motivo.
    const recusa = await setup(() =>
      Response.json(
        { ok: false, code: 'INVALID_REQUEST', message: 'Grande demais.' },
        { status: 400 },
      ),
    )
      .run()
      .catch((error: unknown) => error)
    expect(recusa).toBeInstanceOf(ProjectCheckRejectedError)
    expect(recusa).toBeInstanceOf(ProjectCheckUnavailableError)
    expect((recusa as ProjectCheckRejectedError).reason).toBe('Grande demais.')
    expect((recusa as Error).message).toBe('Não consegui testar este projeto. Peça ajuda à equipe.')
    expect(
      await setup(() => new Response('grande', { status: 413 }))
        .run()
        .catch((error: unknown) => (error as ProjectCheckRejectedError).reason),
    ).toBe('O projeto ficou grande demais para o teste.')
  })

  test('a captura só vai quando pedida e nunca entra no cache', async () => {
    const ctx = setup((body) =>
      Response.json({
        ok: true,
        results: [{ id: 'anda', passed: true }],
        ...(body.screenshots ? { screenshots: { anda: 'anBlZw' } } : {}),
      }),
    )
    expect((await ctx.run()).screenshots).toBeUndefined()
    expect(ctx.bodies[0]?.screenshots).toBe(false)
    expect((await ctx.run(true)).screenshots).toEqual({ anda: 'anBlZw' })
    expect((await ctx.run(true)).screenshots).toEqual({ anda: 'anBlZw' })
    // As duas com captura foram ao executor; a da criança seguinte reaproveita o cache SEM captura.
    expect(ctx.bodies).toHaveLength(3)
    expect((await ctx.run()).screenshots).toBeUndefined()
    expect(ctx.bodies).toHaveLength(3)
  })
})
