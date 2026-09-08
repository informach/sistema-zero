import { describe, expect, mock, test } from 'bun:test'
import type { SessionUser } from '../src/lib/types'
import type { CallOpts } from '../src/server/gateway'

mock.module('server-only', () => ({}))
const { createPracticeRoutes } = await import('../src/routes/practice')
const account = '11111111-1111-4111-8111-111111111111'
const id = '22222222-2222-4222-8222-222222222222'
const profile: SessionUser = {
  id,
  email: '',
  firstName: 'Aluno',
  lastName: '',
  role: 'customer',
  status: 'active',
  activeProfile: { accountId: account },
}
function setup(user: SessionUser | null = profile) {
  const calls: { path: string; opts?: CallOpts }[] = []
  const routes = createPracticeRoutes({
    audience: 'kids',
    session: { getSession: async () => user },
    gateway: {
      gatewayFetch: async (path, opts) => {
        calls.push({ path, opts })
        return { status: 200, body: { session: { id } } }
      },
    },
  })
  return { calls, routes }
}
const request = (body: unknown) =>
  new Request('http://localhost/api/practice/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sz-viewer': id },
    body: JSON.stringify(body),
  })
describe('practice BFF', () => {
  test('exige perfil e recusa escrita em suporte somente leitura antes de chamar Members', async () => {
    for (const user of [
      null,
      { ...profile, activeProfile: undefined },
      { ...profile, act: { sub: 'admin', mode: 'readonly' as const } },
    ]) {
      const ctx = setup(user)
      expect((await ctx.routes.practiceSessions.POST(request({}))).status).toBe(user ? 403 : 401)
      expect(ctx.calls).toHaveLength(0)
    }
  })
  test('não aceita IDs de dono no corpo e encaminha somente a sessão estudada', async () => {
    const ctx = setup()
    const body = { id, courseSlug: 'curso', lessonId: id, blockId: id }
    expect(
      (await ctx.routes.practiceSessions.POST(request({ ...body, userId: account }))).status,
    ).toBe(400)
    expect(ctx.calls).toHaveLength(0)
    expect((await ctx.routes.practiceSessions.POST(request(body))).status).toBe(200)
    expect(ctx.calls).toEqual([
      { path: '/members/practice/sessions', opts: { method: 'POST', body } },
    ])
  })
  test('IDs inválidos e respostas sem escolhas não saem do BFF', async () => {
    const ctx = setup()
    expect(
      (
        await ctx.routes.practiceAnswers.POST(request({ answers: { q: [] } }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await ctx.routes.practiceSession.GET(
          new Request('http://localhost', { headers: { 'x-sz-viewer': id } }),
          {
            params: Promise.resolve({ id: '../../other' }),
          },
        )
      ).status,
    ).toBe(400)
    expect(ctx.calls).toHaveLength(0)
  })
  test('uma aba do perfil anterior não lê nem inicia práticas para o novo perfil', async () => {
    const ctx = setup({ ...profile, id: account })
    const stale = request({ id, courseSlug: 'curso', lessonId: id, blockId: id })
    expect((await ctx.routes.practiceSessions.POST(stale)).status).toBe(409)
    expect((await ctx.routes.practiceSessions.GET(stale)).status).toBe(409)
    expect(
      (
        await ctx.routes.practiceTopics.GET(
          new Request('http://localhost?courseSlug=curso', {
            headers: { 'x-sz-viewer': id },
          }),
        )
      ).status,
    ).toBe(409)
    expect(ctx.calls).toHaveLength(0)
  })
  test('a leitura também exige a identificação do perfil da tela', async () => {
    const ctx = setup()
    expect((await ctx.routes.practiceSessions.GET(new Request('http://localhost'))).status).toBe(
      409,
    )
    expect(ctx.calls).toHaveLength(0)
  })
})
