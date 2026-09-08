import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const scheduled: Array<() => Promise<void>> = []
const nextServer = await import('next/server')
mock.module('next/server', () => ({
  ...nextServer,
  after: (work: () => Promise<void>) => scheduled.push(work),
}))
const writes: string[] = []
let importStatus = 200
let failSource = false
const gateway = await import('../../src/server/gateway')
mock.module('@/server/gateway', () => ({
  ...gateway,
  gatewayFetch: async (path: string, options?: { body?: { sourceRef?: string } }) => {
    if (path.endsWith('/import-learning'))
      return {
        status: importStatus,
        body:
          importStatus === 200
            ? {
                ok: true,
                blocks: [
                  { id: 'new', action: 'create' },
                  { id: 'retained', action: 'preserve' },
                  { id: 'video', action: 'preserve' },
                ],
              }
            : { error: { code: 'LEARNING_CONFLICT', message: 'Recarregue' } },
      }
    if (path.endsWith('/content'))
      return {
        status: 200,
        body: {
          blocks: [
            {
              id: 'new',
              lessonId: 'lesson',
              blockRevision: 'new-revision',
              content: { kind: 'rich_text', markdown: 'Gravidade muda a velocidade.' },
            },
            {
              id: 'retained',
              lessonId: 'lesson',
              blockRevision: 'retained-revision',
              content: { kind: 'rich_text', markdown: 'Texto preservado.' },
            },
            {
              id: 'video',
              lessonId: 'lesson',
              blockRevision: 'video-revision',
              content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
            },
          ],
        },
      }
    if (path.endsWith('/sources')) {
      writes.push(options?.body?.sourceRef ?? '')
      return { status: failSource ? 503 : 200, body: { ok: !failSource } }
    }
    throw new Error(`Unexpected call: ${path}`)
  },
}))
const { POST } = await import('../../src/app/api/members/lessons/[id]/import-learning/route')
const request = () =>
  POST(
    new Request('https://admin.test/api/members/lessons/lesson/import-learning', {
      method: 'POST',
      body: JSON.stringify({ document: {}, expectedFingerprint: 'fixture' }),
    }),
    { params: Promise.resolve({ id: 'lesson' }) },
  )

describe('imported lesson knowledge sync', () => {
  test('schedules imported text synchronization and leaves existing Vimeo media alone', async () => {
    const response = await request()
    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ ok: true, zappyKnowledgeStatus: 'pending' })
    expect(writes).toEqual([])
    expect(scheduled).toHaveLength(1)
    await scheduled.shift()?.()
    expect(writes.sort()).toEqual(['block:new', 'block:retained'])
  })
  test('a rejected import never schedules indexing', async () => {
    importStatus = 409
    expect((await request()).status).toBe(409)
    expect(scheduled).toHaveLength(0)
  })
  test('indexing failure never rolls back the import or prevents other sources from being processed', async () => {
    importStatus = 200
    failSource = true
    writes.length = 0
    expect((await request()).status).toBe(202)
    await expect(scheduled.shift()?.()).resolves.toBeUndefined()
    expect(writes.sort()).toEqual(['block:new', 'block:retained'])
  })
})
