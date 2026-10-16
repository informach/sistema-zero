import { randomUUID } from 'node:crypto'
import { DomainError } from '@sistemazero/core/errors'
import { ForbiddenError } from '@sistemazero/core/http'
import type { AutomationEvaluation, AutomationPolicy } from '@sistemazero/helpdesk-contracts'
import { z } from 'zod'
import { ConcurrencyConflictError } from '../../domain/helpdesk-errors'
import { KNOWLEDGE_INDEX_VERSION } from '../../domain/kb/chunking'
import type { AutomationRepository } from '../../domain/ports/automation-repository.port'
import {
  AUTOMATION_PROMPT_VERSION,
  automationPolicyHash,
  pilotEvaluationValid,
} from '../../domain/ticket/automation'
import type { Actor } from '../actor'
import { toTicketView } from '../views'

export class AutomationPolicyInvalidError extends DomainError {
  readonly code = 'AUTOMATION_POLICY_INVALID'
}
export const AutomationPolicySchema = z
  .object({
    mode: z.enum(['off', 'shadow', 'pilot']),
    categories: z.array(z.enum(['curso_acesso', 'problema_tecnico', 'studio'])).max(3),
    cohortPercent: z.number().int().min(0).max(100),
    dailyBudgetMicros: z.number().int().min(0).max(1_000_000_000),
    attemptReserveMicros: z.number().int().min(0).max(10_000_000),
    accountDailyLimit: z.number().int().min(1).max(100),
    evaluationId: z.string().uuid().nullable(),
  })
  .strict()
export const EvaluationInputSchema = z
  .object({
    evaluatedAt: z.iso.datetime(),
    policyHash: z.string().regex(/^[a-f0-9]{64}$/),
    indexVersion: z.number().int().positive(),
    datasetVersion: z.string().min(1).max(100),
    model: z.string().min(1).max(200),
    promptVersion: z.string().min(1).max(100),
    cases: z.number().int().min(1).max(100000),
    reviewedResponses: z.number().int().nonnegative(),
    correctResponses: z.number().int().nonnegative(),
    answerableCases: z.number().int().nonnegative(),
    retrievedCases: z.number().int().nonnegative(),
    criticalErrors: z.number().int().nonnegative(),
    deterministicPassed: z.boolean(),
    p95Ms: z.number().nonnegative(),
  })
  .strict()

export class AutomationService {
  constructor(
    readonly repo: AutomationRepository,
    private readonly model: string | null,
    private readonly now: () => Date,
  ) {}
  private admin(actor: Actor) {
    if (actor.status !== 'active' || !['admin', 'superadmin'].includes(actor.role ?? ''))
      throw new ForbiddenError('Política de automação exige administrador')
  }
  async policy(actor: Actor) {
    this.admin(actor)
    const view = await this.repo.policy(this.now())
    return {
      ...view,
      evaluationContext: {
        policyHash: automationPolicyHash(view.policy),
        model: this.model,
        promptVersion: AUTOMATION_PROMPT_VERSION,
        indexVersion: KNOWLEDGE_INDEX_VERSION,
      },
    }
  }
  evaluations(actor: Actor) {
    this.admin(actor)
    return this.repo.evaluations()
  }
  diagnostics(actor: Actor) {
    this.admin(actor)
    return this.repo.diagnostics(this.now())
  }
  async recordEvaluation(actor: Actor, input: unknown) {
    this.admin(actor)
    const parsed = EvaluationInputSchema.safeParse(input)
    if (!parsed.success) throw new AutomationPolicyInvalidError('Relatório de avaliação inválido')
    const data = parsed.data
    if (new Date(data.evaluatedAt).getTime() > this.now().getTime())
      throw new AutomationPolicyInvalidError('A avaliação não pode ter data futura')
    if (
      data.correctResponses > data.reviewedResponses ||
      data.reviewedResponses > data.cases ||
      data.retrievedCases > data.answerableCases ||
      data.answerableCases > data.cases
    )
      throw new AutomationPolicyInvalidError('Contagens de avaliação inconsistentes')
    const evaluation: AutomationEvaluation = {
      ...data,
      id: randomUUID(),
      reviewedBy: actor.userId,
      createdAt: this.now().toISOString(),
    }
    await this.repo.saveEvaluation(evaluation)
    return evaluation
  }
  async update(actor: Actor, input: unknown, version: number) {
    this.admin(actor)
    const parsed = AutomationPolicySchema.safeParse(input)
    if (!parsed.success) throw new AutomationPolicyInvalidError('Política inválida')
    const policy: AutomationPolicy = parsed.data
    if (policy.mode !== 'off') {
      if (
        !this.model ||
        !policy.categories.length ||
        policy.cohortPercent === 0 ||
        policy.attemptReserveMicros <= 0 ||
        policy.dailyBudgetMicros < policy.attemptReserveMicros
      )
        throw new AutomationPolicyInvalidError(
          'Defina modelo, temas, coorte e orçamento antes de ativar',
        )
      if (policy.mode === 'pilot') {
        const report = (await this.repo.evaluations()).find(
          (item) => item.id === policy.evaluationId,
        )
        if (!pilotEvaluationValid(report, this.model, this.now(), policy))
          throw new AutomationPolicyInvalidError(
            'Piloto exige avaliação atual do modelo e prompt, 100 respostas revisadas, 95% de qualidade, 90% de recuperação, zero erro crítico e p95 até 30s',
          )
      }
    }
    const saved = await this.repo.updatePolicy(policy, version, actor.userId, this.now())
    if (!saved) throw new ConcurrencyConflictError()
    return saved
  }
  async takeover(actor: Actor, ticketId: string, version: number, commandKey: string) {
    const ticket = await this.repo.takeover(
      ticketId,
      actor.userId,
      actor.displayName,
      version,
      commandKey,
      this.now(),
    )
    if (!ticket) throw new ConcurrencyConflictError()
    return toTicketView(ticket, this.now())
  }
}
