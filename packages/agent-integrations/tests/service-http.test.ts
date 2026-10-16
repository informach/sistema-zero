import { expect, test } from 'bun:test'
import { JsonService } from '../src/sistemazero/http'

test('service retries only reads, opens a bounded circuit, and does not reveal tokens in errors', async () => {
  let gets = 0,
    posts = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (request.method === 'POST') posts++
      else gets++
      return Response.json({ error: { code: 'TEMPORARILY_UNAVAILABLE' } }, { status: 503 })
    },
  })
  try {
    const http = new JsonService(server.url.origin)
    await expect(http.request('/read', { token: 'secret-test' })).rejects.toThrow(
      'TEMPORARILY_UNAVAILABLE',
    )
    expect(gets).toBe(2)
    await expect(
      http.request('/botsecret-test/send', { method: 'POST', body: {} }),
    ).rejects.toThrow('Service request failed (503, TEMPORARILY_UNAVAILABLE)')
    expect(posts).toBe(1)
    await expect(http.request('/read')).rejects.toThrow('CIRCUIT_OPEN')
    expect(gets).toBe(2)
  } finally {
    await server.stop(true)
  }
})
