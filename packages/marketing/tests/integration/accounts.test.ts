import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { buildTestApp, request } from '../helpers'

function makeAccount(overrides: Partial<SocialAccount> = {}): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'google-sub-1',
    displayName: 'Canal Sistema Zero',
    username: null,
    accessTokenEnc: 'sealed:access',
    refreshTokenEnc: 'sealed:refresh',
    tokenExpiresAt: new Date(now.getTime() + 3600_000),
    refreshExpiresAt: null,
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ],
    status: 'connected',
    metadata: { email: 'equipe@sz.com', channelId: 'UC1', channelTitle: 'Canal' },
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('Contas sociais', () => {
  it('GET lista SEM material de token (nunca _enc/sealed no corpo)', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(makeAccount())
    const res = await request(t.app, 'GET', '/marketing/accounts')
    expect(res.status).toBe(200)
    const raw = await res.text()
    // Invariante de segurança: nenhum vestígio de token na resposta.
    expect(raw).not.toContain('sealed:')
    expect(raw).not.toContain('TokenEnc')
    expect(raw).not.toContain('token_enc')
    const body = JSON.parse(raw) as {
      items: Array<{
        displayName: string
        canAutoPublish: boolean
        metadata: { channelId: string }
      }>
      autoCapableNetworks: string[]
    }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.displayName).toBe('Canal Sistema Zero')
    expect(body.items[0]?.metadata.channelId).toBe('UC1')
    // Sem publisher montado (F1): auto indisponível mesmo com escopos.
    expect(body.items[0]?.canAutoPublish).toBe(false)
    expect(body.autoCapableNetworks).toEqual([])
  })

  it('com publisher montado (F2) canAutoPublish reflete escopos', async () => {
    const t = buildTestApp({ autoCapableNetworks: new Set(['youtube']) })
    await t.repos.accounts.create(makeAccount())
    await t.repos.accounts.create(
      makeAccount({ externalId: 'sub-2', scopes: ['openid'], id: randomUUID() }),
    )
    const res = await request(t.app, 'GET', '/marketing/accounts')
    const body = (await res.json()) as {
      items: Array<{ externalId: string; canAutoPublish: boolean }>
    }
    const byExternal = new Map(body.items.map((i) => [i.externalId, i.canAutoPublish]))
    expect(byExternal.get('google-sub-1')).toBe(true)
    expect(byExternal.get('sub-2')).toBe(false)
  })

  it('DELETE desconecta: revoke best-effort + tokens zerados + revoked (linha preservada)', async () => {
    const t = buildTestApp()
    const account = makeAccount()
    await t.repos.accounts.create(account)
    const res = await request(t.app, 'DELETE', `/marketing/accounts/${account.id}`)
    expect(res.status).toBe(200)
    const stored = t.repos.accounts.rows.get(account.id)
    expect(stored?.status).toBe('revoked')
    expect(stored?.accessTokenEnc).toBeNull()
    expect(stored?.refreshTokenEnc).toBeNull()
    expect(t.provider.revoked).toEqual(['refresh'])
  })

  it('DELETE de conta inexistente → 404', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'DELETE', `/marketing/accounts/${randomUUID()}`)
    expect(res.status).toBe(404)
  })
})
