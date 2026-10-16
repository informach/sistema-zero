import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { KnowledgeEvidence } from '@sistemazero/helpdesk-contracts'
import { KnowledgeAnswerService } from '../../src/application/ai/knowledge-answer.service'
import { LlmError } from '../../src/domain/ports/llm-client.port'
import { FakeLlmClient } from '../fakes/ai'
import { InMemoryAiRunRepository } from '../fakes/ai-runs'
import { TEST_EVIDENCE } from '../fakes/answers'

const input = {
  query: 'Como acessar?',
  thread: 'Cliente: como acessar?',
  audience: 'customer_adult',
  product: 'community',
  limit: 6,
  ticketId: null,
  generation: null,
  purpose: 'test',
} as const
function build(sources: KnowledgeEvidence[] = [TEST_EVIDENCE], budget = 12000) {
  const llm = new FakeLlmClient()
  const runs = new InMemoryAiRunRepository()
  const service = new KnowledgeAnswerService(
    llm,
    { search: async () => sources },
    runs,
    budget,
    () => new Date(),
    randomUUID,
  )
  return { llm, runs, service }
}
const response = {
  reply: 'A equipe pode ajudar no acesso.',
  kbCoverage: 'covered',
  citationIds: [TEST_EVIDENCE.chunkId],
  clarification: false,
  reason: 'supported',
}
describe('Respostas com evidência', () => {
  it('sem fonte não chama o provedor e registra lacuna', async () => {
    const { service, llm, runs } = build([])
    const run = await service.answer(input)
    expect(run.coverage).toBe('not_covered')
    expect(run.reply).toBeNull()
    expect(llm.calls).toHaveLength(0)
    expect((await runs.gaps(10))[0]?.runId).toBe(run.id)
  })
  it('rejeita citação inventada mesmo com declaração de cobertura', async () => {
    const { service, llm } = build()
    llm.queue = [{ ...response, citationIds: [randomUUID()] }]
    const run = await service.answer(input)
    expect(run.reply).toBeNull()
    expect(run.coverage).toBe('not_covered')
    expect(run.reason).toBe('invalid_evidence')
  })
  it('não inventa custo zero e persiste fontes com revisão', async () => {
    const { service, llm, runs } = build()
    llm.queue = [response]
    const run = await service.answer(input)
    expect(run.coverage).toBe('covered')
    expect(run.attempts[0]?.costUsd).toBeNull()
    expect((await runs.byId(run.id))?.evidence).toEqual([TEST_EVIDENCE])
  })
  it('não corta um trecho para caber no orçamento', async () => {
    const { service, llm } = build([TEST_EVIDENCE], 20)
    const run = await service.answer(input)
    expect(run.evidence).toHaveLength(0)
    expect(llm.calls).toHaveLength(0)
  })
  it('persiste falha sem conteúdo do erro do provedor', async () => {
    const { service, llm, runs } = build()
    llm.error = new LlmError('segredo e mensagem privada', 'unavailable')
    const outcome = await service.answer(input).then(
      () => null,
      (error: unknown) => error,
    )
    expect(outcome).toBeInstanceOf(LlmError)
    const [run] = runs.items.values()
    expect(run?.status).toBe('failed')
    expect(run?.reason).toBe('provider_failure')
    expect(JSON.stringify(run)).not.toContain('segredo')
  })
  it('não aceita feedback associado a outro ticket', async () => {
    const { service, llm, runs } = build()
    llm.queue = [response]
    const run = await service.answer({
      ...input,
      ticketId: randomUUID(),
      purpose: 'copilot',
      generation: 1,
    })
    expect(
      await runs.feedback({
        runId: run.id,
        ticketId: randomUUID(),
        actorId: randomUUID(),
        kind: 'rejected',
        reason: 'Fonte insuficiente',
        at: new Date(),
      }),
    ).toBe(false)
  })
})
