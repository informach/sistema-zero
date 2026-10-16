import { describe, expect, it } from 'bun:test'
import type { ClassifyResult } from '../../src/application/ai/prompts'
import { LlmError } from '../../src/domain/ports/llm-client.port'
import { buildTestApp, json, makeMessage, makeTicket, request, type TestApp } from '../helpers'

const CLS: ClassifyResult = {
  category: 'pagamento_reembolso',
  priority: 'alta',
  confidence: 0.95,
  sentiment: 'irritado',
  flags: { reembolso: true, juridico: false },
  summary: 'Cliente pede reembolso da compra.',
}
const DRAFT = {
  citationIds: ['11111111-1111-4111-8111-111111111111'],
  clarification: false,
  reason: 'supported',
  reply: 'Entendo, vou verificar o reembolso.',
  kbCoverage: 'partial',
}

async function seedTicket(t: TestApp): Promise<string> {
  const ticket = makeTicket({ subject: 'Quero reembolso', aiStatus: 'pending' })
  await t.repos.tickets.create(ticket)
  await t.repos.messages.create(
    makeMessage(ticket.id, { bodyText: 'Quero meu dinheiro de volta.' }),
  )
  return ticket.id
}

describe('IA on-demand', () => {
  it('mantém autoria do draft efetivamente enviado e recusa referência de outro ticket', async () => {
    const t = buildTestApp()
    const ticket = makeTicket({ source: 'portal', gmailThreadId: null, portal: 'adult' })
    await t.repos.tickets.create(ticket)
    await t.repos.messages.create(makeMessage(ticket.id))
    t.llm.queue = [DRAFT]
    const generated = await json(
      await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/draft/regenerate`),
    )
    const other = makeTicket({ source: 'portal', gmailThreadId: null })
    await t.repos.tickets.create(other)
    const denied = await request(t.app, 'POST', `/helpdesk/tickets/${other.id}/reply`, {
      body: { body: DRAFT.reply, version: other.version, draftRunId: generated.aiDraftRunId },
    })
    expect(denied.status).toBe(409)
    const sent = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: {
        body: `${DRAFT.reply} Texto revisado.`,
        version: ticket.version,
        draftRunId: generated.aiDraftRunId,
      },
    })
    expect(sent.status).toBe(200)
    const messages = await t.repos.messages.byTicketId(ticket.id)
    const outbound = messages.find((message) => message.direction === 'outbound')
    expect(outbound?.aiRunId).toBe(generated.aiDraftRunId)
    expect(outbound?.draftEdited).toBe(true)
  })
  it('POST summarize classifica e resume', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const id = await seedTicket(t)
    t.llm.queue = [CLS]
    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/summarize`)
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.category).toBe('pagamento_reembolso')
    expect(body.priority).toBe('alta')
    expect(body.aiSummary).toBe('Cliente pede reembolso da compra.')
    expect(body.aiStatus).toBe('done')
  })

  it('POST draft/regenerate gera o rascunho', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const id = await seedTicket(t)
    t.llm.queue = [DRAFT]
    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/draft/regenerate`)
    expect(res.status).toBe(200)
    expect((await json(res)).aiDraft).toBe('Entendo, vou verificar o reembolso.')
  })

  it('sem IA configurada → 503 AI_NOT_CONFIGURED', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const id = await seedTicket(t)
    t.llm.configured = false
    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/summarize`)
    expect(res.status).toBe(503)
    expect((await json(res)).error.code).toBe('AI_NOT_CONFIGURED')
  })

  it('IA indisponível → 502 AI_UNAVAILABLE', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const id = await seedTicket(t)
    t.llm.error = new LlmError('upstream 500', 'unavailable')
    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/summarize`)
    expect(res.status).toBe(502)
    expect((await json(res)).error.code).toBe('AI_UNAVAILABLE')
  })

  it('ticket inexistente → 404', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    t.llm.queue = [CLS]
    const res = await request(
      t.app,
      'POST',
      '/helpdesk/tickets/99999999-9999-4999-8999-999999999999/summarize',
    )
    expect(res.status).toBe(404)
  })
})
