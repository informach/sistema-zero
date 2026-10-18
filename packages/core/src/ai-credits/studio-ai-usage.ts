import type { AiCreditsView } from './credits'
import type { StudioAiFundingSource } from './studio-ai'

/** Server-to-server contracts. These commands are never accepted directly from a browser. */
export interface StudioAiActor {
  audience?: 'adult' | 'kids'
  accountId: string
  userId: string
  privileged: boolean
}
export interface StudioAiRunRequest {
  runId: string
  projectId: string
  purpose: 'tutor' | 'builder'
  model: string
  /** UTF-8 bytes of the largest prompt/schema, including repair instructions. */
  inputBytes: number
  maxOutputTokens: number
  maxAttempts: number
}
export interface StudioAiPriceCaps {
  prompt: number
  completion: number
  request: 0
}
export type StudioAiDenial = 'day' | 'month' | 'cost-day' | 'cost-month' | 'busy' | 'connection'
export type StudioAiReservation =
  | { allowed: false; scope: StudioAiDenial; credits: AiCreditsView }
  | {
      allowed: true
      source: StudioAiFundingSource
      priceCaps: StudioAiPriceCaps
      credits: AiCreditsView
      expiresAt: string
    }
export interface StudioAiSettlement {
  attempt: number
  status: 'confirmed' | 'uncertain' | 'rejected'
  actualMicroUsd?: number
  generationId?: string
  promptTokens?: number
  completionTokens?: number
}
export type StudioAiUsageAction =
  | { operation: 'reserve'; request: StudioAiRunRequest }
  | { operation: 'dispatch'; runId: string; attempt: number }
  | { operation: 'settle'; runId: string; settlement: StudioAiSettlement }
  | { operation: 'finish'; runId: string }

export interface StudioAiCostTotals {
  confirmedMicroUsd: number
  uncertainMicroUsd: number
  reservedMicroUsd: number
  calls: number
}
export interface StudioAiCostView {
  day: string
  month: string
  platform: { today: StudioAiCostTotals; month: StudioAiCostTotals }
  openrouter: { today: StudioAiCostTotals; month: StudioAiCostTotals }
}
export interface StudioAiCostGroup extends StudioAiCostTotals {
  source: StudioAiFundingSource
  model: string
  purpose: 'tutor' | 'builder'
  privileged: boolean
}
