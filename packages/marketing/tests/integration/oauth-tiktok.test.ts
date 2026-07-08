import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import type { ProviderAccount } from '../../src/domain/ports/oauth-provider.port'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import {
  FakeOAuthProvider,
  FakeSecretBox,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'
import { buildTestApp, request, TEST_APP_URL } from '../helpers'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

/** Consent típico do TikTok: 1 conta do criador (open_id), tokens 24h/365d. */
function tiktokConsentAccounts(): ProviderAccount[] {
  return [
    {
      network: 'tiktok',
      identity: {
        externalId: 'open-id-1',
        displayName: 'Sistema Zero',
        username: 'sistemazero',
        metadata: { unionId: 'union-1', username: 'sistemazero', avatarUrl: null },
      },
      tokens: {
        accessToken: 'tt-access-24h',
        refreshToken: 'tt-refresh-365d',
        expiresInSeconds: 86_400,
        refreshExpiresInSeconds: 365 * 86_400,
        scopes: [
          'user.info.basic',
          'user.info.profile',
          'user.info.stats',
          'video.publish',
          'video.list',
        ],
      },
    },
  ]
}

async function startTiktokFlow(t: ReturnType<typeof buildTestApp>): Promise<string> {
  const res = await request(t.app, 'POST', '/marketing/oauth/tiktok/start')
  const body = (await res.json()) as { authorizeUrl: string }
  return new URL(body.authorizeUrl).searchParams.get('state') ?? ''
}

function callback(t: ReturnType<typeof buildTestApp>, qs: string): Promise<Response> {
  return t.app.handle(
    new Request(`http://localhost/marketing/oauth/tiktok/callback?${qs}`, {
      headers: { 'x-internal-token': 'test-internal-token-1234' },
    }),
  )
}

describe('OAuth TikTok (conta única do criador)', () => {
  it('start devolve authorizeUrl e grava o state com a rede tiktok', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'POST', '/marketing/oauth/tiktok/start')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { authorizeUrl: string }
    const state = new URL(body.authorizeUrl).searchParams.get('state')
    expect(state).toBeTruthy()
    expect(t.repos.oauthStates.rows.get(state ?? '')?.network).toBe('tiktok')
  })

  it('callback upserta a conta (access 24h selado, refresh 365d, username no metadata)', async () => {
    const t = buildTestApp()
    t.tiktokProvider.accounts = tiktokConsentAccounts()
    const state = await startTiktokFlow(t)
    const res = await callback(t, `state=${state}&code=abc123`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${TEST_APP_URL}/conexoes?connected=tiktok`)

    const accounts = [...t.repos.accounts.rows.values()]
    expect(accounts).toHaveLength(1)
    const account = accounts[0] as SocialAccount
    expect(account.network).toBe('tiktok')
    expect(account.externalId).toBe('open-id-1')
    expect(account.username).toBe('sistemazero')
    expect(account.accessTokenEnc).toBe('sealed:tt-access-24h')
    expect(account.refreshTokenEnc).toBe('sealed:tt-refresh-365d')
    expect(account.tokenExpiresAt).not.toBeNull() // 24h — o refresh proativo assume
    expect(account.refreshExpiresAt).not.toBeNull() // 365d
    expect((account.metadata as { username?: string }).username).toBe('sistemazero')
    expect(account.scopes).toContain('video.publish')
  })

  it('reconexão do mesmo criador NÃO duplica (unique network+externalId)', async () => {
    const t = buildTestApp()
    t.tiktokProvider.accounts = tiktokConsentAccounts()
    const s1 = await startTiktokFlow(t)
    await callback(t, `state=${s1}&code=abc`)
    const s2 = await startTiktokFlow(t)
    await callback(t, `state=${s2}&code=def`)
    expect([...t.repos.accounts.rows.values()]).toHaveLength(1)
  })
})

describe('refresh do TikTok ROTACIONA o refresh token', () => {
  it('getFreshAccessToken persiste o refresh NOVO devolvido pelo provider', async () => {
    const accounts = new InMemorySocialAccountRepository()
    const provider = new FakeOAuthProvider()
    provider.refreshResult = {
      accessToken: 'tt-access-novo',
      refreshToken: 'tt-refresh-ROTACIONADO',
      expiresInSeconds: 86_400,
      refreshExpiresInSeconds: 365 * 86_400,
    }
    const now = new Date()
    const account: SocialAccount = {
      id: randomUUID(),
      version: 0,
      network: 'tiktok',
      externalId: 'open-id-1',
      displayName: 'Sistema Zero',
      username: 'sistemazero',
      accessTokenEnc: 'sealed:tt-access-velho',
      refreshTokenEnc: 'sealed:tt-refresh-365d',
      tokenExpiresAt: new Date(now.getTime() - 60_000), // vencido → refresh
      refreshExpiresAt: new Date(now.getTime() + 300 * 86_400_000),
      scopes: ['video.publish'],
      status: 'connected',
      metadata: {},
      connectedBy: randomUUID(),
      lastRefreshAt: null,
      lastRefreshError: null,
      createdAt: now,
      updatedAt: now,
    }
    await accounts.create(account)
    const service = new AccountService(
      accounts,
      { providers: new Map([['tiktok', provider]]), secretBox: new FakeSecretBox() },
      new Set(),
      () => new Date(),
      silentLogger,
    )

    const token = await service.getFreshAccessToken(account)
    expect(token).toBe('tt-access-novo')
    expect(provider.refreshed).toEqual(['tt-refresh-365d'])
    const stored = accounts.rows.get(account.id)
    // O refresh antigo NÃO serve mais — o novo precisa estar selado.
    expect(stored?.refreshTokenEnc).toBe('sealed:tt-refresh-ROTACIONADO')
    expect(stored?.refreshExpiresAt?.getTime()).toBeGreaterThan(now.getTime() + 300 * 86_400_000)
  })
})
