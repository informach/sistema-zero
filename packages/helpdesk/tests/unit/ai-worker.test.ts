import { describe, expect, it } from 'bun:test'
import type { ClassifyResult, DraftResult } from '../../src/application/ai/prompts'
import { TicketAiService } from '../../src/application/ai/ticket-ai.service'
import { LlmError } from '../../src/domain/ports/llm-client.port'
import { AiWorker } from '../../src/infrastructure/workers/ai-worker'
import { FakeLlmClient } from '../fakes/ai'
import { InMemoryMessageRepository, InMemoryTicketRepository } from '../fakes/in-memory'
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
})
