import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { initialKidsJourneyPolicy, projectAdultJourney } from '@sistemazero/core/journey'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import {
  PYTHON_MOLDA_SCENE_FEATURE,
  PYTHON_PINTA_PHYSICS_FEATURE,
  PYTHON_PINTA_WORLD_FEATURE,
  type StudioPythonRuntimeFeature,
} from '@sistemazero/core/studio/python-runtime-features'
import type {
  StudioFreeRuntimeRequest,
  StudioLessonRuntimeRequest,
  StudioLivePublicationRuntimeRequest,
  StudioPublicRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import type { StudioProjectCapability } from '@sistemazero/core/studio/runtime-catalog'
import sharp from 'sharp'
import { KidsJourneyQueryService } from '../../members/src/application/kids-journey/kids-journey-query.service'
import { AuthorizeFreeRuntimeService } from '../../members/src/application/studio/authorize-free-runtime.service'
import { AuthorizeLessonRuntimeService } from '../../members/src/application/studio/authorize-lesson-runtime.service'
import { AuthorizeLivePublicationRuntimeService } from '../../members/src/application/studio/authorize-live-publication-runtime.service'
import { AuthorizePublicRuntimeService } from '../../members/src/application/studio/authorize-public-runtime.service'
import { FreeStudioAccessService } from '../../members/src/application/studio/free-studio-access.service'
import { InvalidContentCommandError } from '../../members/src/domain/course/course.errors'
import { AccessDeniedError } from '../../members/src/domain/entitlement/entitlement.errors'
import type { KidsJourneySnapshot } from '../../members/src/domain/ports/kids-journey-repository.port'
import { createStudioAuthoringPolicy } from '../../members/src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import {
  currentPublishedPublication,
  currentPublishedSource,
  PublicationError,
  publicationCommand,
  publishedStatus,
  purgePublication,
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

async function fixture(
  kind: 'classic' | 'pro',
  context: 'free' | 'lesson' | 'live',
  audience: 'kids' | 'adult' = 'kids',
  language: 'python' | 'javascript' = 'python',
  identity?: { userId: string; accountId: string; requestId: string; publicObjects: Set<string> },
  runtimeStatus: 'active' | 'retired' | 'revoked' = 'active',
  releaseCapabilities?: readonly StudioProjectCapability[],
  completePintaReader: boolean | 'world' | readonly StudioPythonRuntimeFeature[] = false,
) {
  const f = await authoringFixture(
    language,
    kind,
    releaseCapabilities,
    Array.isArray(completePintaReader)
      ? completePintaReader
      : completePintaReader
        ? completePintaReader === 'world'
          ? [PYTHON_PINTA_WORLD_FEATURE]
          : [PYTHON_PINTA_WORLD_FEATURE, PYTHON_PINTA_PHYSICS_FEATURE]
        : undefined,
  )
  if (language === 'python') f.configuration.releases[0]!.status = runtimeStatus
  if (language === 'python') {
    f.configuration.releases[0]!.blockIds = ['sz_py_pass']
    f.policy = await createStudioAuthoringPolicy(f.configuration)
  }
  const userId = identity?.userId ?? crypto.randomUUID()
  const actor = {
    audience,
    userId,
    accountId: identity?.accountId ?? (audience === 'adult' ? userId : crypto.randomUUID()),
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
    createStudioRuntimeHosts(
      f.configuration.catalog,
      language === 'python' ? [{ runtime: f.project.runtime, origin: 'https://runtime.test' }] : [],
    ),
  )
  const state = {
    owned: context === 'free',
    allowed: true,
    visible: true,
    calls: [] as string[],
    posts: 0,
    liveRevision: 3,
    hubFirstFailure: false,
    threadStatus: 'visible' as 'visible' | 'deleted' | 'rejected',
    canonicalPlayId: null as string | null,
    livePlayId: crypto.randomUUID(),
    prepareFirstFailure: false,
    prepares: 0,
    reservationFault: null as 'snapshot' | 'missing-id' | 'live-id' | null,
    // O post que o hub devolve como "existing" (republicar o mesmo projeto).
    existing: null as { id: string; playId: string } | null,
    updates: [] as Array<Record<string, unknown>>,
    prepareBodies: [] as Array<Record<string, unknown>>,
    touches: [] as string[],
    postBodies: [] as Array<Record<string, unknown>>,
  }
  // Admitted owner + published seed are shared by BFF and runtime authorization.
  const kidsJourney = new KidsJourneyQueryService({
    async readSnapshot(owners): Promise<KidsJourneySnapshot> {
      return {
        policy: {
          phase: 'published',
          version: 1,
          policy: initialKidsJourneyPolicy(),
          updatedAt: new Date(0),
        },
        catalog: [],
        profiles: new Map(
          owners
            .filter((owner) => owner.userId === actor.userId && owner.accountId === actor.accountId)
            .map((owner) => [
              owner.userId,
              {
                ...owner,
                registered: true,
                milestones: [],
                earned: {
                  level: context === 'free' ? 'god' : 'noob',
                  capabilities: [],
                  courseAccess: { entry: [], expanded: [], reward: [] },
                },
              },
            ]),
        ),
      }
    },
  })
  const free = new AuthorizeFreeRuntimeService(
    new FreeStudioAccessService(
      {
        async execute() {
          return {
            grants: [],
            communities: state.owned
              ? [audience === 'adult' ? 'adult-estudio-completo' : 'estudio-completo']
              : [],
            hasMaster: false,
            hasMasterKids: false,
          }
        },
      },
      {
        async execute() {
          return { blocks: ['sz_py_pass'] }
        },
      },
      kidsJourney,
      {
        async get() {
          return projectAdultJourney(
            { schemaVersion: 1, stages: [] },
            0,
            [],
            ['studio', 'bridge', 'pro'],
          )
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
  const publicCoverKeys: string[] = []
  const publicCacheControls: Array<string | undefined> = []
  const publicObjects = identity?.publicObjects ?? new Set<string>()
  const retiredCoverKeys = new Set<string>()
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'runtime-test-token',
    R2_PUBLIC_URL: 'https://media.test',
  })
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    objects.set(input.key, new Uint8Array(input.body))
  })
  spyOn(storage, 'r2CreateObjectPrivate').mockImplementation(async (input) => {
    if (objects.has(input.key)) return false
    objects.set(input.key, new Uint8Array(input.body))
    return true
  })
  spyOn(storage, 'r2HeadObjectPrivate').mockImplementation(async (key) =>
    objects.has(key)
      ? { contentType: 'application/json', contentLength: objects.get(key)!.length, etag: 'test' }
      : null,
  )
  spyOn(storage, 'r2DeleteObjectPrivate').mockImplementation(async (key) => {
    objects.delete(key)
  })
  spyOn(storage, 'r2CreateObject').mockImplementation(async (input) => {
    if (publicObjects.has(input.key) || retiredCoverKeys.has(input.key)) return null
    publicCoverKeys.push(input.key)
    publicCacheControls.push(input.cacheControl)
    publicObjects.add(input.key)
    return { key: input.key, url: `https://media.test/${input.key}` }
  })
  spyOn(storage, 'r2FenceObject').mockImplementation(async (key) => {
    retiredCoverKeys.add(key)
    publicObjects.delete(key)
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
        input.operation === 'purge'
          ? await purgePublication(bucket.bucket, input.playId)
          : input.operation === 'resolve'
            ? await currentPublishedSource(bucket.bucket, input.playId)
            : input.operation === 'resolve-metadata'
              ? await currentPublishedPublication(bucket.bucket, input.playId)
              : input.operation === 'resolve-status'
                ? await publishedStatus(bucket.bucket, input.playId)
                : await publicationCommand(bucket.bucket, input),
      )
    } catch (error) {
      if (error instanceof PublicationError)
        return Response.json({ error: { message: error.message } }, { status: error.status })
      throw error
    }
  })
  globalThis.fetch = Object.assign(upstream, { preconnect: originalFetch.preconnect })
  const reservations = new Map<
    string,
    { reservationId: string; playId: string; snapshotHash: string }
  >()
  const finalized = new Map<string, { id: string; playId: string; studioMeta?: unknown }>()
  const prepare = async (input: {
    clientIdempotencyKey: string
    snapshotHash: string
    liveWorkspace?: { playId: string }
  }) => {
    state.prepares++
    state.prepareBodies.push(structuredClone(input) as Record<string, unknown>)
    if (state.existing && !(input as { asNewPost?: boolean }).asNewPost)
      return {
        status: 200,
        body: {
          state: 'existing',
          playId: state.existing.playId,
          thread: {
            id: state.existing.id,
            playId: state.existing.playId,
            status: state.threadStatus,
            coverImageUrl: 'https://media.test/studio/cover/old.webp',
          },
        },
      }
    const existing = finalized.get(input.clientIdempotencyKey)
    const canonical = state.canonicalPlayId
      ? [...finalized.values()].find((thread) => thread.playId === state.canonicalPlayId)
      : existing
    if (canonical)
      return {
        status: 200,
        body: {
          state: 'finalized',
          deduped: true,
          thread: { ...canonical, status: state.threadStatus },
        },
      }
    let reservation = reservations.get(input.clientIdempotencyKey)
    if (reservation && reservation.snapshotHash !== input.snapshotHash)
      return { status: 409, body: null }
    if (!reservation) {
      reservation = {
        reservationId: crypto.randomUUID(),
        playId: input.liveWorkspace?.playId ?? crypto.randomUUID(),
        snapshotHash: input.snapshotHash,
      }
      reservations.set(input.clientIdempotencyKey, reservation)
    }
    if (state.prepareFirstFailure && state.prepares === 1) return { status: 503, body: null }
    if (state.reservationFault === 'snapshot')
      return {
        status: 200,
        body: { state: 'reserved', ...reservation, snapshotHash: '0'.repeat(64) },
      }
    if (state.reservationFault === 'missing-id')
      return { status: 200, body: { state: 'reserved', ...reservation, reservationId: null } }
    if (state.reservationFault === 'live-id')
      return {
        status: 200,
        body: { state: 'reserved', ...reservation, playId: crypto.randomUUID() },
      }
    return { status: 200, body: { state: 'reserved', ...reservation } }
  }
  const post = async (input: {
    playId: string
    clientIdempotencyKey: string
    studioMeta?: unknown
  }) => {
    state.posts++
    state.postBodies.push(structuredClone(input) as Record<string, unknown>)
    const thread = { id: crypto.randomUUID(), playId: input.playId, studioMeta: input.studioMeta }
    finalized.set(input.clientIdempotencyKey, thread)
    if (state.posts === 1 && state.hubFirstFailure) return { status: 503, body: null }
    return {
      status: 200,
      body: {
        thread: {
          id: crypto.randomUUID(),
          playId: state.canonicalPlayId ?? input.playId,
          status: state.threadStatus,
        },
        deduped: state.posts > 1,
      },
    }
  }
  const update = (input: Record<string, unknown>) => {
    state.updates.push(structuredClone(input))
    return {
      status: 200,
      body: {
        thread: {
          id: state.existing?.id ?? crypto.randomUUID(),
          playId: input.playId,
          status: state.threadStatus,
          coverImageUrl: input.coverImageUrl ?? 'https://media.test/studio/cover/old.webp',
        },
        previousCoverUrl: input.coverImageUrl ? 'https://media.test/studio/cover/old.webp' : null,
        updated: true,
      },
    }
  }
  const routes = createStudioRoutes({
    audience,
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
        body: {
          level: { slug: context === 'free' ? 'god' : 'noob' },
          ...(audience === 'adult'
            ? { journey: { capabilities: ['studio', 'bridge', 'pro'] } }
            : {
                kidsJourney: await kidsJourney.get({
                  userId: actor.userId,
                  accountId: actor.accountId,
                }),
              }),
        },
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
          playId: state.livePlayId,
          publicationToken: 'server-attested-fixture',
          revision: state.liveRevision,
        },
      }),
      authorizeFreeRuntime: async (input: StudioFreeRuntimeRequest) => {
        state.calls.push('authorize-free')
        try {
          return { status: 200, body: await free.execute(actor, input) }
        } catch (error) {
          if (error instanceof AccessDeniedError) return { status: 403, body: null }
          if (error instanceof InvalidContentCommandError) return { status: 400, body: null }
          throw error
        }
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
      prepareShowcaseThreadStudio: prepare,
      prepareShowcaseThreadStudioStandalone: prepare,
      createShowcaseThreadStudio: post,
      createShowcaseThreadStudioStandalone: post,
      updateShowcaseThreadStudio: async (input: Record<string, unknown>) => update(input),
      updateShowcaseThreadStudioStandalone: async (input: Record<string, unknown>) => update(input),
      showcaseSource: async () => ({
        status: 200,
        body: {
          thread: state.existing
            ? {
                id: state.existing.id,
                playId: state.existing.playId,
                status: state.threadStatus,
                title: 'Meu jogo',
                body: 'Meu projeto Python',
                coverImageUrl: null,
              }
            : null,
        },
      }),
      touchShowcase: async (playId: string) => {
        state.touches.push(playId)
        return { status: 200, body: { touched: true } }
      },
      resolveStudioPlay: async () => ({
        status: 200,
        body: { visible: state.visible, authorDisplayName: 'Ana' },
      }),
    },
  } as never)
  const requestId = identity?.requestId ?? crypto.randomUUID()
  const publish = async (
    uploadedProject: unknown = f.project,
    coverBytes?: Uint8Array,
    publicationRequestId = requestId,
  ) => {
    const form = new FormData()
    form.set('title', 'Meu jogo')
    form.set('description', 'Meu projeto Python')
    form.set('clientIdempotencyKey', publicationRequestId)
    form.set('project', new File([JSON.stringify(uploadedProject)], 'project.json'))
    if (coverBytes)
      form.set('cover', new File([new Uint8Array(coverBytes)], 'cover.png', { type: 'image/png' }))
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
  return {
    ...f,
    ...bucket,
    actor,
    state,
    routes,
    publish,
    objects,
    publicCoverKeys,
    publicCacheControls,
    publicObjects,
    requestId,
  }
}

for (const context of ['free', 'lesson', 'live'] as const)
  for (const supported of [false, true])
    for (const { version, world, malformed } of [
      { version: 2, world: false, malformed: false },
      { version: 3, world: true, malformed: false },
      { version: 4, world: false, malformed: false },
      { version: 4, world: true, malformed: false },
      { version: 4, world: false, malformed: true },
    ] as const)
      for (const revision of context === 'free' ? [false, true] : [false])
        test(`${context}: ${revision ? 'revisão' : 'publicação'} de dados Pinta ${version} ${world ? 'mundo' : 'mapa'} ${malformed ? (supported ? 'recusa bytes inválidos com leitor novo' : 'recusa bytes inválidos com leitor anterior') : supported ? 'preserva a privacidade' : 'recusa o leitor anterior'}`, async () => {
          const { pngWithPintaData } = await import('../../pinta/src/export/pngText')
          const f = await fixture(
            'classic',
            context,
            'kids',
            'python',
            undefined,
            'active',
            undefined,
            version === 4 && !supported ? 'world' : supported,
          )
          const initial = revision ? await (await f.publish()).json() : null
          const oldSource = initial
            ? await currentPublishedSource(f.bucket, initial.publicationId)
            : null
          // A byte/policy fixture; rendering is qualified independently in the real browser runtime.
          const raw = await pngWithPintaData(
            Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
              'base64',
            ),
            {
              format: 'pinta',
              kind: 'map',
              version,
              ...(version === 4 && !malformed ? { scene: { version: 3 } } : {}),
            },
          )
          const dataUrl = `data:image/png;base64,${Buffer.from(raw).toString('base64')}`
          f.project.assets = [
            {
              id: 'mapa',
              name: 'mapa',
              kind: 'image',
              source: 'library',
              libOrigin: 'pinta',
              libId: 'personal:desenho-privado',
              width: 1,
              height: 1,
              proPath: 'assets/mapa.png',
              dataUrl,
              pintaImage: {
                recipe: {
                  version: world ? 2 : 1,
                  algorithm: 'pinta-image-1',
                  drawingId: 'desenho-privado',
                  selection: { kind: world ? 'map-world' : 'map' },
                  scale: 1,
                },
                provenance: {
                  sourceSha256: 'a'.repeat(64),
                  dependencies: !world ? [{ drawingId: 'tiles', sha256: 'b'.repeat(64) }] : [],
                },
                output: {
                  mime: 'image/png',
                  width: 1,
                  height: 1,
                  bytes: raw.length,
                  sha256: createHash('sha256').update(raw).digest('hex'),
                  dataVersion: version,
                },
              },
            },
          ]
          const before = JSON.stringify(f.project)
          // A revisão é a REPUBLICAÇÃO do mesmo projeto: o hub responde "existing" e o
          // Compartilhar sobe uma versão nova atrás do mesmo link.
          if (revision)
            f.state.existing = { id: crypto.randomUUID(), playId: initial.publicationId }
          const response = revision
            ? await f.publish(f.project, undefined, crypto.randomUUID())
            : await f.publish(f.project)
          expect(response.status).toBe(malformed ? 400 : supported ? 200 : 409)
          if (supported && !malformed) {
            const body = await response.json()
            const retained = await currentPublishedSource(
              f.bucket,
              initial?.publicationId ?? body.publicationId,
            )
            expect(retained?.source).not.toContain('desenho-privado')
            expect(JSON.parse(retained!.source).assets[0].dataUrl).toBe(dataUrl)
          } else {
            expect(await response.json()).toMatchObject({
              error: { code: malformed ? 'INVALID_INPUT' : 'RUNTIME_PINTA_READER_OUTDATED' },
            })
            expect(f.state.posts).toBe(revision ? 1 : 0)
            if (initial)
              expect((await currentPublishedSource(f.bucket, initial.publicationId))?.source).toBe(
                oldSource?.source,
              )
          }
          expect(JSON.stringify(f.project)).toBe(before)
        })

for (const supported of [false, true])
  test(`cenário 3D do Molda ${supported ? 'publica com o leitor de cenas' : 'recusa o ambiente sem o leitor de cenas'}`, async () => {
    const { MIME_DA_CENA_PARA_STUDIO } = await import('@sistemazero/molda-cenarios-core/studio')
    const f = await fixture(
      'classic',
      'free',
      'kids',
      'python',
      undefined,
      'active',
      undefined,
      supported ? [PYTHON_MOLDA_SCENE_FEATURE] : [],
    )
    const envelope = {
      formato: 'studio-cena3d',
      versao: 1,
      recursos: [],
      cena: {
        formato: 'molda-cena-compilada',
        versao: 1,
        nome: 'Praça vazia',
        unidade: 'metro',
        eixoVertical: 'y',
        fonte: { cenario: 'praca', revisao: 1, digest: 'a'.repeat(64) },
        arquivos: [],
        nos: [],
        entidades: [],
        colisoes: [],
        aguas: [],
        caminhos: [],
        marcadores: [],
        texturas: [],
        fontes: { modelos: [], texturas: [], conjuntos: [] },
        licencas: [],
        ambiente: { hora: 12 },
      },
    }
    f.project.assets = [
      {
        id: 'praca',
        name: 'praca',
        kind: 'scene3d',
        source: 'library',
        originalFileName: 'praca.json',
        proPath: 'cenarios/praca.json',
        dataUrl: `data:${MIME_DA_CENA_PARA_STUDIO};base64,${Buffer.from(JSON.stringify(envelope)).toString('base64')}`,
      },
    ]
    const before = JSON.stringify(f.project)
    const response = await f.publish(f.project)
    expect(response.status).toBe(supported ? 200 : 409)
    if (!supported) {
      expect(await response.json()).toMatchObject({
        error: { code: 'RUNTIME_PINTA_READER_OUTDATED' },
      })
      expect(f.state.posts).toBe(0)
    }
    expect(JSON.stringify(f.project)).toBe(before)
  })

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

for (const kind of ['classic', 'pro'] as const)
  test(`adult free Python ${kind} publication authorizes the adult audience`, async () => {
    const f = await fixture(kind, 'free', 'adult')
    const response = await f.publish()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(f.state.calls).toContain('authorize-free')
    expect((await currentPublishedSource(f.bucket, body.publicationId))?.publication).toMatchObject(
      { programmingLanguage: 'python', kind },
    )
  })

for (const context of ['free', 'lesson', 'live'] as const)
  for (const kind of ['classic', 'pro'] as const)
    test(`${context} Python ${kind} deduplication preserves the canonical published bytes`, async () => {
      const f = await fixture(kind, context)
      const first = await f.publish()
      expect(first.status).toBe(200)
      const playId = (await first.json()).publicationId as string
      const sourceKey = `studio/play/${playId}.json`
      const before = f.objects.get(sourceKey)!.slice()
      const retainedBefore = await currentPublishedSource(f.bucket, playId)
      const keysBefore = [...f.objects.keys()]
      const callsBefore = [...f.state.calls]
      f.state.canonicalPlayId = playId
      f.state.livePlayId = crypto.randomUUID()
      f.project.name = 'A draft edited after publication'
      const retry = await f.publish(f.project, undefined, crypto.randomUUID())
      expect(retry.status).toBe(200)
      expect((await retry.json()).publicationId).toBe(playId)
      expect(f.objects.get(sourceKey)).toEqual(before)
      expect((await currentPublishedSource(f.bucket, playId))?.source).toBe(retainedBefore?.source)
      expect([...f.objects.keys()]).toEqual(keysBefore)
      expect(f.state.calls).toEqual(callsBefore)
    })

for (const context of ['free', 'lesson', 'live'] as const)
  test(`${context} a finalized legacy post is returned without claiming or rewriting its artifact`, async () => {
    const f = await fixture('classic', context)
    const first = await f.publish()
    expect(first.status).toBe(200)
    const playId = (await first.json()).publicationId as string
    const sourceKey = `studio/play/${playId}.json`
    const before = f.objects.get(sourceKey)!.slice()
    f.objects.delete(`studio/publication-owners/kids/${playId}.json`)
    f.state.canonicalPlayId = playId
    f.state.livePlayId = crypto.randomUUID()
    f.project.name = 'An unverified replacement'
    const retry = await f.publish(f.project, undefined, crypto.randomUUID())
    expect(retry.status).toBe(200)
    expect(f.objects.get(sourceKey)).toEqual(before)
    expect(f.objects.has(`studio/publication-owners/kids/${playId}.json`)).toBe(false)
  })

for (const context of ['free', 'lesson', 'live'] as const)
  test(`${context} JavaScript Classic deduplication cannot replace or claim an unverified canonical snapshot`, async () => {
    const f = await fixture('classic', context, 'kids', 'javascript')
    const first = await f.publish()
    expect(first.status).toBe(200)
    const playId = (await first.json()).playUrl.split('/').at(-1)!
    const sourceKey = `studio/play/${playId}.json`
    const before = f.objects.get(sourceKey)!.slice()
    f.state.canonicalPlayId = playId
    f.state.livePlayId = crypto.randomUUID()
    f.project.name = 'A changed draft'
    const replay = await f.publish(f.project, undefined, crypto.randomUUID())
    expect(replay.status).toBe(200)
    expect(f.objects.get(sourceKey)).toEqual(before)
    f.objects.delete(`studio/publication-owners/kids/${playId}.json`)
    f.state.livePlayId = crypto.randomUUID()
    const unverified = await f.publish(f.project, undefined, crypto.randomUUID())
    expect(unverified.status).toBe(200)
    expect(f.objects.get(sourceKey)).toEqual(before)
    expect(f.objects.has(`studio/publication-owners/kids/${playId}.json`)).toBe(false)
  })

test('a missing private snapshot is 404, while a temporary storage failure is retryable', async () => {
  const f = await fixture('classic', 'free')
  const published = await f.publish()
  expect(published.status).toBe(200)
  const playId = (await published.json()).publicationId as string
  const play = () =>
    f.routes.studioPlay.GET(new Request('https://kids.test/'), {
      params: Promise.resolve({ id: playId }),
    })

  spyOn(storage, 'r2GetObjectPrivate').mockRejectedValueOnce(
    new storage.PrivateObjectNotFoundError('missing'),
  )
  const missing = await play()
  expect(missing.status).toBe(404)
  expect(await missing.json()).toEqual({ error: { code: 'NOT_FOUND' } })

  spyOn(storage, 'r2GetObjectPrivate').mockRejectedValueOnce(
    new storage.PrivateObjectUnavailableError('storage offline'),
  )
  const unavailable = await play()
  expect(unavailable.status).toBe(503)
  expect(unavailable.headers.get('Retry-After')).toBe('5')
  expect(await unavailable.json()).toEqual({ error: { code: 'SERVICE_UNAVAILABLE' } })

  expect((await play()).status).toBe(200)
})

test('revoked Python release cannot publish; retired existing release stays playable', async () => {
  const revoked = await fixture('classic', 'free', 'kids', 'python', undefined, 'revoked')
  const refused = await revoked.publish()
  expect(refused.status).toBe(403)
  expect(
    [...revoked.objects.keys()].every((key) => key.startsWith('studio/publication-owners/')),
  ).toBe(true)
  expect(revoked.state.calls).not.toContain('promote-python')
  expect(revoked.publicObjects.size).toBe(0)

  const retired = await fixture('classic', 'free', 'kids', 'python', undefined, 'retired')
  const published = await retired.publish()
  expect(published.status).toBe(200)
  const playId = (await published.json()).publicationId as string
  const playable = await retired.routes.studioPlay.GET(new Request('https://kids.test/'), {
    params: Promise.resolve({ id: playId }),
  })
  expect(playable.status).toBe(200)
})

const PILOT_CAPABILITIES = ['edit', 'export-source', 'execute', 'python-repl'] as const

for (const context of ['free', 'lesson', 'live'] as const)
  test(`${context} Python publication requires the exact release to declare publish`, async () => {
    const f = await fixture('classic', context, 'kids', 'python', undefined, 'active', [
      ...PILOT_CAPABILITIES,
    ])
    const refused = await f.publish()
    expect(refused.status).toBe(403)
    expect((await refused.json()).error.code).toBe('RUNTIME_PUBLISH_NOT_ALLOWED')
    expect(f.state.calls).toContain(`authorize-${context}`)
    expect(f.state.calls).not.toContain('promote-python')
    expect([...f.objects.keys()].every((key) => key.startsWith('studio/publication-owners/'))).toBe(
      true,
    )
    expect(f.publicObjects.size).toBe(0)

    const declared = await fixture('classic', context, 'kids', 'python', undefined, 'active', [
      ...PILOT_CAPABILITIES,
      'publish',
    ])
    const published = await declared.publish()
    expect(published.status).toBe(200)
    expect(declared.state.calls).toContain('promote-python')
  })

for (const context of ['free', 'lesson', 'live'] as const)
  test(`${context} JavaScript Classic publication is unchanged by release publish declarations`, async () => {
    // JavaScript publication never consults Python release capabilities.
    const f = await fixture('classic', context, 'kids', 'javascript', undefined, 'active', [
      'edit',
      'execute',
      'export-source',
    ])
    const published = await f.publish()
    expect(published.status).toBe(200)
    expect(f.state.calls).not.toContain(`authorize-${context}`)
  })

test('a Python project cannot publish a Turtle extension absent from its approved release', async () => {
  const f = await fixture('classic', 'free')
  f.project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
  const refused = await f.publish()
  expect(refused.status).toBe(403)
  expect([...f.objects.keys()].every((key) => key.startsWith('studio/publication-owners/'))).toBe(
    true,
  )
  expect(f.state.calls).not.toContain('promote-python')
  expect(f.publicObjects.size).toBe(0)
})

for (const context of ['free', 'lesson', 'live'] as const) {
  for (const fault of ['snapshot', 'missing-id'] as const) {
    test(`${context} rejects a reservation with ${fault} mismatch before any artifact write`, async () => {
      const f = await fixture('classic', context)
      f.state.reservationFault = fault
      const response = await f.publish()
      expect(response.status).toBe(502)
      expect((await response.json()).error.code).toBe('INVALID_PUBLICATION_RESERVATION')
      expect(f.objects.size).toBe(0)
      expect(f.publicObjects.size).toBe(0)
      expect(f.state.posts).toBe(0)
      expect(f.state.calls).not.toContain('promote-python')
    })
  }
}

test('live rejects a reservation for a different signed workspace publication', async () => {
  const f = await fixture('pro', 'live')
  f.state.reservationFault = 'live-id'
  const response = await f.publish()
  expect(response.status).toBe(502)
  expect((await response.json()).error.code).toBe('INVALID_PUBLICATION_RESERVATION')
  expect(f.objects.size).toBe(0)
  expect(f.publicObjects.size).toBe(0)
  expect(f.state.posts).toBe(0)
  expect(f.state.calls).not.toContain('promote-python')
})

test('a lost reservation response writes no artifact and retries the same reserved ID', async () => {
  const f = await fixture('pro', 'free')
  f.state.prepareFirstFailure = true
  expect((await f.publish()).status).toBe(503)
  expect(f.objects.size).toBe(0)
  expect(f.publicObjects.size).toBe(0)
  expect(f.state.calls).not.toContain('promote-python')
  expect(f.state.posts).toBe(0)
  expect((await f.publish()).status).toBe(200)
  expect([...f.objects.keys()].filter((key) => key.startsWith('studio/play/'))).toHaveLength(1)
  expect(f.state.posts).toBe(1)
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
  expect([...f.objects.keys()].filter((key) => key.startsWith('studio/play/'))).toHaveLength(1)
  expect(
    [...f.objects.keys()].filter((key) => key.startsWith('studio/publication-owners/')),
  ).toHaveLength(1)
})

test('replaying a finalized publication preserves its cover without uploading another candidate', async () => {
  const f = await fixture('classic', 'free')
  const cover = new Uint8Array(
    await sharp({
      create: { width: 8, height: 8, channels: 4, background: '#ff0000' },
    })
      .png()
      .toBuffer(),
  )
  const first = await f.publish(f.project, cover)
  const replay = await f.publish(f.project, cover)
  expect(first.status).toBe(200)
  expect(replay.status).toBe(200)
  const firstBody = await first.json()
  const replayBody = await replay.json()
  expect(replayBody.publicationId).toBe(firstBody.publicationId)
  expect(f.publicCoverKeys).toHaveLength(1)
  expect(f.publicCacheControls).toEqual(['no-store'])
  expect(new Set(f.publicCoverKeys).size).toBe(1)
  const firstCoverKey = f.publicCoverKeys[0]!
  expect([...f.publicObjects]).toEqual([firstCoverKey])
  expect(firstCoverKey).toMatch(
    new RegExp(
      `^studio/cover/${f.actor.userId}/${firstBody.publicationId}/${f.requestId}-[a-f0-9-]{36}-[a-f0-9]{64}\\.webp$`,
    ),
  )
  expect(
    (await currentPublishedSource(f.bucket, firstBody.publicationId))?.publication.revisions,
  ).toHaveLength(1)
})

test('replay after moderation cannot restore the original public cover or retained source', async () => {
  const f = await fixture('classic', 'free')
  const cover = new Uint8Array(
    await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff0000' } })
      .png()
      .toBuffer(),
  )
  const first = await f.publish(f.project, cover)
  expect(first.status).toBe(200)
  const playId = (await first.json()).publicationId as string
  const originalCover = f.publicCoverKeys[0]!
  f.publicObjects.delete(originalCover)
  f.state.threadStatus = 'deleted'
  const cleanup = await import('../src/server/studio-publication-cleanup')
  const intent = await cleanup.enqueueStudioPublicationCleanup(
    playId,
    undefined,
    'kids',
    f.actor.userId,
  )
  await cleanup.performStudioPublicationCleanup(
    playId,
    intent.coverKey,
    undefined,
    intent.runtime,
    intent.coverReceiptKey,
    intent.ownershipKey,
  )
  const retired = f.objects.get(`studio/play/${playId}.json`)!.slice()
  const replay = await f.publish(f.project, cover)
  expect(replay.status).toBe(409)
  expect(f.publicObjects.size).toBe(0)
  expect(f.publicCoverKeys[1]).not.toBe(originalCover)
  expect(f.objects.get(`studio/play/${playId}.json`)).toEqual(retired)
  expect(JSON.parse(new TextDecoder().decode(retired))).toEqual({
    playId,
    studioPublicationState: 'retired',
  })
  expect(await currentPublishedSource(f.bucket, playId)).toBeNull()
})

for (const moderationStatus of ['deleted', 'rejected'] as const)
  test(`JavaScript Classic replay after ${moderationStatus} leaves no candidate snapshot or cover`, async () => {
    const f = await fixture('classic', 'free', 'kids', 'javascript')
    const cover = new Uint8Array(
      await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff0000' } })
        .png()
        .toBuffer(),
    )
    const first = await f.publish(f.project, cover)
    expect(first.status).toBe(200)
    const firstPlayId = (await first.json()).playUrl.split('/').at(-1)!
    const originalCover = f.publicCoverKeys[0]!
    f.publicObjects.delete(originalCover)
    f.objects.delete(`studio/play/${firstPlayId}.json`)
    f.state.threadStatus = moderationStatus
    f.state.canonicalPlayId = firstPlayId
    const replay = await f.publish(f.project, cover)
    expect(replay.status).toBe(409)
    expect(f.publicObjects.size).toBe(0)
    expect(f.publicCoverKeys[1]).not.toBe(originalCover)
    expect(f.objects.has(`studio/play/${firstPlayId}.json`)).toBe(false)
    expect([...f.objects.keys()].filter((key) => key.startsWith('studio/play/'))).toHaveLength(0)
    expect(
      [...f.objects.keys()].filter((key) => key.startsWith('studio/publication-owners/')),
    ).toEqual([`studio/publication-owners/kids/${firstPlayId}.json`])
    expect(
      [...f.objects.keys()].filter((key) => key.startsWith('studio/cover-candidates/')),
    ).toHaveLength(1)
  })

test('same author and request in two publication contexts never share a cover object', async () => {
  const identity = {
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    publicObjects: new Set<string>(),
  }
  const cover = new Uint8Array(
    await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff0000' } })
      .png()
      .toBuffer(),
  )
  const free = await fixture('classic', 'free', 'kids', 'python', identity)
  expect((await free.publish(free.project, cover)).status).toBe(200)
  const freeKey = free.publicCoverKeys[0]!
  const lesson = await fixture('classic', 'lesson', 'kids', 'python', identity)
  expect((await lesson.publish(lesson.project, cover)).status).toBe(200)
  const lessonKey = lesson.publicCoverKeys[0]!
  expect(lessonKey).not.toBe(freeKey)
  expect(identity.publicObjects.has(freeKey)).toBe(true)
  expect(identity.publicObjects.has(lessonKey)).toBe(true)
  await storage.r2FenceObject(freeKey)
  expect(identity.publicObjects.has(freeKey)).toBe(false)
  expect(identity.publicObjects.has(lessonKey)).toBe(true)
})

test('free Python republication updates the same link, skips an unchanged game, restores and disables', async () => {
  const f = await fixture('pro', 'free')
  if (f.project.programmingLanguage !== 'python' || f.project.kind !== 'pro')
    throw new Error('Python Pro fixture')
  const result = await (await f.publish()).json()
  const playId = result.publicationId as string
  // O 1º post existe: o hub passa a responder "existing" para o mesmo projeto.
  f.state.existing = { id: crypto.randomUUID(), playId }
  expect(f.state.prepareBodies[0]).toMatchObject({ sourceProjectId: f.project.id })
  const first = await currentPublishedSource(f.bucket, playId)
  const original = JSON.parse(first!.source).tree[f.project.python.entrypoint].content

  const same = await f.publish(f.project, undefined, crypto.randomUUID())
  expect(same.status).toBe(409)
  expect((await same.json()).error.code).toBe('SHOWCASE_UNCHANGED')
  expect(f.state.updates).toHaveLength(0)

  f.project.tree[f.project.python.entrypoint] = {
    kind: 'file',
    content: 'print("draft updated")\n',
  }
  const updatedResponse = await f.publish(f.project, undefined, crypto.randomUUID())
  expect(updatedResponse.status).toBe(200)
  expect(await updatedResponse.json()).toMatchObject({
    playUrl: `/jogar/${playId}`,
    publicationId: playId,
    updated: true,
  })
  expect(f.state.updates).toHaveLength(1)
  expect(f.state.updates[0]).toMatchObject({ playId, coverImageUrl: null })
  const play = () =>
    f.routes.studioPlay.GET(new Request('https://kids.test/'), {
      params: Promise.resolve({ id: playId }),
    })
  expect((await (await play()).json()).tree[f.project.python.entrypoint].content).toBe(
    'print("draft updated")\n',
  )
  const mutation = (body: object) =>
    f.routes.studioPublication.POST(
      new Request('https://kids.test/api/studio/publication', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, playId, requestId: crypto.randomUUID() }),
      }),
    )
  // A operação "update" saiu: atualizar é sempre pelo Compartilhar (post + versão juntos).
  expect(
    (await mutation({ operation: 'update', expectedVersion: 2, project: f.project })).status,
  ).toBe(400)
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
  expect(f.state.touches).toEqual([playId])
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
  // Desligar o link não é atualizar o jogo: o selo "Atualizado" só vem de restaurar.
  expect(f.state.touches).toEqual([playId])
  expect(await currentPublishedSource(f.bucket, playId)).toBeNull()
})

test('the free-studio finalize carries the project identity and the new-post choice to the hub', async () => {
  const f = await fixture('classic', 'free', 'kids', 'javascript')
  expect((await f.publish()).status).toBe(200)
  expect(f.state.postBodies[0]).toMatchObject({ sourceProjectId: f.project.id })
  expect(f.state.postBodies[0]?.asNewPost).toBeUndefined()
  const form = new FormData()
  form.set('title', 'Meu jogo')
  form.set('description', 'Outro jogo')
  form.set('clientIdempotencyKey', crypto.randomUUID())
  form.set('asNewPost', '1')
  form.set('project', new File([JSON.stringify(f.project)], 'project.json'))
  const request = new Request('https://kids.test/api/studio/publish', {
    method: 'POST',
    body: form,
  })
  request.headers.set('Content-Length', String((await request.clone().arrayBuffer()).byteLength))
  expect((await f.routes.studioPublishStandalone.POST(request)).status).toBe(200)
  expect(f.state.postBodies[1]).toMatchObject({ sourceProjectId: f.project.id, asNewPost: true })
})

test('a project that changed kind after publishing cannot update the old post', async () => {
  const f = await fixture('classic', 'free', 'kids', 'javascript')
  const playId = crypto.randomUUID()
  // Um post de antes do histórico cujo retrato era de outro tipo (Python clássico).
  f.objects.set(
    `studio/play/${playId}.json`,
    new TextEncoder().encode(
      JSON.stringify({
        id: f.project.id,
        programmingLanguage: 'python',
        kind: 'classic',
        files: {},
      }),
    ),
  )
  f.state.existing = { id: crypto.randomUUID(), playId }
  const response = await f.publish()
  expect(response.status).toBe(409)
  expect((await response.json()).error.code).toBe('SHOWCASE_KIND_CHANGED')
  expect(f.state.updates).toHaveLength(0)
  expect(await currentPublishedSource(f.bucket, playId)).toBeNull()
})

test('a slow versions service does not hold the classic public game', async () => {
  const f = await fixture('classic', 'free', 'kids', 'javascript')
  const result = await (await f.publish()).json()
  const before = globalThis.fetch
  // Keep a real pending request: AbortSignal.timeout is unreferenced, unlike network IO.
  // A bare never-settling Promise makes Bun 1.3.11 on Windows spin without firing it.
  const versions = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      return new Promise<Response>((resolve) => {
        const cancelled = () => resolve(new Response(null, { status: 503 }))
        if (request.signal.aborted) cancelled()
        else request.signal.addEventListener('abort', cancelled, { once: true })
      })
    },
  })
  globalThis.fetch = Object.assign(
    (_url: RequestInfo | URL, init?: RequestInit) => originalFetch(versions.url, init),
    { preconnect: before.preconnect },
  )
  try {
    const started = Date.now()
    const play = await f.routes.studioPlay.GET(new Request('https://kids.test/'), {
      params: Promise.resolve({ id: result.publicationId }),
    })
    expect(play.status).toBe(200)
    expect(Date.now() - started).toBeLessThan(8_000)
  } finally {
    globalThis.fetch = before
    await versions.stop(true)
  }
}, 15_000)

test('classic JavaScript keeps versions behind the same link and the status compares the game', async () => {
  const f = await fixture('classic', 'free', 'kids', 'javascript')
  const response = await f.publish()
  expect(response.status).toBe(200)
  const result = await response.json()
  const playId = result.publicationId as string
  expect(playId).toBe(result.playUrl.replace('/jogar/', ''))
  expect((await currentPublishedSource(f.bucket, playId))?.publication).toMatchObject({
    kind: 'classic',
    version: 1,
  })
  f.state.existing = { id: crypto.randomUUID(), playId }
  const status = async (project: unknown) =>
    (
      await f.routes.studioPublication.POST(
        new Request('https://kids.test/api/studio/publication', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operation: 'status',
            compare: true,
            context: { kind: 'free', projectId: f.project.id, project },
          }),
        }),
      )
    ).json()
  expect(await status(f.project)).toMatchObject({
    published: true,
    playId,
    history: true,
    unchanged: true,
  })
  // Renomear não muda o jogo.
  expect(await status({ ...f.project, name: 'Outro nome', updatedAt: 99 })).toMatchObject({
    unchanged: true,
  })
  const changed = structuredClone(f.project) as typeof f.project & {
    files: Record<string, string>
  }
  changed.files['script.js'] = `${changed.files['script.js'] ?? ''}\n// versão 2`
  expect(await status(changed)).toMatchObject({ unchanged: false })

  const cover = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#123456' },
  })
    .png()
    .toBuffer()
  const updated = await f.publish(changed, new Uint8Array(cover), crypto.randomUUID())
  expect(updated.status).toBe(200)
  expect(f.state.updates[0]?.coverImageUrl).toMatch(/^https:\/\/media\.test\/studio\/cover\//)
  const live = await currentPublishedSource(f.bucket, playId)
  expect(live?.publication).toMatchObject({ kind: 'classic', version: 2 })
  const play = await f.routes.studioPlay.GET(new Request('https://kids.test/'), {
    params: Promise.resolve({ id: playId }),
  })
  expect((await play.json()).files['script.js']).toContain('versão 2')

  const disable = await f.routes.studioPublication.POST(
    new Request('https://kids.test/api/studio/publication', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        operation: 'activate',
        playId,
        requestId: crypto.randomUUID(),
        expectedVersion: 2,
        revision: live!.publication.activeRevision,
        disabled: true,
      }),
    }),
  )
  expect(disable.status).toBe(200)
  const off = await f.routes.studioPlay.GET(new Request('https://kids.test/'), {
    params: Promise.resolve({ id: playId }),
  })
  expect(off.status).toBe(404)
})

test('"Publicar como jogo novo" skips the existing post and creates another link', async () => {
  const f = await fixture('classic', 'free', 'kids', 'javascript')
  const first = await (await f.publish()).json()
  f.state.existing = { id: crypto.randomUUID(), playId: first.publicationId }
  const form = new FormData()
  form.set('title', 'Meu jogo')
  form.set('description', 'Outro jogo')
  form.set('clientIdempotencyKey', crypto.randomUUID())
  form.set('asNewPost', '1')
  form.set('project', new File([JSON.stringify(f.project)], 'project.json'))
  const request = new Request('https://kids.test/api/studio/publish', {
    method: 'POST',
    body: form,
  })
  request.headers.set('Content-Length', String((await request.clone().arrayBuffer()).byteLength))
  const response = await f.routes.studioPublishStandalone.POST(request)
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.publicationId).not.toBe(first.publicationId)
  expect(f.state.prepareBodies.at(-1)).toMatchObject({ asNewPost: true })
  expect(f.state.updates).toHaveLength(0)
})

/** A structurally valid PNG whose size is set by one private ancillary chunk. */
function paddedPng(padding: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc32 = (bytes: Uint8Array) => {
    let c = 0xffffffff
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const base = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
    'base64',
  )
  const typed = Buffer.concat([Buffer.from('szPd', 'latin1'), Buffer.alloc(padding)])
  const chunk = Buffer.alloc(12 + padding)
  chunk.writeUInt32BE(padding, 0)
  typed.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(typed), 8 + padding)
  const iend = base.length - 12
  return Buffer.concat([base.subarray(0, iend), chunk, base.subarray(iend)])
}

test('a large PNG publishes at the 6 MiB project cap and fails clearly one encoded block above it', async () => {
  const { studioPublicProject } = await import('../src/server/studio-publication')
  const { prepareEditableStudioProject } = await import(
    '@sistemazero/studio/editable-project-validation'
  )
  const PROJECT_MAX_BYTES = 6 * 1024 * 1024
  const f = await fixture('classic', 'free')
  const withPng = async (padding: number) => {
    const png = paddedPng(padding)
    const prepared = await prepareEditableStudioProject({
      ...structuredClone(f.project),
      assets: [
        {
          id: 'grande',
          name: 'grande',
          kind: 'image',
          source: 'upload',
          dataUrl: `data:image/png;base64,${png.toString('base64')}`,
          width: 1,
          height: 1,
          proPath: 'assets/grande.png',
        },
      ],
    })
    if (prepared?.programmingLanguage !== 'python') throw new Error('Python fixture required')
    const uploaded = studioPublicProject(prepared)
    const bytes = Math.max(
      Buffer.byteLength(JSON.stringify(uploaded)),
      Buffer.byteLength(
        JSON.stringify(studioPublicProject((await prepareEditableStudioProject(uploaded))!)),
      ),
    )
    return { png, uploaded, bytes }
  }
  // Padding in multiples of 3 adds exactly 4 base64 characters per step.
  const probe = await withPng(3_000)
  const steps = Math.floor((PROJECT_MAX_BYTES - probe.bytes) / 4)
  const atLimit = await withPng(3_000 + steps * 3)
  expect(atLimit.bytes).toBeLessThanOrEqual(PROJECT_MAX_BYTES)
  expect(atLimit.bytes).toBeGreaterThan(PROJECT_MAX_BYTES - 4)
  expect(atLimit.png.length).toBeGreaterThan(4_500_000)

  const accepted = await f.publish(atLimit.uploaded)
  expect(accepted.status).toBe(200)
  const body = await accepted.json()
  const retained = await currentPublishedSource(f.bucket, body.publicationId)
  expect(JSON.parse(retained!.source).assets[0].dataUrl).toBe(
    `data:image/png;base64,${atLimit.png.toString('base64')}`,
  )

  const above = await withPng(3_000 + (steps + 1) * 3)
  expect(above.bytes).toBeGreaterThan(PROJECT_MAX_BYTES)
  const calls = f.state.calls.length
  const rejected = await f.publish(above.uploaded, undefined, crypto.randomUUID())
  expect(rejected.status).toBe(413)
  expect(await rejected.json()).toEqual({
    error: {
      code: 'PROJECT_TOO_LARGE',
      message:
        'O projeto ficou grande demais para publicar. Use imagens ou sons menores e tente de novo.',
    },
  })
  expect(f.state.calls.slice(calls)).toEqual([])
})

test('a capa acima do teto recusa a publicação com a frase, em vez de sumir do post', async () => {
  for (const context of ['free', 'lesson'] as const) {
    const f = await fixture('classic', context, 'kids', 'javascript')
    const response = await f.publish(f.project, new Uint8Array(4 * 1024 * 1024 + 1))
    expect(response.status).toBe(413)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('COVER_TOO_LARGE')
    expect(body.error.message).toBe(
      'A imagem da capa é grande demais. Escolha uma imagem menor e tente de novo.',
    )
    expect(f.state.postBodies).toHaveLength(0)
  }
})

test('o pedido acima do teto do envio diz que o projeto ficou grande, nunca "tente de novo"', async () => {
  const f = await fixture('classic', 'free', 'kids', 'javascript')
  const form = new FormData()
  form.set('title', 'Meu jogo')
  form.set('description', 'Grande demais')
  form.set('clientIdempotencyKey', crypto.randomUUID())
  form.set('project', new File([JSON.stringify(f.project)], 'project.json'))
  const request = new Request('https://kids.test/api/studio/publish', {
    method: 'POST',
    body: form,
  })
  request.headers.set('Content-Length', String(10 * 1024 * 1024))
  const response = await f.routes.studioPublishStandalone.POST(request)
  expect(response.status).toBe(413)
  const body = (await response.json()) as { error: { code: string; message: string } }
  expect(body.error.code).toBe('PROJECT_TOO_LARGE')
  expect(body.error.message).toContain('grande demais para publicar')
})
