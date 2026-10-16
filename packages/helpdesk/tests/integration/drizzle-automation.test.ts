import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type {
  AiRunView,
  AutomationPolicy,
  KnowledgeEvidence,
} from '@sistemazero/helpdesk-contracts'
import { KnowledgeAnswerService } from '../../src/application/ai/knowledge-answer.service'
import { KbService } from '../../src/application/kb/kb.service'
import { CustomerTicketService } from '../../src/application/tickets/customer-ticket.service'
import { chunkKnowledge, KNOWLEDGE_INDEX_VERSION } from '../../src/domain/kb/chunking'
import type { LlmClient, LlmCompleteInput } from '../../src/domain/ports/llm-client.port'
import { automationPolicyHash } from '../../src/domain/ticket/automation'
import { ticketSla } from '../../src/domain/ticket/ticket-sla'
import { pruneAiData } from '../../src/infrastructure/persistence/drizzle/ai-retention'
import { DrizzleAiRunRepository } from '../../src/infrastructure/persistence/drizzle/ai-run.repository'
import { DrizzleAutomationRepository } from '../../src/infrastructure/persistence/drizzle/automation.repository'
import { DrizzleCustomerTicketRepository } from '../../src/infrastructure/persistence/drizzle/customer-ticket.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleKbRepository } from '../../src/infrastructure/persistence/drizzle/kb.repository'
import { DrizzleMessageRepository } from '../../src/infrastructure/persistence/drizzle/message.repository'
import { DrizzleReplyDeliveryRepository } from '../../src/infrastructure/persistence/drizzle/reply-delivery.repository'
import { DrizzleTicketRepository } from '../../src/infrastructure/persistence/drizzle/ticket.repository'
import { AutomationWorker } from '../../src/infrastructure/workers/automation-worker'
import { makeMessage, makeTicket } from '../helpers'

const url = process.env.HELPDESK_TEST_DATABASE_URL
if (url && !/helpdesk_test/i.test(url)) throw new Error('Use banco descartável helpdesk_test')
const suite = url ? describe : describe.skip
const actor = { userId: randomUUID(), displayName: 'Editora', role: 'admin', status: 'active' }
const owner = { accountId: randomUUID(), email: 'sintetico@example.test', name: 'Pessoa de teste' }
const policy: AutomationPolicy = {
  mode: 'pilot',
  categories: ['studio'],
  cohortPercent: 100,
  dailyBudgetMicros: 100000,
  attemptReserveMicros: 10000,
  accountDailyLimit: 20,
  evaluationId: null,
}
const logger = { info() {}, warn() {}, error() {}, debug() {} }

function barrier() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}
class PausedLlm implements LlmClient {
  readonly started = barrier()
  readonly proceed = barrier()
  constructor(private readonly source: KnowledgeEvidence) {}
  isConfigured() {
    return true
  }
  async complete<T>(input: LlmCompleteInput<T>): Promise<T> {
    await input.beforeAttempt?.(1)
    this.started.release()
    await this.proceed.promise
    await input.onAttempt?.({
      attempt: 1,
      model: 'synthetic',
      providerId: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
      durationMs: 0,
      outcome: 'completed',
    })
    return input.schema.parse({
      reply: 'Abra o Estúdio e escolha o bloco de movimento.',
      kbCoverage: 'covered',
      citationIds: [this.source.chunkId],
      clarification: false,
      reason: 'supported',
    })
  }
}
suite('Automação durável e concorrência no PostgreSQL', () => {
  let db: DbConnection, second: DbConnection
  let repo: DrizzleAutomationRepository,
    other: DrizzleAutomationRepository,
    kb: DrizzleKbRepository,
    tickets: DrizzleTicketRepository,
    messages: DrizzleMessageRepository,
    portal: CustomerTicketService
  let source: KnowledgeEvidence
  beforeAll(() => {
    if (!url) return
    db = createDbConnection(url)
    second = createDbConnection(url)
    repo = new DrizzleAutomationRepository(db.db, 'synthetic')
    other = new DrizzleAutomationRepository(second.db, 'synthetic')
    kb = new DrizzleKbRepository(db.db)
    tickets = new DrizzleTicketRepository(db)
    messages = new DrizzleMessageRepository(db.db)
    portal = new CustomerTicketService(
      new DrizzleCustomerTicketRepository(db.db),
      messages,
      { aiEnabled: true },
      () => new Date(),
      randomUUID,
    )
  })
  beforeEach(async () => {
    await db.sql`truncate helpdesk.tickets, helpdesk.kb_articles, helpdesk.kb_revisions, helpdesk.automation_policy, helpdesk.automation_policy_events cascade`
    policy.evaluationId = randomUUID()
    await repo.saveEvaluation({
      id: policy.evaluationId,
      policyHash: automationPolicyHash(policy),
      indexVersion: KNOWLEDGE_INDEX_VERSION,
      evaluatedAt: new Date().toISOString(),
      datasetVersion: 'synthetic-concurrency',
      model: 'synthetic',
      promptVersion: 'knowledge-answer-1',
      cases: 100,
      reviewedResponses: 100,
      correctResponses: 100,
      answerableCases: 100,
      retrievedCases: 100,
      criticalErrors: 0,
      deterministicPassed: true,
      p95Ms: 1000,
      reviewedBy: actor.userId,
      createdAt: new Date().toISOString(),
    })
    await repo.updatePolicy(policy, 0, actor.userId, new Date())
    const editorial = new KbService(kb, () => new Date(), randomUUID)
    const article = await editorial.create(actor, {
      title: 'Blocos do Estúdio',
      content: 'Abra o Estúdio e escolha o bloco de movimento para mover o personagem.',
      audience: 'customer_all',
      product: 'studio',
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    const indexing = await kb.claimIndex(new Date(), 60000)
    if (!indexing?.indexLeaseToken) throw new Error('No index claim')
    await kb.finishIndex(
      indexing.id,
      indexing.indexLeaseToken,
      chunkKnowledge(indexing.id, indexing.content, randomUUID),
      new Date(),
    )
    await editorial.publish(actor, article.id, {
      revisionId: indexing.id,
      version: article.version,
    })
    const [found] = await kb.search(
      {
        query: 'Como usar o bloco de movimento?',
        audience: 'customer_adult',
        product: 'studio',
        limit: 6,
      },
      new Date(),
    )
    if (!found) throw new Error('Fixture source not indexed')
    source = found
  })
  afterAll(async () => {
    await db.close()
    await second.close()
  })
  const create = (idempotencyKey = randomUUID()) =>
    portal.create(owner, {
      idempotencyKey,
      subject: 'Blocos do Estúdio',
      body: 'Como usar o bloco de movimento?',
      category: 'studio',
      portal: 'adult',
    })
  async function claim() {
    const result = await repo.claim(new Date())
    if (!result) throw new Error('Missing automation job')
    return result
  }
  const run = (
    ticketId: string,
    generation: number,
    purpose: 'automatic' | 'shadow' = 'automatic',
  ): AiRunView => ({
    id: randomUUID(),
    ticketId,
    generation,
    purpose,
    audience: 'customer_adult',
    product: 'studio',
    promptVersion: 'knowledge-answer-1',
    status: 'completed',
    coverage: 'covered',
    reply: 'Abra o Estúdio e escolha o bloco de movimento.',
    reason: 'supported',
    clarification: false,
    evidence: [source],
    attempts: [],
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  })

  it('retry do cliente mantém uma mensagem, geração e job', async () => {
    const key = randomUUID()
    const [first, replay] = await Promise.all([create(key), create(key)])
    expect(replay.ticket.id).toBe(first.ticket.id)
    expect(replay.message.id).toBe(first.message.id)
    const [counts] =
      await db.sql`select (select count(*) from helpdesk.tickets)::int as tickets,(select count(*) from helpdesk.ticket_messages)::int as messages,(select count(*) from helpdesk.automation_jobs)::int as jobs`
    expect(counts).toMatchObject({ tickets: 1, messages: 1, jobs: 1 })
    const collision = await portal
      .create(owner, {
        idempotencyKey: key,
        subject: 'Outro assunto',
        body: 'Outro texto',
        category: 'studio',
        portal: 'adult',
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(collision).toBeInstanceOf(Error)
  })
  it('duas réplicas não reivindicam nem publicam a mesma geração duas vezes', async () => {
    const created = await create()
    const claims = await Promise.all([repo.claim(new Date()), other.claim(new Date())])
    expect(claims.filter(Boolean)).toHaveLength(1)
    const selected = claims.find((value) => value !== null)
    if (!selected) throw new Error('No claim')
    const response = run(created.ticket.id, selected.job.generation)
    const outcomes = await Promise.all([
      repo.complete(selected.job, response, new Date()),
      other.complete(selected.job, response, new Date()),
    ])
    expect(outcomes.sort()).toEqual(['published', 'superseded'])
    expect(
      (await messages.byTicketId(created.ticket.id)).filter((m) => m.sentVia === 'ai'),
    ).toHaveLength(1)
    expect((await tickets.byId(created.ticket.id))?.status).toBe('waiting')
    const [outbox] =
      await db.sql`select count(*)::int as count from helpdesk.portal_notification_outbox`
    expect(outbox?.count).toBe(0)
  })
  it('novo inbound invalida a geração em voo e retry não cria outro inbound', async () => {
    const created = await create()
    const { job } = await claim()
    const key = randomUUID()
    const first = await portal.addMessage(
      owner,
      created.ticket.id,
      'Tenho outra dúvida sobre o bloco',
      key,
    )
    const replay = await portal.addMessage(
      owner,
      created.ticket.id,
      'Tenho outra dúvida sobre o bloco',
      key,
    )
    expect(first.message.id).toBe(replay.message.id)
    expect(await repo.complete(job, run(created.ticket.id, job.generation), new Date())).toBe(
      'superseded',
    )
    expect((await tickets.byId(created.ticket.id))?.aiGeneration).toBe(job.generation + 1)
  })
  it('nota durante inferência assume o ticket e impede a publicação posterior', async () => {
    const created = await create()
    const llm = new PausedLlm(source)
    const answers = new KnowledgeAnswerService(
      llm,
      kb,
      new DrizzleAiRunRepository(db.db),
      12000,
      () => new Date(),
      randomUUID,
    )
    const worker = new AutomationWorker(repo, answers, messages, () => new Date(), logger)
    const work = worker.runOnce()
    await llm.started.promise
    await tickets.appendNote(
      makeMessage(created.ticket.id, {
        kind: 'note',
        visibility: 'internal',
        direction: null,
        sentVia: null,
        gmailMessageId: null,
      }),
      new Date(),
    )
    llm.proceed.release()
    await work
    const saved = await tickets.byId(created.ticket.id)
    expect(saved?.humanTakeover).toBe(true)
    expect(saved?.handlingMode).toBe('human')
    expect(
      (await messages.byTicketId(created.ticket.id)).filter((m) => m.sentVia === 'ai'),
    ).toHaveLength(0)
  })
  it('retirar uma fonte durante inferência transfere sem publicar', async () => {
    const created = await create()
    const llm = new PausedLlm(source)
    const answers = new KnowledgeAnswerService(
      llm,
      kb,
      new DrizzleAiRunRepository(db.db),
      12000,
      () => new Date(),
      randomUUID,
    )
    const worker = new AutomationWorker(repo, answers, messages, () => new Date(), logger)
    const work = worker.runOnce()
    await llm.started.promise
    const article = await kb.byId(source.articleId)
    if (!article) throw new Error('Missing article')
    await kb.withdraw(article.id, article.version, false, actor.userId, new Date())
    llm.proceed.release()
    await work
    expect((await tickets.byId(created.ticket.id))?.handoffReason).toBe('sources_changed')
    expect(
      (await messages.byTicketId(created.ticket.id)).filter((m) => m.sentVia === 'ai'),
    ).toHaveLength(0)
  })
  it('desligamento impede commit e watchdog transfere pendências', async () => {
    const created = await create()
    const { job } = await claim()
    await repo.updatePolicy({ ...policy, mode: 'off' }, 1, actor.userId, new Date())
    expect(await repo.complete(job, run(created.ticket.id, job.generation), new Date())).toBe(
      'superseded',
    )
    await repo.expire(new Date())
    expect((await tickets.byId(created.ticket.id))?.handoffReason).toBe('policy_changed')
  })
  it('lease vencido tem nova tentativa e token antigo não publica', async () => {
    const created = await create()
    const first = await claim()
    const reclaimed = await repo.claim(new Date(first.job.leaseExpiresAt.getTime() + 1))
    expect(reclaimed?.job.attempts).toBe(2)
    expect(
      await repo.complete(first.job, run(created.ticket.id, first.job.generation), new Date()),
    ).toBe('superseded')
    await repo.expire(new Date(first.job.deadlineAt.getTime() + 1))
    const saved = await tickets.byId(created.ticket.id)
    expect(saved?.status).toBe('open')
    expect(saved?.handoffReason).toBe('deadline')
    expect(saved?.humanSlaStartedAt).toEqual(saved?.automationStartedAt)
    expect(await repo.claim(new Date(first.job.deadlineAt.getTime() + 2))).toBeNull()
  })
  it('reserva desconhecida continua consumindo orçamento e reserva é idempotente', async () => {
    const changed = { ...policy, dailyBudgetMicros: 10000, evaluationId: randomUUID() }
    const report = (await repo.evaluations()).find((r) => r.id === policy.evaluationId)!
    await repo.saveEvaluation({
      ...report,
      id: changed.evaluationId,
      policyHash: automationPolicyHash(changed),
    })
    await repo.updatePolicy(changed, 1, actor.userId, new Date())
    await create()
    const first = await claim()
    expect(await repo.reserve(first.job, new Date())).toBe(true)
    expect(await repo.reserve(first.job, new Date())).toBe(true)
    await repo.reconcile(first.job, null, new Date())
    await create()
    const next = await claim()
    expect(await repo.reserve(next.job, new Date())).toBe(false)
    const usage = (await repo.policy(new Date())).usage
    expect(usage.reservedMicros).toBe(10000)
    expect(usage.unknownAttempts).toBe(1)
  })
  it('modo sombra nunca altera atendimento nem envia mensagem', async () => {
    await repo.updatePolicy({ ...policy, mode: 'shadow' }, 1, actor.userId, new Date())
    const created = await create()
    const { job } = await claim()
    expect(
      await repo.complete(job, run(created.ticket.id, job.generation, 'shadow'), new Date()),
    ).toBe('shadow')
    await portal.command(owner, created.ticket.id, 'handoff', randomUUID())
    expect((await repo.diagnostics(new Date())).handoffs).toHaveLength(0)
    expect((await tickets.byId(created.ticket.id))?.handlingMode).toBe('human')
    expect(
      (await messages.byTicketId(created.ticket.id)).filter((m) => m.sentVia === 'ai'),
    ).toHaveLength(0)
  })
  it('portal com thread Gmail continua exclusivamente humano', async () => {
    const ticket = makeTicket({
      source: 'portal',
      portal: 'adult',
      requesterAccountId: owner.accountId,
      category: 'studio',
    })
    const repository = new DrizzleCustomerTicketRepository(db.db)
    await repository.createWithInitialMessage({
      ticket,
      message: makeMessage(ticket.id),
      commandKey: randomUUID(),
      commandHash: 'legacy',
      aiEnabled: true,
    })
    expect(await repo.claim(new Date())).toBeNull()
    expect((await tickets.byId(ticket.id))?.handlingMode).toBe('human')
  })
  it('pedido humano interrompe imediatamente e novas mensagens continuam humanas', async () => {
    const created = await create()
    const { job } = await claim()
    await portal.addMessage(
      owner,
      created.ticket.id,
      'Quero falar com um atendente humano',
      randomUUID(),
    )
    expect(await repo.complete(job, run(created.ticket.id, job.generation), new Date())).toBe(
      'superseded',
    )
    expect((await tickets.byId(created.ticket.id))?.handoffReason).toBe('customer_requested')
    await portal.addMessage(
      owner,
      created.ticket.id,
      'Como usar o bloco de movimento?',
      randomUUID(),
    )
    expect(await repo.claim(new Date())).toBeNull()
  })
  it('limita respostas e não confunde aguardar cliente com resolução', async () => {
    const created = await create()
    for (let turn = 0; turn < 3; turn++) {
      const { job } = await claim()
      expect(await repo.complete(job, run(created.ticket.id, job.generation), new Date())).toBe(
        'published',
      )
      expect((await tickets.byId(created.ticket.id))?.resolvedAt).toBeNull()
      await portal.addMessage(
        owner,
        created.ticket.id,
        'Ainda tenho dúvida sobre o bloco de movimento',
        randomUUID(),
      )
    }
    const ticket = await tickets.byId(created.ticket.id)
    expect(ticket?.handlingMode).toBe('human')
    expect(ticket?.handoffReason).toBe('turn_limit')
    expect(
      (await messages.byTicketId(created.ticket.id)).filter((message) => message.sentVia === 'ai'),
    ).toHaveLength(3)
  })
  it('assumir atendimento é idempotente e preserva nome do responsável', async () => {
    const created = await create()
    const { job } = await claim()
    const key = randomUUID()
    const first = await repo.takeover(
      created.ticket.id,
      actor.userId,
      actor.displayName,
      created.ticket.version,
      key,
      new Date(),
    )
    const repeated = await repo.takeover(
      created.ticket.id,
      actor.userId,
      actor.displayName,
      created.ticket.version,
      key,
      new Date(),
    )
    expect(repeated?.version).toBe(first?.version)
    expect(first?.assignedToName).toBe(actor.displayName)
    expect(await repo.complete(job, run(created.ticket.id, job.generation), new Date())).toBe(
      'superseded',
    )
  })
  it('mudança de modelo após ativação bloqueia publicação mesmo sem mudar política', async () => {
    const created = await create()
    const { job } = await claim()
    const changedModel = new DrizzleAutomationRepository(second.db, 'different-model')
    expect(await changedModel.reserve(job, new Date())).toBe(false)
    expect(
      await changedModel.complete(job, run(created.ticket.id, job.generation), new Date()),
    ).toBe('superseded')
  })
  it('falha de provedor tem no máximo duas tentativas e termina em transferência', async () => {
    const created = await create()
    const first = await claim()
    await repo.fail(first.job, 'provider_failure', new Date())
    const secondAttempt = await repo.claim(new Date(Date.now() + 1500))
    if (!secondAttempt) throw new Error('Missing retry')
    expect(secondAttempt.job.attempts).toBe(2)
    await repo.fail(secondAttempt.job, 'provider_failure', new Date())
    expect((await tickets.byId(created.ticket.id))?.handoffReason).toBe('provider_failure')
    expect(await repo.claim(new Date(Date.now() + 3000))).toBeNull()
  })
  it('portal pagina por tupla estável, não expõe notas/entregas incertas e protege fontes', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    await repo.complete(job, run(ticket.id, job.generation), new Date())
    const detail = await portal.byId(owner, ticket.id)
    const bot = detail.messages.find((m) => m.authorKind === 'assistant')!
    expect(bot.citations).toHaveLength(1)
    const citation = bot.citations[0]!
    expect((await portal.source(owner, ticket.id, citation.id)).text).toContain('movimento')
    const stranger = await portal
      .source(
        { ...owner, accountId: randomUUID(), email: 'outro@example.test' },
        ticket.id,
        citation.id,
      )
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(stranger).toBeInstanceOf(Error)
    const at = new Date(Date.now() + 1000)
    for (let i = 0; i < 55; i++)
      await messages.create(
        makeMessage(ticket.id, { createdAt: at, kind: 'portal', gmailMessageId: null }),
      )
    await messages.create(
      makeMessage(ticket.id, {
        kind: 'note',
        visibility: 'internal',
        createdAt: at,
        gmailMessageId: null,
      }),
    )
    await messages.create(
      makeMessage(ticket.id, {
        direction: 'outbound',
        deliveryState: 'unknown',
        createdAt: at,
        gmailMessageId: null,
      }),
    )
    const first = await portal.byId(owner, ticket.id)
    expect(first.messages).toHaveLength(50)
    expect(first.hasOlder).toBe(true)
    const older = await portal.page(owner, ticket.id, { limit: 50, before: first.olderCursor! })
    expect(older.messages).toHaveLength(7)
    expect(new Set([...older.messages, ...first.messages].map((m) => m.id)).size).toBe(57)
    const after = await portal.page(owner, ticket.id, { limit: 50, after: detail.latestCursor! })
    expect(after.messages).toHaveLength(50)
    expect(after.hasMore).toBe(true)
    const article = await kb.byId(source.articleId)
    await kb.withdraw(source.articleId, article!.version, false, actor.userId, new Date())
    const unavailable = await portal.source(owner, ticket.id, citation.id).then(
      () => null,
      (e: unknown) => e,
    )
    expect(unavailable).toBeInstanceOf(Error)
  })
  it('confirmação explícita é idempotente e reabertura continua humana', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    await repo.complete(job, run(ticket.id, job.generation), new Date())
    expect((await tickets.byId(ticket.id))?.resolvedAt).toBeNull()
    const key = randomUUID()
    await Promise.all([
      portal.command(owner, ticket.id, 'resolve', key),
      portal.command(owner, ticket.id, 'resolve', key),
    ])
    expect((await tickets.byId(ticket.id))?.status).toBe('resolved')
    await portal.addMessage(owner, ticket.id, 'Ainda preciso de ajuda', randomUUID())
    const reopened = await tickets.byId(ticket.id)
    expect(reopened?.status).toBe('open')
    expect(reopened?.handlingMode).toBe('human')
    expect(reopened?.humanTakeover).toBe(true)
    const events =
      await db.sql`select kind, automated from helpdesk.resolution_events where ticket_id=${ticket.id} order by created_at`
    expect(events.map((e) => e.kind)).toEqual(['confirmed', 'reopened'])
    expect(events[0]?.automated).toBe(true)
  })
  it('transferência solicitada em voo bloqueia publicação e preserva SLA no próximo inbound', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    const key = randomUUID()
    await portal.command(owner, ticket.id, 'handoff', key)
    const human = await tickets.byId(ticket.id)
    await portal.command(owner, ticket.id, 'handoff', key)
    expect((await tickets.byId(ticket.id))?.version).toBe(human?.version)
    await portal.addMessage(owner, ticket.id, 'Mais um detalhe', randomUUID())
    expect((await tickets.byId(ticket.id))?.humanSlaStartedAt).toEqual(human?.automationStartedAt)
    expect(await repo.complete(job, run(ticket.id, job.generation), new Date())).toBe('superseded')
  })
  it('diagnóstico distingue confirmação, espera e custo desconhecido', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    await repo.reserve(job, new Date())
    await repo.complete(job, run(ticket.id, job.generation), new Date())
    const pending = await repo.diagnostics(new Date())
    expect(pending.cycles.awaiting_confirmation).toBe(1)
    expect(pending.cycles.confirmed).toBe(0)
    await portal.command(owner, ticket.id, 'resolve', randomUUID())
    const confirmed = await repo.diagnostics(new Date())
    expect(confirmed.cycles.confirmed).toBe(1)
    expect(confirmed.cycles.matured).toBe(0)
    expect(confirmed.cycles.durable).toBe(0)
    expect((await repo.policy(new Date())).usage.unknownAttempts).toBe(1)
  })
  it('contabiliza a transferência após resposta concluída uma única vez', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    await repo.complete(job, run(ticket.id, job.generation), new Date())
    await portal.command(owner, ticket.id, 'handoff', randomUUID())
    await portal.command(owner, ticket.id, 'handoff', randomUUID())
    const diagnostics = await repo.diagnostics(new Date())
    expect(diagnostics.handoffs).toEqual([
      { reason: 'customer_requested', count: 1, p95Ms: expect.any(Number) },
    ])
    await messages.create(
      makeMessage(ticket.id, {
        kind: 'portal',
        direction: 'outbound',
        visibility: 'customer',
        sentVia: 'human',
        gmailMessageId: null,
        gmailInternalDate: null,
        createdAt: new Date(Date.now() + 1000),
      }),
    )
    expect((await repo.diagnostics(new Date())).latency.human_response_samples).toBe(1)
  })
  for (const action of ['patch', 'note', 'takeover'] as const) {
    it(`registra a transferência por ${action} depois de concluída a inferência`, async () => {
      const { ticket } = await create(),
        { job } = await claim()
      await repo.complete(job, run(ticket.id, job.generation), new Date())
      const current = (await tickets.byId(ticket.id))!
      expect(
        await tickets.patch(ticket.id, current.version - 1, { status: 'open' }, new Date()),
      ).toBeNull()
      expect((await repo.diagnostics(new Date())).handoffs).toHaveLength(0)
      if (action === 'patch')
        await tickets.patch(ticket.id, current.version, { status: 'open' }, new Date())
      if (action === 'takeover')
        await repo.takeover(
          ticket.id,
          actor.userId,
          actor.displayName,
          current.version,
          randomUUID(),
          new Date(),
        )
      if (action === 'note')
        await tickets.appendNote(
          makeMessage(ticket.id, {
            kind: 'note',
            visibility: 'internal',
            direction: null,
            sentVia: null,
            gmailMessageId: null,
          }),
          new Date(),
        )
      // Subsequent staff activity is not a second transfer.
      await tickets.appendNote(
        makeMessage(ticket.id, {
          kind: 'note',
          visibility: 'internal',
          direction: null,
          sentVia: null,
          gmailMessageId: null,
        }),
        new Date(),
      )
      expect((await repo.diagnostics(new Date())).handoffs).toEqual([
        { reason: 'staff_intervention', count: 1, p95Ms: expect.any(Number) },
      ])
    })
  }
  it('reabertura pela equipe invalida a resolução durável automatizada', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    await repo.complete(job, run(ticket.id, job.generation), new Date())
    await portal.command(owner, ticket.id, 'resolve', randomUUID())
    const resolved = (await tickets.byId(ticket.id))!
    await tickets.patch(
      ticket.id,
      resolved.version,
      { status: 'open', resolvedAt: null },
      new Date(),
    )
    const diagnostics = await repo.diagnostics(new Date(Date.now() + 8 * 86400000))
    expect(diagnostics.cycles).toMatchObject({ confirmed: 1, reopened: 1, matured: 1, durable: 0 })
    expect(diagnostics.handoffs).toHaveLength(0)
  })
  it('reserva revalida o prazo após adquirir os locks', async () => {
    await create()
    const { job } = await claim()
    const expired = new Date(Date.now() - 1000)
    await db.sql`update helpdesk.automation_evaluations set detail=jsonb_set(detail,'{evaluatedAt}',to_jsonb(${new Date(expired.getTime() - 60000).toISOString()}::text)) where id=${policy.evaluationId!}`
    await db.sql`update helpdesk.automation_jobs set lease_expires_at=${expired.toISOString()}, deadline_at=${expired.toISOString()} where id=${job.id}`
    expect(await repo.reserve(job, new Date(expired.getTime() - 1000))).toBe(false)
    expect((await repo.policy(new Date())).usage.reservedMicros).toBe(0)
  })
  it('claim não reativa job cujo prazo venceu durante a espera pelo lock', async () => {
    const { ticket } = await create()
    const expired = new Date(Date.now() - 1000)
    await db.sql`update helpdesk.automation_evaluations set detail=jsonb_set(detail,'{evaluatedAt}',to_jsonb(${new Date(expired.getTime() - 60000).toISOString()}::text)) where id=${policy.evaluationId!}`
    await db.sql`update helpdesk.automation_jobs set created_at=${new Date(expired.getTime() - 60000).toISOString()}, next_at=${new Date(expired.getTime() - 60000).toISOString()}, deadline_at=${expired.toISOString()} where ticket_id=${ticket.id}`
    expect(await repo.claim(new Date(expired.getTime() - 1000))).toBeNull()
    expect((await tickets.byId(ticket.id))?.handlingMode).toBe('human')
  })
  it('configuração alterada exige nova avaliação antes de reivindicar piloto', async () => {
    await repo.updatePolicy({ ...policy, dailyBudgetMicros: 200000 }, 1, actor.userId, new Date())
    await create()
    expect(await repo.claim(new Date())).toBeNull()
  })
  it('ordem incremental segue gravação e não a data antiga da mensagem', async () => {
    const { ticket } = await create()
    const initial = await portal.byId(owner, ticket.id)
    const old = makeMessage(ticket.id, {
      kind: 'portal',
      createdAt: new Date('2020-01-01'),
      gmailMessageId: null,
    })
    await messages.create(old)
    const page = await portal.page(owner, ticket.id, { limit: 50, after: initial.latestCursor! })
    expect(page.messages.map((m) => m.id)).toEqual([old.id])
  })
  it('SLA humano e SQL conservam a origem da espera após transferência', async () => {
    const { ticket } = await create()
    const anchor = new Date(Date.now() - 13 * 3600000)
    await db.sql`update helpdesk.tickets set automation_started_at=${anchor.toISOString()} where id=${ticket.id}`
    await portal.command(owner, ticket.id, 'handoff', randomUUID())
    await portal.addMessage(owner, ticket.id, 'Mais contexto sobre o bloco', randomUUID())
    const saved = (await tickets.byId(ticket.id))!
    expect(ticketSla(saved, new Date())?.state).toBe('breached')
    const list = await tickets.list(
      { limit: 50, cursor: null, sla: 'breached', handlingMode: 'human' },
      new Date(),
    )
    expect(list.items.map((t) => t.id)).toContain(ticket.id)
    expect((await tickets.stats(new Date())).sla.breached).toBe(1)
  })

  it('retenção expurga derivados e comandos antigos sem apagar job ativo', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    const result = run(ticket.id, job.generation)
    await new DrizzleAiRunRepository(db.db).create(result)
    await repo.complete(job, result, new Date())
    await portal.command(owner, ticket.id, 'handoff', randomUUID())
    expect((await repo.diagnostics(new Date())).handoffs).toHaveLength(1)
    await db.sql`update helpdesk.tickets set ai_draft_run_id=${result.id},ai_draft='derivado sintético',ai_summary='resumo sintético',ai_summary_at=${new Date().toISOString()} where id=${ticket.id}`
    await create()
    await db.sql.begin((tx) => pruneAiData(tx, new Date(Date.now() + 91 * 86400000), 30))
    const [counts] =
      await db.sql`select (select count(*) from helpdesk.automation_jobs)::int as jobs,(select count(*) from helpdesk.ai_runs)::int as runs,(select count(*) from helpdesk.customer_commands)::int as commands`
    expect(counts).toEqual({ jobs: 1, runs: 0, commands: 0 })
    const [handoffs] = await db.sql`select count(*)::int as count from helpdesk.automation_handoffs`
    expect(handoffs?.count).toBe(0)
    expect((await tickets.byId(ticket.id))?.aiDraft).toBeNull()
    expect((await tickets.byId(ticket.id))?.aiSummary).toBeNull()
    expect((await repo.policy(new Date())).policy.evaluationId).toBe(policy.evaluationId)
    expect((await repo.evaluations()).some((r) => r.id === policy.evaluationId)).toBe(true)
  })
  it('segundo esclarecimento transfere em vez de prolongar a automação', async () => {
    const { ticket } = await create(),
      first = await claim()
    expect(
      await repo.complete(
        first.job,
        { ...run(ticket.id, first.job.generation), clarification: true, reason: 'clarification' },
        new Date(),
      ),
    ).toBe('published')
    await portal.addMessage(owner, ticket.id, 'O bloco é de movimento', randomUUID())
    const second = await claim()
    expect(
      await repo.complete(
        second.job,
        { ...run(ticket.id, second.job.generation), clarification: true, reason: 'clarification' },
        new Date(),
      ),
    ).toBe('handoff')
    expect((await tickets.byId(ticket.id))?.automationClarifications).toBe(1)
  })
  it('publicador recusa esclarecimento com flag inconsistente', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    expect(
      await repo.complete(
        job,
        { ...run(ticket.id, job.generation), reason: 'clarification', clarification: false },
        new Date(),
      ),
    ).toBe('handoff')
    expect((await tickets.byId(ticket.id))?.handoffReason).toBe('invalid_evidence')
    expect((await messages.byTicketId(ticket.id)).some((m) => m.sentVia === 'ai')).toBe(false)
  })
  it('mudança de público ou vencimento da revisão impede publicação', async () => {
    const { ticket } = await create(),
      { job } = await claim()
    await db.sql`update helpdesk.kb_revisions set audience='customer_parent' where id=${source.revisionId}`
    expect(await repo.complete(job, run(ticket.id, job.generation), new Date())).toBe('handoff')
    const next = await create(),
      nextClaim = await claim()
    await db.sql`update helpdesk.kb_revisions set audience='customer_all',valid_until=${new Date(Date.now() - 1000).toISOString()} where id=${source.revisionId}`
    expect(
      await repo.complete(nextClaim.job, run(next.ticket.id, nextClaim.job.generation), new Date()),
    ).toBe('handoff')
    expect((await messages.byTicketId(next.ticket.id)).some((m) => m.sentVia === 'ai')).toBe(false)
  })

  it('resposta humana durante inferência vence e cria somente o aviso humano', async () => {
    const { ticket } = await create()
    const llm = new PausedLlm(source)
    const answers = new KnowledgeAnswerService(
      llm,
      kb,
      new DrizzleAiRunRepository(db.db),
      12000,
      () => new Date(),
      randomUUID,
    )
    const worker = new AutomationWorker(repo, answers, messages, () => new Date(), logger)
    const work = worker.runOnce()
    await llm.started.promise
    const at = new Date(),
      message = makeMessage(ticket.id, {
        kind: 'portal',
        direction: 'outbound',
        sentVia: 'human',
        gmailInternalDate: null,
        gmailMessageId: null,
        createdAt: at,
      })
    const notification = {
      id: randomUUID(),
      ticketId: ticket.id,
      messageId: message.id,
      payload: {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Sintético', email: owner.email },
        variables: { saudacao: 'Olá', assunto: 'Ajuda', link: 'https://example.test/ajuda' },
        idempotencyKey: `helpdesk-reply:${message.id}`,
      },
      status: 'pending' as const,
      attempts: 0,
      nextAttemptAt: at,
      leaseExpiresAt: null,
      lastError: null,
      sentAt: null,
      createdAt: at,
      updatedAt: at,
    }
    const human = await new DrizzleReplyDeliveryRepository(db.db).appendPortalReply({
      ticketId: ticket.id,
      expectedVersion: ticket.version,
      message,
      notification,
      at,
    })
    expect(human.status).toBe('created')
    llm.proceed.release()
    await work
    expect((await messages.byTicketId(ticket.id)).filter((m) => m.sentVia === 'ai')).toHaveLength(0)
    const [count] =
      await db.sql`select count(*)::int as count from helpdesk.portal_notification_outbox where ticket_id=${ticket.id}`
    expect(count?.count).toBe(1)
    expect((await tickets.byId(ticket.id))?.handlingMode).toBe('human')
    const diagnostics = await repo.diagnostics(new Date())
    expect(diagnostics.handoffs).toEqual([
      { reason: 'staff_intervention', count: 1, p95Ms: expect.any(Number) },
    ])
    expect(diagnostics.latency.human_response_samples).toBe(1)
  })
})
