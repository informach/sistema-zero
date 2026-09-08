import { describe, expect, test } from 'bun:test'
import type { SessionUser } from '../src/lib/types'
import { createLearningRoutes } from '../src/routes/learning'
import type { CallOpts } from '../src/server/gateway'

const user: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: '',
  firstName: 'Aluno',
  lastName: '',
  role: 'customer',
  status: 'active',
  activeProfile: { accountId: '22222222-2222-4222-8222-222222222222' },
}
const lessonId = '33333333-3333-4333-8333-333333333333'
const blockId = '44444444-4444-4444-8444-444444444444'
const progress = {
  revision: 'a'.repeat(32),
  answers: { prediction: 'a', observed: true },
  hintsUsed: 1,
  positionSeconds: null,
}
const context = { params: Promise.resolve({ lessonId, blockId }) }
function setup(current: SessionUser | null = user) {
  const calls: Array<{ path: string; opts: CallOpts }> = []
  const routes = createLearningRoutes({
    session: { getSession: async () => current },
    gateway: {
      gatewayFetch: async (path, opts) => {
        calls.push({ path, opts })
        return { status: 200, body: { ok: true } }
      },
    },
  })
  return { routes, calls }
}
function request(body: unknown, viewer: string | null = user.id) {
  return new Request('https://kids.test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(viewer ? { 'x-sz-viewer': viewer } : {}) },
    body: JSON.stringify(body),
  })
}
describe('learning BFF boundary', () => {
  test('forwards validated answers to the fixed gateway route without accepting an owner', async () => {
    const { routes, calls } = setup()
    const response = await routes.learningProgress.POST(request(progress), context)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(calls).toEqual([
      {
        path: `/members/lessons/${lessonId}/blocks/${blockId}/learning-progress`,
        opts: { method: 'PUT', body: progress },
      },
    ])
    expect(
      (await routes.learningProgress.POST(request({ ...progress, userId: user.id }), context))
        .status,
    ).toBe(400)
    expect(calls).toHaveLength(1)
  })
  test('expired, read-only and switched profile sessions never reach the gateway', async () => {
    for (const current of [null, { ...user, act: { sub: 'admin', mode: 'readonly' as const } }]) {
      const { routes, calls } = setup(current)
      expect((await routes.learningProgress.POST(request(progress), context)).status).toBe(
        current ? 403 : 401,
      )
      expect(calls).toHaveLength(0)
    }
    for (const viewer of [null, 'another-profile']) {
      const { routes, calls } = setup()
      expect((await routes.learningProgress.POST(request(progress, viewer), context)).status).toBe(
        409,
      )
      expect(calls).toHaveLength(0)
    }
  })
  test('bounds payloads, rejects malformed IDs, non-finite positions and nested state', async () => {
    const { routes, calls } = setup()
    expect(
      (
        await routes.learningProgress.POST(
          request({ ...progress, answers: { big: 'a'.repeat(65000) } }),
          context,
        )
      ).status,
    ).toBe(413)
    expect(
      (
        await routes.learningProgress.POST(request(progress), {
          params: Promise.resolve({ lessonId: '../another', blockId }),
        })
      ).status,
    ).toBe(400)
    expect(
      (await routes.learningProgress.POST(request({ ...progress, positionSeconds: -1 }), context))
        .status,
    ).toBe(400)
    expect(
      (
        await routes.learningProgress.POST(
          request({ ...progress, answers: { nested: { secret: { deep: true } } } }),
          context,
        )
      ).status,
    ).toBe(400)
    expect(calls).toHaveLength(0)
  })
  test('navigation, help and attempts use the same session boundary and strict contracts', async () => {
    const { routes, calls } = setup()
    expect(
      (await routes.learningNavigation.POST(request({ sectionId: lessonId }), context)).status,
    ).toBe(200)
    expect(
      (
        await routes.learningHelp.POST(
          request({ sectionId: lessonId, body: 'Meu cacto não aparece.' }),
          context,
        )
      ).status,
    ).toBe(200)
    const { positionSeconds: _position, ...answer } = progress
    expect(
      (await routes.learningAttempt.POST(request({ ...answer, id: blockId }), context)).status,
    ).toBe(200)
    expect(calls.map((call) => call.opts.method)).toEqual(['PUT', 'POST', 'POST'])
    expect(
      (await routes.learningHelp.POST(request({ sectionId: lessonId, body: '   ' }), context))
        .status,
    ).toBe(400)
  })
})
