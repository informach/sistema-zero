export type StudioAiFundingSource = 'platform' | 'openrouter'

/** Public account view. Credentials and OAuth verifiers never belong in this contract. */
export interface StudioAiAccountView {
  available: boolean
  connected: boolean
  source: StudioAiFundingSource
  connectedAt: string | null
  externalDailyLimitMicroUsd: number | null
  externalMonthlyLimitMicroUsd: number | null
  keyManagementUrl: string | null
}

export interface StudioAiPolicyInput {
  source: StudioAiFundingSource
  externalDailyLimitMicroUsd: number | null
  externalMonthlyLimitMicroUsd: number | null
}
