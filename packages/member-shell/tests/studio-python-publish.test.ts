import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { creatorJourneyLevel } from '@sistemazero/core/journey'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import type {
  StudioFreeRuntimeRequest,
  StudioLessonRuntimeRequest,
  StudioLivePublicationRuntimeRequest,
  StudioPublicRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { AuthorizeFreeRuntimeService } from '../../members/src/application/studio/authorize-free-runtime.service'
import { AuthorizeLessonRuntimeService } from '../../members/src/application/studio/authorize-lesson-runtime.service'
import { AuthorizeLivePublicationRuntimeService } from '../../members/src/application/studio/authorize-live-publication-runtime.service'
import { AuthorizePublicRuntimeService } from '../../members/src/application/studio/authorize-public-runtime.service'
import { FreeStudioAccessService } from '../../members/src/application/studio/free-studio-access.service'
import { emptyQualifyingByTier } from '../../members/src/domain/gamification/levels'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import {
  currentPublishedPublication,
  currentPublishedSource,
  PublicationError,
  publicationCommand,
} from '../../studio-runtime/src/publications'
import { memoryArtifactBucket } from '../../studio-runtime/tests/artifact-bucket'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'python-publish-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const storage = await import('../src/server/r2')
const { createStudioRoutes } = await import('../src/routes/studio')
const originalFetch = globalThis.fetch
afterEach(() => {
  mock.restore()
  globalThis.fetch = originalFetch
})

async function fixture(kind: 'classic' | 'pro', context: 'free' | 'lesson' | 'live') {
  const f = await authoringFixture('python', kind)
  const actor = {
    audience: 'kids' as const,
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    privileged: false,
    readOnly: false,
  }
  const lessonId = crypto.randomUUID(),
    blockId = crypto.randomUUID(),
    workspaceId = crypto.randomUUID()
  f.project.id =
    context === 'lesson'
      ? lessonStudioProjectId(blockId, actor.userId)
      : context === 'live'
        ? workspaceId
        : f.project.id
  const policy = await createStudioRuntimePolicy(
    f.configuration,
    createStudioRuntimeHosts(f.configuration.catalog, [
      { runtime: f.project.runtime, origin: 'https://runtime.test' },
    ]),
  )
  const state = {
    owned: context === 'free',
    allowed: true,
    visible: true,
    calls: [] as string[],
    posts: 0,
    liveRevision: 3,
    hubFirstFailure: false,
  }
  const free = new AuthorizeFreeRuntimeService(
    new FreeStudioAccessService(
      {
        async execute() {
          return {
            grants: [],
            communities: state.owned ? ['estudio-completo'] : [],
            hasMaster: false,
            hasMasterKids: false,
          }
        },
      },
      {
        async listQualifyingJourneySlots() {
          return Object.assign(emptyQualifyingByTier(), creatorJourneyLevel('god').requiredSlots)
        },
        async listStudioUnlocksByCourse() {
          return [{ courseId: 'course', blocks: [SERVER_BLOCK_CATALOG[0]!.type] }]
        },
      },
      {
        async listGrants() {
          return []
        },
      },
    ),
    policy,
    f.policy,
  )
  const baseline = {
    id: 'b'.repeat(64),
    blockId,
    lessonId,
    courseId: crypto.randomUUID(),
    bound: true,
    readOnly: false,
    configuration: {
      initialProject: f.project,
      pythonLevel: 3 as const,
      allowedModes: [f.project.mode],
    },
  }
  const lesson = new AuthorizeLessonRuntimeService(
    {
      async execute() {
        if (!state.allowed) throw new Error('Lesson not eligible')
        return baseline
      },
    },
    policy,
  )
  const live = new AuthorizeLivePublicationRuntimeService(
    {
      async showcaseSnapshot(_actor, id, revision) {
        if (!state.allowed || id !== workspaceId || revision !== state.liveRevision)
          throw new Error('Live revision changed')
        return { workspaceId, revision, project: structuredClone(f.project), title: 'Oficina' }
      },
    },
    policy,
  )
  const publicRuntime = new AuthorizePublicRuntimeService(policy)
  const bucket = memoryArtifactBucket()
  const objects = new Map<string, Uint8Array>()
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'runtime-test-token',
  })
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    objects.set(input.key, new Uint8Array(input.body))
  })
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (key) => {
    const bytes = objects.get(key)
    if (!bytes) throw new Error('Missing private game')
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  const upstream = mock(async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toBe('https://runtime.test/v1/publications')
    const input = JSON.parse(String(init?.body))
    state.calls.push(input.operation)
    try {
      return Response.json(
        input.operation === 'resolve'
          ? await currentPublishedSource(bucket.bucket, input.playId)
          : input.operation === 'resolve-metadata'
            ? await currentPublishedPublication(bucket.bucket, input.playId)
            : await publicationCommand(bucket.bucket, input),
      )
    } catch (error) {
      if (error instanceof PublicationError)
        return Response.json({ error: { message: error.message } }, { status: error.status })
      throw error
    }
  })
  globalThis.fetch = Object.assign(upstream, { preconnect: originalFetch.preconnect })
  const livePlayId = crypto.randomUUID()
  const post = async (input: { playId: string }) => {
    state.posts++
    if (state.posts === 1 && state.hubFirstFailure) return { status: 503, body: null }
    return {
      status: 200,
      body: { thread: { id: crypto.randomUUID(), playId: input.playId }, deduped: state.posts > 1 },
    }
  }
  const routes = createStudioRoutes({
    media: {
      requireUploadSession: async () => ({
        id: actor.userId,
        role: 'student',
        activeProfile: { accountId: actor.accountId },
      }),
    },
    members: {
      getGamification: async () => ({
        status: 200,
        body: { level: { slug: context === 'free' ? 'god' : 'noob' } },
      }),
      checkStudioAccess: async () => ({
        status: 200,
        body: { access: { 'estudio-completo': state.owned } },
      }),
      getOwnStudioSubmission: async () => ({
        status: 200,
        body: { project: structuredClone(f.project) },
      }),
      getShowcasePayload: async () => ({
        status: 200,
        body: { eligible: state.allowed, defaultCoverUrl: null },
      }),
      openLessonStudio: async () => ({ status: 200, body: baseline }),
      getLiveShowcasePayload: async () => ({
        status: 200,
        body: {
          eligible: state.allowed,
          project: structuredClone(f.project),
          playId: livePlayId,
          publicationToken: 'server-attested-fixture',
          revision: state.liveRevision,
        },
      }),
      authorizeFreeRuntime: async (input: StudioFreeRuntimeRequest) => {
        state.calls.push('authorize-free')
        return { status: 200, body: await free.execute(actor, input) }
      },
      authorizeLessonRuntime: async (
        _lesson: string,
        _block: string,
        input: StudioLessonRuntimeRequest,
      ) => {
        state.calls.push('authorize-lesson')
        return { status: 200, body: await lesson.execute(actor, { lessonId, blockId }, input) }
      },
      authorizeLivePublicationRuntime: async (
        _workspace: string,
        input: StudioLivePublicationRuntimeRequest,
      ) => {
        state.calls.push('authorize-live')
        return {
          status: 200,
          body: await live.execute(
            { id: actor.userId, accountId: actor.accountId, name: 'Ana', staff: false },
            input,
          ),
        }
      },
      authorizePublicRuntime: async (input: StudioPublicRuntimeRequest) => ({
        status: 200,
        body: await publicRuntime.execute(input),
      }),
    },
    hub: {
      createShowcaseThreadStudio: post,
      createShowcaseThreadStudioStandalone: post,
      resolveStudioPlay: async () => ({
        status: 200,
        body: { visible: state.visible, authorDisplayName: 'Ana' },
      }),
    },
  } as never)
  const requestId = crypto.randomUUID()
  const publish = async (uploadedProject: unknown = f.project) => {
    const form = new FormData()
    form.set('title', 'Meu jogo')
    form.set('description', 'Meu projeto Python')
    form.set('clientIdempotencyKey', requestId)
    form.set('project', new File([JSON.stringify(uploadedProject)], 'project.json'))
    if (context === 'lesson') {
      form.set('lessonId', lessonId)
      form.set('blockId', blockId)
    }
    if (context === 'live') {
      form.set('liveWorkspaceId', workspaceId)
      form.set('liveRevision', String(state.liveRevision))
    }
    const request = new Request('https://kids.test/api/studio/publish', {
      method: 'POST',
      body: form,
    })
    request.headers.set('Content-Length', String((await request.clone().arrayBuffer()).byteLength))
    return context === 'lesson'
      ? routes.studioPublish.POST(request)
      : routes.studioPublishStandalone.POST(request)
  }
  return { ...f, ...bucket, actor, state, routes, publish, objects, requestId }
}

for (const context of ['free', 'lesson', 'live'] as const)
  for (const kind of ['classic', 'pro'] as const)
    test(`${context} Python ${kind} publishes retained source with its own scope and opens an anonymous public game`, async () => {
      const f = await fixture(kind, context)
      const response = await f.publish(
        context === 'free'
          ? f.project
          : { programmingLanguage: 'javascript', files: { 'script.js': 'UNSENT_FORGERY' } },
      )
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.playUrl).toBe(`/jogar/${body.publicationId}`)
      expect(f.state.calls).toContain(`authorize-${context}`)
      if (context !== 'free') expect(f.state.calls).not.toContain('authorize-free')
      const retained = await currentPublishedSource(f.bucket, body.publicationId)
      expect(retained?.source).not.toContain('UNSENT_FORGERY')
      const play = await f.routes.studioPlay.GET(new Request('https://kids.test/'), {
        params: Promise.resolve({ id: body.publicationId }),
      })
      expect(play.status).toBe(200)
      expect(play.headers.get('X-Studio-Pro-Url')).toBeNull()
      expect(play.headers.get('X-Studio-Python-Revision')).toBe(
        retained?.publication.activeRevision ?? null,
      )
      expect(await play.json()).toMatchObject({ programmingLanguage: 'python', kind })
      const started = await f.routes.studioPublicRuntime.POST(
        new Request('https://kids.test/api/studio/public-runtime', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            playId: body.publicationId,
            publicationRevision: retained?.publication.activeRevision,
          }),
        }),
      )
      expect(started.status).toBe(200)
      expect(await started.json()).toMatchObject({ actor: null, capabilities: ['execute'] })
      expect(f.state.calls).not.toContain('cover')
    })

test('a lost Hub response retries the exact Python publication without adding a second retained revision', async () => {
  const f = await fixture('pro', 'free')
  f.state.hubFirstFailure = true
  expect((await f.publish()).status).toBe(503)
  const response = await f.publish()
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(
    (await currentPublishedSource(f.bucket, body.publicationId))?.publication.revisions,
  ).toHaveLength(1)
  expect(f.objects.size).toBe(1)
})

test('free Python publication separates the edited draft from public update, restore and disable', async () => {
  const f = await fixture('pro', 'free')
  if (f.project.programmingLanguage !== 'python' || f.project.kind !== 'pro')
    throw new Error('Python Pro fixture')
  const result = await (await f.publish()).json()
  const playId = result.publicationId as string
  const first = await currentPublishedSource(f.bucket, playId)
  const original = JSON.parse(first!.source).tree[f.project.python.entrypoint].content
  f.project.tree[f.project.python.entrypoint] = {
    kind: 'file',
    content: 'print("draft updated")\n',
  }
  expect(
    JSON.parse((await currentPublishedSource(f.bucket, playId))!.source).tree[
      f.project.python.entrypoint
    ].content,
  ).toBe(original)
  const mutation = (body: object) =>
    f.routes.studioPublication.POST(
      new Request('https://kids.test/api/studio/publication', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, playId, requestId: crypto.randomUUID() }),
      }),
    )
  const updatedResponse = await mutation({
    operation: 'update',
    expectedVersion: 1,
    project: f.project,
  })
  expect(updatedResponse.status).toBe(200)
  const updated = await updatedResponse.json()
  expect(updated.version).toBe(2)
  expect(updated.revisions).toHaveLength(2)
  const play = () =>
    f.routes.studioPlay.GET(new Request('https://kids.test/'), {
      params: Promise.resolve({ id: playId }),
    })
  expect((await (await play()).json()).tree[f.project.python.entrypoint].content).toBe(
    'print("draft updated")\n',
  )
  expect(
    (
      await mutation({
        operation: 'activate',
        expectedVersion: 2,
        revision: first!.publication.activeRevision,
        disabled: false,
      })
    ).status,
  ).toBe(200)
  expect((await (await play()).json()).tree[f.project.python.entrypoint].content).toBe(original)
  expect(
    (
      await mutation({
        operation: 'activate',
        expectedVersion: 3,
        revision: first!.publication.activeRevision,
        disabled: true,
      })
    ).status,
  ).toBe(200)
  expect((await play()).status).toBe(404)
  expect(await currentPublishedSource(f.bucket, playId)).toBeNull()
})
