import { afterAll, expect, mock, test } from 'bun:test'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'

mock.module('server-only', () => ({}))
const originalGateway = { ...(await import('../src/server/gateway')) }
const calls: { path: string; body: unknown }[] = []
let status = 200
let unavailable = false
mock.module('../src/server/gateway', () => ({
  ...originalGateway,
  gatewayFetch: async (path: string, options: { body: unknown }) => {
    calls.push({ path, body: options.body })
    if (unavailable) throw new Error('Controlled upstream outage')
    return {
      status,
      body:
        status === 200
          ? { accepted: true }
          : { error: { code: 'DENIED', message: 'Acesso recusado.' } },
    }
  },
}))
const { POST } = await import('../src/app/api/members/studio/authoring-runtime/route')
const { POST: checkProject } = await import(
  '../src/app/api/members/python-project-checks/test/route'
)
afterAll(() => mock.module('../src/server/gateway', () => originalGateway))

async function candidate() {
  const fixture = await pythonEnvironmentFixture('classic')
  return {
    context: {
      kind: 'authoring',
      lessonId: '22222222-2222-4222-8222-222222222222',
      draftRevision: '33333333-3333-4333-8333-333333333333',
      blockId: null,
      purpose: 'authoring',
    },
    operation: 'analyze',
    revision: 'a'.repeat(64),
    subject: studioRuntimeSubject(fixture.project),
  }
}
function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://admin.test/api/members/studio/authoring-runtime', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}
test('authoring BFF forwards the strict candidate and preserves authorization errors without caching', async () => {
  const body = await candidate()
  for (const code of [200, 401, 403, 409, 503]) {
    status = code
    const response = await POST(request(JSON.stringify(body)))
    expect(response.status).toBe(code)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(calls.at(-1)).toEqual({ path: '/members/admin/studio/authoring-runtime', body })
  }
})
test('authoring BFF rejects malformed, oversized and authority-injecting requests before upstream', async () => {
  const body = await candidate()
  const before = calls.length
  for (const [value, headers, expected] of [
    ['{', {}, 400],
    [JSON.stringify({ ...body, actor: { role: 'admin' } }), {}, 400],
    [JSON.stringify(body), { 'content-encoding': 'gzip' }, 400],
    [JSON.stringify(body), { 'content-type': 'text/plain' }, 400],
    [JSON.stringify({ extra: 'x'.repeat(2_000_000) }), {}, 413],
  ] satisfies [string, Record<string, string>, number][]) {
    const response = await POST(request(value, headers))
    expect(response.status).toBe(expected)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  }
  expect(calls.length).toBe(before)
})

test('Python objective BFF forwards only bounded authored criteria, preserves denials and reports unavailable execution', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const { context } = await candidate()
  const body = {
    project: fixture.project,
    context,
    checks: [
      {
        id: 'output',
        label: 'Escreva sua mensagem',
        programmingLanguage: 'python',
        profileId: fixture.project.runtime.profileId,
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'console' }, compare: 'contains', value: 'Olá' },
        },
      },
    ],
  }
  for (const code of [200, 401, 403, 409, 503]) {
    status = code
    const response = await checkProject(request(JSON.stringify(body)))
    expect(response.status).toBe(code)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(calls.at(-1)).toEqual({ path: '/members/admin/python-project-checks/test', body })
  }
  const before = calls.length
  for (const [raw, headers, expected] of [
    ['{', {}, 400],
    [JSON.stringify({ ...body, passed: true }), {}, 400],
    [JSON.stringify(body), { 'content-encoding': 'gzip' }, 400],
    [JSON.stringify({ extra: 'x'.repeat(4_500_000) }), {}, 413],
  ] satisfies [string, Record<string, string>, number][]) {
    expect((await checkProject(request(raw, headers))).status).toBe(expected)
  }
  expect(calls.length).toBe(before)
  unavailable = true
  try {
    const response = await checkProject(request(JSON.stringify(body)))
    expect(response.status).toBe(504)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toMatchObject({ error: { code: 'PROJECT_CHECK_UNAVAILABLE' } })
  } finally {
    unavailable = false
  }
})
