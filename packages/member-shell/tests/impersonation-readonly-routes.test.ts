import { describe, expect, mock, test } from 'bun:test'

// `server-only` lanca fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createShellRoutes } = await import('../src/routes')
const { createHubRoutes } = await import('../src/routes/hub')

const IMPERSONATED_USER = {
  id: 'user-1',
  email: 'aluno@example.com',
  firstName: 'Aluno',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
  act: { sub: 'admin-1', email: 'admin@example.com' },
}

async function expectReadonly(res: Response) {
  expect(res.status).toBe(403)
  await expect(res.json()).resolves.toMatchObject({
    error: { code: 'IMPERSONATION_READONLY' },
  })
}

describe('sessao de impersonacao somente-leitura', () => {
  test('bloqueia escrita de progresso antes de chamar o members', async () => {
    let calls = 0
    const routes = createShellRoutes({
      session: { getSession: async () => IMPERSONATED_USER },
      members: {
        markLessonComplete: async () => {
          calls++
          return { status: 200, body: { ok: true } }
        },
      },
    } as never)

    const res = await routes.lessonComplete.POST(new Request('https://community.test/api'), {
      params: Promise.resolve({ lessonId: 'lesson-1' }),
    })

    await expectReadonly(res)
    expect(calls).toBe(0)
  })

  test('bloqueia escrita no forum antes de chamar o hub', async () => {
    let calls = 0
    const routes = createHubRoutes({
      session: { getSession: async () => IMPERSONATED_USER },
      hub: {
        createThread: async () => {
          calls++
          return { status: 201, body: { id: 'thread-1', authorId: 'user-1' } }
        },
      },
    } as never)

    const res = await routes.hubChannelThreads.POST(
      new Request('https://community.test/api', {
        method: 'POST',
        body: JSON.stringify({ title: 'Duvida', body: 'Mensagem' }),
      }),
      { params: Promise.resolve({ id: 'channel-1' }) },
    )

    await expectReadonly(res)
    expect(calls).toBe(0)
  })
})
