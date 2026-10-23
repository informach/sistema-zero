import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { McpOAuth } from '../src/mcp/auth'

test('MCP OAuth validates state, uses PKCE and consumes the callback once', async () => {
  const credentials = new Map<string, string>()
  let challenge = ''
  let exchanges = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const base = url.origin
      if (url.pathname.startsWith('/.well-known/oauth-protected-resource'))
        return Response.json({ resource: `${base}/mcp`, authorization_servers: [base] })
      if (url.pathname.startsWith('/.well-known/oauth-authorization-server'))
        return Response.json({
          issuer: base,
          authorization_endpoint: `${base}/authorize`,
          token_endpoint: `${base}/token`,
          registration_endpoint: `${base}/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none'],
        })
      if (url.pathname === '/register') {
        const body = await request.json()
        return Response.json({ ...body, client_id: 'fixture-client' })
      }
      if (url.pathname === '/token') {
        const input = new URLSearchParams(await request.text())
        if (
          createHash('sha256')
            .update(input.get('code_verifier') ?? '')
            .digest('base64url') !== challenge
        )
          return Response.json({ error: 'invalid_grant' }, { status: 400 })
        exchanges++
        return Response.json({
          access_token: 'fixture-access',
          refresh_token: 'fixture-refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        })
      }
      return new Response('Not found', { status: 404 })
    },
  })
  const provider = await McpOAuth.create(`http://127.0.0.1:${server.port}/mcp`, {
    get: async (key) => credentials.get(key) ?? null,
    set: async (key, value) => {
      credentials.set(key, value)
    },
    delete: async (key) => credentials.delete(key),
  })
  try {
    const flow = await provider.begin()
    expect(flow.status).toBe('waiting')
    if (!flow.url) throw new Error('No authorization URL')
    const authorization = new URL(flow.url)
    challenge = authorization.searchParams.get('code_challenge') ?? ''
    expect(challenge.length).toBeGreaterThan(20)
    const callback = new URL(provider.redirectUrl)
    callback.searchParams.set('code', 'fixture-code')
    callback.searchParams.set('state', 'invalid')
    expect((await fetch(callback)).status).toBe(400)
    expect(exchanges).toBe(0)
    callback.searchParams.set('state', authorization.searchParams.get('state') ?? '')
    expect((await fetch(callback)).status).toBe(200)
    expect((await provider.tokens())?.access_token).toBe('fixture-access')
    expect((await fetch(callback)).status).toBe(400)
    expect(exchanges).toBe(1)
  } finally {
    provider.close()
    server.stop(true)
  }
})
