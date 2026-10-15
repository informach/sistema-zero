import 'server-only'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { isStudioProPublication, studioProPublicationUrl } from '@sistemazero/core/studio'
import type { Project } from '@sistemazero/studio'
import { ProjectDocumentError } from '@sistemazero/studio/project-document'
import {
  prepareProjectForHost,
  sanitizeProjectForHost,
} from '@sistemazero/studio/project-validation'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getEnv } from '../lib/env'
import { UGC_IMAGE_INPUT_MIME } from '../lib/hub-attachments'
import { coverKeyFromPublicUrl, verifyCleanupSignature } from '../lib/studio-cleanup'
import type { HubClient, MembersClient } from '../server/clients'
import { optimizeImage } from '../server/image-optimizer'
import { type MediaModule, mediaErrorResponse, rejectOversizedRequest } from '../server/media'
import { generateProjectDescription } from '../server/openrouter'
import {
  bufferFromStream,
  r2DeleteObjectPrivate,
  r2GetObjectPrivate,
  r2PutObject,
  r2PutObjectPrivate,
} from '../server/r2'
import {
  StudioProRuntimeInputError,
  StudioProRuntimeUpstreamError,
  studioProRuntimePublicStatus,
} from '../server/studio-pro-runtime'
import {
  callStudioPublication,
  publishStudioProRevision,
  StudioPublicationError,
  studioPublicationOwner,
  studioPublicationPlayId,
  studioPublicProject,
} from '../server/studio-publication'

import {
  drainStudioPublicationCleanup,
  enqueueStudioPublicationCleanup,
  performStudioPublicationCleanup,
} from '../server/studio-publication-cleanup'

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
  if (error instanceof StudioPublicationError || error instanceof StudioProRuntimeInputError)
    return NextResponse.json(
      { error: { code: 'PRO_PUBLICATION_FAILED', message: error.message } },
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

/** Slug do servidor do Mural (kids). Só a vitrine kids chama estas rotas. */
const MURAL_SPACE_SLUG = 'mural-dos-criadores'
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const COVER_MAX_BYTES = 4 * 1024 * 1024 // print do jogo (WebP/PNG)
const PROJECT_MAX_BYTES = 6 * 1024 * 1024 // projeto auto-suficiente (assets data URLs)
const PUBLISH_MAX_BYTES = 8 * 1024 * 1024 // teto do multipart inteiro (cover + projeto + campos)
/** Prefixo do artefato jogável no bucket PRIVADO (servido só via /api/studio/play/:id). */
const PLAY_KEY = (id: string) => `studio/play/${id}.json`

// Descrição: só os 3 arquivos canônicos (clampados) — NÃO o projeto com assets.
const DescribeBody = z.union([
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
}) {
  const { hub, members, media } = deps

  const studioDescribe = {
    POST: async (req: Request) => {
      const sess = await media.requireUploadSession(req)
      if (sess instanceof NextResponse) return sess
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

      const oversized = rejectOversizedRequest(req, PUBLISH_MAX_BYTES)
      if (oversized) return oversized

      let form: FormData
      try {
        form = await req.formData()
      } catch {
        return invalid()
      }

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
        return NextResponse.json({ error: { code: 'PROJECT_TOO_LARGE' } }, { status: 413 })
      }
      let projectBytes: Buffer
      let publicationProject: Project | null = null
      // Metadado do projeto p/ o selo de nível do remix no card do Mural (derivado
      // do projeto JÁ saneado — cosmético; o gate real do remix é no clique).
      let studioMeta: { pro: boolean; extensions: string[] } | null = null
      try {
        const rawProject = JSON.parse(
          Buffer.from(await projectPart.arrayBuffer()).toString('utf-8'),
        )
        const project = sanitizeProjectForHost(rawProject)
        if (!project) return invalid()
        publicationProject = studioPublicProject(project)
        studioMeta = {
          pro: project.kind === 'pro',
          extensions: project.installedExtensions.map((ext) => ext.id),
        }
        projectBytes = Buffer.from(JSON.stringify(publicationProject), 'utf-8')
        if (projectBytes.length > PROJECT_MAX_BYTES) {
          return NextResponse.json({ error: { code: 'PROJECT_TOO_LARGE' } }, { status: 413 })
        }
      } catch {
        return invalid()
      }

      // 1. Elegibilidade (UX antecipado — o hub re-valida de forma autoritativa).
      const payload = await members.getShowcasePayload(lessonId, blockId)
      if (payload.status !== 200 || !payload.body) {
        return NextResponse.json(payload.body ?? { error: { code: 'SHOWCASE_FAILED' } }, {
          status: payload.status === 200 ? 502 : payload.status,
        })
      }
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
      const playId =
        publicationProject?.kind === 'pro'
          ? studioPublicationPlayId(owner, `lesson:${lessonId}:${blockId}`, clientIdempotencyKey)
          : randomUUID()
      if (publicationProject?.kind === 'pro') {
        try {
          await publishStudioProRevision({
            project: publicationProject,
            source: projectBytes.toString('utf8'),
            playId,
            owner,
            requestId: clientIdempotencyKey,
            expectedVersion: 0,
            parentOrigin: new URL(req.url).origin,
            signal: req.signal,
          })
        } catch (error) {
          return publicationError(error)
        }
      }

      // 2. Capa: print/upload da criança → R2 PÚBLICO; OU a capa padrão do curso
      // (admin) quando ela escolheu "usar a capa do curso" (`useDefaultCover`). A URL
      // do admin vem do payload AUTORITATIVO do members (não confiamos no cliente).
      let coverImageUrl: string | null = null
      const cover = form.get('cover')
      if (
        cover instanceof File &&
        cover.size > 0 &&
        cover.size <= COVER_MAX_BYTES &&
        UGC_IMAGE_INPUT_MIME.has(cover.type)
      ) {
        try {
          const optimized = await optimizeImage(await cover.arrayBuffer(), 'ugc')
          const stored = await r2PutObject({
            key: `studio/cover/${sess.id}/${randomUUID()}.${optimized.extension}`,
            body: optimized.buffer,
            contentType: optimized.contentType,
          })
          coverImageUrl = stored.url
        } catch {
          // best-effort: deixa null.
        }
      } else if (form.get('useDefaultCover') === '1') {
        coverImageUrl = payload.body.defaultCoverUrl ?? null
      }

      if (publicationProject?.kind === 'pro' && !coverImageUrl) {
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
          coverImageUrl = (
            await r2PutObject({
              key: `studio/cover/${sess.id}/${playId}.${optimized.extension}`,
              body: optimized.buffer,
              contentType: optimized.contentType,
            })
          ).url
        } catch (error) {
          return publicationError(error)
        }
      }

      // 3. Projeto jogável → R2 PRIVADO (servido só via /api/studio/play/:id; sem URL pública).
      try {
        await r2PutObjectPrivate({
          key: PLAY_KEY(playId),
          body: projectBytes,
          contentType: 'application/json',
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }

      // 4. Cria o post no Mural (o hub re-valida elegibilidade + autor do header).
      const r = await hub.createShowcaseThreadStudio({
        spaceSlug: MURAL_SPACE_SLUG,
        lessonId,
        blockId,
        coverImageUrl,
        description,
        playId,
        clientIdempotencyKey,
        studioMeta,
      })
      if (r.status !== 200 || !r.body) {
        return NextResponse.json(r.body ?? { error: { code: 'SHOWCASE_FAILED' } }, {
          status: r.status,
        })
      }
      const threadId = r.body.thread.id
      // O playId real é o do post DEVOLVIDO (dedupe pode trazer um post anterior).
      const resolvedPlayId = r.body.thread.playId ?? playId
      if (publicationProject?.kind === 'pro' && resolvedPlayId !== playId) {
        try {
          const canonical = await callStudioPublication(
            { operation: 'get', playId: resolvedPlayId, owner },
            req.signal,
          )
          // A legacy deduplicated post can predate compiled Pro publications.
          // Preserve an existing canonical revision; only migrate a missing one.
          if (!isStudioProPublication(canonical))
            await publishStudioProRevision({
              project: publicationProject,
              source: projectBytes.toString('utf8'),
              playId: resolvedPlayId,
              owner,
              requestId: clientIdempotencyKey,
              expectedVersion: 0,
              parentOrigin: new URL(req.url).origin,
              signal: req.signal,
            })
          await r2PutObjectPrivate({
            key: PLAY_KEY(resolvedPlayId),
            body: projectBytes,
            contentType: 'application/json',
          })
        } catch (error) {
          return publicationError(error)
        }
      }
      return NextResponse.json(
        {
          muralUrl: `/${MURAL_SPACE_SLUG}?thread=${encodeURIComponent(threadId)}`,
          playUrl: `/jogar/${resolvedPlayId}`,
          ...(publicationProject?.kind === 'pro' ? { publicationId: resolvedPlayId } : {}),
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

      const oversized = rejectOversizedRequest(req, PUBLISH_MAX_BYTES)
      if (oversized) return oversized

      let form: FormData
      try {
        form = await req.formData()
      } catch {
        return invalid()
      }

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
        if (response.status !== 200 || !response.body?.eligible)
          return NextResponse.json(response.body ?? { error: { code: 'SHOWCASE_NOT_ELIGIBLE' } }, {
            status: response.status === 200 ? 409 : response.status,
          })
        liveSnapshot = response.body
      }

      const projectPart = form.get('project')
      if (!liveSnapshot && (!(projectPart instanceof File) || projectPart.size === 0))
        return invalid()
      if (!liveSnapshot && projectPart instanceof File && projectPart.size > PROJECT_MAX_BYTES) {
        return NextResponse.json({ error: { code: 'PROJECT_TOO_LARGE' } }, { status: 413 })
      }
      let projectBytes: Buffer
      let publicationProject: Project | null = null
      // Metadado do projeto p/ o selo de nível do remix (cosmético; gate real no clique).
      let studioMeta: { pro: boolean; extensions: string[] } | null = null
      try {
        const rawProject =
          liveSnapshot?.project ??
          (projectPart instanceof File
            ? JSON.parse(Buffer.from(await projectPart.arrayBuffer()).toString('utf-8'))
            : null)
        const project = sanitizeProjectForHost(rawProject)
        if (!project) return invalid()
        publicationProject = studioPublicProject(project)
        studioMeta = {
          pro: project.kind === 'pro',
          extensions: project.installedExtensions.map((ext) => ext.id),
        }
        projectBytes = Buffer.from(JSON.stringify(publicationProject), 'utf-8')
        if (projectBytes.length > PROJECT_MAX_BYTES) {
          return NextResponse.json({ error: { code: 'PROJECT_TOO_LARGE' } }, { status: 413 })
        }
      } catch {
        return invalid()
      }

      const owner = studioPublicationOwner(sess.id, sess.activeProfile?.accountId ?? sess.id)
      const playId =
        liveSnapshot?.playId ??
        (publicationProject?.kind === 'pro'
          ? studioPublicationPlayId(owner, 'standalone', clientIdempotencyKey)
          : randomUUID())
      if (publicationProject?.kind === 'pro') {
        if (!liveSnapshot) {
          const access = await members.checkStudioAccess()
          if (access.status !== 200 || access.body?.access?.['estudio-completo'] !== true)
            return NextResponse.json(
              { error: { code: 'SHOWCASE_NOT_ELIGIBLE' } },
              { status: access.status >= 500 ? 503 : 403 },
            )
        }
        try {
          await publishStudioProRevision({
            project: publicationProject,
            source: projectBytes.toString('utf8'),
            playId,
            owner,
            requestId: clientIdempotencyKey,
            expectedVersion: 0,
            parentOrigin: new URL(req.url).origin,
            signal: req.signal,
          })
        } catch (error) {
          return publicationError(error)
        }
      }

      // Capa (print) → R2 PÚBLICO (best-effort → null = sem capa).
      let coverImageUrl: string | null = null
      const cover = form.get('cover')
      if (
        cover instanceof File &&
        cover.size > 0 &&
        cover.size <= COVER_MAX_BYTES &&
        UGC_IMAGE_INPUT_MIME.has(cover.type)
      ) {
        try {
          const optimized = await optimizeImage(await cover.arrayBuffer(), 'ugc')
          const stored = await r2PutObject({
            key: `studio/cover/${sess.id}/${randomUUID()}.${optimized.extension}`,
            body: optimized.buffer,
            contentType: optimized.contentType,
          })
          coverImageUrl = stored.url
        } catch {
          // best-effort: deixa null.
        }
      }

      if (publicationProject?.kind === 'pro' && !coverImageUrl) {
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
          coverImageUrl = (
            await r2PutObject({
              key: `studio/cover/${sess.id}/${playId}.${optimized.extension}`,
              body: optimized.buffer,
              contentType: optimized.contentType,
            })
          ).url
        } catch (error) {
          return publicationError(error)
        }
      }

      // Projeto jogável → R2 PRIVADO (servido só via /api/studio/play/:id).
      try {
        await r2PutObjectPrivate({
          key: PLAY_KEY(playId),
          body: projectBytes,
          contentType: 'application/json',
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }

      // Cria o post no Mural (o hub re-valida a POSSE do produto + autor do header).
      const r = await hub.createShowcaseThreadStudioStandalone({
        ...(liveSnapshot
          ? {
              liveWorkspace: {
                id: liveWorkspaceId,
                revision: liveRevision,
                publicationToken: liveSnapshot.publicationToken,
              },
            }
          : {}),
        spaceSlug: MURAL_SPACE_SLUG,
        title,
        description,
        coverImageUrl,
        playId,
        clientIdempotencyKey,
        challengeKey: liveSnapshot ? null : challengeKey,
        studioMeta,
      })
      if (r.status !== 200 || !r.body) {
        // A timeout or even a rejected retry cannot prove Hub did not commit a
        // previous attempt. Keep the stable private object for reconciliation.
        return NextResponse.json(r.body ?? { error: { code: 'SHOWCASE_FAILED' } }, {
          status: r.status,
        })
      }
      const threadId = r.body.thread.id
      const resolvedPlayId = r.body.thread.playId ?? playId
      if (publicationProject?.kind === 'pro' && resolvedPlayId !== playId) {
        try {
          const canonical = await callStudioPublication(
            { operation: 'get', playId: resolvedPlayId, owner },
            req.signal,
          )
          // A legacy deduplicated post can predate compiled Pro publications.
          // Preserve an existing canonical revision; only migrate a missing one.
          if (!isStudioProPublication(canonical))
            await publishStudioProRevision({
              project: publicationProject,
              source: projectBytes.toString('utf8'),
              playId: resolvedPlayId,
              owner,
              requestId: clientIdempotencyKey,
              expectedVersion: 0,
              parentOrigin: new URL(req.url).origin,
              signal: req.signal,
            })
          await r2PutObjectPrivate({
            key: PLAY_KEY(resolvedPlayId),
            body: projectBytes,
            contentType: 'application/json',
          })
        } catch (error) {
          return publicationError(error)
        }
      }
      if (liveSnapshot && publicationProject?.kind !== 'pro' && resolvedPlayId !== playId) {
        // Older attempts used random IDs. Hub identifies the canonical object
        // for this same author/workspace/revision/key: restore it before success.
        try {
          await r2PutObjectPrivate({
            key: PLAY_KEY(resolvedPlayId),
            body: projectBytes,
            contentType: 'application/json',
          })
        } catch (error) {
          return mediaErrorResponse(error)
        }
        await r2DeleteObjectPrivate(PLAY_KEY(playId)).catch(() => {})
      }
      return NextResponse.json(
        {
          muralUrl: `/${MURAL_SPACE_SLUG}?thread=${encodeURIComponent(threadId)}`,
          playUrl: `/jogar/${resolvedPlayId}`,
          ...(publicationProject?.kind === 'pro' ? { publicationId: resolvedPlayId } : {}),
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
      if (playable.status !== 200 || playable.body?.visible !== true) {
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      }
      // Visível confirmado → grava o dedupe (não polui o mapa com playIds inexistentes/ocultos).
      if (wouldCount) commitCountPlay(ip, id)
      try {
        const obj = await r2GetObjectPrivate(PLAY_KEY(id))
        const bytes = await bufferFromStream(obj.body, PROJECT_MAX_BYTES)
        let project = await prepareProjectForHost(JSON.parse(bytes.toString('utf-8')))
        let compiledUrl: string | undefined
        let compiledRevision: string | undefined
        if (project?.kind === 'pro') {
          const published = await callStudioPublication(
            { operation: 'resolve', playId: id },
            req.signal,
          )
          if (!published || !('source' in published))
            return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
          project = await prepareProjectForHost(JSON.parse(published.source))
          if (project?.kind !== 'pro')
            throw new ProjectDocumentError('invalid-document', 'Publicação Pro inválida.')
          compiledRevision = published.publication.activeRevision
          compiledUrl = studioProPublicationUrl(
            new URL(getEnv().STUDIO_PRO_RUNTIME_URL!).origin,
            id,
            compiledRevision,
          )
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
        // Erro = inexistente/inacessível (404), não vaza detalhe.
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      }
    },
  }

  // S2S do HUB (rede interna, HMAC): apaga os artefatos R2 de um post do Mural
  // APAGADO pela moderação — o snapshot jogável (R2 privado `studio/play/<id>.json`)
  // e a capa (R2 público `studio/cover/...`, que seguiria buscável pela URL). FORA do
  // matcher do proxy (não é sessão de aluno): a auth é o HMAC do hub. Best-effort: o
  // hub dispara em fire-and-forget → 204 sempre, salvo 401 em assinatura inválida.
  const studioCleanup = {
    POST: async (req: Request) => {
      const secret = getEnv().GATEWAY_HMAC_SECRET
      let raw: string
      try {
        raw = req.body ? (await bufferFromStream(req.body, 4096)).toString('utf8') : ''
      } catch {
        return invalid()
      }
      // Sem segredo não há como autenticar o chamador → no-op (não apaga nada).
      if (!secret) return new NextResponse(null, { status: 204 })
      if (!verifyCleanupSignature(secret, raw, req.headers.get('x-signature'))) {
        return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      }
      let body: { playId?: unknown; coverUrl?: unknown }
      try {
        body = JSON.parse(raw)
      } catch {
        return invalid()
      }
      const playId = typeof body.playId === 'string' ? body.playId : ''
      if (!UUID_RE.test(playId)) return invalid()
      try {
        await enqueueStudioPublicationCleanup(playId.toLowerCase(), body.coverUrl)
      } catch {
        // Hub retries 5xx; never acknowledge cleanup before its intent is durable.
        return NextResponse.json({ error: { code: 'CLEANUP_UNAVAILABLE' } }, { status: 503 })
      }
      try {
        await performStudioPublicationCleanup(
          playId.toLowerCase(),
          typeof body.coverUrl === 'string'
            ? coverKeyFromPublicUrl(getEnv().R2_PUBLIC_URL, body.coverUrl)
            : null,
          AbortSignal.timeout(2500),
        )
      } catch {
        console.info('[studio-publication] cleanup queued', { playId })
      }
      return new NextResponse(null, { status: 204 })
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
        return NextResponse.json(await drainStudioPublicationCleanup(), {
          headers: { 'Cache-Control': 'no-store' },
        })
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
                operation: z.literal('update'),
                playId: z.string().uuid(),
                requestId: z.string().uuid(),
                expectedVersion: z.number().int().positive(),
                project: z.unknown(),
              })
              .strict(),
          ])
          .safeParse(await readJsonBodyWithLimit(request, PROJECT_MAX_BYTES + 32768))
        if (!parsed.success) return invalid()
        const input = parsed.data
        const owner = studioPublicationOwner(user.id, user.activeProfile?.accountId ?? user.id)
        if (input.operation === 'update') {
          const access = await members.checkStudioAccess()
          if (access.status !== 200 || access.body?.access?.['estudio-completo'] !== true)
            return NextResponse.json({ error: { code: 'SHOWCASE_NOT_ELIGIBLE' } }, { status: 403 })
          const visible = await hub.resolveStudioPlay(input.playId, false)
          if (visible.status !== 200 || visible.body?.visible !== true)
            return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
          const previous = await callStudioPublication(
            { operation: 'get', playId: input.playId, owner },
            request.signal,
          )
          if (!isStudioProPublication(previous))
            return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
          const project = sanitizeProjectForHost(input.project)
          if (project?.kind !== 'pro') return invalid()
          return NextResponse.json(
            await publishStudioProRevision({
              project: studioPublicProject(project),
              source: JSON.stringify(studioPublicProject(project)),
              playId: input.playId,
              owner,
              requestId: input.requestId,
              expectedVersion: input.expectedVersion,
              parentOrigin: new URL(request.url).origin,
              signal: request.signal,
            }),
            { headers: { 'Cache-Control': 'no-store' } },
          )
        }
        return NextResponse.json(await callStudioPublication({ ...input, owner }, request.signal), {
          headers: { 'Cache-Control': 'no-store' },
        })
      } catch (error) {
        return publicationError(error)
      }
    },
  }
  return {
    studioDescribe,
    studioPublish,
    studioPublishStandalone,
    studioPlay,
    studioCleanup,
    studioPublicationAuthorize,
    studioPublicationCleanup,
    studioPublication,
  }
}
