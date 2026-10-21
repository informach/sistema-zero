import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server: neutralizado para testar o handler.
mock.module('server-only', () => ({}))
const { createShellRoutes } = await import('../src/routes')

/**
 * O bloco Estúdio da aula abre com `POST …/studio-context` SEM corpo (`apiSend(url, 'POST')`).
 * Num Request do Next o `body` de um POST vazio ainda é um stream, e o handler lia isso como JSON
 * inválido: toda aula com Estúdio mostrava "Contexto inválido." antes de abrir o editor.
 */
const lessonId = '33333333-3333-4333-8333-333333333333'
const blockId = '44444444-4444-4444-8444-444444444444'
const ctx = { params: Promise.resolve({ lessonId, blockId }) }

function setup() {
  const calls: unknown[] = []
  const routes = createShellRoutes({
    session: { audience: 'kids', getSession: async () => null },
    members: {
      openLessonStudio: async (_lesson: string, _block: string, input: unknown) => {
        calls.push(input)
        return { status: 200, body: { ok: true } }
      },
    },
  } as never)
  return { routes, calls }
}

const post = (body?: BodyInit) =>
  new Request('https://kids.test/api', {
    method: 'POST',
    ...(body === undefined ? {} : { body, headers: { 'content-type': 'application/json' } }),
  })

describe('POST studio-context', () => {
  test('sem corpo abre o contexto (o que o bloco da aula envia)', async () => {
    const { routes, calls } = setup()
    const empty = new Request('https://kids.test/api', { method: 'POST', body: '' })
    expect((await routes.studioContext.POST(empty, ctx)).status).toBe(200)
    expect((await routes.studioContext.POST(post(), ctx)).status).toBe(200)
    expect(calls).toEqual([{}, {}])
  })

  test('confirmação válida segue; JSON inválido continua 400', async () => {
    const { routes, calls } = setup()
    const confirm = { baselineId: 'a'.repeat(64), environment: { runtime: 'x' } }
    expect((await routes.studioContext.POST(post(JSON.stringify({ confirm })), ctx)).status).toBe(
      200,
    )
    expect(calls).toEqual([{ confirm }])
    expect((await routes.studioContext.POST(post('{'), ctx)).status).toBe(400)
    expect(
      (await routes.studioContext.POST(post(JSON.stringify({ confirm: { baselineId: 'x' } })), ctx))
        .status,
    ).toBe(400)
  })
})
