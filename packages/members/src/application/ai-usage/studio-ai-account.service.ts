import { createHash, randomBytes } from 'node:crypto'
import type { StudioAiAccountView, StudioAiPolicyInput } from '@sistemazero/core/ai-credits'
import { ValidationError } from '@sistemazero/core/errors'
import {
  StudioAiConflictError,
  StudioAiUnavailableError,
} from '../../domain/ai-usage/studio-ai.errors'
import type {
  OpenRouterOAuthPort,
  StudioAiAccountRepository,
  StudioAiSecretVault,
} from '../../domain/ports/studio-ai-account.port'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export class StudioAiAccountService {
  constructor(
    private readonly deps: {
      accounts: StudioAiAccountRepository
      vault: StudioAiSecretVault | null
      oauth: OpenRouterOAuthPort
      callbackOrigins: readonly string[]
      now?: () => Date
    },
  ) {}
  private now() {
    return this.deps.now?.() ?? new Date()
  }
  private vault() {
    if (!this.deps.vault) throw new StudioAiUnavailableError()
    return this.deps.vault
  }
  async view(accountId: string): Promise<StudioAiAccountView> {
    const account = await this.deps.accounts.get(accountId)
    return {
      available: Boolean(this.deps.vault && this.deps.callbackOrigins.length),
      connected: Boolean(account?.credential),
      source: account?.source ?? 'platform',
      connectedAt: account?.connectedAt?.toISOString() ?? null,
      externalDailyLimitMicroUsd: account?.externalDailyLimitMicroUsd ?? null,
      externalMonthlyLimitMicroUsd: account?.externalMonthlyLimitMicroUsd ?? null,
      keyManagementUrl: account?.keyHash
        ? `https://openrouter.ai/keys/${account.keyHash}`
        : 'https://openrouter.ai/settings/keys',
    }
  }
  async begin(accountId: string, browserBinding: string, callbackUrl: string) {
    const vault = this.vault()
    let callback: URL
    try {
      callback = new URL(callbackUrl)
    } catch {
      throw new ValidationError('Retorno de conexão inválido.')
    }
    if (
      !this.deps.callbackOrigins.includes(callback.origin) ||
      callback.username ||
      callback.password ||
      callback.pathname !== '/api/parents/openrouter/callback' ||
      callback.search ||
      callback.hash
    )
      throw new ValidationError('Retorno de conexão inválido.')
    if (!/^[a-f0-9]{64}$/.test(browserBinding))
      throw new ValidationError('Sessão de conexão inválida.')
    const state = randomBytes(32).toString('base64url')
    const verifier = randomBytes(48).toString('base64url')
    const now = this.now()
    await this.deps.accounts.begin(
      {
        accountId,
        stateHash: hash(state),
        bindingHash: hash(browserBinding),
        verifier: vault.seal(verifier, `oauth:${accountId}:${hash(state)}`),
        callbackUrl,
        expiresAt: new Date(now.getTime() + 10 * 60_000),
      },
      now,
    )
    const url = new URL('https://openrouter.ai/auth')
    url.searchParams.set('callback_url', callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set(
      'code_challenge',
      createHash('sha256').update(verifier).digest('base64url'),
    )
    url.searchParams.set('code_challenge_method', 'S256')
    return { url: url.href }
  }
  async complete(accountId: string, browserBinding: string, state: string, code: string) {
    const vault = this.vault()
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(state) ||
      !/^[a-f0-9]{64}$/.test(browserBinding) ||
      !code ||
      code.length > 1024
    )
      throw new StudioAiConflictError()
    const pending = await this.deps.accounts.consume(
      accountId,
      hash(state),
      hash(browserBinding),
      this.now(),
    )
    if (!pending) throw new StudioAiConflictError()
    const verifier = vault.open(pending.verifier, `oauth:${accountId}:${pending.stateHash}`)
    const key = await this.deps.oauth.exchange(code, verifier)
    const accepted = await this.deps.accounts.connect(
      accountId,
      pending.revision,
      vault.seal(key, `credential:${accountId}`),
      hash(key),
      this.now(),
    )
    if (!accepted) throw new StudioAiConflictError()
    return this.view(accountId)
  }
  async policy(accountId: string, input: StudioAiPolicyInput) {
    for (const value of [input.externalDailyLimitMicroUsd, input.externalMonthlyLimitMicroUsd])
      if (value !== null && (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000_000))
        throw new ValidationError('Limite de uso inválido.')
    if (!['platform', 'openrouter'].includes(input.source))
      throw new ValidationError('Fonte de uso inválida.')
    if (
      input.source === 'openrouter' &&
      (!input.externalDailyLimitMicroUsd || !input.externalMonthlyLimitMicroUsd)
    )
      throw new ValidationError('Defina limites diário e mensal antes de usar a conta conectada.')
    if (
      input.externalDailyLimitMicroUsd &&
      input.externalMonthlyLimitMicroUsd &&
      input.externalDailyLimitMicroUsd > input.externalMonthlyLimitMicroUsd
    )
      throw new ValidationError('O limite diário não pode superar o mensal.')
    await this.deps.accounts.policy(accountId, input, this.now())
    return this.view(accountId)
  }
  async disconnect(accountId: string) {
    // Removing our credential does not claim to revoke the provider's key.
    // Keep the selected funding source: a disconnect cannot silently charge the platform.
    await this.deps.accounts.disconnect(accountId, this.now())
    return this.view(accountId)
  }
}
