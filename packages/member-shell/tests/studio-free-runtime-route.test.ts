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
      async studioStudentTests() {
        return { status: 500, body: {} }
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
      async studioStudentTests() {
        return { status: 500, body: {} }
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
      async studioStudentTests() {
        return { status: 500, body: {} }
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

const testsRequest = (value: unknown, headers: Record<string, string> = {}) =>
  new Request('https://app.test/api/studio/student-tests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(value),
  })

test('Meus testes no Pro: o BFF repassa um lote e o projeto, sem guardar, e recusa a forma errada', async () => {
  const calls: unknown[] = []
  const routes = createStudioFreeRuntimeRoutes(
    {
      async studioFreeOptions() {
        return { status: 200, body: {} }
      },
      async authorizeFreeRuntime() {
        return { status: 200, body: {} }
      },
      async studioStudentTests(input) {
        calls.push(input)
        return { status: 200, body: { results: [{ id: 't1', passed: true }] } }
      },
    },
    'kids',
  )
  const project = { kind: 'pro', tree: {} }
  const tests = [{ id: 't1', name: 'Recado', rule: {} }]
  const ok = await routes.tests.POST(testsRequest({ project, tests }))
  expect(ok.status).toBe(200)
  expect(ok.headers.get('cache-control')).toBe('private, no-store')
  expect(await ok.json()).toEqual({ results: [{ id: 't1', passed: true }] })
  expect(calls).toEqual([{ project, tests }])
  for (const ruim of [
    { project, tests: [] },
    { project, tests: Array.from({ length: 9 }, () => tests[0]) },
    { project: null, tests },
    { tests },
  ])
    expect((await routes.tests.POST(testsRequest(ruim))).status).toBe(400)
  expect(
    (
      await routes.tests.POST(
        new Request('https://app.test/api/studio/student-tests', {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(400)
  expect(calls).toHaveLength(1)
})

test('Meus testes no Pro: a recusa do members passa como veio (a criança lê a frase)', async () => {
  const busy = {
    error: {
      code: 'PROJECT_CHECK_BUSY',
      message: 'Calma: espere alguns segundos e teste de novo.',
    },
  }
  const routes = createStudioFreeRuntimeRoutes(
    {
      async studioFreeOptions() {
        return { status: 200, body: {} }
      },
      async authorizeFreeRuntime() {
        return { status: 200, body: {} }
      },
      async studioStudentTests() {
        return { status: 429, body: busy }
      },
    },
    'adult',
  )
  const response = await routes.tests.POST(
    testsRequest({ project: { kind: 'pro' }, tests: [{ id: 'a' }] }),
  )
  expect(response.status).toBe(429)
  expect(await response.json()).toEqual(busy)
})
