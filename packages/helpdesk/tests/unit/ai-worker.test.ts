import { describe, expect, it } from 'bun:test'
import type { ClassifyResult, DraftResult } from '../../src/application/ai/prompts'
import { TicketAiService } from '../../src/application/ai/ticket-ai.service'
import {
  type LlmClient,
  type LlmCompleteInput,
  LlmError,
} from '../../src/domain/ports/llm-client.port'
import { AiWorker } from '../../src/infrastructure/workers/ai-worker'
import { FakeLlmClient } from '../fakes/ai'
import {
  InMemoryMessageRepository,
  InMemoryTicketIngestionRepository,
  InMemoryTicketRepository,
} from '../fakes/in-memory'
import { makeMessage, makeTicket } from '../helpers'

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} }
const NOW = new Date('2026-07-08T12:00:00Z')

const CLS: ClassifyResult = {
  category: 'problema_tecnico',
  priority: 'alta',
  confidence: 0.8,
  sentiment: 'negativo',
  flags: { reembolso: false, juridico: false },
  summary: 'Vídeo não carrega no Estúdio.',
}
const DRAFT: DraftResult = { reply: 'Vamos resolver isso já.', kbCoverage: 'partial' }

class ControlledLlmClient implements LlmClient {
  private firstResolve: ((value: unknown) => void) | null = null
  private startedResolve: (() => void) | null = null
  private calls = 0

  isConfigured(): boolean {
    return true
  }

  complete<T>(_input: LlmCompleteInput<T>): Promise<T> {
    this.calls += 1
    if (this.calls > 1) return Promise.resolve(DRAFT as T)
    return new Promise<T>((resolve) => {
      this.firstResolve = resolve as (value: unknown) => void
      this.startedResolve?.()
    })
  }

  waitForCall(): Promise<void> {
    if (this.firstResolve) return Promise.resolve()
    return new Promise<void>((resolve) => {
      this.startedResolve = resolve
    })
  }

  resolveFirst(value: unknown): void {
    const resolve = this.firstResolve
    if (!resolve) throw new Error('Nenhuma chamada da IA aguardando resposta')
    this.firstResolve = null
    resolve(value)
  }
}

function build() {
  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const llm = new FakeLlmClient()
  const service = new TicketAiService(
    llm,
    tickets,
    messages,
    async () => [],
    {
      maxThreadChars: 24_000,
      maxKbChars: 12_000,
    },
    () => NOW,
  )
  const worker = new AiWorker({
    tickets,
    ticketAi: service,
    now: () => NOW,
    logger: silentLogger,
    config: { intervalMs: 15_000, leaseMs: 120_000, maxAttempts: 3 },
  })
  return { tickets, messages, llm, worker }
}

async function seedPending(
  tickets: InMemoryTicketRepository,
  messages: InMemoryMessageRepository,
  over = {},
) {
  const ticket = makeTicket({
    aiStatus: 'pending',
    aiNextAttemptAt: new Date(NOW.getTime() - 1000),
    ...over,
  })
  await tickets.create(ticket)
  await messages.create(makeMessage(ticket.id))
  return ticket.id
}

describe('AiWorker', () => {
  it('claima pending, roda o pipeline e fecha em done', async () => {
    const { tickets, messages, llm, worker } = build()
    const id = await seedPending(tickets, messages)
    llm.queue = [CLS, DRAFT]
    await worker.tick()
    const t = await tickets.byId(id)
    expect(t?.aiStatus).toBe('done')
    expect(t?.category).toBe('problema_tecnico')
    expect(t?.aiDraft).toBe('Vamos resolver isso já.')
    expect(t?.aiAttempts).toBe(0)
  })

  it('sem ticket pending → no-op', async () => {
    const { tickets, messages, worker } = build()
    await seedPending(tickets, messages, { aiStatus: 'done', aiNextAttemptAt: null })
    await worker.tick()
    // nada a asserir além de não lançar; a fila do llm ficou intacta
  })

  it('reclama um lease processing expirado depois de um crash do worker', async () => {
    const { tickets, messages, llm, worker } = build()
    const id = await seedPending(tickets, messages, {
      aiStatus: 'processing',
      aiNextAttemptAt: new Date(NOW.getTime() - 1000),
    })
    llm.queue = [CLS, DRAFT]

    await worker.tick()

    expect((await tickets.byId(id))?.aiStatus).toBe('done')
  })

  it('falha transitória com tentativas < teto → backoff (pending)', async () => {
    const { tickets, messages, llm, worker } = build()
    const id = await seedPending(tickets, messages)
    llm.error = new LlmError('upstream fora', 'unavailable')
    await worker.tick()
    const t = await tickets.byId(id)
    expect(t?.aiStatus).toBe('pending')
    expect(t?.aiLastError).toContain('upstream fora')
    expect(t?.aiNextAttemptAt?.getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('falha no teto de tentativas → failed', async () => {
    const { tickets, messages, llm, worker } = build()
    // aiAttempts=2 → o claim bumpa p/ 3 = maxAttempts → failed
    const id = await seedPending(tickets, messages, { aiAttempts: 2 })
    llm.error = new LlmError('modelo indisponível', 'unavailable')
    await worker.tick()
    const t = await tickets.byId(id)
    expect(t?.aiStatus).toBe('failed')
    expect(t?.aiLastError).toContain('modelo indisponível')
  })

  it('não persiste resultado antigo nem fecha a geração criada por um inbound concorrente', async () => {
    const tickets = new InMemoryTicketRepository()
    const messages = new InMemoryMessageRepository()
    const llm = new ControlledLlmClient()
    const service = new TicketAiService(
      llm,
      tickets,
      messages,
      async () => [],
      { maxThreadChars: 24_000, maxKbChars: 12_000 },
      () => NOW,
    )
    const worker = new AiWorker({
      tickets,
      ticketAi: service,
      now: () => NOW,
      logger: silentLogger,
      config: { intervalMs: 15_000, leaseMs: 120_000, maxAttempts: 3 },
    })
    const ticket = makeTicket({
      aiStatus: 'pending',
      aiNextAttemptAt: new Date(NOW.getTime() - 1000),
    })
    await tickets.create(ticket)
    await messages.create(makeMessage(ticket.id))

    const running = worker.tick()
    await llm.waitForCall()

    const inboundAt = new Date(NOW.getTime() + 60_000)
    const ingestion = new InMemoryTicketIngestionRepository(tickets, messages)
    await ingestion.ingest({
      ticket: makeTicket({ gmailThreadId: ticket.gmailThreadId }),
      message: {
        ...makeMessage(ticket.id, {
          gmailMessageId: 'gm-new-generation',
          createdAt: inboundAt,
          gmailInternalDate: inboundAt,
        }),
        gmailMessageId: 'gm-new-generation',
      },
      direction: 'inbound',
      aiEnabled: true,
      at: inboundAt,
    })

    llm.resolveFirst(CLS)
    await running

    expect(await tickets.byId(ticket.id)).toMatchObject({
      aiStatus: 'pending',
      aiSummary: null,
      aiDraft: null,
      aiAttempts: 0,
    })
  })
})
