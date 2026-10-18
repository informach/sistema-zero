import { expect, mock, test } from 'bun:test'
import type { StudioFreeRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'

mock.module('server-only', () => ({}))
const { createStudioFreeRuntimeRoutes } = await import('../src/routes/studio-free-runtime')
const subject = studioRuntimeSubject(documentFixture('python', 'pro'))
const input: StudioFreeRuntimeRequest = {
  context: { kind: 'free', audience: 'kids', projectId: subject.id },
  subject,
  operation: 'execute',
  revision: 'b'.repeat(64),
}
const request = (value: unknown) =>
  new Request('https://app.test/api/studio/free-runtime', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  })

test('free BFF preserves admission denials and discovery status without caching or supplying authority', async () => {
  const calls: StudioFreeRuntimeRequest[] = []
  const denied = { error: { code: 'ACCESS_DENIED' } }
  const routes = createStudioFreeRuntimeRoutes(
    {
      async studioFreeOptions() {
        return { status: 403, body: denied }
      },
      async authorizeFreeRuntime(candidate) {
        calls.push(candidate)
        return { status: 403, body: denied }
      },
    },
    'kids',
  )
  for (const response of [await routes.options.GET(), await routes.runtime.POST(request(input))]) {
    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual(denied)
  }
  expect(calls).toEqual([input])
  expect(
    (await routes.runtime.POST(request({ ...input, actor: { userId: 'other' } }))).status,
  ).toBe(400)
  expect(calls.length).toBe(1)
})

test('free BFF bounds compact JSON and rejects compressed, malformed and whole-project requests', async () => {
  let calls = 0
  const routes = createStudioFreeRuntimeRoutes(
    {
      async studioFreeOptions() {
        return { status: 200, body: {} }
      },
      async authorizeFreeRuntime() {
        calls++
        return { status: 200, body: {} }
      },
    },
    'kids',
  )
  expect(
    (await routes.runtime.POST(request({ ...input, project: documentFixture('python', 'pro') })))
      .status,
  ).toBe(400)
  expect(
    (await routes.runtime.POST(request({ ...input, ignored: 'x'.repeat(2_000_000) }))).status,
  ).toBe(413)
  for (const [body, headers] of [
    ['{', { 'content-type': 'application/json' }],
    ['{}', {}],
    [JSON.stringify(input), { 'content-type': 'application/json', 'content-encoding': 'gzip' }],
  ] as const)
    expect(
      (
        await routes.runtime.POST(
          new Request('https://app.test', { method: 'POST', body, headers }),
        )
      ).status,
    ).toBe(400)
  expect(calls).toBe(0)
})

test('host audience cannot be selected by free runtime JSON', async () => {
  const calls: StudioFreeRuntimeRequest[] = []
  const routes = createStudioFreeRuntimeRoutes(
    {
      async studioFreeOptions() {
        return { status: 200, body: {} }
      },
      async authorizeFreeRuntime(candidate) {
        calls.push(candidate)
        return { status: 200, body: {} }
      },
    },
    'adult',
  )
  expect((await routes.runtime.POST(request(input))).status).toBe(403)
  expect(calls).toEqual([])
  const adult = { ...input, context: { ...input.context, audience: 'adult' as const } }
  expect((await routes.runtime.POST(request(adult))).status).toBe(200)
  expect(calls).toEqual([adult])
})
