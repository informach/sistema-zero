import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { StudioProPublication } from '@sistemazero/core/studio'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'publication-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const storage = await import('../src/server/r2')
const optimizer = await import('../src/server/image-optimizer')
const { createStudioRoutes } = await import('../src/routes/studio')
const originalFetch = globalThis.fetch
afterEach(() => {
  mock.restore()
  globalThis.fetch = originalFetch
})

function fixture(
  options: {
    compiled?: boolean
    publishEnabled?: boolean
    entitled?: boolean
    hubFirstFailure?: boolean
  } = {},
) {
  spyOn(optimizer, 'optimizeImage').mockImplementation(async () => ({
    buffer: Buffer.from('cover'),
    contentType: 'image/webp',
    extension: 'webp',
    width: 1,
    height: 1,
    sizeBytes: 5,
  }))
  spyOn(storage, 'r2PutObject').mockImplementation(async (input) => ({
    key: input.key,
    url: `https://images.test/${input.key}`,
  }))
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'runtime-secret-fixture',
    STUDIO_PRO_KITS_PUBLISH: options.publishEnabled === false ? '' : 'canvas-survival',
  })
  const objects = new Map<string, Uint8Array>()
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    objects.set(input.key, new Uint8Array(input.body))
  })
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (key) => {
    const bytes = objects.get(key)
    if (!bytes) throw new Error('Missing object')
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  const project = {
    ...createBlankProjectSnapshot('publication-fixture', 'Ilha'),
    kind: 'pro',
    mode: 'code',
    tree: { 'index.html': { kind: 'file', content: '<main>Olá</main>' } },
    proMeta: {
      templateId: 'canvas-survival',
      devScript: 'dev',
      assistance: { version: 1, briefing: 'private learner decision' },
      publication: { playId: crypto.randomUUID() },
      origin: { projectId: 'private-original', revision: 1 },
    },
  }
  const owner = crypto.randomUUID(),
    requestId = crypto.randomUUID()
  let state: StudioProPublication | null = null,
    source = '',
    visible = true,
    builds = 0,
    hubCalls = 0
  const artifact = {
    id: 'a'.repeat(64),
    url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
    sha256: 'b'.repeat(64),
    expiresAt: Date.now() + 60_000,
  }
  const validation = { profileVersion: 1 as const, runtimeFingerprint: '1'.repeat(64) }
  const fetcher = mock(async (url: RequestInfo | URL, init?: RequestInit) => {
    const input = JSON.parse(String(init?.body))
    if (String(url).endsWith('/v1/build')) {
      builds++
      expect(input.validate).toBe(true)
      if (options.compiled === false)
        return Response.json({ ok: false, message: 'Erro no jogo' }, { status: 422 })
      return Response.json({
        ok: true,
        artifact,
        validation,
        evidence: ['types', 'build', 'playtest', 'capture'].map((kind) => ({
          kind,
          status: 'passed',
          detail: 'Verified fixture',
          ...(kind === 'capture'
            ? { artifactUrl: new URL('__studio-proof.png', artifact.url).href }
            : {}),
        })),
      })
    }
    expect(String(url)).toEndWith('/v1/publications')
    if (input.operation === 'cover') return Response.json({ png: 'iVBORw0KGgo=' })
    if (input.operation === 'lookup')
      return Response.json(state && input.requestId === requestId ? state : null)
    if (input.operation === 'get') return Response.json(state)
    if (input.operation === 'resolve')
      return Response.json(state ? { source, publication: state } : null)
    if (input.operation === 'promote') {
      source = input.source
      state = {
        playId: input.playId,
        version: 1,
        activeRevision: 'c'.repeat(64),
        disabled: false,
        revisions: [
          {
            id: 'c'.repeat(64),
            sourceHash: createHash('sha256').update(source).digest('hex'),
            artifactHash: artifact.sha256,
            createdAt: Date.now(),
            validation,
          },
        ],
      }
      return Response.json(state)
    }
    throw new Error(`Unexpected command ${input.operation}`)
  })
  globalThis.fetch = Object.assign(fetcher, { preconnect: originalFetch.preconnect })
  const routes = createStudioRoutes({
    media: {
      requireUploadSession: async () => ({ id: owner, activeProfile: { accountId: owner } }),
    },
    members: {
      checkStudioAccess: async () => ({
        status: 200,
        body: { access: { 'estudio-completo': options.entitled !== false } },
      }),
    },
    hub: {
      createShowcaseThreadStudioStandalone: async (input: { playId: string }) => {
        hubCalls++
        expect(state?.playId).toBe(input.playId)
        return hubCalls === 1 && options.hubFirstFailure
          ? { status: 503, body: null }
          : {
              status: 200,
              body: {
                thread: { id: crypto.randomUUID(), playId: input.playId },
                deduped: hubCalls > 1,
              },
            }
      },
      resolveStudioPlay: async () => ({ status: 200, body: { visible, authorDisplayName: 'Ana' } }),
    },
  } as never)
  async function publish() {
    const form = new FormData()
    form.set('title', 'Ilha')
    form.set('description', 'Minha ilha')
    form.set('clientIdempotencyKey', requestId)
    form.set('project', new File([JSON.stringify(project)], 'project.json'))
    const request = new Request('https://kids.test/api/studio/publish-standalone', {
      method: 'POST',
      body: form,
    })
    request.headers.set('Content-Length', String((await request.clone().arrayBuffer()).byteLength))
    return routes.studioPublishStandalone.POST(request)
  }
  return {
    routes,
    publish,
    builds: () => builds,
    hubCalls: () => hubCalls,
    objects,
    state: () => state,
    hide: () => {
      visible = false
    },
  }
}

test('Pro publication validates before creating the Mural post and resolves a permanent revision for play/remix', async () => {
  const f = fixture()
  const response = await f.publish()
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.playUrl).toBe(`/jogar/${body.publicationId}`)
  expect(f.builds()).toBe(1)
  const play = await f.routes.studioPlay.GET(
    new Request(`https://kids.test/api/studio/play/${body.publicationId}`),
    { params: Promise.resolve({ id: body.publicationId }) },
  )
  expect(play.status).toBe(200)
  expect(play.headers.get('X-Studio-Pro-Url')).toBe(
    `https://runtime.test/v1/published/${body.publicationId}/${'c'.repeat(64)}/index.html`,
  )
  const publicProject = await play.json()
  expect(publicProject).toMatchObject({
    kind: 'pro',
    tree: { 'index.html': { content: '<main>Olá</main>' } },
  })
  expect(publicProject.proMeta).toEqual({ templateId: 'canvas-survival', devScript: 'dev' })
  expect(JSON.stringify(publicProject)).not.toContain('private learner')
  f.hide()
  expect(
    (
      await f.routes.studioPlay.GET(new Request('https://kids.test/'), {
        params: Promise.resolve({ id: body.publicationId }),
      })
    ).status,
  ).toBe(404)
})

test('publication mutations reject browser-supplied ownership and oversized envelopes before runtime calls', async () => {
  const f = fixture()
  const request = (body: unknown) =>
    new Request('https://kids.test/api/studio/publication', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  expect(
    (
      await f.routes.studioPublication.POST(
        request({ operation: 'get', playId: crypto.randomUUID(), owner: 'forged' }),
      )
    ).status,
  ).toBe(400)
  expect(
    (
      await f.routes.studioPublication.POST(
        request({
          operation: 'update',
          playId: crypto.randomUUID(),
          requestId: crypto.randomUUID(),
          expectedVersion: 1,
          project: { content: 'x'.repeat(6 * 1024 * 1024 + 32768) },
        }),
      )
    ).status,
  ).toBe(413)
  expect(f.builds()).toBe(0)
  expect(f.state()).toBeNull()
})

test('M3, entitlement and failed validation prevent any post or playable pointer', async () => {
  for (const options of [{ publishEnabled: false }, { entitled: false }, { compiled: false }]) {
    const f = fixture(options)
    expect((await f.publish()).status).toBe(
      options.compiled === false ? 422 : options.entitled === false ? 403 : 503,
    )
    expect(f.objects.size).toBe(0)
    expect(f.hubCalls()).toBe(0)
    expect(f.state()).toBeNull()
    mock.restore()
  }
})

test('a lost Hub response retries the same permanent publication without compiling again', async () => {
  const f = fixture({ hubFirstFailure: true })
  expect((await f.publish()).status).toBe(503)
  expect((await f.publish()).status).toBe(200)
  expect(f.builds()).toBe(1)
  expect(f.objects.size).toBe(1)
})

test('the runtime visibility callback requires its bearer, checks the Hub and never counts a play', async () => {
  const f = fixture()
  const request = (token: string) =>
    new Request('https://kids.test/api/internal/studio-play', {
      method: 'POST',
      headers: { Authorization: token },
      body: JSON.stringify({ playId: crypto.randomUUID() }),
    })
  expect((await f.routes.studioPublicationAuthorize.POST(request(''))).status).toBe(401)
  expect(
    await (
      await f.routes.studioPublicationAuthorize.POST(request('Bearer runtime-secret-fixture'))
    ).json(),
  ).toEqual({ visible: true })
  f.hide()
  expect(
    await (
      await f.routes.studioPublicationAuthorize.POST(request('Bearer runtime-secret-fixture'))
    ).json(),
  ).toEqual({ visible: false })
})
