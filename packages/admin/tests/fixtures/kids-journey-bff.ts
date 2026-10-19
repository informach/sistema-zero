import { beforeEach, expect, mock, test } from 'bun:test'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import type { CallOpts } from '../../src/server/gateway'

mock.module('server-only', () => ({}))
const calls: { path: string; options: CallOpts }[] = []
let status = 200
let responseBody: unknown
const policy = initialKidsJourneyPolicy()
const base = '/members/admin/journey/kids'
const id = '11111111-aaaa-4111-8111-111111111111'
mock.module('../../src/server/gateway', () => ({
  gatewayFetch: async (path: string, options: CallOpts = {}) => {
    calls.push({ path, options: structuredClone(options) })
    return { status, body: responseBody }
  },
}))
const transport = await import('../../src/server/kids-journey')
const root = await import('../../src/app/api/members/journey/kids/route')
const history = await import('../../src/app/api/members/journey/kids/history/route')
const preview = await import('../../src/app/api/members/journey/kids/preview/route')
const prepare = await import('../../src/app/api/members/journey/kids/preparations/route')
const preparation = await import('../../src/app/api/members/journey/kids/preparations/[id]/route')
const advance = await import(
  '../../src/app/api/members/journey/kids/preparations/[id]/advance/route'
)
const publish = await import(
  '../../src/app/api/members/journey/kids/preparations/[id]/publish/route'
)

beforeEach(() => {
  calls.length = 0
  status = 200
  responseBody = { phase: 'published', version: 1, policy }
})

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://admin.test/api/members/journey/kids', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}
const context = () => ({ params: Promise.resolve({ id }) })
const draft = () => ({ expectedVersion: 1, policy })
const publication = () => ({
  expectedVersion: 1,
  draftHash: 'a'.repeat(64),
  catalogHash: 'b'.repeat(64),
  cohortHash: 'c'.repeat(64),
})

test('policy and history use fixed Members routes and only history query fields', async () => {
  await transport.getKidsJourneyPolicy()
  await transport.getKidsJourneyHistory(
    new URLSearchParams({
      beforeVersion: '5',
      limit: '20',
      userId: 'untrusted',
      role: 'superadmin',
    }),
  )
  expect(calls).toEqual([
    { path: base, options: {} },
    { path: `${base}/history`, options: { query: { beforeVersion: '5', limit: '20' } } },
  ])
})

test('preview and preparation forward drafts without inventing actor identity or policy', async () => {
  const candidate = draft()
  const preparationBody = { ...candidate, reason: 'Ajuste pedagógico' }
  await transport.previewKidsJourney(candidate)
  await transport.prepareKidsJourney(preparationBody)
  expect(calls).toEqual([
    { path: `${base}/preview`, options: { method: 'POST', body: candidate } },
    { path: `${base}/preparations`, options: { method: 'POST', body: preparationBody } },
  ])
})

test('preparation operations require canonical UUID identity before building a URL', async () => {
  await transport.getKidsJourneyPreparation(id.toUpperCase())
  await transport.advanceKidsJourneyPreparation(id)
  const body = publication()
  await transport.publishKidsJourneyPreparation(id, body)
  expect(calls).toEqual([
    { path: `${base}/preparations/${id}`, options: {} },
    { path: `${base}/preparations/${id}/advance`, options: { method: 'POST' } },
    { path: `${base}/preparations/${id}/publish`, options: { method: 'POST', body } },
  ])
  const before = calls.length
  for (const invalid of ['..', '../history', 'a/b', 'https://untrusted.test']) {
    expect((await transport.getKidsJourneyPreparation(invalid)).status).toBe(400)
    expect((await transport.advanceKidsJourneyPreparation(invalid)).status).toBe(400)
    expect((await transport.publishKidsJourneyPreparation(invalid, body)).status).toBe(400)
  }
  expect(calls.length).toBe(before)
})

test('all concrete handlers preserve statuses and keep successful and failed responses private', async () => {
  for (const code of [200, 400, 401, 403, 409, 503]) {
    status = code
    responseBody =
      code === 200
        ? { phase: 'published', version: 1, policy }
        : { error: { code: 'JOURNEY_TEST_ERROR', message: 'Jornada indisponível.' } }
    const responses = [
      await root.GET(),
      await history.GET(new Request('https://admin.test/history?limit=20')),
      await preview.POST(request(JSON.stringify(draft()))),
      await prepare.POST(request(JSON.stringify({ ...draft(), reason: 'Ajuste' }))),
      await preparation.GET(new Request('https://admin.test/preparation'), context()),
      await advance.POST(request('{}'), context()),
      await publish.POST(request(JSON.stringify(publication())), context()),
    ]
    for (const response of responses) {
      expect(response.status).toBe(code)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(await response.json()).toEqual(responseBody)
    }
  }
})

test('JSON mutation handlers reject malformed, encoded, non-JSON and oversized bodies before upstream', async () => {
  for (const operation of [
    (candidate: Request) => preview.POST(candidate),
    (candidate: Request) => prepare.POST(candidate),
    (candidate: Request) => publish.POST(candidate, context()),
  ]) {
    for (const [body, headers, expected] of [
      ['{', {}, 400],
      ['{}', { 'content-encoding': 'gzip' }, 400],
      ['{}', { 'content-type': 'text/plain' }, 400],
      [JSON.stringify({ extra: 'x'.repeat(512 * 1024) }), {}, 413],
    ] satisfies [string, Record<string, string>, number][]) {
      const response = await operation(request(body, headers))
      expect(response.status).toBe(expected)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
    }
  }
  expect(calls).toEqual([])
})

test('browser authority headers are not part of the transport call', async () => {
  const body = draft()
  await preview.POST(
    request(JSON.stringify(body), {
      'x-auth-user-role': 'superadmin',
      'x-auth-user-id': id,
      'x-internal-token': 'not-a-secret',
    }),
  )
  expect(calls).toEqual([{ path: `${base}/preview`, options: { method: 'POST', body } }])
})

test('initializing and unavailable policy responses never become a fabricated published seed', async () => {
  responseBody = { phase: 'initializing', version: 0, policy }
  const initializing = await root.GET()
  expect(await initializing.json()).toEqual(responseBody)
  status = 503
  responseBody = { privateDetails: 'must-not-leak' }
  const unavailable = await root.GET()
  expect(unavailable.status).toBe(503)
  expect(await unavailable.json()).toEqual({
    error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível completar a operação.' },
  })
})
