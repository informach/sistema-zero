import { describe, expect, test } from 'bun:test'
import { createEmptyProject } from '@sistemazero/studio/project'
import {
  ProjectCheckBusyError,
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
  const run = () =>
    checker.check({ requester: 'u1', project, kind: 'classic', objectives: [objective] })
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

  test('muitos testes seguidos e pedido recusado têm frases próprias', async () => {
    await expect(
      setup(() =>
        Response.json({ ok: false, code: 'RATE_LIMITED', message: 'x' }, { status: 429 }),
      ).run(),
    ).rejects.toBeInstanceOf(ProjectCheckBusyError)
    await expect(
      setup(() =>
        Response.json(
          { ok: false, code: 'INVALID_REQUEST', message: 'Grande demais.' },
          { status: 400 },
        ),
      ).run(),
    ).rejects.toThrow('Grande demais.')
  })
})
