import type {
  StudioAiActor,
  StudioAiCostView,
  StudioAiFundingSource,
  StudioAiPriceCaps,
  StudioAiRunRequest,
  StudioAiSettlement,
} from '@sistemazero/core/ai-credits'
import type { AiUsageTotals } from './ai-usage-repository.port'

export interface StudioAiUsageLimits {
  dailyLimit: number
  monthlyLimit: number
  dailyMicroUsd: number
  monthlyMicroUsd: number
  maxConcurrent: number
  externalDailyRuns: number
  priceCaps: StudioAiPriceCaps
}
export interface StudioAiReserveInput {
  actor: StudioAiActor
  request: StudioAiRunRequest
  now: Date
  day: string
  estimateMicroUsd: number
  expiresAt: Date
  limits: StudioAiUsageLimits
  externalAvailable: boolean
}
export type StudioAiReserveResult = AiUsageTotals &
  (
    | {
        allowed: false
        source: StudioAiFundingSource
        scope: 'day' | 'month' | 'cost-day' | 'cost-month' | 'busy' | 'connection'
      }
    | {
        allowed: true
        source: StudioAiFundingSource
        priceCaps: StudioAiPriceCaps
        expiresAt: Date
      }
  )
export interface StudioAiUsageRepository {
  reserve(input: StudioAiReserveInput): Promise<StudioAiReserveResult>
  /** One-use permission. A lost response must never be replayed as a new provider call. */
  dispatch(
    actor: StudioAiActor,
    runId: string,
    attempt: number,
    now: Date,
  ): Promise<{ source: StudioAiFundingSource; credential: string | null }>
  settle(
    actor: StudioAiActor,
    runId: string,
    settlement: StudioAiSettlement,
    now: Date,
  ): Promise<void>
  finish(actor: StudioAiActor, runId: string, now: Date): Promise<void>
  costs(accountId: string, day: string, now: Date): Promise<StudioAiCostView>
  stats(
    month: string,
    now: Date,
  ): Promise<import('@sistemazero/core/ai-credits').StudioAiCostGroup[]>
  claimReconciliation(now: Date, limit: number): Promise<StudioAiReconciliation[]>
  releaseReconciliation(runId: string, attempt: number, claimId: string, now: Date): Promise<void>
}

export interface StudioAiReconciliation {
  actor: StudioAiActor
  runId: string
  attempt: number
  claimId: string
  generationId: string
  source: StudioAiFundingSource
  credential: string | null
}
