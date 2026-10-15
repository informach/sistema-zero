import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { createLiveRouteHandler } = await import('../src/routes/live')
const id = 'da43dd41-73c1-4aeb-9a0c-557b11213687'
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) })

describe('live BFF security and delivery', () => {
  test('forwards numeric snapshot revisions without accepting arbitrary query metadata', async () => {
    const queries: unknown[] = []
    const handler = createLiveRouteHandler({
      scope: 'learner',
      session: async () => ({ readonly: false }),
      gatewayFetch: async (_path, options) => {
        queries.push(options.query)
        return { status: 200, body: {} }
      },
    })
    await handler(
      new Request(
        `https://sz.test/api/live?revision=0&role=teacher&planRevision=${'a'.repeat(64)}&sessionId=${id}&cursor=${id}&limit=20`,
      ),
      context('workspaces', id),
    )
    await handler(
      new Request('https://sz.test/api/live?revision=-1&planRevision=invalid'),
      context('workspaces', id),
    )
    expect(queries).toEqual([
      { revision: '0', planRevision: 'a'.repeat(64), sessionId: id, cursor: id, limit: '20' },
      {},
    ])
  })
  test('rejects anonymous and readonly mutations before calling Members', async () => {
    let calls = 0
    const gatewayFetch = async () => {
      calls++
      return { status: 200, body: {} }
    }
    const anonymous = createLiveRouteHandler({
      scope: 'learner',
      gatewayFetch,
      session: async () => null,
    })
    expect(
      (await anonymous(new Request('https://sz.test/api/live/catalog'), context('catalog'))).status,
    ).toBe(401)
    const readonly = createLiveRouteHandler({
      scope: 'learner',
      gatewayFetch,
      session: async () => ({ readonly: true }),
    })
    expect(
      (
        await readonly(
          new Request('https://sz.test/api/live/sessions/join', { method: 'POST', body: '{}' }),
          context('sessions', id, 'join'),
        )
      ).status,
    ).toBe(403)
    expect(calls).toBe(0)
  })
  test('any support session (even write mode) reads the room but never acts in it', async () => {
    let calls = 0
    const support = createLiveRouteHandler({
      scope: 'learner',
      session: async () => ({ readonly: false, support: true }),
      gatewayFetch: async () => {
        calls++
        return { status: 200, body: {} }
      },
    })
    for (const path of [
      ['sessions', id, 'join'],
      ['sessions', id, 'chat'],
      ['occurrences', id, 'media', 'join'],
      ['workspaces', id, 'commits'],
    ]) {
      const response = await support(
        new Request('https://sz.test/api/live', { method: 'POST', body: '{}' }),
        context(...path),
      )
      expect(response.status).toBe(403)
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
        'SUPPORT_SESSION',
      )
    }
    expect(calls).toBe(0)
    expect(
      (await support(new Request('https://sz.test/api/live/catalog'), context('catalog'))).status,
    ).toBe(200)
    expect(calls).toBe(1)
  })
  test('caps body size before upstream and accepts project-sized commits', async () => {
    let calls = 0
    const handler = createLiveRouteHandler({
      scope: 'learner',
      session: async () => ({ readonly: false }),
      gatewayFetch: async () => {
        calls++
        return { status: 200, body: {} }
      },
    })
    const body = JSON.stringify({ text: 'x'.repeat(300_000) })
    expect(
      (
        await handler(
          new Request('https://sz.test/api/live', { method: 'POST', body }),
          context('sessions', id, 'chat'),
        )
      ).status,
    ).toBe(413)
    expect(calls).toBe(0)
    expect(
      (
        await handler(
          new Request('https://sz.test/api/live', { method: 'POST', body }),
          context('workspaces', id, 'commits'),
        )
      ).status,
    ).toBe(200)
    expect(calls).toBe(1)
  })
  test('never sends private storage metadata and never signs beyond the lesson grant', async () => {
    let ttl = 0
    const handler = createLiveRouteHandler({
      scope: 'learner',
      session: async () => ({ readonly: false }),
      gatewayFetch: async () => ({
        status: 200,
        body: {
          storageKey: 'r2priv:secret/replay.mp4',
          expiresAt: new Date(Date.now() + 31_000).toISOString(),
          version: 3,
        },
      }),
      signAsset: async (_key, options) => {
        ttl = options?.expiresInSeconds ?? 0
        return 'https://r2.example/signed'
      },
    })
    const response = await handler(
      new Request('https://sz.test/api/live'),
      context('sessions', id, 'recording'),
    )
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toMatchObject({ url: 'https://r2.example/signed', version: 3 })
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(31)
  })
  test('does not sign expired grants or relay internal failures', async () => {
    let signed = false
    const handler = createLiveRouteHandler({
      scope: 'learner',
      session: async () => ({ readonly: false }),
      gatewayFetch: async () => ({
        status: 200,
        body: { storageKey: 'secret', expiresAt: '2020-01-01T00:00:00Z' },
      }),
      signAsset: async () => {
        signed = true
        return 'bad'
      },
    })
    expect(
      (await handler(new Request('https://sz.test/api/live'), context('sessions', id, 'recording')))
        .status,
    ).toBe(403)
    expect(signed).toBe(false)
    const failed = createLiveRouteHandler({
      scope: 'learner',
      session: async () => ({ readonly: false }),
      gatewayFetch: async () => ({ status: 500, body: { password: 'private' } }),
    })
    expect(
      await (await failed(new Request('https://sz.test/api/live'), context('catalog'))).text(),
    ).not.toContain('private')
  })
})
