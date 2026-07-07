import { describe, expect, it } from 'bun:test'
import { buildTestApp, request, staffHeaders, TEST_APP_URL } from '../helpers'

describe('OAuth (start + callback)', () => {
  it('start devolve authorizeUrl com S256/offline/consent e grava o state', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'POST', '/marketing/oauth/youtube/start')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { authorizeUrl: string }
    const url = new URL(body.authorizeUrl)
    const state = url.searchParams.get('state')
    expect(state).toBeTruthy()
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://gateway.test/marketing/oauth/youtube/callback',
    )
    expect(t.repos.oauthStates.rows.get(state ?? '')).toBeTruthy()
  })

  it('rede sem fluxo OAuth → 404 NETWORK_NOT_SUPPORTED', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'POST', '/marketing/oauth/instagram/start')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NETWORK_NOT_SUPPORTED')
  })

  it('OAuth não configurado → 503 OAUTH_NOT_CONFIGURED', async () => {
    const t = buildTestApp({ googleEnabled: false })
    const res = await request(t.app, 'POST', '/marketing/oauth/youtube/start')
    expect(res.status).toBe(503)
  })

  async function startFlow(t: ReturnType<typeof buildTestApp>): Promise<string> {
    const res = await request(t.app, 'POST', '/marketing/oauth/youtube/start')
    const body = (await res.json()) as { authorizeUrl: string }
    return new URL(body.authorizeUrl).searchParams.get('state') ?? ''
  }

  function callback(t: ReturnType<typeof buildTestApp>, qs: string): Promise<Response> {
    // Callback é rota pública no gateway: só x-internal-token, SEM X-Auth-User-*.
    return t.app.handle(
      new Request(`http://localhost/marketing/oauth/youtube/callback?${qs}`, {
        headers: { 'x-internal-token': 'test-internal-token-1234' },
      }),
    )
  }

  it('callback feliz: upsert com tokens SELADOS + 302 ?connected=youtube', async () => {
    const t = buildTestApp()
    const state = await startFlow(t)
    const res = await callback(t, `state=${state}&code=abc123&scope=x`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?connected=youtube`)
    const accounts = [...t.repos.accounts.rows.values()]
    expect(accounts).toHaveLength(1)
    const account = accounts[0]
    expect(account?.externalId).toBe('google-sub-1')
    expect(account?.accessTokenEnc).toBe('sealed:fake-access-token')
    expect(account?.refreshTokenEnc).toBe('sealed:fake-refresh-token')
    expect(account?.status).toBe('connected')
    // PKCE: o exchange recebeu o verifier gravado no state.
    expect(t.provider.exchanged[0]?.codeVerifier).toBeTruthy()
  })

  it('state REUSADO → 302 ?error=state_invalid (single-use)', async () => {
    const t = buildTestApp()
    const state = await startFlow(t)
    await callback(t, `state=${state}&code=abc123`)
    const res = await callback(t, `state=${state}&code=abc123`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?error=state_invalid`)
    expect([...t.repos.accounts.rows.values()]).toHaveLength(1)
  })

  it('state vencido → ?error=state_invalid', async () => {
    const t = buildTestApp()
    const state = await startFlow(t)
    const record = t.repos.oauthStates.rows.get(state)
    if (record) record.expiresAt = new Date(Date.now() - 1000)
    const res = await callback(t, `state=${state}&code=abc123`)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?error=state_invalid`)
  })

  it('usuária negou no Google (error=access_denied) → redirect com erro', async () => {
    const t = buildTestApp()
    const res = await callback(t, 'error=access_denied')
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?error=access_denied`)
  })

  it('exchange falha → ?error=exchange_failed (state já consumido)', async () => {
    const t = buildTestApp()
    const state = await startFlow(t)
    t.provider.failExchangeWith = 'permanent'
    const res = await callback(t, `state=${state}&code=abc123`)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?error=exchange_failed`)
    expect([...t.repos.accounts.rows.values()]).toHaveLength(0)
  })

  it('reconexão da MESMA conta atualiza sem duplicar e PRESERVA o refresh antigo', async () => {
    const t = buildTestApp()
    const state1 = await startFlow(t)
    await callback(t, `state=${state1}&code=abc123`)
    // 2º consent sem refresh_token (Google só devolve no 1º).
    t.provider.tokenSet = { ...t.provider.tokenSet, refreshToken: null, accessToken: 'novo-token' }
    const state2 = await startFlow(t)
    const res = await callback(t, `state=${state2}&code=def456`)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?connected=youtube`)
    const accounts = [...t.repos.accounts.rows.values()]
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.accessTokenEnc).toBe('sealed:novo-token')
    expect(accounts[0]?.refreshTokenEnc).toBe('sealed:fake-refresh-token')
  })

  it('start sem staff → 401/403', async () => {
    const t = buildTestApp()
    const res = await t.app.handle(
      new Request('http://localhost/marketing/oauth/youtube/start', {
        method: 'POST',
        headers: staffHeaders({ 'x-auth-user-role': '' }),
      }),
    )
    expect([401, 403]).toContain(res.status)
  })
})
