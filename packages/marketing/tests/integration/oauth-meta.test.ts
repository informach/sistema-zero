import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import type { ProviderAccount } from '../../src/domain/ports/oauth-provider.port'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { TokenRefreshWorker } from '../../src/infrastructure/workers/token-refresh-worker'
import {
  FakeOAuthProvider,
  FakeSecretBox,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'
import { buildTestApp, request, TEST_APP_URL } from '../helpers'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

/** Consent Meta típico: 1 Página + o IG business vinculado (MESMO page token). */
function metaConsentAccounts(): ProviderAccount[] {
  const shared = {
    refreshToken: 'user-token-60d',
    expiresInSeconds: null,
    refreshExpiresInSeconds: 60 * 86_400,
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
    ],
  }
  return [
    {
      network: 'facebook',
      identity: {
        externalId: 'page-1',
        displayName: 'Página Sistema Zero',
        username: null,
        metadata: { pageId: 'page-1', pageName: 'Página Sistema Zero', igBusinessId: 'ig-1' },
      },
      tokens: { accessToken: 'page-token-1', ...shared },
    },
    {
      network: 'instagram',
      identity: {
        externalId: 'ig-1',
        displayName: 'sistemazero',
        username: 'sistemazero',
        metadata: { igUserId: 'ig-1', username: 'sistemazero', pageId: 'page-1' },
      },
      tokens: { accessToken: 'page-token-1', ...shared },
    },
  ]
}

async function startFacebookFlow(t: ReturnType<typeof buildTestApp>): Promise<string> {
  const res = await request(t.app, 'POST', '/marketing/oauth/facebook/start')
  const body = (await res.json()) as { authorizeUrl: string }
  return new URL(body.authorizeUrl).searchParams.get('state') ?? ''
}

function callback(t: ReturnType<typeof buildTestApp>, qs: string): Promise<Response> {
  return t.app.handle(
    new Request(`http://localhost/marketing/oauth/facebook/callback?${qs}`, {
      headers: { 'x-internal-token': 'test-internal-token-1234' },
    }),
  )
}

describe('OAuth Meta (facebook → Páginas + Instagram num consent)', () => {
  it('start em facebook devolve authorizeUrl e grava o state', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'POST', '/marketing/oauth/facebook/start')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { authorizeUrl: string }
    const state = new URL(body.authorizeUrl).searchParams.get('state')
    expect(state).toBeTruthy()
    expect(t.repos.oauthStates.rows.get(state ?? '')?.network).toBe('facebook')
  })

  it('start em instagram → 404 orientando conectar pelo Facebook', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'POST', '/marketing/oauth/instagram/start')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { message: string } }
    expect(body.error.message).toContain('Facebook')
  })

  it('callback upserta as DUAS contas (facebook + instagram) do mesmo consent', async () => {
    const t = buildTestApp()
    t.metaProvider.accounts = metaConsentAccounts()
    const state = await startFacebookFlow(t)
    const res = await callback(t, `state=${state}&code=abc123`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?connected=facebook`)

    const accounts = [...t.repos.accounts.rows.values()]
    expect(accounts).toHaveLength(2)
    const fb = accounts.find((a) => a.network === 'facebook')
    const ig = accounts.find((a) => a.network === 'instagram')
    // MESMO page token selado nos dois; user token 60d no refresh; page token
    // NÃO expira (tokenExpiresAt null); refreshExpiresAt ~60d.
    expect(fb?.accessTokenEnc).toBe('sealed:page-token-1')
    expect(ig?.accessTokenEnc).toBe('sealed:page-token-1')
    expect(fb?.refreshTokenEnc).toBe('sealed:user-token-60d')
    expect(fb?.tokenExpiresAt).toBeNull()
    expect(fb?.refreshExpiresAt).not.toBeNull()
    expect(ig?.externalId).toBe('ig-1')
  })

  it('reconexão do mesmo consent NÃO duplica (unique network+externalId)', async () => {
    const t = buildTestApp()
    t.metaProvider.accounts = metaConsentAccounts()
    const s1 = await startFacebookFlow(t)
    await callback(t, `state=${s1}&code=abc`)
    const s2 = await startFacebookFlow(t)
    await callback(t, `state=${s2}&code=def`)
    expect([...t.repos.accounts.rows.values()]).toHaveLength(2)
  })

  it('conta sem Páginas → redirect com erro (exchange_failed)', async () => {
    const t = buildTestApp()
    t.metaProvider.accounts = [] // resolveAccounts vazio → no_accounts
    const state = await startFacebookFlow(t)
    const res = await callback(t, `state=${state}&code=abc`)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?error=no_accounts`)
  })
})

describe('renovação proativa do user token 60d (token-refresh-worker)', () => {
  function metaAccount(overrides: Partial<SocialAccount> = {}): SocialAccount {
    const now = new Date()
    return {
      id: randomUUID(),
      version: 0,
      network: 'facebook',
      externalId: 'page-1',
      displayName: 'Página',
      username: null,
      accessTokenEnc: 'sealed:page-token-velho',
      refreshTokenEnc: 'sealed:user-token-60d',
      // Page token não expira; o USER token (refresh) está vencendo.
      tokenExpiresAt: null,
      refreshExpiresAt: new Date(now.getTime() + 5 * 86_400_000), // 5d < margem 10d
      scopes: [],
      status: 'connected',
      metadata: { pageId: 'page-1' },
      connectedBy: randomUUID(),
      lastRefreshAt: null,
      lastRefreshError: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  }

  function setup() {
    const accounts = new InMemorySocialAccountRepository()
    const provider = new FakeOAuthProvider()
    const now = () => new Date()
    const accountService = new AccountService(
      accounts,
      {
        providers: new Map([
          ['facebook', provider],
          ['instagram', provider],
        ]),
        secretBox: new FakeSecretBox(),
      },
      new Set(),
      now,
      silentLogger,
    )
    const worker = new TokenRefreshWorker({
      accounts,
      accountService,
      now,
      logger: silentLogger,
      config: { intervalMs: 1000, marginMs: 20 * 60_000, renewMarginMs: 10 * 86_400_000 },
    })
    return { accounts, provider, worker }
  }

  it('user token vencendo → renewAccounts re-sela TODAS as contas irmãs', async () => {
    const s = setup()
    const fb = metaAccount()
    await s.accounts.create(fb)
    s.provider.accounts = metaConsentAccounts()

    await s.worker.tick()

    expect(s.provider.renewCalls).toEqual(['user-token-60d'])
    const stored = [...s.accounts.rows.values()]
    // O upsert da renovação criou/atualizou as duas contas do consent.
    expect(stored.filter((a) => a.network === 'facebook')).toHaveLength(1)
    expect(stored.filter((a) => a.network === 'instagram')).toHaveLength(1)
    const fbStored = stored.find((a) => a.network === 'facebook')
    expect(fbStored?.accessTokenEnc).toBe('sealed:page-token-1')
  })

  it('renovação com falha PERMANENTE → needs_reauth', async () => {
    const s = setup()
    const fb = metaAccount()
    await s.accounts.create(fb)
    s.provider.failRenewWith = 'permanent'

    await s.worker.tick()

    expect(s.accounts.rows.get(fb.id)?.status).toBe('needs_reauth')
  })

  it('page token sem expiração NÃO cai no refresh (token entregue direto)', async () => {
    const s = setup()
    const fb = metaAccount({ refreshExpiresAt: new Date(Date.now() + 50 * 86_400_000) })
    await s.accounts.create(fb)
    const accountService = new AccountService(
      s.accounts,
      { providers: new Map([['facebook', s.provider]]), secretBox: new FakeSecretBox() },
      new Set(),
      () => new Date(),
      silentLogger,
    )
    const token = await accountService.getFreshAccessToken(fb)
    expect(token).toBe('page-token-velho')
    expect(s.provider.refreshed).toHaveLength(0)
  })
})
