import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { LivePublicationService } from '../../members/src/application/live/live-publication.service'

mock.module('server-only', () => ({}))
const actualStorage = await import('../src/server/r2')
const objects = new Map<string, Buffer>()
const { createStudioRoutes } = await import('../src/routes/studio')
afterEach(() => {
  objects.clear()
  mock.restore()
})

test.each([
  false,
  true,
])('a committed Mural post retains its playable file after timeout and retry (legacy=%s)', async (legacy) => {
  spyOn(actualStorage, 'r2CreateObjectPrivate').mockImplementation(async (input) => {
    if (objects.has(input.key)) return false
    objects.set(input.key, Buffer.from(input.body))
    return true
  })
  spyOn(actualStorage, 'r2HeadObjectPrivate').mockImplementation(async (key) =>
    objects.has(key)
      ? { contentType: 'application/json', contentLength: objects.get(key)!.length, etag: 'test' }
      : null,
  )
  spyOn(actualStorage, 'r2GetObjectPrivate').mockImplementation(async (key) => ({
    body: new Blob([new Uint8Array(objects.get(key)!)]).stream(),
    contentType: 'application/json',
    contentLength: objects.get(key)!.length,
  }))
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
  let canonicalThread: { id: string; playId: string; status: 'visible' } | undefined = legacy
    ? { id: randomUUID(), playId: randomUUID(), status: 'visible' }
    : undefined
  if (canonicalThread)
    objects.set(`studio/play/${canonicalThread.playId}.json`, Buffer.from('{"legacy":"original"}'))
  const reservationId = randomUUID()
  let preparations = 0
  const sent: string[] = []
  const routes = createStudioRoutes({
    media: {
      requireUploadSession: async () => ({
        id: actor.id,
        activeProfile: { accountId: actor.accountId },
      }),
    },
    members: {
      getLiveShowcasePayload: async (id: string, revision: number, key: string) => ({
        status: 200,
        body: await publication.prepare(actor, id, revision, key),
      }),
    },
    hub: {
      prepareShowcaseThreadStudioStandalone: async (input: {
        snapshotHash: string
        liveWorkspace: { playId: string }
      }) => {
        preparations++
        if (preparations === 3) return { status: 403, body: { error: { code: 'FORBIDDEN' } } }
        if (legacy && preparations === 1)
          return { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } }
        return {
          status: 200,
          body: canonicalThread
            ? { state: 'finalized', thread: canonicalThread }
            : {
                state: 'reserved',
                reservationId,
                playId: input.liveWorkspace.playId,
                snapshotHash: input.snapshotHash,
              },
        }
      },
      createShowcaseThreadStudioStandalone: async (input: { playId: string }) => {
        canonicalThread ??= { id: randomUUID(), playId: input.playId, status: 'visible' }
        sent.push(input.playId)
        // Hub commits, but the response is lost. A later request deduplicates the post.
        if (sent.length === 1)
          return { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } }
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
  expect(objects.has(key)).toBe(true)
  const afterFirst = new Map(objects)
  expect((await routes.studioPublishStandalone.POST(await request())).status).toBe(200)
  expect(sent).toHaveLength(legacy ? 0 : 1)
  expect(objects.has(key)).toBe(true)
  expect(objects).toEqual(afterFirst)
  // A rejected retry also cannot prove the file is unreferenced.
  expect((await routes.studioPublishStandalone.POST(await request())).status).toBe(403)
  expect(objects.has(key)).toBe(true)
  expect(objects).toEqual(afterFirst)
})
