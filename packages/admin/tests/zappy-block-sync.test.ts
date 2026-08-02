import { describe, expect, mock, test } from 'bun:test'

// mock.module NÃO é isolado por arquivo (e no Linux/CI a chave de path casa entre
// arquivos, ao contrário do Windows) — um stub INCOMPLETO de '@/server/zappy-knowledge'
// vazava para zappy-backfill/zappy-knowledge.test.ts e apagava backfillZappyKnowledge/
// extractPdfText (undefined → 3 falhas SÓ no CI). Espalhamos os exports REAIS e
// sobrescrevemos só o que este teste precisa, para o vazamento ser inócuo.
mock.module('server-only', () => ({}))
const actualZappyKnowledge = await import('@/server/zappy-knowledge')

mock.module('@/server/members', () => ({
  updateBlock: async () => ({
    status: 200,
    body: { id: 'block-1', lessonId: 'lesson-1', content: { kind: 'rich_text' } },
  }),
  deleteBlock: async () => ({ status: 200, body: { ok: true } }),
}))
mock.module('@/server/zappy-knowledge', () => ({
  ...actualZappyKnowledge,
  syncZappyKnowledgeForBlock: async () => {
    throw new Error('index indisponível')
  },
  deleteZappyKnowledgeForBlock: async () => undefined,
}))
mock.module('@/server/forward', () => ({
  forwardUpstream: ({ status, body }: { status: number; body: unknown }) =>
    Response.json(body, { status }),
}))

const { PATCH } = await import('../src/app/api/members/blocks/[id]/route')

describe('sincronização do conhecimento após autoria', () => {
  test('expõe estado pendente sem fingir que a indexação terminou', async () => {
    const response = await PATCH(
      new Request('https://admin.test/api/members/blocks/block-1', {
        method: 'PATCH',
        body: JSON.stringify({ content: { kind: 'rich_text', html: '<p>Novo</p>' } }),
      }),
      { params: Promise.resolve({ id: 'block-1' }) },
    )

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ zappyKnowledgeStatus: 'pending' })
  })
})
