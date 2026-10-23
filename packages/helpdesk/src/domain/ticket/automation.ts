import { createHash } from 'node:crypto'
import type {
  AutomationEvaluation,
  AutomationPolicy,
  HandlingMode,
  HandoffReason,
} from '@sistemazero/helpdesk-contracts'
import { KNOWLEDGE_INDEX_VERSION } from '../kb/chunking'
import type { Ticket } from './ticket'

export const AUTOMATION_MAX_RESPONSES = 3
export const AUTOMATION_MAX_CLARIFICATIONS = 1
export const AUTOMATION_DEADLINE_MS = 60_000
export const AUTOMATION_LEASE_MS = 30_000
export const AUTOMATION_MAX_ATTEMPTS = 2
export const AUTOMATION_PROMPT_VERSION = 'knowledge-answer-1'
export function pilotEvaluationValid(
  report: AutomationEvaluation | undefined,
  model: string | null,
  at: Date,
  policy: AutomationPolicy,
): boolean {
  return (
    !!report &&
    !!model &&
    report.policyHash === automationPolicyHash(policy) &&
    report.model === model &&
    report.promptVersion === AUTOMATION_PROMPT_VERSION &&
    report.indexVersion === KNOWLEDGE_INDEX_VERSION &&
    report.cases >= 100 &&
    report.deterministicPassed &&
    report.criticalErrors === 0 &&
    report.reviewedResponses >= 100 &&
    report.reviewedResponses === report.cases &&
    report.correctResponses <= report.reviewedResponses &&
    report.correctResponses / report.reviewedResponses >= 0.95 &&
    report.answerableCases > 0 &&
    report.answerableCases <= report.cases &&
    report.retrievedCases <= report.answerableCases &&
    report.retrievedCases / report.answerableCases >= 0.9 &&
    report.p95Ms <= 30000 &&
    at.getTime() >= new Date(report.evaluatedAt).getTime() &&
    at.getTime() - new Date(report.evaluatedAt).getTime() <= 30 * 86_400_000
  )
}

export function initialHandling() {
  return {
    handlingMode: 'human' as HandlingMode,
    handlingEpoch: 0,
    humanTakeover: false,
    automationStartedAt: null as Date | null,
    humanSlaStartedAt: null as Date | null,
    handoffReason: null as HandoffReason | null,
    automationReplies: 0,
    automationClarifications: 0,
  }
}

export function requestedHuman(text: string): boolean {
  return /(?:falar|conversar|atendimento|atendente|suporte).{0,35}(?:humano|pessoa|equipe|atendente)|(?:quero|preciso|chame|chamar|chama).{0,20}(?:atendente|equipe|humano)|n[aã]o (?:ajudou|resolveu)/i.test(
    text,
  )
}

export function ineligibleReason(
  ticket: Pick<
    Ticket,
    'source' | 'gmailThreadId' | 'triage' | 'humanTakeover' | 'category' | 'requesterAccountId'
  >,
  question: string,
  policy: AutomationPolicy,
): HandoffReason | null {
  if (requestedHuman(question)) return 'customer_requested'
  if (
    ticket.source !== 'portal' ||
    ticket.gmailThreadId !== null ||
    ticket.triage !== 'human' ||
    ticket.humanTakeover
  )
    return 'unsupported_topic'
  if (
    /reembols|estorn|cobran|pagament|cart[aã]o|pix|boleto|cancel|procon|advogad|jur[ií]dic|processo judicial|meu (?:cpf|saldo|pagamento)|altere|troque minha|exclua minha/i.test(
      question,
    )
  )
    return 'sensitive'
  if (
    !ticket.category ||
    !policy.categories.includes(ticket.category) ||
    !['curso_acesso', 'problema_tecnico', 'studio'].includes(ticket.category)
  )
    return 'unsupported_topic'
  return null
}

export function inCohort(accountId: string, percent: number): boolean {
  const bucket =
    createHash('sha256').update(`helpdesk-pilot-1:${accountId}`).digest().readUInt32BE(0) % 10000
  return bucket < percent * 100
}
export function commandHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function applyHumanTakeover(ticket: Ticket, at: Date): void {
  if (ticket.handlingMode === 'assistant' && !['closed', 'resolved'].includes(ticket.status))
    ticket.status = 'open'
  ticket.handlingMode = 'human'
  ticket.humanTakeover = true
  ticket.handlingEpoch++
  ticket.humanSlaStartedAt ??= ticket.automationStartedAt
  ticket.handoffReason = 'staff_intervention'
  ticket.updatedAt = at
}

/** Mode and report ID are rollout controls; every evaluated operational parameter is bound. */
export function automationPolicyHash(policy: AutomationPolicy): string {
  return commandHash({
    categories: [...new Set(policy.categories)].sort(),
    cohortPercent: policy.cohortPercent,
    dailyBudgetMicros: policy.dailyBudgetMicros,
    attemptReserveMicros: policy.attemptReserveMicros,
    accountDailyLimit: policy.accountDailyLimit,
  })
}
