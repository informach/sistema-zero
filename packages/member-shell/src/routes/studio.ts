import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { UGC_IMAGE_INPUT_MIME } from '../lib/hub-attachments'
import type { HubClient, MembersClient } from '../server/clients'
import { optimizeImage } from '../server/image-optimizer'
import { type MediaModule, mediaErrorResponse, rejectOversizedRequest } from '../server/media'
import { generateProjectDescription } from '../server/openrouter'
import { r2GetObjectPrivate, r2PutObject, r2PutObjectPrivate } from '../server/r2'

export type StudioRoutes = ReturnType<typeof createStudioRoutes>

const invalid = () => NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })

/** Slug do servidor do Mural (kids). Só a vitrine kids chama estas rotas. */
const MURAL_SPACE_SLUG = 'mural-dos-criadores'
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const COVER_MAX_BYTES = 4 * 1024 * 1024 // print do jogo (WebP/PNG)
const PROJECT_MAX_BYTES = 6 * 1024 * 1024 // projeto auto-suficiente (assets data URLs)
const PUBLISH_MAX_BYTES = 8 * 1024 * 1024 // teto do multipart inteiro (cover + projeto + campos)
const PROJECT_FILE_MAX_CHARS = 2_000_000
const PROJECT_TOTAL_FILE_MAX_CHARS = 5_000_000
const PROJECT_EXTRA_FILE_MAX_CHARS = 1_000_000
const PROJECT_MAX_EXTRA_FILES = 100
const PROJECT_MAX_ASSETS = 128
const PROJECT_MAX_INSTALLED_EXTENSIONS = 100
/** Prefixo do artefato jogável no bucket PRIVADO (servido só via /api/studio/play/:id). */
const PLAY_KEY = (id: string) => `studio/play/${id}.json`

// Descrição: só os 3 arquivos canônicos (clampados) — NÃO o projeto com assets.
const DescribeBody = z.object({
  files: z.object({
    html: z.string().max(20_000).optional(),
    css: z.string().max(20_000).optional(),
    js: z.string().max(40_000).optional(),
  }),
  title: z.string().max(200).optional(),
})

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
    rlStore.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (e.count >= 10) return true
  e.count += 1
  return false
}

function sanitizeProjectString(raw: unknown, maxChars: number): string {
  return typeof raw === 'string' ? raw.slice(0, maxChars) : ''
}

function sanitizeProjectFiles(raw: unknown): {
  'index.html': string
  'style.css': string
  'script.js': string
} | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const files = raw as Record<string, unknown>
  const out = {
    'index.html': sanitizeProjectString(files['index.html'], PROJECT_FILE_MAX_CHARS),
    'style.css': sanitizeProjectString(files['style.css'], PROJECT_FILE_MAX_CHARS),
    'script.js': sanitizeProjectString(files['script.js'], PROJECT_FILE_MAX_CHARS),
  }
  const total = out['index.html'].length + out['style.css'].length + out['script.js'].length
  return total <= PROJECT_TOTAL_FILE_MAX_CHARS ? out : null
}

function sanitizeProjectExtraFiles(raw: unknown) {
  if (!Array.isArray(raw)) return []
  const out: Array<{
    name: string
    language: 'html' | 'css' | 'javascript' | 'typescript'
    content: string
  }> = []
  for (const item of raw) {
    if (out.length >= PROJECT_MAX_EXTRA_FILES) break
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const f = item as Record<string, unknown>
    const language =
      f.language === 'html' ||
      f.language === 'css' ||
      f.language === 'javascript' ||
      f.language === 'typescript'
        ? f.language
        : null
    if (typeof f.name !== 'string' || !language || typeof f.content !== 'string') continue
    out.push({
      name: f.name.slice(0, 160),
      language,
      content: f.content.slice(0, PROJECT_EXTRA_FILE_MAX_CHARS),
    })
  }
  return out
}

function sanitizeProjectAssets(raw: unknown) {
  if (!Array.isArray(raw)) return []
  const out: Array<{
    id: string
    name: string
    kind: 'image'
    dataUrl: string
    source: 'upload' | 'library'
    width?: number
    height?: number
    libId?: string
  }> = []
  for (const item of raw) {
    if (out.length >= PROJECT_MAX_ASSETS) break
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const a = item as Record<string, unknown>
    if (a.kind !== 'image') continue
    if (typeof a.name !== 'string' || typeof a.dataUrl !== 'string') continue
    if (!a.dataUrl.startsWith('data:image/')) continue
    const asset: (typeof out)[number] = {
      id: typeof a.id === 'string' && a.id.trim() ? a.id.slice(0, 128) : a.name.slice(0, 128),
      name: a.name.slice(0, 128),
      kind: 'image',
      dataUrl: a.dataUrl,
      source: a.source === 'library' ? 'library' : 'upload',
    }
    if (typeof a.width === 'number' && Number.isFinite(a.width) && a.width > 0) {
      asset.width = Math.floor(a.width)
    }
    if (typeof a.height === 'number' && Number.isFinite(a.height) && a.height > 0) {
      asset.height = Math.floor(a.height)
    }
    if (asset.source === 'library' && typeof a.libId === 'string')
      asset.libId = a.libId.slice(0, 128)
    out.push(asset)
  }
  return out
}

function sanitizeProjectExtensions(raw: unknown) {
  if (!Array.isArray(raw)) return []
  const out: Array<{ id: string; version: string; installedAt: number }> = []
  for (const item of raw) {
    if (out.length >= PROJECT_MAX_INSTALLED_EXTENSIONS) break
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const ext = item as Record<string, unknown>
    if (typeof ext.id !== 'string' || !ext.id.trim()) continue
    out.push({
      id: ext.id.slice(0, 128),
      version: typeof ext.version === 'string' ? ext.version.slice(0, 64) : '0.0.0',
      installedAt:
        typeof ext.installedAt === 'number' && Number.isFinite(ext.installedAt)
          ? ext.installedAt
          : 0,
    })
  }
  return out
}

function sanitizePlayableProject(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const project = raw as Record<string, unknown>
  const files = sanitizeProjectFiles(project.files)
  if (!files) return null
  const now = Date.now()
  return {
    id:
      typeof project.id === 'string' && project.id.trim() ? project.id.slice(0, 128) : randomUUID(),
    name:
      typeof project.name === 'string' && project.name.trim()
        ? project.name.trim().slice(0, 200)
        : 'Projeto',
    createdAt:
      typeof project.createdAt === 'number' && Number.isFinite(project.createdAt)
        ? project.createdAt
        : now,
    updatedAt:
      typeof project.updatedAt === 'number' && Number.isFinite(project.updatedAt)
        ? project.updatedAt
        : now,
    mode:
      project.mode === 'code' || project.mode === 'bridge' || project.mode === 'blocks'
        ? project.mode
        : 'blocks',
    files,
    extraFiles: sanitizeProjectExtraFiles(project.extraFiles),
    assets: sanitizeProjectAssets(project.assets),
    ir:
      project.ir && typeof project.ir === 'object' && !Array.isArray(project.ir)
        ? project.ir
        : null,
    blocksState:
      project.blocksState && typeof project.blocksState === 'object' ? project.blocksState : null,
    installedExtensions: sanitizeProjectExtensions(project.installedExtensions),
    ...(project.kind === 'pro' ? { kind: 'pro' as const } : {}),
  }
}

/**
 * Rotas do "Compartilhar" do Estúdio (consumidas pelo community-kids):
 * - `POST /api/studio/describe` — rascunho da descrição via OpenRouter (servidor), fail-soft.
 * - `POST /api/studio/publish` — print→R2 público, projeto→R2 privado, post no Mural + link de jogar.
 * - `GET  /api/studio/play/:id` — PÚBLICO (sem login): stream do projeto do R2 (mesma origem).
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
        json = await req.json()
      } catch {
        return invalid()
      }
      const parsed = DescribeBody.safeParse(json)
      if (!parsed.success) return invalid()
      const { files, title } = parsed.data
      const total = (files.html?.length ?? 0) + (files.css?.length ?? 0) + (files.js?.length ?? 0)
      if (total > 80_000) return invalid()
      // Fail-soft: erro/sem chave → { description:'', fallback:true } (criança escreve).
      const result = await generateProjectDescription({ files, title })
      return NextResponse.json(result, { status: 200 })
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
      try {
        const rawProject = JSON.parse(
          Buffer.from(await projectPart.arrayBuffer()).toString('utf-8'),
        )
        const project = sanitizePlayableProject(rawProject)
        if (!project) return invalid()
        projectBytes = Buffer.from(JSON.stringify(project), 'utf-8')
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

      // 3. Projeto jogável → R2 PRIVADO (servido só via /api/studio/play/:id; sem URL pública).
      const playId = randomUUID()
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
      })
      if (r.status !== 200 || !r.body) {
        return NextResponse.json(r.body ?? { error: { code: 'SHOWCASE_FAILED' } }, {
          status: r.status,
        })
      }
      const threadId = r.body.thread.id
      // O playId real é o do post DEVOLVIDO (dedupe pode trazer um post anterior).
      const resolvedPlayId = r.body.thread.playId ?? playId
      return NextResponse.json(
        {
          muralUrl: `/${MURAL_SPACE_SLUG}?thread=${encodeURIComponent(threadId)}`,
          playUrl: `/jogar/${resolvedPlayId}`,
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

      const projectPart = form.get('project')
      if (!(projectPart instanceof File) || projectPart.size === 0) return invalid()
      if (projectPart.size > PROJECT_MAX_BYTES) {
        return NextResponse.json({ error: { code: 'PROJECT_TOO_LARGE' } }, { status: 413 })
      }
      let projectBytes: Buffer
      try {
        const rawProject = JSON.parse(
          Buffer.from(await projectPart.arrayBuffer()).toString('utf-8'),
        )
        const project = sanitizePlayableProject(rawProject)
        if (!project) return invalid()
        projectBytes = Buffer.from(JSON.stringify(project), 'utf-8')
        if (projectBytes.length > PROJECT_MAX_BYTES) {
          return NextResponse.json({ error: { code: 'PROJECT_TOO_LARGE' } }, { status: 413 })
        }
      } catch {
        return invalid()
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

      // Projeto jogável → R2 PRIVADO (servido só via /api/studio/play/:id).
      const playId = randomUUID()
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
        spaceSlug: MURAL_SPACE_SLUG,
        title,
        description,
        coverImageUrl,
        playId,
        clientIdempotencyKey,
      })
      if (r.status !== 200 || !r.body) {
        return NextResponse.json(r.body ?? { error: { code: 'SHOWCASE_FAILED' } }, {
          status: r.status,
        })
      }
      const threadId = r.body.thread.id
      const resolvedPlayId = r.body.thread.playId ?? playId
      return NextResponse.json(
        {
          muralUrl: `/${MURAL_SPACE_SLUG}?thread=${encodeURIComponent(threadId)}`,
          playUrl: `/jogar/${resolvedPlayId}`,
          deduped: r.body.deduped,
        },
        { status: 200 },
      )
    },
  }

  const studioPlay = {
    // PÚBLICO (sem login): só serve enquanto o playId segue associado a post visível
    // no Mural. O projeto fica no R2 privado, MESMA ORIGEM (sem CORS).
    GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      if (!UUID_RE.test(id))
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      const playable = await hub.resolveStudioPlay(id)
      if (playable.status !== 200 || playable.body?.visible !== true) {
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      }
      try {
        const obj = await r2GetObjectPrivate(PLAY_KEY(id))
        return new NextResponse(obj.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } catch {
        // Erro = inexistente/inacessível (404), não vaza detalhe.
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      }
    },
  }

  return { studioDescribe, studioPublish, studioPublishStandalone, studioPlay }
}
