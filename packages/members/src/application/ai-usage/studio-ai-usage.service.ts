import type {
  StudioAiActor,
  StudioAiReservation,
  StudioAiRunRequest,
  StudioAiSettlement,
} from '@sistemazero/core/ai-credits'
import { ValidationError } from '@sistemazero/core/errors'
import { computeAiCredits } from '../../domain/ai-usage/ai-credits'
import { StudioAiUnavailableError } from '../../domain/ai-usage/studio-ai.errors'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import type { StudioAiSecretVault } from '../../domain/ports/studio-ai-account.port'
import type {
  StudioAiUsageLimits,
  StudioAiUsageRepository,
} from '../../domain/ports/studio-ai-usage.port'

export class StudioAiUsageService {
  constructor(
    private readonly deps: {
      repository: StudioAiUsageRepository
      vault: StudioAiSecretVault | null
      limits: StudioAiUsageLimits
      clock?: () => Date
    },
  ) {}
  private now() {
    return this.deps.clock?.() ?? new Date()
  }
  async reserve(actor: StudioAiActor, request: StudioAiRunRequest): Promise<StudioAiReservation> {
    const attempts = request.purpose === 'tutor' ? 3 : 6
    if (
      !Number.isSafeInteger(request.inputBytes) ||
      request.inputBytes < 1 ||
      request.inputBytes > 256_000 ||
      !Number.isSafeInteger(request.maxOutputTokens) ||
      request.maxOutputTokens < 1 ||
      request.maxOutputTokens > 8_000 ||
      !Number.isSafeInteger(request.maxAttempts) ||
      request.maxAttempts < 1 ||
      request.maxAttempts > attempts
    )
      throw new ValidationError('Orçamento da operação de IA inválido.')
    const now = this.now()
    // Text-only: bytes bound tokens conservatively, with framing/schema/cache-write margin.
    // Prices are enforced on provider routing too, not just used for a local estimate.
    const { prompt, completion } = this.deps.limits.priceCaps
    const estimateMicroUsd = Math.ceil(
      (request.inputBytes * 2 + 4096) * prompt + request.maxOutputTokens * completion,
    )
    const result = await this.deps.repository.reserve({
      actor,
      request,
      now,
      day: localDateSaoPaulo(now),
      estimateMicroUsd,
      expiresAt: new Date(now.getTime() + 5 * 60_000),
      limits: this.deps.limits,
      externalAvailable: this.deps.vault !== null,
    })
    const credits = {
      ...computeAiCredits({
        now,
        usedDay: result.usedDay,
        usedMonth: result.usedMonth,
        dailyLimit: this.deps.limits.dailyLimit,
        monthlyLimit: this.deps.limits.monthlyLimit,
        unlimited: actor.privileged,
      }),
      studioSource: result.source,
    }
    return result.allowed
      ? {
          allowed: true,
          source: result.source,
          priceCaps: result.priceCaps,
          credits,
          expiresAt: result.expiresAt.toISOString(),
        }
      : { allowed: false, scope: result.scope, credits }
  }
  async dispatch(actor: StudioAiActor, runId: string, attempt: number) {
    const result = await this.deps.repository.dispatch(actor, runId, attempt, this.now())
    if (result.source === 'platform') return { source: result.source, apiKey: null }
    try {
      if (!this.deps.vault || !result.credential) throw new StudioAiUnavailableError()
      // Only the private HMAC endpoint can return this transient value to the server transport.
      return {
        source: result.source,
        apiKey: this.deps.vault.open(result.credential, `credential:${actor.accountId}`),
      }
    } catch {
      // No permission left the service: this failure is known to precede provider execution.
      await this.deps.repository.settle(actor, runId, { attempt, status: 'rejected' }, this.now())
      throw new StudioAiUnavailableError()
    }
  }
  settle(actor: StudioAiActor, runId: string, settlement: StudioAiSettlement) {
    if (
      settlement.status === 'confirmed' &&
      (!Number.isSafeInteger(settlement.actualMicroUsd) ||
        settlement.actualMicroUsd! < 0 ||
        settlement.actualMicroUsd! > 1_000_000_000)
    )
      throw new ValidationError('Uso do provedor inválido.')
    if (settlement.status !== 'confirmed' && settlement.actualMicroUsd !== undefined)
      throw new ValidationError('Custo incerto não pode ser apresentado como confirmado.')
    return this.deps.repository.settle(actor, runId, settlement, this.now())
  }
  finish(actor: StudioAiActor, runId: string) {
    return this.deps.repository.finish(actor, runId, this.now())
  }
  costs(accountId: string) {
    const now = this.now()
    return this.deps.repository.costs(accountId, localDateSaoPaulo(now), now)
  }
  async claimReconciliation() {
    const jobs = await this.deps.repository.claimReconciliation(this.now(), 4)
    return jobs.flatMap(({ credential, ...job }) => {
      try {
        const apiKey =
          credential && this.deps.vault
            ? this.deps.vault.open(credential, `credential:${job.actor.accountId}`)
            : null
        return job.source === 'openrouter' && !apiKey ? [] : [{ ...job, apiKey }]
      } catch {
        return []
      }
    })
  }
  releaseReconciliation(runId: string, attempt: number, claimId: string) {
    return this.deps.repository.releaseReconciliation(runId, attempt, claimId, this.now())
  }
}
