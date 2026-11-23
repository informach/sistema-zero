import 'server-only'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { CREATOR_SHOWCASE_SLUGS, canonicalJson } from '@sistemazero/core/creations'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import {
  isStudioClassicPublication,
  isStudioProjectId,
  isStudioProPublication,
  isStudioPublication,
  isStudioPythonPublication,
  studioProPublicationUrl,
} from '@sistemazero/core/studio'
import { isStudioPortablePath } from '@sistemazero/core/studio/portable-path'
import {
  type StudioPublicProjectMetadata,
  StudioPublicProjectMetadataSchema,
} from '@sistemazero/core/studio/public-metadata'
import {
  type StudioReservationContext,
  StudioReservationRetirementSchema,
} from '@sistemazero/core/studio/publication-reservation'
import {
  StudioFreeRuntimeDecisionSchema,
  StudioLessonRuntimeDecisionSchema,
  StudioLivePublicationRuntimeDecisionSchema,
  type StudioRuntimeCandidate,
} from '@sistemazero/core/studio/runtime-authorization'
import type { EditableStudioProject } from '@sistemazero/studio'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { ProjectDocumentError } from '@sistemazero/studio/project-document'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getEnv } from '../lib/env'
import { UGC_IMAGE_INPUT_MIME } from '../lib/hub-attachments'
import { hasKidsCapability, kidsJourneyAccess } from '../lib/kids-journey-access'
import { showcaseFailureBody } from '../lib/showcase-failure'
import { verifyCleanupSignature, verifyReservationCleanupSignature } from '../lib/studio-cleanup'
import { isPrivilegedRole } from '../lib/studio-tier'
import type {
  HubClient,
  MembersClient,
  StudioPublicationPreparation,
  StudioPublicationUpdate,
} from '../server/clients'
import type { GatewayResponse } from '../server/gateway'
import { optimizeImage } from '../server/image-optimizer'
import { type MediaModule, mediaErrorResponse, rejectOversizedRequest } from '../server/media'
import { generateProjectDescription } from '../server/openrouter'
import {
  bufferFromStream,
  MediaNotConfiguredError,
  PrivateObjectNotFoundError,
  PrivateObjectUnavailableError,
  r2GetObjectPrivate,
} from '../server/r2'
import {
  acknowledgeStudioCoverCandidate,
  commitStudioCoverCandidate,
  drainStudioCoverCandidates,
  enqueueStudioCoverCandidate,
  readStudioCoverReceipt,
} from '../server/studio-cover-candidates'
import {
  StudioProRuntimeInputError,
  StudioProRuntimeUpstreamError,
  studioProRuntimePublicStatus,
} from '../server/studio-pro-runtime'
import {
  callStudioPublication,
  isStudioClassicHistoryProject,
  publishStudioClassicRevision,
  publishStudioProRevision,
  publishStudioPythonRevision,
  StudioPublicationError,
  studioClassicHistoryAvailable,
  studioGameFingerprint,
  studioPublicationOwner,
  studioPublicProject,
  studioRequiredPintaRuntimeFeatures,
} from '../server/studio-publication'
import {
  drainStudioPublicationCleanup,
  enqueueStudioPublicationCleanup,
  performStudioPublicationCleanup,
} from '../server/studio-publication-cleanup'
import {
  createStudioPublicationCover,
  retireStudioPublicationCover,
} from '../server/studio-publication-cover'
import { recordStudioPublicationOwner } from '../server/studio-publication-ownership'
import {
  createStudioPublicationSnapshot,
  isRetiredStudioPublicationSnapshot,
} from '../server/studio-publication-snapshot'
import {
  drainStudioReservationCleanup,
  retireStudioReservation,
} from '../server/studio-reservation-cleanup'
import { createStudioExampleFilesRoute } from './studio-example-files'
import { createStudioPublicRuntimeRoute } from './studio-public-runtime'
import { createStudioWorldMeasurementRoute } from './studio-world-measurement'

export type StudioRoutes = ReturnType<typeof createStudioRoutes>

function publicationError(error: unknown): NextResponse {
  if (error instanceof RequestBodyTooLargeError)
    return NextResponse.json(
      {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'O projeto ficou grande demais para publicar.',
        },
      },
      { status: 413 },
    )
  if (error instanceof InvalidJsonBodyError) return invalid()
  if (error instanceof ProjectDocumentError && error.code === 'invalid-document')
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: error.message } },
      { status: 400 },
    )
  if (error instanceof StudioPublicationError || error instanceof StudioProRuntimeInputError)
    return NextResponse.json(
      {
        error: {
          code: (error instanceof StudioPublicationError && error.code) || 'PRO_PUBLICATION_FAILED',
          message: error.message,
        },
      },
      { status: error.status },
    )
  if (error instanceof StudioProRuntimeUpstreamError)
    return NextResponse.json(
      { error: { code: 'PRO_PUBLICATION_FAILED', message: error.message } },
      { status: studioProRuntimePublicStatus(error.status) },
    )
  return mediaErrorResponse(error)
}

const invalid = () => NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
/** The client shows `error.message`; without it the author only saw a generic failure. */
const projectTooLarge = () =>
  NextResponse.json(
    {
      error: {
        code: 'PROJECT_TOO_LARGE',
        message:
          'O projeto ficou grande demais para publicar. Use imagens ou sons menores e tente de novo.',
      },
    },
    { status: 413 },
  )
/**
 * A capa acima do teto sumia do post sem aviso. Agora a publicação é recusada com a frase, e a
 * criança escolhe uma imagem menor.
 */
const coverTooLarge = () =>
  NextResponse.json(
    {
      error: {
        code: 'COVER_TOO_LARGE',
        message: 'A imagem da capa é grande demais. Escolha uma imagem menor e tente de novo.',
      },
    },
    { status: 413 },
  )
const coverTooBig = (form: FormData) => {
  const cover = form.get('cover')
  return cover instanceof File && cover.size > COVER_MAX_BYTES
}

/** Slug do servidor do Mural (kids). Só a vitrine kids chama estas rotas. */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const COVER_MAX_BYTES = 4 * 1024 * 1024 // print do jogo (WebP/PNG)
const PROJECT_MAX_BYTES = 6 * 1024 * 1024 // projeto auto-suficiente (assets data URLs)
const PUBLISH_MAX_BYTES = 8 * 1024 * 1024 // teto do multipart inteiro (cover + projeto + campos)
/** Prefixo do artefato jogável no bucket PRIVADO (servido só via /api/studio/play/:id). */
const PLAY_KEY = (id: string) => `studio/play/${id}.json`
/** Each upload has its own key: a replay must never restore a moderated cover URL. */
function publicationCoverKey(
  sessionId: string,
  playId: string,
  requestId: string,
  content: Uint8Array,
  extension: string,
): string {
  const digest = createHash('sha256').update(content).digest('hex')
  return `studio/cover/${sessionId}/${playId}/${requestId}-${randomUUID()}-${digest}.${extension}`
}

// Descrição: só os 3 arquivos canônicos (clampados) — NÃO o projeto com assets.
const DescribeBody = z.union([
  z.strictObject({
    kind: z.literal('python'),
    projectKind: z.enum(['classic', 'pro']),
    projectId: z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/),
    sources: z
      .array(
        z.strictObject({
          path: z
            .string()
            .max(240)
            .refine(isStudioPortablePath)
            .refine((path) => path.endsWith('.py')),
          content: z.string().max(4000),
        }),
      )
      .max(6),
    title: z.string().max(200).optional(),
  }),
  z
    .object({
      kind: z.literal('classic').optional(),
      projectId: z
        .string()
        .regex(/^[A-Za-z0-9._:-]{1,128}$/)
        .optional(),
      files: z.object({
        html: z.string().max(20000).optional(),
        css: z.string().max(20000).optional(),
        js: z.string().max(40000).optional(),
      }),
      title: z.string().max(200).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('pro'),
      projectId: z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/),
      sources: z
        .array(
          z
            .object({
              path: z
                .string()
                .max(240)
                .regex(
                  /^(?!.*(?:\.\.|node_modules|package-lock))[A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|html|css|json)$/,
                ),
              content: z.string().max(4000),
            })
            .strict(),
        )
        .max(6),
      title: z.string().max(200).optional(),
    })
    .strict(),
])

// Rate-limit in-process por sessão (réplica única do kids; estado em globalThis).
const RL_KEY = Symbol.for('@sistemazero/member-shell/studio-describe-rl')
type RlMap = Map<string, { count: number; resetAt: number }>
const rlSlot = globalThis as Record<symbol, unknown>
if (!rlSlot[RL_KEY]) rlSlot[RL_KEY] = new Map<string, { count: number; resetAt: number }>()
const rlStore = rlSlot[RL_KEY] as RlMap
function describeRateLimited(key: string): boolean {
  const now = Date.now()
  const e = rlStore.get(key)
  if (!e || e.resetAt <= now) {
    if (!e && rlStore.size >= 5000) {
      for (const [id, entry] of rlStore) if (entry.resetAt <= now) rlStore.delete(id)
      if (rlStore.size >= 5000) return true
    }
    rlStore.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (e.count >= 10) return true
  e.count += 1
  return false
}

// Dedupe do CONTADOR de jogadas por `ip:playId` (TTL 30min, in-process — réplica
// única, mesmo padrão do rate-limit acima). Só o 1º hit da janela vai com `count=1`
// ao hub; F5/reabrir não infla. É contador de VAIDADE: best-effort é suficiente.
const PLAYS_KEY = Symbol.for('@sistemazero/member-shell/studio-plays-seen')
const playsSlot = globalThis as Record<symbol, unknown>
if (!playsSlot[PLAYS_KEY]) playsSlot[PLAYS_KEY] = new Map<string, number>()
const playsSeen = playsSlot[PLAYS_KEY] as Map<string, number>
const PLAYS_TTL_MS = 30 * 60_000
/** Teto anti-OOM da borda pública: cheio de entradas VIVAS → para de contar. */
const PLAYS_MAX_ENTRIES = 50_000

// Peek/commit SEPARADOS: `peekCountPlay` decide SE conta (sem gravar) e o `commit`
// só grava DEPOIS que o hub confirma que o playId é de post VISÍVEL — assim UUIDs
// bem-formados porém inexistentes/ocultos NÃO poluem o mapa (a contagem em si é
// fundida no resolve do hub, gateada em SQL por is_showcase AND status='visible').
function peekCountPlay(ip: string, playId: string): boolean {
  const now = Date.now()
  const seenAt = playsSeen.get(`${ip}:${playId}`)
  if (seenAt !== undefined && now - seenAt < PLAYS_TTL_MS) return false
  if (playsSeen.size >= PLAYS_MAX_ENTRIES) {
    for (const [k, at] of playsSeen) {
      if (now - at >= PLAYS_TTL_MS) playsSeen.delete(k)
    }
    if (playsSeen.size >= PLAYS_MAX_ENTRIES) return false
  }
  return true
}

function commitCountPlay(ip: string, playId: string): void {
  // A janela pode ter enchido durante o await do resolve — respeita o teto anti-OOM.
  if (playsSeen.size >= PLAYS_MAX_ENTRIES) return
  playsSeen.set(`${ip}:${playId}`, Date.now())
}

/**
 * Rotas do "Compartilhar" do Estúdio (consumidas pelo community-kids):
 * - `POST /api/studio/describe` — rascunho da descrição via OpenRouter (servidor), fail-soft.
 * - `POST /api/studio/publish` — print→R2 público, projeto→R2 privado, post no Mural + link de jogar.
 * - `GET  /api/studio/play/:id` — PÚBLICO (sem login): stream do projeto do R2 (mesma origem).
 * - `POST /api/studio/cleanup` — S2S do hub (HMAC): apaga os artefatos R2 ao MODERAR-apagar o post.
 */
export function createStudioRoutes(deps: {
  hub: HubClient
  members: MembersClient
  media: MediaModule
  audience?: 'adult' | 'kids'
}) {
  const { hub, members, media } = deps
  const audience = deps.audience ?? 'kids'
  const muralSpaceSlug = CREATOR_SHOWCASE_SLUGS[audience]
  // Next may reconstruct request.url with an internal host behind a reverse proxy.
  // The published frame must authorize the public app, never a forwarded project-supplied URL.
  const publicationParentOrigin = (request: Request) =>
    new URL(getEnv().APP_PUBLIC_URL ?? request.url).origin

  type PublicationContext =
    | { kind: 'free' }
    | { kind: 'lesson'; lessonId: string; blockId: string; baselineId: string }
    | { kind: 'live'; workspaceId: string; revision: number }
  // Projetos com histórico de versões no serviço de publicação: Pro, Python e, quando o
  // serviço está configurado, o jogo clássico (mesmo link, versões, restaurar).
  const retained = (project: EditableStudioProject | null) =>
    project?.kind === 'pro' ||
    project?.programmingLanguage === 'python' ||
    isStudioClassicHistoryProject(project)
  const publicMetadata = (project: EditableStudioProject) =>
    StudioPublicProjectMetadataSchema.parse({
      programmingLanguage: project.programmingLanguage ?? 'javascript',
      ...(project.runtime ? { runtime: project.runtime } : {}),
      pro: project.kind === 'pro',
      extensions: project.installedExtensions.map((extension) => extension.id).slice(0, 8),
    })
  function resolvePreparation(
    result: Awaited<ReturnType<HubClient['prepareShowcaseThreadStudio']>>,
    project: EditableStudioProject | null,
    snapshotHash: string,
    expectedPlayId?: string,
  ) {
    if (result.status !== 200 || !result.body)
      return NextResponse.json(showcaseFailureBody(result.body, 'SHOWCASE_FAILED'), {
        status: result.status === 200 ? 502 : result.status,
      })
    const prepared = result.body
    if (prepared.state === 'existing') {
      const thread = prepared.thread
      if (!thread.playId || !UUID_RE.test(thread.playId) || thread.playId !== prepared.playId)
        return NextResponse.json({ error: { code: 'SHOWCASE_NOT_VISIBLE' } }, { status: 409 })
      return prepared
    }
    if (prepared.state === 'retired')
      return NextResponse.json({ error: { code: 'SHOWCASE_NOT_VISIBLE' } }, { status: 409 })
    if (prepared.state === 'finalized') {
      const thread = prepared.thread
      if (thread?.status !== 'visible' || !thread.playId || !UUID_RE.test(thread.playId))
        return NextResponse.json({ error: { code: 'SHOWCASE_NOT_VISIBLE' } }, { status: 409 })
      const hasHistory =
        retained(project) ||
        thread.studioMeta?.pro === true ||
        thread.studioMeta?.programmingLanguage === 'python'
      return NextResponse.json({
        muralUrl: `/${muralSpaceSlug}?thread=${encodeURIComponent(thread.id)}`,
        playUrl: `/jogar/${thread.playId}`,
        ...(hasHistory ? { publicationId: thread.playId } : {}),
        deduped: true,
      })
    }
    if (
      prepared.state !== 'reserved' ||
      !UUID_RE.test(prepared.reservationId) ||
      !UUID_RE.test(prepared.playId) ||
      prepared.snapshotHash !== snapshotHash ||
      (expectedPlayId !== undefined && prepared.playId !== expectedPlayId)
    )
      return NextResponse.json(
        { error: { code: 'INVALID_PUBLICATION_RESERVATION' } },
        { status: 502 },
      )
    return prepared
  }
  async function publishRevision(options: {
    project: EditableStudioProject
    requiredPintaRuntimeFeatures?: ReturnType<typeof studioRequiredPintaRuntimeFeatures>
    source: string
    playId: string
    owner: string
    requestId: string
    expectedVersion: number
    parentOrigin: string
    signal: AbortSignal
    context: PublicationContext
  }) {
    if (options.project.programmingLanguage !== 'python')
      return options.project.kind === 'pro'
        ? publishStudioProRevision({ ...options, project: options.project })
        : publishStudioClassicRevision({ ...options, project: options.project })
    return publishStudioPythonRevision({
      ...options,
      project: options.project,
      authorize: async (candidate: StudioRuntimeCandidate) => {
        const context = options.context
        const response =
          context.kind === 'free'
            ? await members.authorizeFreeRuntime({
                ...candidate,
                context: { kind: 'free', audience, projectId: options.project.id },
              })
            : context.kind === 'lesson'
              ? await members.authorizeLessonRuntime(context.lessonId, context.blockId, {
                  ...candidate,
                  baselineId: context.baselineId,
                })
              : await members.authorizeLivePublicationRuntime(context.workspaceId, {
                  ...candidate,
                  operation: 'execute',
                  context: {
                    kind: 'live-publication',
                    workspaceId: context.workspaceId,
                    workspaceRevision: context.revision,
                  },
                })
        if (response.status !== 200)
          throw new StudioPublicationError(
            response.status >= 500 ? 503 : 403,
            'Este projeto não está autorizado para publicar agora.',
          )
        const schema =
          context.kind === 'free'
            ? StudioFreeRuntimeDecisionSchema
            : context.kind === 'lesson'
              ? StudioLessonRuntimeDecisionSchema
              : StudioLivePublicationRuntimeDecisionSchema
        const parsed = schema.safeParse(response.body)
        if (!parsed.success)
          throw new StudioPublicationError(502, 'A autorização da publicação está inválida.')
        const expectedContext =
          context.kind === 'free'
            ? { kind: 'free', audience, projectId: options.project.id }
            : context.kind === 'lesson'
              ? {
                  kind: 'lesson',
                  lessonId: context.lessonId,
                  blockId: context.blockId,
                  baselineId: context.baselineId,
                }
              : {
                  kind: 'live-publication',
                  workspaceId: context.workspaceId,
                  workspaceRevision: context.revision,
                }
        if (canonicalJson(parsed.data.context) !== canonicalJson(expectedContext))
          throw new StudioPublicationError(
            502,
            'A autorização pertence a outro contexto de publicação.',
          )
        return parsed.data
      },
    })
  }

  async function proPublicationAccess(user: { role: string }): Promise<NextResponse | null> {
    if (audience === 'adult' && isPrivilegedRole(user.role)) return null
    const progress = await members.getGamification()
    if (progress.status !== 200 || !progress.body)
      return NextResponse.json({ error: { code: 'JOURNEY_UNAVAILABLE' } }, { status: 503 })
    const kids = audience === 'kids' ? kidsJourneyAccess(progress.body) : null
    if (audience === 'kids' && !kids)
      return NextResponse.json({ error: { code: 'JOURNEY_UNAVAILABLE' } }, { status: 503 })
    const pro =
      audience === 'adult'
        ? progress.body.journey?.capabilities.includes('pro') === true
        : kids !== null && hasKidsCapability(kids, 'studio') && hasKidsCapability(kids, 'pro')
    if (!pro) return NextResponse.json({ error: { code: 'FORBIDDEN_MODE' } }, { status: 403 })
    return null
  }

  /**
   * O jogo que está hoje no link: a revisão ativa do serviço de versões ou, num post
   * clássico de antes do histórico, o primeiro retrato. `fingerprint` nulo = desconhecido.
   */
  async function publishedGame(playId: string, owner: string, signal?: AbortSignal) {
    let version = 0
    let source: string | null = null
    const runtime =
      Boolean(getEnv().STUDIO_PRO_RUNTIME_URL && getEnv().STUDIO_PRO_RUNTIME_TOKEN) ||
      studioClassicHistoryAvailable()
    if (runtime) {
      const state = await callStudioPublication({ operation: 'get', playId, owner }, signal)
      if (state && isStudioPublication(state)) {
        version = state.version
        const current = await callStudioPublication(
          { operation: 'source', playId, owner, revision: state.activeRevision },
          signal,
        )
        if (current && 'source' in current) source = current.source
      }
    }
    if (source === null) {
      try {
        const object = await r2GetObjectPrivate(PLAY_KEY(playId))
        source = (await bufferFromStream(object.body, PROJECT_MAX_BYTES)).toString('utf-8')
      } catch (error) {
        if (!(error instanceof PrivateObjectNotFoundError)) throw error
      }
    }
    let fingerprint: string | null = null
    let kind: string | null = null
    if (source !== null) {
      try {
        const raw: unknown = JSON.parse(source)
        if (!isRetiredStudioPublicationSnapshot(raw)) {
          fingerprint = studioGameFingerprint(raw)
          kind = publicationKind(raw)
        }
      } catch {
        fingerprint = null
      }
    }
    return { version, fingerprint, kind }
  }
  /** O tipo do jogo (linguagem + clássico/Pro): uma versão nova não pode trocá-lo no link. */
  function publicationKind(project: unknown): string | null {
    if (!project || typeof project !== 'object') return null
    const value = project as { programmingLanguage?: unknown; kind?: unknown }
    const kind = value.kind === 'pro' ? 'pro' : 'classic'
    return value.programmingLanguage === 'python' ? `python-${kind}` : kind
  }

  type ExistingPublication = Extract<StudioPublicationPreparation, { state: 'existing' }>
  const unchanged = () =>
    NextResponse.json(
      {
        error: {
          code: 'SHOWCASE_UNCHANGED',
          message: 'Seu jogo no Mural já está igual a este.',
        },
      },
      { status: 409 },
    )

  /**
   * Republicar o MESMO projeto: uma versão nova atrás do mesmo link /jogar e o post do
   * Mural atualizado (descrição, capa), mantendo comentários, jogadas e a data.
   */
  async function updateExistingPublication(options: {
    req: Request
    sessionId: string
    owner: string
    existing: ExistingPublication
    project: EditableStudioProject
    projectBytes: Buffer
    /** Capturado do projeto privado ANTES da projeção pública (Pinta no Python). */
    requiredPintaRuntimeFeatures?: ReturnType<typeof studioRequiredPintaRuntimeFeatures>
    context: PublicationContext
    clientIdempotencyKey: string
    form: FormData
    defaultCoverUrl?: string | null
    update: (coverImageUrl: string | null) => Promise<GatewayResponse<StudioPublicationUpdate>>
  }): Promise<NextResponse> {
    const { req, existing, owner, project, clientIdempotencyKey } = options
    const playId = existing.playId
    try {
      if (!retained(project))
        throw new StudioPublicationError(
          503,
          'Atualizar o jogo publicado ainda não está disponível neste ambiente.',
        )
      const published = await publishedGame(playId, owner, req.signal)
      if (published.kind && published.kind !== publicationKind(project))
        return NextResponse.json(
          {
            error: {
              code: 'SHOWCASE_KIND_CHANGED',
              message:
                'Este projeto virou outro tipo de jogo depois de publicado e não pode atualizar o post de antes. Publique como jogo novo.',
            },
          },
          { status: 409 },
        )
      if (published.fingerprint && published.fingerprint === studioGameFingerprint(project))
        return unchanged()
      await publishRevision({
        project,
        requiredPintaRuntimeFeatures: options.requiredPintaRuntimeFeatures ?? [],
        source: options.projectBytes.toString('utf8'),
        playId,
        owner,
        requestId: clientIdempotencyKey,
        expectedVersion: published.version,
        parentOrigin: publicationParentOrigin(req),
        signal: req.signal,
        context: options.context,
      })
    } catch (error) {
      return publicationError(error)
    }

    // Capa nova só quando a criança escolheu outra; sem ela o post mantém a atual.
    let coverImageUrl: string | null = null
    let uploadedCoverKey: string | null = null
    const cover = options.form.get('cover')
    if (
      cover instanceof File &&
      cover.size > 0 &&
      cover.size <= COVER_MAX_BYTES &&
      UGC_IMAGE_INPUT_MIME.has(cover.type)
    ) {
      try {
        const optimized = await optimizeImage(await cover.arrayBuffer(), 'ugc')
        const coverKey = publicationCoverKey(
          options.sessionId,
          playId,
          clientIdempotencyKey,
          optimized.buffer,
          optimized.extension,
        )
        await enqueueStudioCoverCandidate(audience, playId, coverKey)
        const stored = await createStudioPublicationCover({
          key: coverKey,
          body: optimized.buffer,
          contentType: optimized.contentType,
          cacheControl: 'no-store',
        })
        coverImageUrl = stored.url
        uploadedCoverKey = stored.key
      } catch {
        // best-effort: o post mantém a capa atual.
      }
    } else if (options.form.get('useDefaultCover') === '1' && options.defaultCoverUrl) {
      coverImageUrl = options.defaultCoverUrl
    }

    const r = await options.update(coverImageUrl)
    if (r.status !== 200 || !r.body) {
      if (uploadedCoverKey) {
        await retireStudioPublicationCover(uploadedCoverKey).catch(() => {})
        await acknowledgeStudioCoverCandidate(audience, playId, uploadedCoverKey).catch(() => {})
      }
      return NextResponse.json(showcaseFailureBody(r.body, 'SHOWCASE_FAILED'), {
        status: r.status === 200 ? 502 : r.status,
      })
    }
    const thread = r.body.thread
    if (uploadedCoverKey && thread.coverImageUrl === coverImageUrl) {
      try {
        // O recibo é um por link: a capa antiga sai depois que a nova vira a canônica.
        const previous = await readStudioCoverReceipt(audience, playId)
        await commitStudioCoverCandidate(audience, playId, uploadedCoverKey)
        if (previous && previous.coverUrl === r.body.previousCoverUrl)
          await retireStudioPublicationCover(previous.coverKey)
      } catch {
        // A intenção durável da capa nova reconcilia depois.
      }
    }
    return NextResponse.json(
      {
        muralUrl: `/${muralSpaceSlug}?thread=${encodeURIComponent(thread.id)}`,
        playUrl: `/jogar/${playId}`,
        publicationId: playId,
        updated: true,
      },
      { status: 200 },
    )
  }

  const studioDescribe = {
    POST: async (req: Request) => {
      const sess = await media.requireUploadSession(req)
      if (sess instanceof NextResponse) return sess
      if (audience === 'adult' && !isPrivilegedRole(sess.role)) {
        const progress = await members.getGamification()
        if (progress.status !== 200 || !progress.body?.journey)
          return NextResponse.json({ error: { code: 'JOURNEY_UNAVAILABLE' } }, { status: 503 })
        if (!progress.body.journey.capabilities.includes('ai'))
          return NextResponse.json({ error: { code: 'AI_NOT_UNLOCKED' } }, { status: 403 })
      }
      if (describeRateLimited(sess.id)) {
        return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 })
      }
      let json: unknown
      try {
        json = await readJsonBodyWithLimit(req, 160000)
      } catch {
        return invalid()
      }
      const parsed = DescribeBody.safeParse(json)
      if (!parsed.success) return invalid()
      const result = await generateProjectDescription(parsed.data, {
        members,
        user: sess,
        signal: req.signal,
      })
      return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    },
  }

  const studioPublish = {
    POST: async (req: Request) => {
      // Multipart fora do matcher do proxy → guard próprio (sessão estrita + anti-CSRF).
      const sess = await media.requireUploadSession(req)
      if (sess instanceof NextResponse) return sess

      // Acima do teto do multipart a recusa é permanente: o recado do projeto grande, nunca o
      // "tente de novo" que a tela mostra para VALIDATION_ERROR.
      const oversized = rejectOversizedRequest(req, PUBLISH_MAX_BYTES)
      if (oversized) return oversized.status === 413 ? projectTooLarge() : oversized

      let form: FormData
      try {
        form = await req.formData()
      } catch {
        return invalid()
      }
      if (coverTooBig(form)) return coverTooLarge()

      const lessonId = String(form.get('lessonId') ?? '')
      const blockId = String(form.get('blockId') ?? '')
      const clientIdempotencyKey = String(form.get('clientIdempotencyKey') ?? '')
      const description = String(form.get('description') ?? '').trim()
      if (!UUID_RE.test(lessonId) || !UUID_RE.test(blockId)) return invalid()
      if (!UUID_RE.test(clientIdempotencyKey)) return invalid()
      if (description.length < 1 || description.length > 280) return invalid()

      // Projeto auto-suficiente (JSON com assets data URLs). Persistimos já normalizado:
      // o player público espera o contrato completo do Project e não pode depender de
      // defaults client-side do editor.
      const projectPart = form.get('project')
      if (!(projectPart instanceof File) || projectPart.size === 0) return invalid()
      if (projectPart.size > PROJECT_MAX_BYTES) {
        return projectTooLarge()
      }
      let projectBytes: Buffer
      let publicationProject: EditableStudioProject | null = null
      let requiredPintaRuntimeFeatures: ReturnType<typeof studioRequiredPintaRuntimeFeatures> = []
      // Metadado do projeto p/ o selo de nível do remix no card do Mural (derivado
      // do projeto JÁ saneado — cosmético; o gate real do remix é no clique).
      let studioMeta: StudioPublicProjectMetadata | null = null

      // 1. Elegibilidade (UX antecipado — o hub re-valida de forma autoritativa).
      const payload = await members.getShowcasePayload(lessonId, blockId)
      if (payload.status !== 200 || !payload.body) {
        return NextResponse.json(payload.body ?? { error: { code: 'SHOWCASE_FAILED' } }, {
          status: payload.status === 200 ? 502 : payload.status,
        })
      }
      if (audience === 'adult' && payload.body.audience !== 'adult')
        return NextResponse.json({ error: { code: 'WRONG_AUDIENCE' } }, { status: 403 })
      if (!payload.body.eligible) {
        return NextResponse.json(
          {
            error: {
              code: 'SHOWCASE_NOT_ELIGIBLE',
              message: 'Este projeto ainda não pode ir para o Mural.',
            },
          },
          { status: 409 },
        )
      }

      const owner = studioPublicationOwner(sess.id, sess.activeProfile?.accountId ?? sess.id)
      let publicationContext: PublicationContext = { kind: 'free' }
      try {
        const submitted = await members.getOwnStudioSubmission(lessonId, blockId)
        if (submitted.status !== 200 || !submitted.body?.project)
          throw new StudioPublicationError(
            submitted.status >= 500 ? 503 : 409,
            'Envie este projeto antes de publicar.',
          )
        const project = await prepareEditableStudioProject(submitted.body.project)
        if (!project) return invalid()
        publicationProject = studioPublicProject(project)
        requiredPintaRuntimeFeatures = studioRequiredPintaRuntimeFeatures(project)
        studioMeta = publicMetadata(project)
        projectBytes = Buffer.from(JSON.stringify(publicationProject), 'utf8')
        if (projectBytes.length > PROJECT_MAX_BYTES) return projectTooLarge()
        if (project.programmingLanguage === 'python') {
          const opened = await members.openLessonStudio(lessonId, blockId)
          const baseline = z
            .object({
              id: z.string().regex(/^[a-f0-9]{64}$/),
              lessonId: z.literal(lessonId),
              blockId: z.literal(blockId),
              bound: z.literal(true),
              readOnly: z.literal(false).optional(),
            })
            .safeParse(opened.body)
          if (opened.status !== 200 || !baseline.success)
            throw new StudioPublicationError(
              opened.status >= 500 ? 503 : 409,
              'Reabra o ambiente para conferir o projeto enviado.',
            )
          publicationContext = { kind: 'lesson', lessonId, blockId, baselineId: baseline.data.id }
        }
      } catch (error) {
        return publicationError(error)
      }
      const snapshotHash = createHash('sha256').update(projectBytes).digest('hex')
      const preparation = resolvePreparation(
        await hub.prepareShowcaseThreadStudio({
          publisher: {
            authorId: sess.id,
            accountId: sess.activeProfile?.accountId ?? sess.id,
            audience,
          },
          spaceSlug: muralSpaceSlug,
          lessonId,
          blockId,
          description,
          clientIdempotencyKey,
          snapshotHash,
          studioMeta,
        }),
        publicationProject,
        snapshotHash,
      )
      if (preparation instanceof NextResponse) return preparation
      if (preparation.state === 'existing') {
        if (!publicationProject) return invalid()
        return updateExistingPublication({
          req,
          sessionId: sess.id,
          owner,
          existing: preparation,
          project: publicationProject,
          projectBytes,
          requiredPintaRuntimeFeatures,
          context: publicationContext,
          clientIdempotencyKey,
          form,
          defaultCoverUrl: payload.body.defaultCoverUrl ?? null,
          update: (coverImageUrl) =>
            hub.updateShowcaseThreadStudio({
              publisher: {
                authorId: sess.id,
                accountId: sess.activeProfile?.accountId ?? sess.id,
                audience,
              },
              spaceSlug: muralSpaceSlug,
              lessonId,
              blockId,
              coverImageUrl,
              description,
              playId: preparation.playId,
              clientIdempotencyKey,
              studioMeta,
            }),
        })
      }
      const { playId, reservationId } = preparation
      try {
        await recordStudioPublicationOwner(
          audience,
          playId,
          sess.id,
          StudioReservationRetirementSchema.parse({
            version: 1,
            deliveryId: `studio-reservation-cleanup:${reservationId}`,
            reservationId,
            playId,
            authorId: sess.id,
            accountId: sess.activeProfile?.accountId ?? sess.id,
            audience,
            snapshotHash,
            context: { kind: 'lesson', lessonId, blockId },
          }),
        )
      } catch (error) {
        return publicationError(error)
      }
      if (publicationProject && retained(publicationProject)) {
        try {
          await publishRevision({
            project: publicationProject,
            requiredPintaRuntimeFeatures,
            source: projectBytes.toString('utf8'),
            playId,
            owner,
            requestId: clientIdempotencyKey,
            expectedVersion: 0,
            parentOrigin: publicationParentOrigin(req),
            signal: req.signal,
            context: publicationContext,
          })
        } catch (error) {
          return publicationError(error)
        }
      }

      try {
        await createStudioPublicationSnapshot(playId, projectBytes)
      } catch (error) {
        return publicationError(error)
      }

      // 2. Capa: print/upload da criança → R2 PÚBLICO; OU a capa padrão do curso
      // (admin) quando ela escolheu "usar a capa do curso" (`useDefaultCover`). A URL
      // do admin vem do payload AUTORITATIVO do members (não confiamos no cliente).
      let coverImageUrl: string | null = null
      let uploadedCoverKey: string | null = null
      const cover = form.get('cover')
      if (
        cover instanceof File &&
        cover.size > 0 &&
        cover.size <= COVER_MAX_BYTES &&
        UGC_IMAGE_INPUT_MIME.has(cover.type)
      ) {
        try {
          const optimized = await optimizeImage(await cover.arrayBuffer(), 'ugc')
          const coverKey = publicationCoverKey(
            sess.id,
            playId,
            clientIdempotencyKey,
            optimized.buffer,
            optimized.extension,
          )
          await enqueueStudioCoverCandidate(audience, playId, coverKey)
          const stored = await createStudioPublicationCover({
            key: coverKey,
            body: optimized.buffer,
            contentType: optimized.contentType,
            cacheControl: 'no-store',
          })
          coverImageUrl = stored.url
          uploadedCoverKey = stored.key
        } catch {
          // best-effort: deixa null.
        }
      } else if (form.get('useDefaultCover') === '1') {
        coverImageUrl = payload.body.defaultCoverUrl ?? null
      }

      if (
        publicationProject?.programmingLanguage !== 'python' &&
        publicationProject?.kind === 'pro' &&
        !coverImageUrl
      ) {
        try {
          const capture = await callStudioPublication(
            { operation: 'cover', playId, owner },
            req.signal,
          )
          if (!capture || !('png' in capture))
            throw new StudioPublicationError(502, 'Não foi possível recuperar a capa verificada.')
          const optimized = await optimizeImage(
            new Uint8Array(Buffer.from(capture.png, 'base64')).buffer,
            'ugc',
          )
          const coverKey = publicationCoverKey(
            sess.id,
            playId,
            clientIdempotencyKey,
            optimized.buffer,
            optimized.extension,
          )
          await enqueueStudioCoverCandidate(audience, playId, coverKey)
          const stored = await createStudioPublicationCover({
            key: coverKey,
            body: optimized.buffer,
            contentType: optimized.contentType,
            cacheControl: 'no-store',
          })
          coverImageUrl = stored.url
          uploadedCoverKey = stored.key
        } catch (error) {
          return publicationError(error)
        }
      }

      // 4. Cria o post no Mural (o hub re-valida elegibilidade + autor do header).
      const r = await hub.createShowcaseThreadStudio({
        reservationId,
        snapshotHash,
        publisher: {
          authorId: sess.id,
          accountId: sess.activeProfile?.accountId ?? sess.id,
          audience,
        },
        spaceSlug: muralSpaceSlug,
        lessonId,
        blockId,
        coverImageUrl,
        description,
        playId,
        clientIdempotencyKey,
        studioMeta,
      })
      if (r.status !== 200 || !r.body) {
        return NextResponse.json(showcaseFailureBody(r.body, 'SHOWCASE_FAILED'), {
          status: r.status,
        })
      }
      const threadId = r.body.thread.id
      // O playId real é o do post DEVOLVIDO (dedupe pode trazer um post anterior).
      const resolvedPlayId = r.body.thread.playId
      if (resolvedPlayId !== playId)
        return NextResponse.json(
          { error: { code: 'PUBLICATION_RESERVATION_MISMATCH' } },
          { status: 502 },
        )
      if (uploadedCoverKey) {
        if (r.body.deduped) {
          try {
            await retireStudioPublicationCover(uploadedCoverKey)
            await acknowledgeStudioCoverCandidate(audience, playId, uploadedCoverKey)
          } catch {
            // The durable intent retries after checking the Hub's canonical cover.
          }
        } else if (
          r.body.thread.status === 'visible' &&
          r.body.thread.coverImageUrl === coverImageUrl
        ) {
          await commitStudioCoverCandidate(audience, playId, uploadedCoverKey).catch(() => {})
        }
      }
      if (r.body.thread.status !== 'visible') {
        return NextResponse.json({ error: { code: 'SHOWCASE_NOT_VISIBLE' } }, { status: 409 })
      }
      return NextResponse.json(
        {
          muralUrl: `/${muralSpaceSlug}?thread=${encodeURIComponent(threadId)}`,
          playUrl: `/jogar/${resolvedPlayId}`,
          ...(retained(publicationProject) ? { publicationId: resolvedPlayId } : {}),
          deduped: r.body.deduped,
        },
        { status: 200 },
      )
    },
  }

  // Publish do ESTÚDIO COMPLETO (produto vendável, SEM aula): título + descrição da
  // criança (não há payload autoritativo do members). Mesma mecânica do `studioPublish`
  // (sessão estrita, sanitização do projeto, capa→R2 público, jogável→R2 privado), MENOS
  // o acoplamento de aula: NÃO há `lessonId/blockId` nem checagem de showcase-payload —
  // o HUB re-valida a POSSE do produto (S2S members) antes de criar o post.
  const studioPublishStandalone = {
    POST: async (req: Request) => {
      const sess = await media.requireUploadSession(req)
      if (sess instanceof NextResponse) return sess
      if (audience === 'adult' && !isPrivilegedRole(sess.role)) {
        const progress = await members.getGamification()
        if (progress.status !== 200 || !progress.body?.journey)
          return NextResponse.json({ error: { code: 'JOURNEY_UNAVAILABLE' } }, { status: 503 })
        if (!progress.body.journey.capabilities.includes('studio'))
          return NextResponse.json({ error: { code: 'JOURNEY_LOCKED' } }, { status: 403 })
        const access = await members.checkStudioAccess()
        if (access.status !== 200 || access.body?.access?.['estudio-completo'] !== true)
          return NextResponse.json(
            { error: { code: 'TOOL_ACCESS_REQUIRED' } },
            { status: access.status >= 500 ? 503 : 403 },
          )
      }

      // Acima do teto do multipart a recusa é permanente: o recado do projeto grande, nunca o
      // "tente de novo" que a tela mostra para VALIDATION_ERROR.
      const oversized = rejectOversizedRequest(req, PUBLISH_MAX_BYTES)
      if (oversized) return oversized.status === 413 ? projectTooLarge() : oversized

      let form: FormData
      try {
        form = await req.formData()
      } catch {
        return invalid()
      }
      if (coverTooBig(form)) return coverTooLarge()

      const title = String(form.get('title') ?? '').trim()
      const description = String(form.get('description') ?? '').trim()
      const clientIdempotencyKey = String(form.get('clientIdempotencyKey') ?? '')
      if (!UUID_RE.test(clientIdempotencyKey)) return invalid()
      if (title.length < 1 || title.length > 200) return invalid()
      if (description.length < 1 || description.length > 280) return invalid()
      // Tag do DESAFIO do mês — repassada FROUXA (formato só): o gate real (posse
      // Clube+Estúdio + mês corrente) é o do hub, com drop silencioso da tag.
      const rawChallenge = String(form.get('challengeKey') ?? '')
      const challengeKey = /^m:\d{4}-\d{2}$/.test(rawChallenge) ? rawChallenge : null
      // "Publicar como jogo novo" (opção escondida) e o link local de uma publicação
      // antiga do projeto, para o hub adotar o post de antes.
      const asNewPost = form.get('asNewPost') === '1'
      const rawAdopt = String(form.get('adoptPlayId') ?? '')
      const adoptPlayId = UUID_RE.test(rawAdopt) ? rawAdopt : null

      const liveWorkspaceId = String(form.get('liveWorkspaceId') ?? '')
      const liveRevision = Number(form.get('liveRevision') ?? 0)
      let liveSnapshot: {
        project: Record<string, unknown>
        playId: string
        publicationToken: string
      } | null = null
      if (liveWorkspaceId) {
        if (
          !UUID_RE.test(liveWorkspaceId) ||
          !Number.isSafeInteger(liveRevision) ||
          liveRevision < 1
        )
          return invalid()
        const response = await members.getLiveShowcasePayload(
          liveWorkspaceId,
          liveRevision,
          clientIdempotencyKey,
        )
        if (
          response.status !== 200 ||
          !response.body?.eligible ||
          (audience === 'adult' && response.body?.audience !== 'adult')
        )
          return NextResponse.json(response.body ?? { error: { code: 'SHOWCASE_NOT_ELIGIBLE' } }, {
            status: response.status === 200 ? 409 : response.status,
          })
        liveSnapshot = response.body
      }

      const projectPart = form.get('project')
      if (!liveSnapshot && (!(projectPart instanceof File) || projectPart.size === 0))
        return invalid()
      if (!liveSnapshot && projectPart instanceof File && projectPart.size > PROJECT_MAX_BYTES) {
        return projectTooLarge()
      }
      let projectBytes: Buffer
      let publicationProject: EditableStudioProject | null = null
      let requiredPintaRuntimeFeatures: ReturnType<typeof studioRequiredPintaRuntimeFeatures> = []
      // Metadado do projeto p/ o selo de nível do remix (cosmético; gate real no clique).
      let studioMeta: StudioPublicProjectMetadata | null = null
      try {
        const rawProject =
          liveSnapshot?.project ??
          (projectPart instanceof File
            ? JSON.parse(Buffer.from(await projectPart.arrayBuffer()).toString('utf-8'))
            : null)
        const project = await prepareEditableStudioProject(rawProject)
        if (!project) return invalid()
        publicationProject = studioPublicProject(project)
        requiredPintaRuntimeFeatures = studioRequiredPintaRuntimeFeatures(project)
        studioMeta = publicMetadata(project)
        projectBytes = Buffer.from(JSON.stringify(publicationProject), 'utf-8')
        if (projectBytes.length > PROJECT_MAX_BYTES) {
          return projectTooLarge()
        }
      } catch {
        return invalid()
      }

      const owner = studioPublicationOwner(sess.id, sess.activeProfile?.accountId ?? sess.id)
      // A identidade do projeto do Estúdio livre (a oficina usa o próprio workspace).
      const sourceProjectId =
        !liveSnapshot && publicationProject && isStudioProjectId(publicationProject.id)
          ? publicationProject.id
          : null
      if (!liveSnapshot && publicationProject?.kind === 'pro') {
        const denied = await proPublicationAccess(sess)
        if (denied) return denied
        const access = await members.checkStudioAccess()
        if (access.status !== 200 || access.body?.access?.['estudio-completo'] !== true)
          return NextResponse.json(
            { error: { code: 'SHOWCASE_NOT_ELIGIBLE' } },
            { status: access.status >= 500 ? 503 : 403 },
          )
      }
      const snapshotHash = createHash('sha256').update(projectBytes).digest('hex')
      const preparation = resolvePreparation(
        await hub.prepareShowcaseThreadStudioStandalone({
          publisher: {
            authorId: sess.id,
            accountId: sess.activeProfile?.accountId ?? sess.id,
            audience,
          },
          ...(liveSnapshot
            ? {
                liveWorkspace: {
                  id: liveWorkspaceId,
                  revision: liveRevision,
                  playId: liveSnapshot.playId,
                  publicationToken: liveSnapshot.publicationToken,
                },
              }
            : {}),
          spaceSlug: muralSpaceSlug,
          title,
          description,
          clientIdempotencyKey,
          challengeKey: liveSnapshot ? null : challengeKey,
          snapshotHash,
          studioMeta,
          ...(sourceProjectId ? { sourceProjectId } : {}),
          ...(adoptPlayId && !liveSnapshot ? { adoptPlayId } : {}),
          ...(asNewPost && !liveSnapshot ? { asNewPost: true } : {}),
        }),
        publicationProject,
        snapshotHash,
        liveSnapshot?.playId,
      )
      if (preparation instanceof NextResponse) return preparation
      if (preparation.state === 'existing') {
        if (!publicationProject) return invalid()
        return updateExistingPublication({
          req,
          sessionId: sess.id,
          owner,
          existing: preparation,
          project: publicationProject,
          projectBytes,
          requiredPintaRuntimeFeatures,
          context: liveSnapshot
            ? { kind: 'live', workspaceId: liveWorkspaceId, revision: liveRevision }
            : { kind: 'free' },
          clientIdempotencyKey,
          form,
          update: (coverImageUrl) =>
            hub.updateShowcaseThreadStudioStandalone({
              publisher: {
                authorId: sess.id,
                accountId: sess.activeProfile?.accountId ?? sess.id,
                audience,
              },
              ...(liveSnapshot
                ? {
                    liveWorkspace: {
                      id: liveWorkspaceId,
                      revision: liveRevision,
                      playId: liveSnapshot.playId,
                      publicationToken: liveSnapshot.publicationToken,
                    },
                  }
                : {}),
              spaceSlug: muralSpaceSlug,
              title,
              description,
              coverImageUrl,
              playId: preparation.playId,
              clientIdempotencyKey,
              ...(sourceProjectId ? { sourceProjectId } : {}),
              studioMeta,
            }),
        })
      }
      const { playId, reservationId } = preparation
      try {
        const context: StudioReservationContext = liveSnapshot
          ? { kind: 'live', workspaceId: liveWorkspaceId, revision: liveRevision }
          : { kind: 'free', audience }
        await recordStudioPublicationOwner(
          audience,
          playId,
          sess.id,
          StudioReservationRetirementSchema.parse({
            version: 1,
            deliveryId: `studio-reservation-cleanup:${reservationId}`,
            reservationId,
            playId,
            authorId: sess.id,
            accountId: sess.activeProfile?.accountId ?? sess.id,
            audience,
            snapshotHash,
            context,
          }),
        )
      } catch (error) {
        return publicationError(error)
      }
      if (publicationProject && retained(publicationProject)) {
        try {
          await publishRevision({
            project: publicationProject,
            requiredPintaRuntimeFeatures,
            source: projectBytes.toString('utf8'),
            playId,
            owner,
            requestId: clientIdempotencyKey,
            expectedVersion: 0,
            parentOrigin: publicationParentOrigin(req),
            signal: req.signal,
            context: liveSnapshot
              ? { kind: 'live', workspaceId: liveWorkspaceId, revision: liveRevision }
              : { kind: 'free' },
          })
        } catch (error) {
          return publicationError(error)
        }
      }

      try {
        await createStudioPublicationSnapshot(playId, projectBytes)
      } catch (error) {
        return publicationError(error)
      }

      // Capa (print) → R2 PÚBLICO (best-effort → null = sem capa).
      let coverImageUrl: string | null = null
      let uploadedCoverKey: string | null = null
      const cover = form.get('cover')
      if (
        cover instanceof File &&
        cover.size > 0 &&
        cover.size <= COVER_MAX_BYTES &&
        UGC_IMAGE_INPUT_MIME.has(cover.type)
      ) {
        try {
          const optimized = await optimizeImage(await cover.arrayBuffer(), 'ugc')
          const coverKey = publicationCoverKey(
            sess.id,
            playId,
            clientIdempotencyKey,
            optimized.buffer,
            optimized.extension,
          )
          await enqueueStudioCoverCandidate(audience, playId, coverKey)
          const stored = await createStudioPublicationCover({
            key: coverKey,
            body: optimized.buffer,
            contentType: optimized.contentType,
            cacheControl: 'no-store',
          })
          coverImageUrl = stored.url
          uploadedCoverKey = stored.key
        } catch {
          // best-effort: deixa null.
        }
      }

      if (
        publicationProject?.programmingLanguage !== 'python' &&
        publicationProject?.kind === 'pro' &&
        !coverImageUrl
      ) {
        try {
          const capture = await callStudioPublication(
            { operation: 'cover', playId, owner },
            req.signal,
          )
          if (!capture || !('png' in capture))
            throw new StudioPublicationError(502, 'Não foi possível recuperar a capa verificada.')
          const optimized = await optimizeImage(
            new Uint8Array(Buffer.from(capture.png, 'base64')).buffer,
            'ugc',
          )
          const coverKey = publicationCoverKey(
            sess.id,
            playId,
            clientIdempotencyKey,
            optimized.buffer,
            optimized.extension,
          )
          await enqueueStudioCoverCandidate(audience, playId, coverKey)
          const stored = await createStudioPublicationCover({
            key: coverKey,
            body: optimized.buffer,
            contentType: optimized.contentType,
            cacheControl: 'no-store',
          })
          coverImageUrl = stored.url
          uploadedCoverKey = stored.key
        } catch (error) {
          return publicationError(error)
        }
      }

      // Cria o post no Mural (o hub re-valida a POSSE do produto + autor do header).
      const r = await hub.createShowcaseThreadStudioStandalone({
        reservationId,
        snapshotHash,
        publisher: {
          authorId: sess.id,
          accountId: sess.activeProfile?.accountId ?? sess.id,
          audience,
        },
        ...(liveSnapshot
          ? {
              liveWorkspace: {
                id: liveWorkspaceId,
                revision: liveRevision,
                playId: liveSnapshot.playId,
                publicationToken: liveSnapshot.publicationToken,
              },
            }
          : {}),
        spaceSlug: muralSpaceSlug,
        title,
        description,
        coverImageUrl,
        playId,
        clientIdempotencyKey,
        challengeKey: liveSnapshot ? null : challengeKey,
        studioMeta,
        // A identidade do projeto vai também na finalização: é dela que o hub grava o
        // vínculo do post (sem isso, a próxima publicação criaria outro post).
        ...(sourceProjectId ? { sourceProjectId } : {}),
        ...(asNewPost && !liveSnapshot ? { asNewPost: true } : {}),
      })
      if (r.status !== 200 || !r.body) {
        // A timeout or even a rejected retry cannot prove Hub did not commit a
        // previous attempt. Keep the stable private object for reconciliation.
        return NextResponse.json(showcaseFailureBody(r.body, 'SHOWCASE_FAILED'), {
          status: r.status,
        })
      }
      const threadId = r.body.thread.id
      const resolvedPlayId = r.body.thread.playId
      if (resolvedPlayId !== playId)
        return NextResponse.json(
          { error: { code: 'PUBLICATION_RESERVATION_MISMATCH' } },
          { status: 502 },
        )
      if (uploadedCoverKey) {
        if (r.body.deduped) {
          try {
            await retireStudioPublicationCover(uploadedCoverKey)
            await acknowledgeStudioCoverCandidate(audience, playId, uploadedCoverKey)
          } catch {
            // The durable intent retries after checking the Hub's canonical cover.
          }
        } else if (
          r.body.thread.status === 'visible' &&
          r.body.thread.coverImageUrl === coverImageUrl
        ) {
          await commitStudioCoverCandidate(audience, playId, uploadedCoverKey).catch(() => {})
        }
      }
      if (r.body.thread.status !== 'visible') {
        return NextResponse.json({ error: { code: 'SHOWCASE_NOT_VISIBLE' } }, { status: 409 })
      }
      return NextResponse.json(
        {
          muralUrl: `/${muralSpaceSlug}?thread=${encodeURIComponent(threadId)}`,
          playUrl: `/jogar/${resolvedPlayId}`,
          ...(retained(publicationProject) ? { publicationId: resolvedPlayId } : {}),
          deduped: r.body.deduped,
        },
        { status: 200 },
      )
    },
  }

  const studioPlay = {
    // PÚBLICO (sem login): só serve enquanto o playId segue associado a post visível
    // no Mural. O projeto fica no R2 privado, MESMA ORIGEM (sem CORS). O 1º hit por
    // ip:playId na janela também CONTA a jogada (fundido no resolve — 1 round-trip).
    GET: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      if (!UUID_RE.test(id))
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
      const wouldCount = peekCountPlay(ip, id)
      const playable = await hub.resolveStudioPlay(id, wouldCount)
      if (playable.status >= 500) {
        return NextResponse.json(playable.body ?? { error: { code: 'SERVICE_UNAVAILABLE' } }, {
          status: playable.status,
        })
      }
      if (
        playable.status !== 200 ||
        playable.body?.visible !== true ||
        (audience === 'adult' && playable.body.audience !== 'adult')
      ) {
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      }
      // Visível confirmado → grava o dedupe (não polui o mapa com playIds inexistentes/ocultos).
      if (wouldCount) commitCountPlay(ip, id)
      try {
        const obj = await r2GetObjectPrivate(PLAY_KEY(id))
        const bytes = await bufferFromStream(obj.body, PROJECT_MAX_BYTES)
        const raw: unknown = JSON.parse(bytes.toString('utf-8'))
        if (isRetiredStudioPublicationSnapshot(raw))
          return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
        let project = await prepareEditableStudioProject(raw)
        let compiledUrl: string | undefined
        let compiledRevision: string | undefined
        let pythonRevision: string | undefined
        if (project?.programmingLanguage === 'python' || project?.kind === 'pro') {
          const published = await callStudioPublication(
            { operation: 'resolve', playId: id },
            req.signal,
          )
          if (!published || !('source' in published))
            return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
          const wasPython = project.programmingLanguage === 'python'
          project = await prepareEditableStudioProject(JSON.parse(published.source))
          if (wasPython) {
            if (
              project?.programmingLanguage !== 'python' ||
              !isStudioPythonPublication(published.publication) ||
              project.kind !== published.publication.kind ||
              project.runtime.manifestSha256 !== published.publication.runtime.manifestSha256
            )
              throw new ProjectDocumentError('invalid-document', 'Publicação Python inválida.')
            pythonRevision = published.publication.activeRevision
          } else {
            if (
              project?.programmingLanguage === 'python' ||
              project?.kind !== 'pro' ||
              !isStudioProPublication(published.publication)
            )
              throw new ProjectDocumentError('invalid-document', 'Publicação Pro inválida.')
            compiledRevision = published.publication.activeRevision
            compiledUrl = studioProPublicationUrl(
              new URL(getEnv().STUDIO_PRO_RUNTIME_URL!).origin,
              id,
              compiledRevision,
            )
          }
        }
        if (
          project &&
          project.programmingLanguage !== 'python' &&
          project.kind !== 'pro' &&
          studioClassicHistoryAvailable()
        ) {
          // Jogo clássico com histórico: a versão ativa do link. Sem registro de versões
          // (publicado antes do histórico) vale o primeiro retrato; link desativado = 404.
          // Prazo curto: antes do histórico o /jogar clássico nem consultava o serviço de versões.
          const quick = AbortSignal.any([req.signal, AbortSignal.timeout(3_000)])
          try {
            const published = await callStudioPublication(
              { operation: 'resolve', playId: id },
              quick,
            )
            if (
              published &&
              'source' in published &&
              isStudioClassicPublication(published.publication)
            ) {
              project = await prepareEditableStudioProject(JSON.parse(published.source))
              if (project?.programmingLanguage === 'python' || project?.kind === 'pro')
                throw new ProjectDocumentError('invalid-document', 'Publicação clássica inválida.')
            } else {
              const status = await callStudioPublication(
                { operation: 'resolve-status', playId: id },
                quick,
              )
              if (status && 'exists' in status && status.exists)
                return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
            }
          } catch (error) {
            if (error instanceof ProjectDocumentError || error instanceof SyntaxError) throw error
            // Serviço de versões fora do ar: o jogo segue com o primeiro retrato.
            console.warn('[studio-play] classic revision unavailable', { playId: id })
          }
        }
        if (!project) throw new ProjectDocumentError('invalid-document', 'Projeto inválido.')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        }
        if (compiledUrl && compiledRevision) {
          headers['X-Studio-Pro-Url'] = compiledUrl
          headers['X-Studio-Pro-Revision'] = compiledRevision
        }
        if (pythonRevision) headers['X-Studio-Python-Revision'] = pythonRevision
        // 1º nome do autor (snapshot do hub) p/ a página pública mostrar "feito por
        // {nome}". Header URI-encoded (só ASCII em header; acentos escapados) — a
        // MESMA ORIGEM (rota fora do matcher) deixa o browser lê-lo. Ausente = anônimo.
        const author = playable.body?.authorDisplayName
        if (typeof author === 'string' && author.trim()) {
          headers['X-Author-Name'] = encodeURIComponent(author.trim())
        }
        return new NextResponse(JSON.stringify(project), { status: 200, headers })
      } catch (error) {
        if (error instanceof StudioPublicationError) return publicationError(error)
        if (error instanceof PrivateObjectNotFoundError)
          return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
        if (
          error instanceof PrivateObjectUnavailableError ||
          error instanceof MediaNotConfiguredError
        )
          return NextResponse.json(
            { error: { code: 'SERVICE_UNAVAILABLE' } },
            { status: 503, headers: { 'Retry-After': '5' } },
          )
        if (error instanceof ProjectDocumentError)
          return NextResponse.json(
            {
              error: {
                code: 'PROJECT_CONVERSION_PENDING',
                message: 'Este jogo está aguardando atualização. Tente novamente mais tarde.',
              },
            },
            { status: 409 },
          )
        // JSON corrompido não pode ser entregue como projeto jogável.
        if (error instanceof SyntaxError)
          return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
        return mediaErrorResponse(error)
      }
    },
  }

  // S2S do HUB (rede interna, HMAC): apaga os artefatos R2 de um post do Mural
  // APAGADO pela moderação — o snapshot jogável (R2 privado `studio/play/<id>.json`)
  // e a capa (R2 público `studio/cover/...`, que seguiria buscável pela URL). FORA do
  // matcher do proxy (não é sessão de aluno): a auth é o HMAC do hub. Só confirma
  // o recebimento após guardar uma intenção durável para todas as deleções.
  const studioCleanup = {
    POST: async (req: Request) => {
      const secret = getEnv().GATEWAY_HMAC_SECRET
      let raw: string
      try {
        raw = req.body ? (await bufferFromStream(req.body, 4096)).toString('utf8') : ''
      } catch {
        return invalid()
      }
      if (!secret)
        return NextResponse.json({ error: { code: 'CLEANUP_UNAVAILABLE' } }, { status: 503 })
      if (!verifyCleanupSignature(secret, raw, req.headers.get('x-signature'))) {
        return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      }
      let body: { playId?: unknown; coverUrl?: unknown; authorId?: unknown }
      try {
        body = JSON.parse(raw)
      } catch {
        return invalid()
      }
      const playId = typeof body.playId === 'string' ? body.playId : ''
      if (
        !UUID_RE.test(playId) ||
        typeof body.authorId !== 'string' ||
        !UUID_RE.test(body.authorId)
      )
        return invalid()
      let intent: Awaited<ReturnType<typeof enqueueStudioPublicationCleanup>>
      try {
        intent = await enqueueStudioPublicationCleanup(
          playId.toLowerCase(),
          body.coverUrl,
          audience,
          body.authorId.toLowerCase(),
        )
      } catch {
        // Hub retries 5xx; never acknowledge cleanup before its intent is durable.
        return NextResponse.json({ error: { code: 'CLEANUP_UNAVAILABLE' } }, { status: 503 })
      }
      if (intent.alreadyCleaned) return new NextResponse(null, { status: 204 })
      try {
        await performStudioPublicationCleanup(
          intent.playId,
          intent.coverKey,
          AbortSignal.timeout(2500),
          intent.runtime,
          intent.coverReceiptKey,
          intent.ownershipKey,
        )
      } catch {
        console.info('[studio-publication] cleanup queued', { playId })
      }
      return new NextResponse(null, { status: 204 })
    },
  }

  const studioReservationCleanup = {
    POST: async (request: Request) => {
      const secret = getEnv().GATEWAY_HMAC_SECRET
      if (!secret)
        return NextResponse.json({ error: { code: 'CLEANUP_UNAVAILABLE' } }, { status: 503 })
      let raw: string
      try {
        raw = request.body ? (await bufferFromStream(request.body, 4096)).toString('utf8') : ''
      } catch {
        return invalid()
      }
      const deliveryId = request.headers.get('x-delivery-id')
      if (
        !verifyReservationCleanupSignature(
          secret,
          raw,
          request.headers.get('x-signature'),
          deliveryId,
        )
      )
        return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      let parsed: ReturnType<typeof StudioReservationRetirementSchema.safeParse>
      try {
        parsed = StudioReservationRetirementSchema.safeParse(JSON.parse(raw))
      } catch {
        return invalid()
      }
      if (
        !parsed.success ||
        parsed.data.audience !== audience ||
        parsed.data.deliveryId !== deliveryId
      )
        return invalid()
      try {
        await retireStudioReservation(parsed.data, AbortSignal.timeout(2500))
        return new NextResponse(null, { status: 204 })
      } catch {
        return NextResponse.json({ error: { code: 'CLEANUP_UNAVAILABLE' } }, { status: 503 })
      }
    },
  }

  const studioPublicationCleanup = {
    POST: async (request: Request) => {
      const token = getEnv().STUDIO_PRO_RUNTIME_TOKEN
      const supplied = Buffer.from(request.headers.get('authorization') ?? '')
      const expected = Buffer.from(`Bearer ${token ?? ''}`)
      if (!token || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
        return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      try {
        const [outbox, reservationsOutbox, publications, reservations, covers] = await Promise.all([
          hub.drainStudioArtifactCleanups(),
          hub.drainStudioReservationCleanups(),
          drainStudioPublicationCleanup(),
          drainStudioReservationCleanup(),
          drainStudioCoverCandidates(audience, (playId) => hub.resolveStudioCover(playId)),
        ])
        if (outbox.status !== 200 || reservationsOutbox.status !== 200)
          throw new Error('Fila de limpeza do Hub indisponível.')
        return NextResponse.json(
          {
            outbox: outbox.body,
            reservationsOutbox: reservationsOutbox.body,
            publications,
            reservations,
            covers,
          },
          {
            headers: { 'Cache-Control': 'no-store' },
          },
        )
      } catch {
        return NextResponse.json({ error: { code: 'CLEANUP_UNAVAILABLE' } }, { status: 503 })
      }
    },
  }
  const studioPublicationAuthorize = {
    POST: async (request: Request) => {
      const token = getEnv().STUDIO_PRO_RUNTIME_TOKEN
      const supplied = Buffer.from(request.headers.get('authorization') ?? '')
      const expected = Buffer.from(`Bearer ${token ?? ''}`)
      if (!token || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
        return NextResponse.json({ visible: false }, { status: 401 })
      try {
        const parsed = z
          .object({ playId: z.string().uuid() })
          .strict()
          .safeParse(await readJsonBodyWithLimit(request, 1024))
        if (!parsed.success) return invalid()
        const result = await hub.resolveStudioPlay(parsed.data.playId, false)
        return NextResponse.json(
          { visible: result.status === 200 && result.body?.visible === true },
          { status: result.status >= 500 ? 503 : 200, headers: { 'Cache-Control': 'no-store' } },
        )
      } catch {
        return NextResponse.json(
          { visible: false },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    },
  }
  const PROJECT_ID = /^[A-Za-z0-9_-]{1,128}$/
  const studioPublication = {
    POST: async (request: Request) => {
      const user = await media.requireUploadSession(request)
      if (user instanceof NextResponse) return user
      try {
        const parsed = z
          .discriminatedUnion('operation', [
            z.object({ operation: z.literal('get'), playId: z.string().uuid() }).strict(),
            z
              .object({
                operation: z.literal('source'),
                playId: z.string().uuid(),
                revision: z.string().regex(/^[a-f0-9]{64}$/),
              })
              .strict(),
            z
              .object({
                operation: z.literal('activate'),
                playId: z.string().uuid(),
                requestId: z.string().uuid(),
                expectedVersion: z.number().int().positive(),
                revision: z.string().regex(/^[a-f0-9]{64}$/),
                disabled: z.boolean(),
              })
              .strict(),
            z
              .object({
                operation: z.literal('status'),
                // `compare` = dizer se o jogo mudou (lê a entrega ou recebe o projeto).
                compare: z.boolean().optional(),
                context: z.discriminatedUnion('kind', [
                  z
                    .object({
                      kind: z.literal('lesson'),
                      lessonId: z.string().uuid(),
                      blockId: z.string().uuid(),
                    })
                    .strict(),
                  z
                    .object({
                      kind: z.literal('free'),
                      projectId: z.string().regex(PROJECT_ID),
                      adoptPlayId: z.string().uuid().optional(),
                      project: z.unknown().optional(),
                    })
                    .strict(),
                  z.object({ kind: z.literal('live'), workspaceId: z.string().uuid() }).strict(),
                ]),
              })
              .strict(),
          ])
          .safeParse(await readJsonBodyWithLimit(request, PROJECT_MAX_BYTES + 32768))
        if (!parsed.success) return invalid()
        const input = parsed.data
        const owner = studioPublicationOwner(user.id, user.activeProfile?.accountId ?? user.id)
        if (input.operation === 'status')
          return NextResponse.json(
            await publicationStatus(input.context, owner, request.signal, input.compare === true),
            { headers: { 'Cache-Control': 'no-store' } },
          )
        const result = await callStudioPublication({ ...input, owner }, request.signal)
        // Restaurar ou desativar uma versão também é atualizar o jogo publicado.
        if (
          input.operation === 'activate' &&
          !input.disabled &&
          result &&
          isStudioPublication(result)
        )
          await hub.touchShowcase(input.playId).catch(() => null)
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
      } catch (error) {
        return publicationError(error)
      }
    },
  }

  /**
   * O que o botão Compartilhar precisa saber: o projeto já tem post? (o link, a descrição
   * e a capa de agora) e, quando há um projeto para comparar, se o jogo mudou desde então.
   */
  async function publicationStatus(
    context:
      | { kind: 'lesson'; lessonId: string; blockId: string }
      | { kind: 'free'; projectId: string; adoptPlayId?: string; project?: unknown }
      | { kind: 'live'; workspaceId: string },
    owner: string,
    signal: AbortSignal,
    compare: boolean,
  ) {
    const source = await hub.showcaseSource(
      context.kind === 'free'
        ? {
            kind: 'free',
            spaceSlug: muralSpaceSlug,
            projectId: context.projectId,
            ...(context.adoptPlayId ? { adoptPlayId: context.adoptPlayId } : {}),
          }
        : context,
    )
    if (source.status !== 200 || !source.body)
      throw new StudioPublicationError(
        source.status >= 500 || source.status === 200 ? 503 : source.status,
        'Não foi possível consultar a publicação agora.',
      )
    const thread = source.body.thread
    if (!thread?.playId || !UUID_RE.test(thread.playId)) return { published: false as const }
    let candidate: unknown = null
    if (compare && context.kind === 'free') candidate = context.project ?? null
    if (compare && context.kind === 'lesson') {
      const submitted = await members.getOwnStudioSubmission(context.lessonId, context.blockId)
      candidate = submitted.status === 200 ? (submitted.body?.project ?? null) : null
    }
    let unchangedGame: boolean | undefined
    let history = false
    try {
      const published = await publishedGame(thread.playId, owner, signal)
      history = published.version > 0
      if (candidate && published.fingerprint) {
        const project = await prepareEditableStudioProject(candidate)
        if (project)
          unchangedGame =
            studioGameFingerprint(studioPublicProject(project)) === published.fingerprint
      }
    } catch {
      // Sem a comparação, o botão segue liberado e a publicação confere de novo.
    }
    return {
      published: true as const,
      playId: thread.playId,
      muralUrl: `/${muralSpaceSlug}?thread=${encodeURIComponent(thread.id)}`,
      playUrl: `/jogar/${thread.playId}`,
      title: thread.title,
      description: thread.body,
      coverUrl: thread.coverImageUrl ?? null,
      hidden: thread.status !== 'visible',
      gameUpdatedAt: thread.gameUpdatedAt ?? null,
      history,
      ...(unchangedGame === undefined ? {} : { unchanged: unchangedGame }),
    }
  }
  return {
    studioPublicRuntime: createStudioPublicRuntimeRoute({ hub, members }),
    studioExampleFiles: createStudioExampleFilesRoute({
      requireSession: (request) => media.requireUploadSession(request),
    }),
    studioWorldMeasurement: createStudioWorldMeasurementRoute({
      requireSession: (request) => media.requireUploadSession(request),
    }),
    studioDescribe,
    studioPublish,
    studioPublishStandalone,
    studioPlay,
    studioCleanup,
    studioReservationCleanup,
    studioPublicationAuthorize,
    studioPublicationCleanup,
    studioPublication,
  }
}
