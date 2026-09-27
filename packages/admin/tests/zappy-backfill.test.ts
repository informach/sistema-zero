import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { ZAPPY_KNOWLEDGE_BACKFILL_BATCH_SIZE } from '@sistemazero/core/zappy'

mock.module('server-only', () => ({}))

let transcript: { lang: string; url: string; content: string } | null = null
const sourceWrites: unknown[] = []
const backfillRequests: unknown[] = []
// ⚠️⚠️ ESPALHE O MÓDULO REAL e troque só o necessário. O `mock.module` do bun é
// GLOBAL AO RUN: um mock parcial vaza para os arquivos seguintes, e quem importar
// um símbolo que ele não exporta quebra com `SyntaxError: Export named 'X' not
// found` — num arquivo distante, conforme a ORDEM. Listar "a superfície que as
// outras suítes importam" não escala: toda função nova em `@/server/media` teria
// de ser lembrada aqui (foi o que aconteceu quando a animação Rive do módulo
// nasceu). Espalhar o real fecha a classe inteira do defeito.
// A env vai por `process.env` em vez de mock — assim `isProd` e o resto continuam
// reais (mesma receita de `fixtures/video-thumbnails.fixture.ts`).
process.env.JWT_HS256_SECRET ??= 'qa-admin-jwt-secret-0123456789'
process.env.R2_PUBLIC_URL = 'https://media.test'
const actualMedia = await import('@/server/media')
mock.module('@/server/media', () => ({
  ...actualMedia,
  syncVimeoTranscript: async () => transcript,
}))
const actualR2 = await import('@/server/r2')
mock.module('@/server/r2', () => ({
  ...actualR2,
  r2ReadPrivateObject: async () => new Uint8Array(),
  r2PresignGetUgc: async () => 'https://ugc.example.test/private-object',
}))
mock.module('@/server/gateway', () => ({
  gatewayFetch: async (path: string, options?: { body?: unknown }) => {
    if (path.endsWith('/backfill')) {
      backfillRequests.push(options?.body)
      return {
        status: 200,
        body: {
          indexed: 0,
          deleted: 0,
          nextCursor: null,
          done: true,
          pending: [
            {
              courseId: 'course-1',
              lessonId: 'lesson-1',
              sourceType: 'video-vtt',
              sourceRef: 'block:video-1',
              expectedBlockRevision: 'revision-video-1',
              extraction: { kind: 'vimeo', videoId: '123456789' },
            },
          ],
        },
      }
    }
    if (path.endsWith('/sources')) {
      sourceWrites.push(options?.body)
      return { status: 200, body: { ok: true } }
    }
    throw new Error(`chamada inesperada: ${path}`)
  },
}))

const { backfillZappyKnowledge } = await import('../src/server/zappy-knowledge')

beforeEach(() => {
  transcript = null
  sourceWrites.length = 0
  backfillRequests.length = 0
})

describe('backfill do conhecimento do Zappy', () => {
  test('recupera text track existente pela API Vimeo e indexa o conteúdo', async () => {
    transcript = {
      lang: 'pt-br',
      url: 'https://media.test/admin/captions/123456789-pt-br.vtt',
      content: 'WEBVTT\n\n00:00.000 --> 00:01.000\nOlá, criador!',
    }

    const result = await backfillZappyKnowledge()

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ extracted: 1, failed: 0, failures: [] })
    expect(sourceWrites).toContainEqual(
      expect.objectContaining({
        sourceRef: 'block:video-1',
        sourceType: 'video-vtt',
        expectedBlockRevision: 'revision-video-1',
        content: transcript.content,
      }),
    )
  })

  test('sem track retorna resultado parcial e erro operacional explícito', async () => {
    const result = await backfillZappyKnowledge()

    expect(result.status).toBe(207)
    expect(result.body).toMatchObject({
      extracted: 0,
      failed: 1,
      failures: [
        expect.objectContaining({
          sourceRef: 'block:video-1',
          error: 'Vimeo ainda não disponibilizou transcrição',
        }),
      ],
    })
  })

  test('processa um lote limitado e encaminha o cursor de retomada', async () => {
    const cursor = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e099'

    await backfillZappyKnowledge({ cursor })

    expect(backfillRequests).toEqual([{ cursor, limit: ZAPPY_KNOWLEDGE_BACKFILL_BATCH_SIZE }])
  })
})
