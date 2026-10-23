import type { StudioAiPolicyInput } from '@sistemazero/core/ai-credits'

export interface StudioAiAccount extends StudioAiPolicyInput {
  accountId: string
  credential: string | null
  keyHash: string | null
  connectedAt: Date | null
  revision: number
}
export interface StudioAiOAuthState {
  stateHash: string
  accountId: string
  bindingHash: string
  verifier: string
  callbackUrl: string
  revision: number
  expiresAt: Date
}

export interface StudioAiAccountRepository {
  get(accountId: string): Promise<StudioAiAccount | null>
  /** Locks account against deletion, initializes defaults and invalidates older connection attempts. */
  begin(state: Omit<StudioAiOAuthState, 'revision'>, now: Date): Promise<void>
  /** Atomic delete-and-return; account, browser binding and expiry are part of the predicate. */
  consume(
    accountId: string,
    stateHash: string,
    bindingHash: string,
    now: Date,
  ): Promise<StudioAiOAuthState | null>
  connect(
    accountId: string,
    revision: number,
    credential: string,
    keyHash: string,
    now: Date,
  ): Promise<boolean>
  policy(accountId: string, input: StudioAiPolicyInput, now: Date): Promise<void>
  disconnect(accountId: string, now: Date): Promise<void>
}

export interface StudioAiSecretVault {
  seal(value: string, context: string): string
  open(value: string, context: string): string
}
export interface OpenRouterOAuthPort {
  exchange(code: string, verifier: string): Promise<string>
}
