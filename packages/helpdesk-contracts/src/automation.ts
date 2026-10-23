import type { TicketCategory } from './index'

export type HandlingMode = 'human' | 'assistant'
export type AutomationMode = 'off' | 'shadow' | 'pilot'
export interface AutomationDiagnostics {
  windowDays: number
  asOf: string
  latency: Record<string, number>
  health: Record<string, number>
  cycles: Record<string, number>
  copilot: Record<string, number>
  usage: Array<{ purpose: string; [key: string]: string | number }>
  handoffs: Array<{ reason: string; count: number; p95Ms: number }>
}
export interface AutomationPolicy {
  mode: AutomationMode
  categories: TicketCategory[]
  cohortPercent: number
  dailyBudgetMicros: number
  attemptReserveMicros: number
  accountDailyLimit: number
  evaluationId: string | null
}
export interface AutomationPolicyView {
  version: number
  policy: AutomationPolicy
  updatedAt: string | null
  usage: { reservedMicros: number; knownMicros: number; unknownAttempts: number }
}
export const DEFAULT_AUTOMATION_POLICY: AutomationPolicy = {
  mode: 'off',
  categories: [],
  cohortPercent: 0,
  dailyBudgetMicros: 0,
  attemptReserveMicros: 0,
  accountDailyLimit: 20,
  evaluationId: null,
}
export const HANDOFF_REASONS = {
  customer_requested: 'Você pediu para falar com a equipe.',
  staff_intervention: 'A equipe assumiu o atendimento.',
  sensitive: 'Este assunto precisa da equipe.',
  unsupported_topic: 'A equipe vai ajudar com este assunto.',
  insufficient_sources: 'A equipe vai conferir as informações necessárias.',
  invalid_evidence: 'A equipe vai conferir as informações necessárias.',
  provider_failure: 'A equipe continuará o atendimento.',
  deadline: 'A equipe continuará o atendimento.',
  turn_limit: 'A equipe continuará o atendimento.',
  budget: 'A equipe continuará o atendimento.',
  policy_changed: 'A equipe continuará o atendimento.',
  sources_changed: 'A equipe vai conferir as informações atualizadas.',
} as const
export type HandoffReason = keyof typeof HANDOFF_REASONS
export interface PublicCitation {
  id: string
  title: string
  section: string
  revisionNumber: number
}
export interface AutomationEvaluation {
  evaluatedAt: string
  policyHash: string
  indexVersion: number
  id: string
  datasetVersion: string
  model: string
  promptVersion: string
  cases: number
  reviewedResponses: number
  correctResponses: number
  answerableCases: number
  retrievedCases: number
  criticalErrors: number
  deterministicPassed: boolean
  p95Ms: number
  reviewedBy: string
  createdAt: string
}
