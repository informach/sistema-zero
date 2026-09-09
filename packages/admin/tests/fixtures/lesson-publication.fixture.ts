import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const scheduled: Array<() => void | Promise<void>> = []
const actualNextServer = await import('next/server')
mock.module('next/server', () => ({
  ...actualNextServer,
  after: (callback: () => void | Promise<void>) => scheduled.push(callback),
}))
const actualGateway = await import('@/server/gateway')
const actualMedia = await import('@/server/media')
const { MediaNotConfiguredError } = await import('@/server/r2')
const actualZappy = await import('@/server/zappy-knowledge')
const calls: Array<{ path: string; body: unknown }> = []
let published = false,
  processing = false,
  failMedia = false,
  syncCalls = 0,
  removedCalls = 0,
  statusCalls = 0
let revision = 'revision-1'
mock.module('@/server/gateway', () => ({
  ...actualGateway,
  gatewayFetch: async (path: string, options?: { method?: string; body?: unknown }) => {
    calls.push({ path, body: options?.body })
    if (path.endsWith('/draft') && options?.method === 'PATCH')
      return { status: 200, body: { revision: 'revision-2' } }
    if (path.endsWith('/draft'))
      return {
        status: 200,
        body: {
          revision,
          document: { plannedVideos: [{ videoId: '123456789', blockId: 'video' }] },
        },
      }
    if (path.endsWith('/content'))
      return {
        status: 200,
        body: {
          blocks: [
            {
              id: 'kept',
              kind: 'rich_text',
              content: { kind: 'rich_text', markdown: 'Publicado' },
            },
            ...(published ? [] : [{ id: 'removed', kind: 'video', content: { kind: 'video' } }]),
          ],
        },
      }
    if (path.endsWith('/publish')) {
      published = true
      return { status: 200, body: { revision: 'published-revision' } }
    }
    if (path.endsWith('/validate')) return { status: 200, body: [] }
    return { status: 404, body: null }
  },
}))
mock.module('@/server/media', () => ({
  ...actualMedia,
  requireMediaSession: async () => ({ id: 'author', role: 'admin' }),
  getVideoStatus: async () => {
    statusCalls++
    if (failMedia) throw new MediaNotConfiguredError('Vimeo indisponível')
    return {
      status: processing ? 'processing' : 'ready',
      embedUrl: 'https://player.vimeo.com/video/123456789',
      durationSeconds: 42,
      captions: [],
    }
  },
}))
mock.module('@/server/zappy-knowledge', () => ({
  ...actualZappy,
  syncZappyKnowledgeForBlock: async () => {
    syncCalls++
    throw new Error('index indisponível')
  },
  deleteZappyKnowledgeForBlock: async () => {
    removedCalls++
  },
}))
const { publishLessonDraft } = await import('../../src/server/lesson-draft-publication')
const { PATCH } = await import('../../src/app/api/members/lessons/[id]/draft/route')
const request = () =>
  new Request('https://admin.test/api/members/lessons/lesson-1/draft/publish', {
    method: 'POST',
    body: JSON.stringify({ expectedRevision: 'revision-1', operationId: 'operation-1' }),
  })
beforeEach(() => {
  scheduled.length = 0
  calls.length = 0
  published = false
  processing = false
  failMedia = false
  syncCalls = 0
  removedCalls = 0
  statusCalls = 0
  revision = 'revision-1'
})
describe('publication, Vimeo readiness and Zappy synchronization', () => {
  test('autosave never schedules indexing', async () => {
    const response = await PATCH(
      new Request('https://admin.test/draft', { method: 'PATCH', body: '{}' }),
      { params: Promise.resolve({ id: 'lesson-1' }) },
    )
    expect(response.status).toBe(200)
    expect(scheduled).toHaveLength(0)
  })
  test('publication confirms Vimeo on the server and defers indexing and archived-source removal', async () => {
    const response = await publishLessonDraft(request(), 'lesson-1', 'publish')
    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ zappyKnowledgeStatus: 'pending' })
    expect(calls.find((c) => c.path.endsWith('/publish'))?.body).toMatchObject({
      readyVideoIds: ['123456789'],
    })
    expect(syncCalls).toBe(0)
    expect(scheduled).toHaveLength(1)
    await scheduled[0]?.()
    expect(syncCalls).toBe(1)
    expect(removedCalls).toBe(1)
  })
  test('upload completion alone cannot attest video readiness', async () => {
    processing = true
    const response = await publishLessonDraft(request(), 'lesson-1', 'validate')
    expect(response.status).toBe(200)
    expect(calls.find((c) => c.path.endsWith('/validate'))?.body).toMatchObject({
      readyVideoIds: [],
    })
    expect(scheduled).toHaveLength(0)
  })
  test('Vimeo lookup failure stops publication', async () => {
    failMedia = true
    const response = await publishLessonDraft(request(), 'lesson-1', 'publish')
    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(calls.some((c) => c.path.endsWith('/publish'))).toBe(false)
    expect(scheduled).toHaveLength(0)
  })
  test('a lost publication response can reach the operation ledger without trusting another draft revision', async () => {
    revision = 'published-revision'
    const response = await publishLessonDraft(request(), 'lesson-1', 'publish')
    expect(response.status).toBe(202)
    expect(statusCalls).toBe(0)
    expect(calls.find((c) => c.path.endsWith('/publish'))?.body).toMatchObject({
      expectedRevision: 'revision-1',
      operationId: 'operation-1',
      readyVideoIds: [],
    })
  })
})
