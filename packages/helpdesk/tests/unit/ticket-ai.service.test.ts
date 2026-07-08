import { describe, expect, it } from 'bun:test'
import type { ClassifyResult, DraftResult } from '../../src/application/ai/prompts'
import { TicketAiService } from '../../src/application/ai/ticket-ai.service'
import { FakeLlmClient } from '../fakes/ai'
import { InMemoryMessageRepository, InMemoryTicketRepository } from '../fakes/in-memory'
import { makeMessage, makeTicket } from '../helpers'

const CLS: ClassifyResult = {
  category: 'curso_acesso',
  priority: 'normal',
  confidence: 0.9,
  sentiment: 'neutro',
  flags: { reembolso: false, juridico: false },
  summary: 'Cliente não consegue acessar o curso.',
}
const DRAFT: DraftResult = { reply: 'Oi, vou te ajudar com o acesso.', kbCoverage: 'covered' }

function build(llmConfigured = true) {
  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const llm = new FakeLlmClient()
  llm.configured = llmConfigured
  const service = new TicketAiService(
    llm,
    tickets,
    messages,
    async () => [],
    {
      maxThreadChars: 24_000,
    },
    () => new Date(),
  )
  return { tickets, messages, llm, service }
}

async function seed(
  tickets: InMemoryTicketRepository,
  messages: InMemoryMessageRepository,
  over = {},
) {
  const ticket = makeTicket({ aiStatus: 'pending', ...over })
  await tickets.create(ticket)
  await messages.create(makeMessage(ticket.id))
  return ticket.id
}

describe('TicketAiService', () => {
  it('summarize persiste categoria/prioridade/resumo e fecha em done', async () => {
    const { tickets, messages, llm, service } = build()
    const id = await seed(tickets, messages)
    llm.queue = [CLS]
    const view = await service.summarize(id)
    expect(view.category).toBe('curso_acesso')
    expect(view.aiSummary).toBe('Cliente não consegue acessar o curso.')
    const stored = await tickets.byId(id)
    expect(stored?.aiStatus).toBe('done')
    expect(stored?.priority).toBe('normal')
    expect(stored?.aiClassification?.sentiment).toBe('neutro')
  })

  it('NÃO sobrescreve categoria escolhida à mão', async () => {
    const { tickets, messages, llm, service } = build()
    const id = await seed(tickets, messages, { category: 'outro', categoryManual: true })
    llm.queue = [CLS]
    const view = await service.summarize(id)
    expect(view.category).toBe('outro') // manual preservada
    expect(view.aiSummary).toBe('Cliente não consegue acessar o curso.') // resumo atualiza
  })

  it('NÃO sobrescreve prioridade já definida', async () => {
    const { tickets, messages, llm, service } = build()
    const id = await seed(tickets, messages, { priority: 'alta' })
    llm.queue = [CLS]
    await service.summarize(id)
    expect((await tickets.byId(id))?.priority).toBe('alta')
  })

  it('regenerateDraft persiste o rascunho', async () => {
    const { tickets, messages, llm, service } = build()
    const id = await seed(tickets, messages)
    llm.queue = [DRAFT]
    const view = await service.regenerateDraft(id)
    expect(view.aiDraft).toBe('Oi, vou te ajudar com o acesso.')
    expect(view.aiStatus).toBe('done')
  })

  it('runPipeline classifica E rascunha (ordem classify→draft)', async () => {
    const { tickets, messages, llm, service } = build()
    const id = await seed(tickets, messages)
    const ticket = await tickets.byId(id)
    llm.queue = [CLS, DRAFT]
    const result = await service.runPipeline(ticket!)
    expect(result.classification.category).toBe('curso_acesso')
    expect(result.draft.reply).toBe('Oi, vou te ajudar com o acesso.')
    expect(llm.calls.map((c) => c.label)).toEqual(['classify', 'draft'])
    const stored = await tickets.byId(id)
    expect(stored?.aiSummary).toBe('Cliente não consegue acessar o curso.')
    expect(stored?.aiDraft).toBe('Oi, vou te ajudar com o acesso.')
  })

  it('sem IA configurada → AiNotConfiguredError', async () => {
    const { tickets, messages, service } = build(false)
    const id = await seed(tickets, messages)
    await expect(service.summarize(id)).rejects.toThrow('IA não configurada')
  })
})
