import type { KnowledgeAudience, KnowledgeEvidence, KnowledgeProduct } from './knowledge'

export type AiPurpose = 'copilot' | 'test' | 'shadow' | 'automatic' | 'classification'
export type AiCoverage = 'covered' | 'partial' | 'not_covered'
export type AiFeedbackKind = 'inserted' | 'sent' | 'edited' | 'rejected'

/** Null usage is unknown, never free. Every transport attempt is recorded. */
export interface AiAttemptView {
  attempt: number
  model: string
  providerId: string | null
  inputTokens: number | null
  outputTokens: number | null
  costUsd: number | null
  durationMs: number
  outcome: 'started' | 'completed' | 'invalid_output' | 'unavailable'
}

export interface AiRunView {
  id: string
  ticketId: string | null
  generation: number | null
  purpose: AiPurpose
  audience: KnowledgeAudience
  product: KnowledgeProduct
  promptVersion: string
  status: 'running' | 'completed' | 'failed' | 'superseded'
  coverage: AiCoverage
  reply: string | null
  reason: string | null
  clarification: boolean
  evidence: KnowledgeEvidence[]
  attempts: AiAttemptView[]
  createdAt: string
  completedAt: string | null
}

export interface KnowledgeGapView {
  runId: string
  ticketId: string | null
  reason: string
  audience: KnowledgeAudience
  product: KnowledgeProduct
  createdAt: string
  resolvedArticleId: string | null
}
