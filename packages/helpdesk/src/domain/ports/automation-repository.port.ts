import type {
  AiRunView,
  AutomationEvaluation,
  AutomationPolicy,
  AutomationPolicyView,
  HandoffReason,
} from '@sistemazero/helpdesk-contracts'
import type { Ticket } from '../ticket/ticket'
export interface AutomationJob {
  id: string
  ticketId: string
  generation: number
  epoch: number
  policyVersion: number
  mode: 'shadow' | 'pilot'
  attempts: number
  leaseToken: string
  leaseExpiresAt: Date
  deadlineAt: Date
  createdAt: Date
}
export interface AutomationRepository {
  diagnostics(at: Date): Promise<import('@sistemazero/helpdesk-contracts').AutomationDiagnostics>
  policy(at: Date): Promise<AutomationPolicyView>
  updatePolicy(
    policy: AutomationPolicy,
    version: number,
    actorId: string,
    at: Date,
  ): Promise<AutomationPolicyView | null>
  saveEvaluation(evaluation: AutomationEvaluation): Promise<void>
  evaluations(): Promise<AutomationEvaluation[]>
  claim(at: Date): Promise<{ job: AutomationJob; ticket: Ticket } | null>
  expire(at: Date): Promise<number>
  reserve(job: AutomationJob, at: Date): Promise<boolean>
  reconcile(job: AutomationJob, costUsd: number | null, at: Date): Promise<void>
  complete(
    job: AutomationJob,
    run: AiRunView,
    at: Date,
  ): Promise<'published' | 'shadow' | 'superseded' | 'handoff'>
  fail(job: AutomationJob, reason: HandoffReason, at: Date): Promise<void>
  takeover(
    ticketId: string,
    actorId: string,
    actorName: string,
    version: number,
    commandKey: string,
    at: Date,
  ): Promise<Ticket | null>
}
