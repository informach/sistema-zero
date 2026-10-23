import type { Logger } from '@sistemazero/core/logging'
import type { HandoffReason } from '@sistemazero/helpdesk-contracts'
import type { KnowledgeAnswerService } from '../../application/ai/knowledge-answer.service'
import { buildThreadText } from '../../application/ai/prompts'
import type { AutomationRepository } from '../../domain/ports/automation-repository.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { ineligibleReason } from '../../domain/ticket/automation'

/** A separate durable queue from classification/drafts; network outside DB locks. */
export class AutomationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private working: Promise<void> | null = null
  private maintenance: Promise<unknown> | null = null
  constructor(
    private readonly repo: AutomationRepository,
    private readonly answers: KnowledgeAnswerService,
    private readonly messages: MessageRepository,
    private readonly now: () => Date,
    private readonly logger: Logger,
  ) {}
  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 1000)
    this.tick()
  }
  async stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await Promise.all([this.working, this.maintenance])
  }
  tick() {
    if (!this.maintenance)
      this.maintenance = this.repo
        .expire(this.now())
        .then((count) => {
          if (count > 0) this.logger.warn('automation.jobs_expired', { count })
        })
        .catch(() => this.logger.error('automation.expiration_failed'))
        .finally(() => {
          this.maintenance = null
        })
    if (!this.working)
      this.working = this.runOnce()
        .catch(() => this.logger.error('automation.worker_failed'))
        .finally(() => {
          this.working = null
        })
  }
  async runOnce(): Promise<void> {
    const claimed = await this.repo.claim(this.now())
    if (!claimed) return
    const { job, ticket } = claimed
    let failure: HandoffReason = 'provider_failure'
    try {
      const messages = (await this.messages.page(ticket.id, { limit: 50, publicOnly: true }))
        .slice(0, 50)
        .reverse()
      const question =
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.direction === 'inbound' &&
              message.visibility === 'customer' &&
              message.triage === 'human',
          )?.bodyText ?? ticket.subject
      const policy = await this.repo.policy(this.now())
      const ineligible = ineligibleReason(ticket, question, policy.policy)
      if (ineligible) {
        await this.repo.fail(job, ineligible, this.now())
        return
      }
      const run = await this.answers.answer({
        query: question,
        thread: buildThreadText(ticket.subject, messages, 24000),
        ticketId: ticket.id,
        generation: job.generation,
        purpose: job.mode === 'pilot' ? 'automatic' : 'shadow',
        audience: ticket.portal === 'kids' ? 'customer_parent' : 'customer_adult',
        product:
          ticket.category === 'studio' ? 'studio' : ticket.portal === 'kids' ? 'kids' : 'community',
        limit: 6,
        deadline: new Date(Math.min(job.deadlineAt.getTime(), job.leaseExpiresAt.getTime() - 1000)),
        maxAttempts: 1,
        beforeAttempt: async () => {
          if (!(await this.repo.reserve(job, this.now()))) {
            failure = 'budget'
            throw new Error('Automation reservation denied')
          }
        },
        onAttempt: async (attempt) => {
          if (attempt.outcome !== 'started')
            await this.repo.reconcile(job, attempt.costUsd, this.now())
        },
      })
      const outcome = await this.repo.complete(job, run, this.now())
      if (outcome === 'superseded') await this.answers.runs.finish({ ...run, status: 'superseded' })
      this.logger.info('automation.finished', {
        jobId: job.id,
        ticketId: ticket.id,
        generation: job.generation,
        outcome,
      })
    } catch {
      await this.repo.fail(job, failure, this.now())
      this.logger.warn('automation.attempt_failed', {
        jobId: job.id,
        ticketId: ticket.id,
        reason: failure,
        attempt: job.attempts,
      })
    }
  }
}
