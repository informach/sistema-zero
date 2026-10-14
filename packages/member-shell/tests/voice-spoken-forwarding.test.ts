import { describe, expect, mock, test } from 'bun:test'
import type { SessionUser } from '../src/lib/types'
import type { CallOpts } from '../src/server/gateway'

// `server-only` lança fora do React Server: neutralizado para testar os handlers e os clients.
mock.module('server-only', () => ({}))
const { createLearningRoutes } = await import('../src/routes/learning')
const { createShellRoutes } = await import('../src/routes')
const { createMembersClient } = await import('../src/server/clients')

/**
 * A marca "falado" (14/10/2026) atravessa o BFF até o members: o pedido de ajuda (`spoken`), a
 * resposta nos Recados (`spoken`) e o recado do envio do Estúdio e do Pinta (`messageSpoken`).
 * Sem ela no schema estrito, todo pedido de ajuda falado viraria 400; sem ela no client, a equipe
 * nunca veria o chip.
 */

const user: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: '',
  firstName: 'Ana',
  lastName: '',
  role: 'customer',
  status: 'active',
  activeProfile: { accountId: '22222222-2222-4222-8222-222222222222' },
}
const lessonId = '33333333-3333-4333-8333-333333333333'
const blockId = '44444444-4444-4444-8444-444444444444'
const sectionId = '55555555-5555-4555-8555-555555555555'
const threadId = '66666666-6666-4666-8666-666666666666'

function jsonReq(body: unknown): Request {
  return new Request('https://kids.test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sz-viewer': user.id },
    body: JSON.stringify(body),
  })
}

describe('pedido de ajuda da fase', () => {
  function setup() {
    const calls: Array<{ path: string; opts: CallOpts }> = []
    const routes = createLearningRoutes({
      session: { getSession: async () => user },
      gateway: {
        gatewayFetch: async (path, opts) => {
          calls.push({ path, opts })
          return { status: 200, body: { ok: true } }
        },
      },
    })
    return { routes, calls }
  }
  const ctx = { params: Promise.resolve({ lessonId }) }

  test('a dúvida falada chega ao members com `spoken: true`', async () => {
    const { routes, calls } = setup()
    const res = await routes.learningHelp.POST(
      jsonReq({ sectionId, body: 'meu personagem não pula', spoken: true }),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(calls[0]?.opts.body).toEqual({
      sectionId,
      body: 'meu personagem não pula',
      spoken: true,
    })
  })

  test('a marca precisa ser booleana: texto "true" é recusado sem ir ao members', async () => {
    const { routes, calls } = setup()
    const res = await routes.learningHelp.POST(
      jsonReq({ sectionId, body: 'oi', spoken: 'true' }),
      ctx,
    )
    expect(res.status).toBe(400)
    expect(calls).toHaveLength(0)
  })
})

describe('Recados e envios: o handler repassa a marca ao client', () => {
  function setup() {
    const chamadas: Record<string, unknown[]> = {}
    const anotar =
      (nome: string) =>
      async (...args: unknown[]) => {
        chamadas[nome] = args
        return { status: 200, body: { ok: true } }
      }
    const routes = createShellRoutes({
      session: { getSession: async () => user },
      members: {
        postTeacherMessage: anotar('postTeacherMessage'),
        submitStudioProject: anotar('submitStudioProject'),
        submitPintaAsset: anotar('submitPintaAsset'),
      },
    } as never)
    return { routes, chamadas }
  }

  test('resposta falada nos Recados', async () => {
    const { routes, chamadas } = setup()
    const ctx = { params: Promise.resolve({ threadId }) }
    await routes.teacherThreadReply.POST(jsonReq({ body: 'tentei de novo', spoken: true }), ctx)
    expect(chamadas.postTeacherMessage).toEqual([threadId, 'tentei de novo', true])
    await routes.teacherThreadReply.POST(jsonReq({ body: 'escrevi' }), ctx)
    expect(chamadas.postTeacherMessage).toEqual([threadId, 'escrevi', false])
    const invalida = await routes.teacherThreadReply.POST(
      jsonReq({ body: 'oi', spoken: 'true' }),
      ctx,
    )
    expect(invalida.status).toBe(400)
  })

  test('recado falado no envio do Estúdio e do Pinta; só `true` conta', async () => {
    const { routes, chamadas } = setup()
    const ctx = { params: Promise.resolve({ lessonId, blockId }) }
    const project = {
      id: 'p',
      name: 'Jogo',
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    }
    await routes.studioSubmit.POST(
      jsonReq({ project, message: 'olha o pulo', messageSpoken: true }),
      ctx,
    )
    expect(chamadas.submitStudioProject?.[6]).toBe(true)
    await routes.studioSubmit.POST(
      jsonReq({ project, message: 'olha o pulo', messageSpoken: 'true' }),
      ctx,
    )
    expect(chamadas.submitStudioProject?.[6]).toBe(false)

    await routes.pintaSubmit.POST(
      jsonReq({ asset: { id: 'a' }, message: 'meu dino', messageSpoken: true }),
      ctx,
    )
    expect(chamadas.submitPintaAsset?.[5]).toBe(true)
  })
})

describe('client do members: o corpo que sai para o gateway', () => {
  function setup() {
    const corpos: Array<{ path: string; body: unknown }> = []
    const members = createMembersClient(
      {
        gatewayFetch: async (path: string, opts?: CallOpts) => {
          corpos.push({ path, body: opts?.body })
          return { status: 200, body: {} }
        },
      } as never,
      { audience: 'kids' },
    )
    return { members, corpos }
  }

  test('o recado falado leva `messageSpoken`; sem recado, a marca nem sai', async () => {
    const { members, corpos } = setup()
    await members.submitStudioProject(lessonId, blockId, {}, undefined, 'oi', undefined, true)
    expect(corpos.at(-1)?.body).toMatchObject({ message: 'oi', messageSpoken: true })
    await members.submitStudioProject(lessonId, blockId, {}, undefined, undefined, undefined, true)
    expect(corpos.at(-1)?.body).not.toHaveProperty('messageSpoken')
    await members.submitPintaAsset(lessonId, blockId, {}, 'oi', undefined, true)
    expect(corpos.at(-1)?.body).toMatchObject({ message: 'oi', messageSpoken: true })
  })

  test('a resposta falada leva `spoken`; a escrita não', async () => {
    const { members, corpos } = setup()
    await members.postTeacherMessage(threadId, 'oi', true)
    expect(corpos.at(-1)?.body).toEqual({ body: 'oi', spoken: true })
    await members.postTeacherMessage(threadId, 'oi')
    expect(corpos.at(-1)?.body).toEqual({ body: 'oi' })
  })
})
