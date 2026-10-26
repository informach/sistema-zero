import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { createMasteryRoutes } = await import('../src/routes/masteries')

function harness(user: Record<string, unknown> | null = { id: 'learner' }) {
  const calls: unknown[][] = []
  const session = { audience: 'kids', getSession: async () => user } as unknown as Parameters<
    typeof createMasteryRoutes
  >[0]
  const gateway = {
    gatewayFetch: async (...args: unknown[]) => {
      calls.push(args)
      return { status: 200, body: { ok: true } }
    },
  } as unknown as Parameters<typeof createMasteryRoutes>[1]
  return { routes: createMasteryRoutes(session, gateway), calls }
}
const context = { params: Promise.resolve({ areaId: 'python2d', level: '1' }) }
const request = (body: unknown) =>
  new Request('http://localhost/api/members/journey/masteries/python2d/levels/1/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
test('mastery BFF forwards only validated snapshot identity and configured audience', async () => {
  const { routes, calls } = harness()
  const response = await routes.submission.POST(
    request({ evidenceId: '10000000-0000-4000-8000-000000000001', message: 'Meu jogo' }),
    context,
  )
  expect(response.status).toBe(200)
  expect(calls[0]).toEqual([
    '/members/journey/masteries/python2d/levels/1/submissions',
    {
      method: 'POST',
      query: { audience: 'kids' },
      body: { evidenceId: '10000000-0000-4000-8000-000000000001', message: 'Meu jogo' },
    },
  ])
})
test('mastery BFF refuses forged project payload and support mutation before reaching Members', async () => {
  const forged = harness()
  expect(
    (
      await forged.routes.submission.POST(
        request({ evidenceId: '10000000-0000-4000-8000-000000000001', project: {} }),
        context,
      )
    ).status,
  ).toBe(400)
  expect(forged.calls).toHaveLength(0)
  const support = harness({ id: 'learner', act: { mode: 'readonly' } })
  expect((await support.routes.submission.POST(request({}), context)).status).toBe(403)
  expect(support.calls).toHaveLength(0)
})
test('mastery BFF refuses unknown areas and oversized bodies', async () => {
  const { routes, calls } = harness()
  expect(
    (
      await routes.submission.POST(request({}), {
        params: Promise.resolve({ areaId: 'not-an-area', level: '1' }),
      })
    ).status,
  ).toBe(400)
  expect(
    (await routes.submission.POST(request({ message: 'a'.repeat(10000) }), context)).status,
  ).toBe(413)
  expect(calls).toHaveLength(0)
})
