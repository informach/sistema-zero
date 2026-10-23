import { randomUUID } from 'node:crypto'
import type { KnowledgeEvidence } from '@sistemazero/helpdesk-contracts'
import { KnowledgeAnswerService } from '../../src/application/ai/knowledge-answer.service'
import type { LlmClient } from '../../src/domain/ports/llm-client.port'
import { InMemoryAiRunRepository } from './ai-runs'

export const TEST_CHUNK_ID = '11111111-1111-4111-8111-111111111111'
export const TEST_EVIDENCE: KnowledgeEvidence = {
  chunkId: TEST_CHUNK_ID,
  articleId: '22222222-2222-4222-8222-222222222222',
  revisionId: '33333333-3333-4333-8333-333333333333',
  revisionNumber: 1,
  title: 'Ajuda',
  section: 'Acesso',
  text: 'Orientação geral para acessar o curso. A equipe pode ajudar no acesso.',
  audience: 'customer_all',
  product: 'all',
}
export function testAnswers(llm: LlmClient) {
  return new KnowledgeAnswerService(
    llm,
    { search: async () => [TEST_EVIDENCE] },
    new InMemoryAiRunRepository(),
    12000,
    () => new Date(),
    randomUUID,
  )
}
