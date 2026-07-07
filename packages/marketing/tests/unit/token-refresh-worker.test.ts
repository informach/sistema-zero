import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { TokenRefreshWorker } from '../../src/infrastructure/workers/token-refresh-worker'
import {
  FakeOAuthProvider,
  FakeSecretBox,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

function makeAccount(overrides: Partial<SocialAccount> = {}): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'sub-1',
    displayName: 'Conta',
    username: null,
    accessTokenEnc: 'sealed:velho',
    refreshTokenEnc: 'sealed:refresh',
    // Vence em 5 min — dentro da margem de 20 min do worker.
    tokenExpiresAt: new Date(now.getTime() + 5 * 60_000),
    refreshExpiresAt: null,
    scopes: [],
    status: 'connected',
    metadata: {},
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
    { provider, secretBox: new FakeSecretBox() },
    new Set(),
    now,
    silentLogger,
  )
  const worker = new TokenRefreshWorker({
    accounts,
    accountService,
    now,
    logger: silentLogger,
    config: { intervalMs: 1000, marginMs: 20 * 60_000 },
  })
  return { accounts, provider, worker }
}

describe('token-refresh-worker', () => {
  it('conta expirando → token novo re-selado + lastRefreshAt', async () => {
    const s = setup()
    const account = makeAccount()
    await s.accounts.create(account)

    await s.worker.tick()

    const stored = s.accounts.rows.get(account.id)
    expect(stored?.accessTokenEnc).toBe('sealed:fake-access-token-2')
    expect(stored?.lastRefreshAt).not.toBeNull()
    expect(stored?.lastRefreshError).toBeNull()
    expect(stored?.status).toBe('connected')
    expect(s.provider.refreshed).toEqual(['refresh'])
  })

  it('invalid_grant → needs_reauth + lastRefreshError', async () => {
    const s = setup()
    const account = makeAccount()
    await s.accounts.create(account)
    s.provider.failRefreshWith = 'permanent'

    await s.worker.tick()

    const stored = s.accounts.rows.get(account.id)
    expect(stored?.status).toBe('needs_reauth')
    expect(stored?.lastRefreshError).toBeTruthy()
  })

  it('erro transitório → mantém connected (retry no próximo ciclo)', async () => {
    const s = setup()
    const account = makeAccount()
    await s.accounts.create(account)
    s.provider.failRefreshWith = 'transient'

    await s.worker.tick()

    const stored = s.accounts.rows.get(account.id)
    expect(stored?.status).toBe('connected')
    expect(stored?.accessTokenEnc).toBe('sealed:velho')
  })

  it('token longe de vencer não é tocado', async () => {
    const s = setup()
    const account = makeAccount({ tokenExpiresAt: new Date(Date.now() + 3600_000) })
    await s.accounts.create(account)

    await s.worker.tick()

    expect(s.provider.refreshed).toHaveLength(0)
  })

  it('conta needs_reauth/revoked fica de fora', async () => {
    const s = setup()
    await s.accounts.create(makeAccount({ status: 'needs_reauth' }))
    await s.accounts.create(
      makeAccount({ id: randomUUID(), externalId: 'sub-2', status: 'revoked' }),
    )

    await s.worker.tick()

    expect(s.provider.refreshed).toHaveLength(0)
  })
})
