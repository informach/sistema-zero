import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { KnowledgeAnswerService } from '../../src/application/ai/knowledge-answer.service'
import { DrizzleAiRunRepository } from '../../src/infrastructure/persistence/drizzle/ai-run.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { FakeLlmClient } from '../fakes/ai'
import { TEST_EVIDENCE } from '../fakes/answers'

const url = process.env.HELPDESK_TEST_DATABASE_URL
if (url && !/helpdesk_test/i.test(url)) throw new Error('Use banco descartável helpdesk_test')
const suite = url ? describe : describe.skip
suite('Execuções no PostgreSQL', () => {
  let db: DbConnection
  beforeAll(() => {
    if (url) db = createDbConnection(url)
  })
  afterAll(async () => {
    await db.close()
  })
  it('persiste tentativas, cobertura, evidência e expurga os dados derivados', async () => {
    const repo = new DrizzleAiRunRepository(db.db)
    const llm = new FakeLlmClient()
    llm.queue = [
      {
        reply: 'Veja a orientação de acesso.',
        kbCoverage: 'covered',
        citationIds: [TEST_EVIDENCE.chunkId],
        clarification: false,
        reason: 'supported',
      },
    ]
    const service = new KnowledgeAnswerService(
      llm,
      { search: async () => [TEST_EVIDENCE] },
      repo,
      12000,
      () => new Date(),
      randomUUID,
    )
    const run = await service.answer({
      query: 'acesso',
      thread: 'acesso',
      audience: 'customer_adult',
      product: 'community',
      limit: 6,
      purpose: 'test',
      ticketId: null,
      generation: null,
    })
    const stored = await repo.byId(run.id)
    expect(stored?.evidence[0]?.revisionId).toBe(TEST_EVIDENCE.revisionId)
    expect(stored?.attempts[0]?.costUsd).toBeNull()
    expect(stored?.status).toBe('completed')
    expect(await repo.purge(new Date(Date.now() + 1000))).toBeGreaterThan(0)
    expect(await repo.byId(run.id)).toBeNull()
  })
})
