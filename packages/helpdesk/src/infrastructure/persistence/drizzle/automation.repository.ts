import { randomUUID } from 'node:crypto'
import {
  type AiRunView,
  type AutomationEvaluation,
  type AutomationPolicy,
  type AutomationPolicyView,
  DEFAULT_AUTOMATION_POLICY,
  type HandoffReason,
} from '@sistemazero/helpdesk-contracts'
import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql } from 'drizzle-orm'
import type {
  AutomationJob,
  AutomationRepository,
} from '../../../domain/ports/automation-repository.port'
import {
  AUTOMATION_LEASE_MS,
  AUTOMATION_MAX_ATTEMPTS,
  AUTOMATION_MAX_CLARIFICATIONS,
  AUTOMATION_MAX_RESPONSES,
  commandHash,
  pilotEvaluationValid,
} from '../../../domain/ticket/automation'
import type { Ticket } from '../../../domain/ticket/ticket'
import { automationDiagnostics } from './automation-diagnostics'
import {
  type HelpdeskTx,
  handoffTicket,
  humanTakeoverSet,
  lockAutomationPolicy,
  supersedeJobs,
} from './automation-transactions'
import type { Database } from './db'
import {
  automationEvaluations,
  automationJobs,
  automationPolicy,
  automationPolicyEvents,
  automationReservations,
  customerCommands,
  kbArticles,
  kbChunks,
  kbRevisions,
  messageEvidence,
  ticketMessages,
  tickets,
} from './schema'

import { recordAutomationHandoff } from './ticket-events'

type JobRow = typeof automationJobs.$inferSelect
const activeStates = ['pending', 'processing'] as const
const dayStart = (at: Date) => new Date(`${at.toISOString().slice(0, 10)}T00:00:00Z`)

export class DrizzleAutomationRepository implements AutomationRepository {
  diagnostics(at: Date) {
    return automationDiagnostics(this.db, at)
  }
  constructor(
    private readonly db: Database,
    private readonly model: string | null,
  ) {}

  private async policyReady(
    tx: HelpdeskTx,
    policy: typeof automationPolicy.$inferSelect,
    at: Date,
  ) {
    if (policy.policy.mode !== 'pilot') return true
    if (!policy.policy.evaluationId) return false
    const [evaluation] = await tx
      .select()
      .from(automationEvaluations)
      .where(eq(automationEvaluations.id, policy.policy.evaluationId))
    return pilotEvaluationValid(evaluation?.detail, this.model, at, policy.policy)
  }
  async policy(at: Date): Promise<AutomationPolicyView> {
    const [row] = await this.db
      .select()
      .from(automationPolicy)
      .where(eq(automationPolicy.id, 'default'))
    const [usage] = await this.db
      .select({
        reservedMicros:
          sql<number>`coalesce(sum(case when ${automationReservations.knownMicros} is null then ${automationReservations.reservedMicros} else 0 end),0)`.mapWith(
            Number,
          ),
        knownMicros: sql<number>`coalesce(sum(${automationReservations.knownMicros}),0)`.mapWith(
          Number,
        ),
        unknownAttempts:
          sql<number>`count(*) filter (where ${automationReservations.knownMicros} is null)`.mapWith(
            Number,
          ),
      })
      .from(automationReservations)
      .where(gte(automationReservations.createdAt, dayStart(at)))
    return {
      version: row?.version ?? 0,
      policy: row?.policy ?? DEFAULT_AUTOMATION_POLICY,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      usage: usage ?? { reservedMicros: 0, knownMicros: 0, unknownAttempts: 0 },
    }
  }
  async updatePolicy(policy: AutomationPolicy, version: number, actorId: string, at: Date) {
    const updated = await this.db.transaction(async (tx) => {
      const current = await lockAutomationPolicy(tx)
      if (current.version !== version) return false
      await tx
        .update(automationPolicy)
        .set({ policy, version: version + 1, updatedBy: actorId, updatedAt: at })
        .where(eq(automationPolicy.id, 'default'))
      await tx
        .insert(automationPolicyEvents)
        .values({ id: randomUUID(), version: version + 1, policy, actorId, createdAt: at })
      return true
    })
    return updated ? this.policy(at) : null
  }
  async saveEvaluation(evaluation: AutomationEvaluation) {
    await this.db
      .insert(automationEvaluations)
      .values({ id: evaluation.id, detail: evaluation, createdAt: new Date(evaluation.createdAt) })
  }
  async evaluations() {
    return (
      await this.db
        .select()
        .from(automationEvaluations)
        .orderBy(desc(automationEvaluations.createdAt))
        .limit(50)
    ).map((row) => row.detail)
  }
  private current(ticket: Ticket, job: JobRow) {
    return (
      ticket.aiGeneration === job.generation &&
      ticket.handlingEpoch === job.epoch &&
      !ticket.humanTakeover &&
      ticket.source === 'portal' &&
      ticket.gmailThreadId === null &&
      ticket.triage === 'human' &&
      !['closed', 'resolved'].includes(ticket.status)
    )
  }
  private async locked(tx: HelpdeskTx, job: Pick<AutomationJob, 'id' | 'ticketId'>) {
    const policy = await lockAutomationPolicy(tx)
    const [ticket] = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.id, job.ticketId))
      .for('update')
    const [stored] = await tx
      .select()
      .from(automationJobs)
      .where(eq(automationJobs.id, job.id))
      .for('update')
    return { policy, ticket, stored }
  }
  private authorized(
    ticket: Ticket | undefined,
    stored: JobRow | undefined,
    job: AutomationJob,
    policy: typeof automationPolicy.$inferSelect,
    at: Date,
  ) {
    return (
      !!ticket &&
      !!stored &&
      this.current(ticket, stored) &&
      stored.state === 'processing' &&
      stored.leaseToken === job.leaseToken &&
      stored.leaseExpiresAt !== null &&
      stored.leaseExpiresAt > at &&
      stored.deadlineAt > at &&
      stored.policyVersion === policy.version &&
      stored.mode === policy.policy.mode &&
      (stored.mode === 'shadow' || ticket.handlingMode === 'assistant')
    )
  }
  async claim(at: Date): Promise<{ job: AutomationJob; ticket: Ticket } | null> {
    return this.db.transaction(async (tx) => {
      const policy = await lockAutomationPolicy(tx)
      at = new Date(Math.max(at.getTime(), Date.now()))
      const [candidate] = await tx
        .select()
        .from(automationJobs)
        .where(
          or(
            and(eq(automationJobs.state, 'pending'), lte(automationJobs.nextAt, at)),
            and(eq(automationJobs.state, 'processing'), lte(automationJobs.leaseExpiresAt, at)),
          ),
        )
        .orderBy(asc(automationJobs.createdAt), asc(automationJobs.id))
        .limit(1)
      if (!candidate) return null
      const [ticket] = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.id, candidate.ticketId))
        .for('update', { skipLocked: true })
      if (!ticket) return null
      const [job] = await tx
        .select()
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.id, candidate.id),
            inArray(automationJobs.state, [...activeStates]),
          ),
        )
        .for('update', { skipLocked: true })
      if (!job) return null
      at = new Date(Math.max(at.getTime(), Date.now()))
      if (!this.current(ticket, job)) {
        await tx
          .update(automationJobs)
          .set({ state: 'superseded', finishedAt: at, reason: 'conversation_changed' })
          .where(eq(automationJobs.id, job.id))
        return null
      }
      if (
        !(await this.policyReady(tx, policy, at)) ||
        job.policyVersion !== policy.version ||
        job.mode !== policy.policy.mode ||
        job.deadlineAt <= at ||
        job.attempts >= AUTOMATION_MAX_ATTEMPTS
      ) {
        if (job.mode === 'pilot')
          await handoffTicket(tx, ticket, job.deadlineAt <= at ? 'deadline' : 'policy_changed', at)
        else
          await tx
            .update(automationJobs)
            .set({ state: 'superseded', finishedAt: at, reason: 'policy_changed' })
            .where(eq(automationJobs.id, job.id))
        return null
      }
      const leaseToken = randomUUID()
      const leaseExpiresAt = new Date(
        Math.min(at.getTime() + AUTOMATION_LEASE_MS, job.deadlineAt.getTime()),
      )
      const [claimed] = await tx
        .update(automationJobs)
        .set({ state: 'processing', attempts: job.attempts + 1, leaseToken, leaseExpiresAt })
        .where(eq(automationJobs.id, job.id))
        .returning()
      if (!claimed) return null
      return { job: { ...claimed, leaseToken, leaseExpiresAt }, ticket }
    })
  }
  async expire(at: Date): Promise<number> {
    return this.db.transaction(async (tx) => {
      const policy = await lockAutomationPolicy(tx)
      const candidates = await tx
        .select()
        .from(automationJobs)
        .where(
          and(
            inArray(automationJobs.state, [...activeStates]),
            or(
              lte(automationJobs.deadlineAt, at),
              ne(automationJobs.policyVersion, policy.version),
              and(
                eq(automationJobs.state, 'processing'),
                lte(automationJobs.leaseExpiresAt, at),
                gte(automationJobs.attempts, AUTOMATION_MAX_ATTEMPTS),
              ),
            ),
          ),
        )
        .orderBy(asc(automationJobs.ticketId), asc(automationJobs.id))
        .limit(50)
      let count = 0
      for (const job of candidates) {
        const [ticket] = await tx
          .select()
          .from(tickets)
          .where(eq(tickets.id, job.ticketId))
          .for('update', { skipLocked: true })
        if (!ticket) continue
        if (this.current(ticket, job) && job.mode === 'pilot')
          await handoffTicket(
            tx,
            ticket,
            job.policyVersion !== policy.version ? 'policy_changed' : 'deadline',
            at,
          )
        else
          await tx
            .update(automationJobs)
            .set({ state: 'superseded', finishedAt: at, reason: 'expired' })
            .where(
              and(eq(automationJobs.id, job.id), inArray(automationJobs.state, [...activeStates])),
            )
        count++
      }
      return count
    })
  }
  async reserve(job: AutomationJob, at: Date): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const { policy, ticket, stored } = await this.locked(tx, job)
      at = new Date(Math.max(at.getTime(), Date.now()))
      if (
        !(await this.policyReady(tx, policy, at)) ||
        !this.authorized(ticket, stored, job, policy, at) ||
        !ticket?.requesterAccountId
      )
        return false
      const [existing] = await tx
        .select()
        .from(automationReservations)
        .where(
          and(
            eq(automationReservations.jobId, job.id),
            eq(automationReservations.attempt, job.attempts),
          ),
        )
      if (existing) return true
      const [usage] = await tx
        .select({
          spent:
            sql<number>`coalesce(sum(coalesce(${automationReservations.knownMicros},${automationReservations.reservedMicros})),0)`.mapWith(
              Number,
            ),
          accountCount:
            sql<number>`count(*) filter (where ${automationReservations.accountId} = ${ticket.requesterAccountId})`.mapWith(
              Number,
            ),
        })
        .from(automationReservations)
        .where(gte(automationReservations.createdAt, dayStart(at)))
      const reserve = policy.policy.attemptReserveMicros
      if (
        reserve <= 0 ||
        (usage?.spent ?? 0) + reserve > policy.policy.dailyBudgetMicros ||
        (usage?.accountCount ?? 0) >= policy.policy.accountDailyLimit
      )
        return false
      await tx.insert(automationReservations).values({
        id: randomUUID(),
        jobId: job.id,
        attempt: job.attempts,
        accountId: ticket.requesterAccountId,
        reservedMicros: reserve,
        createdAt: at,
      })
      return true
    })
  }
  async reconcile(job: AutomationJob, costUsd: number | null, _at: Date) {
    if (costUsd === null || !Number.isFinite(costUsd) || costUsd < 0) return
    await this.db
      .update(automationReservations)
      .set({ knownMicros: Math.ceil(costUsd * 1_000_000) })
      .where(
        and(
          eq(automationReservations.jobId, job.id),
          eq(automationReservations.attempt, job.attempts),
        ),
      )
  }
  async complete(
    job: AutomationJob,
    run: AiRunView,
    at: Date,
  ): Promise<'published' | 'shadow' | 'superseded' | 'handoff'> {
    return this.db.transaction(async (tx) => {
      const { policy, ticket, stored } = await this.locked(tx, job)
      // Re-evaluate time after waiting for locks, not when inference finished.
      const commitAt = new Date(Math.max(at.getTime(), Date.now()))
      if (
        !(await this.policyReady(tx, policy, commitAt)) ||
        !this.authorized(ticket, stored, job, policy, commitAt) ||
        !ticket ||
        !stored
      )
        return 'superseded'
      if (
        run.ticketId !== ticket.id ||
        run.generation !== job.generation ||
        run.purpose !== (job.mode === 'pilot' ? 'automatic' : 'shadow')
      )
        return 'superseded'
      if (job.mode === 'shadow') {
        await tx
          .update(automationJobs)
          .set({
            state: 'completed',
            runId: run.id,
            finishedAt: commitAt,
            leaseToken: null,
            leaseExpiresAt: null,
          })
          .where(eq(automationJobs.id, job.id))
        return 'shadow'
      }
      const fail = async (reason: HandoffReason) => {
        await handoffTicket(tx, ticket, reason, commitAt)
        return 'handoff' as const
      }
      if (
        run.status !== 'completed' ||
        run.coverage !== 'covered' ||
        !run.reply ||
        !run.evidence.length
      )
        return fail('insufficient_sources')
      if (
        ticket.automationReplies >= AUTOMATION_MAX_RESPONSES ||
        (run.clarification && ticket.automationClarifications >= AUTOMATION_MAX_CLARIFICATIONS)
      )
        return fail('turn_limit')
      if (
        !['supported', 'clarification'].includes(run.reason ?? '') ||
        run.clarification !== (run.reason === 'clarification') ||
        new Set(run.evidence.map((source) => source.chunkId)).size !== run.evidence.length
      )
        return fail('invalid_evidence')
      if (!(await this.sourcesValid(tx, run, ticket, commitAt))) return fail('sources_changed')
      commitAt.setTime(Math.max(commitAt.getTime(), Date.now()))
      if (
        !stored.leaseExpiresAt ||
        stored.leaseExpiresAt <= commitAt ||
        stored.deadlineAt <= commitAt
      )
        return fail('deadline')
      const messageId = randomUUID()
      await tx.insert(ticketMessages).values({
        id: messageId,
        ticketId: ticket.id,
        kind: 'portal',
        visibility: 'customer',
        direction: 'outbound',
        sentVia: 'ai',
        fromName: 'Assistente virtual do Sistema Zero',
        bodyText: run.reply,
        aiRunId: run.id,
        automationGeneration: job.generation,
        triage: 'human',
        createdAt: commitAt,
      })
      await tx.insert(messageEvidence).values(
        run.evidence.map((source) => ({
          id: randomUUID(),
          messageId,
          articleId: source.articleId,
          revisionId: source.revisionId,
          chunkId: source.chunkId,
          title: source.title,
          section: source.section,
          revisionNumber: source.revisionNumber,
        })),
      )
      await tx
        .update(tickets)
        .set({
          status: 'waiting',
          version: sql`${tickets.version}+1`,
          messageCount: sql`${tickets.messageCount}+1`,
          lastMessageAt: commitAt,
          updatedAt: commitAt,
          automationReplies: ticket.automationReplies + 1,
          automationClarifications: ticket.automationClarifications + (run.clarification ? 1 : 0),
        })
        .where(eq(tickets.id, ticket.id))
      await tx
        .update(automationJobs)
        .set({
          state: 'completed',
          runId: run.id,
          finishedAt: commitAt,
          leaseToken: null,
          leaseExpiresAt: null,
        })
        .where(eq(automationJobs.id, job.id))
      return 'published'
    })
  }
  private async sourcesValid(
    tx: HelpdeskTx,
    run: AiRunView,
    ticket: Ticket,
    at: Date,
  ): Promise<boolean> {
    const audience =
      ticket.portal === 'kids'
        ? 'customer_parent'
        : ticket.portal === 'adult'
          ? 'customer_adult'
          : null
    if (!audience || run.audience !== audience) return false
    const product =
      ticket.category === 'studio' ? 'studio' : ticket.portal === 'kids' ? 'kids' : 'community'
    if (run.product !== product) return false
    const ids = [...new Set(run.evidence.map((source) => source.articleId))].sort()
    const articles = await tx
      .select()
      .from(kbArticles)
      .where(inArray(kbArticles.id, ids))
      .orderBy(asc(kbArticles.id))
      .for('share')
    let earliestExpiry = Number.POSITIVE_INFINITY
    for (const source of run.evidence) {
      const article = articles.find((item) => item.id === source.articleId)
      if (!article || article.archived || article.publishedRevisionId !== source.revisionId)
        return false
      const [revision] = await tx
        .select()
        .from(kbRevisions)
        .where(eq(kbRevisions.id, source.revisionId))
        .for('share')
      if (
        revision?.indexState !== 'ready' ||
        !revision.validUntil ||
        (revision.validUntil &&
          revision.validUntil.getTime() <= Math.max(at.getTime(), Date.now())) ||
        ![audience, 'customer_all'].includes(revision.audience) ||
        !['all', run.product].includes(revision.product)
      )
        return false
      earliestExpiry = Math.min(earliestExpiry, revision.validUntil.getTime())
      const [chunk] = await tx
        .select()
        .from(kbChunks)
        .where(and(eq(kbChunks.id, source.chunkId), eq(kbChunks.revisionId, revision.id)))
      if (!chunk || chunk.text !== source.text || revision.title !== source.title) return false
    }
    return earliestExpiry > Math.max(at.getTime(), Date.now())
  }
  async fail(job: AutomationJob, reason: HandoffReason, at: Date) {
    await this.db.transaction(async (tx) => {
      const { policy, ticket, stored } = await this.locked(tx, job)
      if (
        !ticket ||
        !stored ||
        !this.current(ticket, stored) ||
        stored.state !== 'processing' ||
        stored.leaseToken !== job.leaseToken
      )
        return
      if (
        reason === 'provider_failure' &&
        stored.attempts < AUTOMATION_MAX_ATTEMPTS &&
        stored.deadlineAt.getTime() > at.getTime() + 5000 &&
        stored.policyVersion === policy.version
      ) {
        await tx
          .update(automationJobs)
          .set({
            state: 'pending',
            nextAt: new Date(at.getTime() + 1000),
            leaseToken: null,
            leaseExpiresAt: null,
            reason,
          })
          .where(eq(automationJobs.id, job.id))
        return
      }
      if (job.mode === 'pilot') await handoffTicket(tx, ticket, reason, at)
      else
        await tx
          .update(automationJobs)
          .set({ state: 'handoff', reason, finishedAt: at, leaseToken: null, leaseExpiresAt: null })
          .where(eq(automationJobs.id, job.id))
    })
  }
  async takeover(
    ticketId: string,
    actorId: string,
    actorName: string,
    version: number,
    commandKey: string,
    at: Date,
  ): Promise<Ticket | null> {
    return this.db.transaction(async (tx) => {
      await lockAutomationPolicy(tx)
      const hash = commandHash(['takeover', ticketId, version])
      const [command] = await tx
        .select()
        .from(customerCommands)
        .where(and(eq(customerCommands.accountId, actorId), eq(customerCommands.key, commandKey)))
      if (command) {
        if (command.hash !== hash) return null
        return (await tx.select().from(tickets).where(eq(tickets.id, command.ticketId)))[0] ?? null
      }
      const [previous] = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .for('update')
      if (!previous) return null
      const [ticket] = await tx
        .update(tickets)
        .set({
          ...humanTakeoverSet(at),
          assignedTo: actorId,
          assignedToName: actorName,
          version: version + 1,
        })
        .where(and(eq(tickets.id, ticketId), eq(tickets.version, version)))
        .returning()
      if (ticket) {
        await recordAutomationHandoff(tx, previous, 'staff_intervention', at)
        await supersedeJobs(tx, ticket.id, at)
        await tx.insert(customerCommands).values({
          id: randomUUID(),
          accountId: actorId,
          key: commandKey,
          hash,
          ticketId: ticket.id,
          createdAt: at,
        })
      }
      return ticket ?? null
    })
  }
}
