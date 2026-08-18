import { beforeEach, describe, expect, mock, test } from 'bun:test'

const scheduled: Array<() => void | Promise<void>> = []
const actualNextServer = await import('next/server')
mock.module('next/server', () => ({
  ...actualNextServer,
  after: (callback: () => void | Promise<void>) => scheduled.push(callback),
}))

// mock.module NÃO é isolado por arquivo (e no Linux/CI a chave de path casa entre
// arquivos, ao contrário do Windows) — um stub INCOMPLETO de '@/server/zappy-knowledge'
// vazava para zappy-backfill/zappy-knowledge.test.ts e apagava backfillZappyKnowledge/
// extractPdfText (undefined → 3 falhas SÓ no CI). Espalhamos os exports REAIS e
// sobrescrevemos só o que este teste precisa, para o vazamento ser inócuo.
mock.module('server-only', () => ({}))
const actualZappyKnowledge = await import('@/server/zappy-knowledge')
// Mesmo motivo do spread acima, sentido inverso: este stub ESTREITO de
// '@/server/members' vazava para os testes das rotas de entrega e apagava
// getStudioSubmissionPrevious/restoreStudioSubmissionPrevious — o import nomeado
// de previous/route.ts morria com SyntaxError SÓ no CI (a ordem de arquivos do
// Linux registra este mock antes daquele arquivo linkar o módulo).
const actualMembers = await import('@/server/members')

let syncCalls = 0

mock.module('@/server/members', () => ({
  ...actualMembers,
  updateBlock: async () => ({
    status: 200,
    body: {
      id: 'block-1',
      lessonId: 'lesson-1',
      blockRevision: 'revision-1',
      content: { kind: 'rich_text' },
    },
  }),
  createBlock: async () => ({
    status: 201,
    body: {
      id: 'block-created',
      lessonId: 'lesson-1',
      blockRevision: 'revision-created',
      content: { kind: 'video' },
    },
  }),
  deleteBlock: async () => ({ status: 200, body: { ok: true } }),
}))
mock.module('@/server/zappy-knowledge', () => ({
  ...actualZappyKnowledge,
  syncZappyKnowledgeForBlock: async () => {
    syncCalls += 1
    throw new Error('index indisponível')
  },
  deleteZappyKnowledgeForBlock: async () => undefined,
}))
mock.module('@/server/forward', () => ({
  forwardUpstream: ({ status, body }: { status: number; body: unknown }) =>
    Response.json(body, { status }),
}))

const { PATCH } = await import('../src/app/api/members/blocks/[id]/route')
const { POST } = await import('../src/app/api/members/lessons/[id]/blocks/route')

beforeEach(() => {
  scheduled.length = 0
  syncCalls = 0
})

describe('sincronização do conhecimento após autoria', () => {
  test('atualização responde como pendente antes de iniciar a extração', async () => {
    const response = await PATCH(
      new Request('https://admin.test/api/members/blocks/block-1', {
        method: 'PATCH',
        body: JSON.stringify({ content: { kind: 'rich_text', html: '<p>Novo</p>' } }),
      }),
      { params: Promise.resolve({ id: 'block-1' }) },
    )

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ zappyKnowledgeStatus: 'pending' })
    expect(syncCalls).toBe(0)
    expect(scheduled).toHaveLength(1)

    await expect(scheduled[0]?.()).resolves.toBeUndefined()
    expect(syncCalls).toBe(1)
  })

  test('criação também retira a extração pesada do caminho da resposta', async () => {
    const response = await POST(
      new Request('https://admin.test/api/members/lessons/lesson-1/blocks', {
        method: 'POST',
        body: JSON.stringify({ content: { kind: 'video' } }),
      }),
      { params: Promise.resolve({ id: 'lesson-1' }) },
    )

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ zappyKnowledgeStatus: 'pending' })
    expect(syncCalls).toBe(0)
    expect(scheduled).toHaveLength(1)
  })
})
