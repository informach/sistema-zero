import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { StudioAiAccountService } from '../../src/application/ai-usage/studio-ai-account.service'
import { StudioAiConflictError } from '../../src/domain/ai-usage/studio-ai.errors'
import type {
  StudioAiAccount,
  StudioAiAccountRepository,
  StudioAiOAuthState,
} from '../../src/domain/ports/studio-ai-account.port'
import { AesStudioAiVault } from '../../src/infrastructure/security/studio-ai-vault'
import { studioAiVaultConfig } from '../../src/infrastructure/security/studio-ai-vault-config'

const key = 'a'.repeat(64)
const binding = 'b'.repeat(64)
function setup() {
  const accounts = new Map<string, StudioAiAccount>()
  const states = new Map<string, StudioAiOAuthState>()
  let now = new Date('2026-10-15T12:00:00Z')
  let exchanges = 0
  let exchangedVerifier = ''
  let exchangeGate: Promise<void> | undefined
  const repo: StudioAiAccountRepository = {
    get: async (id) => accounts.get(id) ?? null,
    async begin(state) {
      const account = accounts.get(state.accountId) ?? {
        accountId: state.accountId,
        source: 'platform',
        credential: null,
        keyHash: null,
        connectedAt: null,
        revision: 0,
        externalDailyLimitMicroUsd: null,
        externalMonthlyLimitMicroUsd: null,
      }
      account.revision++
      accounts.set(state.accountId, account)
      for (const [hash, existing] of states)
        if (existing.accountId === state.accountId) states.delete(hash)
      states.set(state.stateHash, { ...state, revision: account.revision })
    },
    async consume(id, hash, browserHash, at) {
      const row = states.get(hash)
      if (!row || row.accountId !== id || row.bindingHash !== browserHash || row.expiresAt <= at)
        return null
      states.delete(hash)
      return row
    },
    async connect(id, revision, credential, keyHash, connectedAt) {
      const account = accounts.get(id)
      if (!account || account.revision !== revision) return false
      Object.assign(account, { credential, keyHash, connectedAt, revision: revision + 1 })
      return true
    },
    async policy(id, input) {
      const account = accounts.get(id)!
      if (input.source === 'openrouter' && !account?.credential) throw new StudioAiConflictError()
      Object.assign(account, input, { revision: account.revision + 1 })
    },
    async disconnect(id) {
      const account = accounts.get(id)
      if (account)
        Object.assign(account, {
          credential: null,
          keyHash: null,
          connectedAt: null,
          revision: account.revision + 1,
        })
      for (const [hash, state] of states) if (state.accountId === id) states.delete(hash)
    },
  }
  const vault = new AesStudioAiVault({ k1: key }, 'k1')
  const service = new StudioAiAccountService({
    accounts: repo,
    vault,
    callbackOrigins: ['https://kids.test'],
    now: () => now,
    oauth: {
      async exchange(_code, verifier) {
        exchanges++
        exchangedVerifier = verifier
        await exchangeGate
        return 'sk-or-test-credential-private'
      },
    },
  })
  return {
    service,
    accounts,
    states,
    vault,
    get exchanges() {
      return exchanges
    },
    get verifier() {
      return exchangedVerifier
    },
    setNow(value: Date) {
      now = value
    },
    setGate(value: Promise<void>) {
      exchangeGate = value
    },
    async start() {
      return new URL(
        (
          await service.begin(
            'account-1',
            binding,
            'https://kids.test/api/parents/openrouter/callback',
          )
        ).url,
      )
    },
  }
}
describe('OpenRouter parent connection', () => {
  test('uses S256, encrypts verifier/key, binds the account/browser and returns no credential', async () => {
    const f = setup(),
      url = await f.start()
    expect(url.origin).toBe('https://openrouter.ai')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    const state = url.searchParams.get('state')!
    await expect(f.service.complete('other-account', binding, state, 'code')).rejects.toThrow(
      StudioAiConflictError,
    )
    await expect(f.service.complete('account-1', 'c'.repeat(64), state, 'code')).rejects.toThrow(
      StudioAiConflictError,
    )
    expect(f.exchanges).toBe(0)
    const stored = [...f.states.values()][0]!
    expect(stored.verifier).toStartWith('v1:k1:')
    const view = await f.service.complete('account-1', binding, state, 'code')
    expect(url.searchParams.get('code_challenge')).toBe(
      createHash('sha256').update(f.verifier).digest('base64url'),
    )
    expect(view.connected).toBe(true)
    expect(view.source).toBe('platform')
    expect(JSON.stringify(view)).not.toContain('credential')
    expect(f.accounts.get('account-1')!.credential).not.toContain('sk-or-')
    expect(f.vault.open(f.accounts.get('account-1')!.credential!, 'credential:account-1')).toBe(
      'sk-or-test-credential-private',
    )
    await expect(f.service.complete('account-1', binding, state, 'code')).rejects.toThrow(
      StudioAiConflictError,
    )
    expect(f.exchanges).toBe(1)
  })
  test('expiration, stale connects and disconnection cannot switch funding or restore a deleted key', async () => {
    const f = setup(),
      expired = await f.start()
    f.setNow(new Date('2026-10-15T12:10:00Z'))
    await expect(
      f.service.complete('account-1', binding, expired.searchParams.get('state')!, 'code'),
    ).rejects.toThrow()
    expect(f.exchanges).toBe(0)
    const url = await f.start()
    await f.service.complete('account-1', binding, url.searchParams.get('state')!, 'code')
    await f.service.policy('account-1', {
      source: 'openrouter',
      externalDailyLimitMicroUsd: 10_000,
      externalMonthlyLimitMicroUsd: 100_000,
    })
    let release!: () => void
    f.setGate(
      new Promise<void>((resolve) => {
        release = resolve
      }),
    )
    const next = await f.start()
    const pending = f.service.complete(
      'account-1',
      binding,
      next.searchParams.get('state')!,
      'code',
    )
    await Promise.resolve()
    await f.service.disconnect('account-1')
    release()
    await expect(pending).rejects.toThrow(StudioAiConflictError)
    expect(await f.service.view('account-1')).toMatchObject({
      connected: false,
      source: 'openrouter',
    })
  })
  test('rejects foreign callbacks and invalid limits before saving', async () => {
    const f = setup()
    await expect(
      f.service.begin('account-1', binding, 'https://evil.test/api/parents/openrouter/callback'),
    ).rejects.toThrow()
    await expect(
      f.service.policy('account-1', {
        source: 'openrouter',
        externalDailyLimitMicroUsd: null,
        externalMonthlyLimitMicroUsd: null,
      }),
    ).rejects.toThrow('limites')
    await expect(
      f.service.policy('account-1', {
        source: 'platform',
        externalDailyLimitMicroUsd: 100,
        externalMonthlyLimitMicroUsd: 10,
      }),
    ).rejects.toThrow('diário')
  })
  test('key rotation retains old decryptors and rejects changed ciphertext or account context', () => {
    const old = new AesStudioAiVault({ k1: key }, 'k1')
    const token = old.seal('private', 'credential:one')
    const rotated = new AesStudioAiVault({ k1: key, k2: 'c'.repeat(64) }, 'k2')
    expect(rotated.open(token, 'credential:one')).toBe('private')
    expect(rotated.seal('private', 'credential:one')).toStartWith('v1:k2:')
    expect(() => rotated.open(token, 'credential:two')).toThrow()
    expect(() => rotated.open(`${token.slice(0, -4)}AAAA`, 'credential:one')).toThrow()
    expect(studioAiVaultConfig({})).toEqual({ vault: null, callbackOrigins: [] })
    expect(() => studioAiVaultConfig({ STUDIO_AI_VAULT_KEYS: '{}' })).toThrow('incompleta')
  })
})
