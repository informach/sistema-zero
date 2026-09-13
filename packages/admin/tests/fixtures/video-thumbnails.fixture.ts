import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.VIMEO_ACCESS_TOKEN = 'qa-vimeo-token'
const actualMedia = await import('../../src/server/media')
let authorized = true
const { NextResponse } = await import('next/server')
mock.module('@/server/media', () => ({
  ...actualMedia,
  requireMediaSession: async () =>
    authorized
      ? { id: 'author', role: 'admin' }
      : NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
}))
const { GET, PATCH, POST } = await import('../../src/app/api/media/videos/[id]/thumbnail/route')
const originalFetch = globalThis.fetch
const calls: { url: string; method: string; body?: string }[] = []
const picture = {
  uri: '/videos/123456789/pictures/44',
  active: true,
  type: 'custom',
  sizes: [
    { width: 320, link: 'https://i.vimeocdn.com/small.jpg' },
    { width: 640, link: 'https://i.vimeocdn.com/cover.jpg' },
  ],
}
globalThis.fetch = Object.assign(
  async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input)
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : undefined,
    })
    if (url.includes('?fields=pictures')) return Response.json({ pictures: picture })
    if (url.includes('per_page='))
      return Response.json({
        data: [{ ...picture, active: false }],
        paging: { next: '/videos/123456789/pictures?page=2' },
      })
    if (init?.method === 'POST') return Response.json(picture, { status: 201 })
    return new Response(null, { status: 204 })
  },
  { preconnect: originalFetch.preconnect },
)
const params = { params: Promise.resolve({ id: '123456789' }) }
const url = 'https://admin.test/api/media/videos/123456789/thumbnail'

test('reads current cover separately from paged alternatives, and selects within the requested video', async () => {
  const response = await GET(new Request(`${url}?page=2`), params)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.json()).toMatchObject({
    current: { id: '44', url: 'https://i.vimeocdn.com/cover.jpg', active: true },
    page: 2,
    hasMore: true,
  })
  const selected = await PATCH(
    new Request(url, { method: 'PATCH', body: JSON.stringify({ pictureId: '44' }) }),
    params,
  )
  expect(selected.status).toBe(200)
  expect(calls.at(-1)).toMatchObject({
    url: 'https://api.vimeo.com/videos/123456789/pictures/44',
    method: 'PATCH',
    body: '{"active":true}',
  })
  const automatic = await PATCH(
    new Request(url, { method: 'PATCH', body: JSON.stringify({ automatic: true }) }),
    params,
  )
  expect(await automatic.json()).toEqual({ ok: true, pictureId: '44' })
  expect(calls.at(-1)?.body).toBe('{"time":0,"active":true}')
})
test('rejects invalid selections and enforces authorization before touching Vimeo', async () => {
  const count = calls.length
  const invalid = await PATCH(
    new Request(url, { method: 'PATCH', body: JSON.stringify({ pictureId: '../other-video' }) }),
    params,
  )
  expect(invalid.status).toBe(400)
  expect(calls).toHaveLength(count)
  const badPage = await GET(new Request(`${url}?page=-1`), params)
  expect(badPage.status).toBe(400)
  authorized = false
  expect((await GET(new Request(url), params)).status).toBe(401)
  expect((await POST(new Request(url, { method: 'POST' }), params)).status).toBe(401)
  expect((await PATCH(new Request(url, { method: 'PATCH' }), params)).status).toBe(401)
  expect(calls).toHaveLength(count)
})
