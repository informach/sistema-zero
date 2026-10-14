import { afterEach, expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { LivePublicationService } from '../../members/src/application/live/live-publication.service'

mock.module('server-only', () => ({}))
const actualStorage = await import('../src/server/r2')
const objects = new Map<string, unknown>()
mock.module('../src/server/r2', () => ({
  ...actualStorage,
  r2PutObjectPrivate: async (input: { key: string; body: unknown }) => {
    objects.set(input.key, input.body)
  },
  r2DeleteObjectPrivate: async (key: string) => {
    objects.delete(key)
  },
}))
const { createStudioRoutes } = await import('../src/routes/studio')
afterEach(() => objects.clear())

test.each([
  false,
  true,
])('a committed Mural post retains its playable file after timeout and retry (legacy=%s)', async (legacy) => {
  const workspaceId = randomUUID(),
    requestId = randomUUID()
  const actor = { id: randomUUID(), accountId: randomUUID(), name: 'Criadora', staff: false }
  const publication = new LivePublicationService(
    {
      showcaseSnapshot: async () => ({
        workspaceId,
        revision: 1,
        project: createBlankProjectSnapshot(workspaceId, 'Jogo'),
        title: 'Jogo',
      }),
    },
    'publication-test-secret-at-least-32-characters',
  )
  let canonicalThread: { id: string; playId: string } | undefined = legacy
    ? { id: randomUUID(), playId: randomUUID() }
    : undefined
  const sent: string[] = []
  const routes = createStudioRoutes({
    media: { requireUploadSession: async () => ({ id: actor.id }) },
    members: {
      getLiveShowcasePayload: async (id: string, revision: number, key: string) => ({
        status: 200,
        body: await publication.prepare(actor, id, revision, key),
      }),
    },
    hub: {
      createShowcaseThreadStudioStandalone: async (input: { playId: string }) => {
        canonicalThread ??= { id: randomUUID(), playId: input.playId }
        sent.push(input.playId)
        // Hub commits, but the response is lost. A later request deduplicates the post.
        if (sent.length === 1)
          return { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } }
        if (sent.length === 3) return { status: 403, body: { error: { code: 'FORBIDDEN' } } }
        return { status: 200, body: { thread: canonicalThread, deduped: true } }
      },
    },
  } as any)
  async function request() {
    const form = new FormData()
    form.set('liveWorkspaceId', workspaceId)
    form.set('liveRevision', '1')
    form.set('clientIdempotencyKey', requestId)
    form.set('title', 'Jogo')
    form.set('description', 'Minha criação')
    const req = new Request('https://kids.example/api/studio/publish-standalone', {
      method: 'POST',
      body: form,
    })
    req.headers.set('content-length', String((await req.clone().arrayBuffer()).byteLength))
    return req
  }
  expect((await routes.studioPublishStandalone.POST(await request())).status).toBe(503)
  expect(canonicalThread).toBeDefined()
  const key = `studio/play/${canonicalThread!.playId}.json`
  if (!legacy) expect(objects.has(key)).toBe(true)
  expect((await routes.studioPublishStandalone.POST(await request())).status).toBe(200)
  expect(new Set(sent).size).toBe(1)
  expect(objects.has(key)).toBe(true)
  expect(objects.size).toBe(1)
  // A rejected retry also cannot prove the file is unreferenced.
  expect((await routes.studioPublishStandalone.POST(await request())).status).toBe(403)
  expect(objects.has(key)).toBe(true)
})
