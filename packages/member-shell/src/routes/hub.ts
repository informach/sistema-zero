import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  extForMime,
  HUB_ATTACHMENT_LIMITS,
  isAllowedMime,
  isHubAttachmentKind,
  isInlineKind,
  sanitizeFilename,
  UGC_IMAGE_INPUT_MIME,
} from '../lib/hub-attachments'
import { redactAuthors } from '../lib/hub-redact'
import type { HubAttachmentKind } from '../lib/types'
import type { HubClient, MembersClient } from '../server/clients'
import type { GatewayResponse } from '../server/gateway'
import { optimizeImage } from '../server/image-optimizer'
import { type MediaModule, mediaErrorResponse, rejectOversizedRequest } from '../server/media'
import { r2PresignGetUgc, r2PresignPutUgc, r2PutObject, r2PutObjectUgc } from '../server/r2'
import type { SessionModule } from '../server/session'

export type HubRoutes = ReturnType<typeof createHubRoutes>

const invalid = () => NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
const ok = (r: GatewayResponse) => NextResponse.json(r.body, { status: r.status })
/** Como `ok`, mas esconde o `authorId` de terceiros (privacidade — ver `hub-redact`). */
const okRedacted = (r: GatewayResponse, viewerId: string | null) =>
  NextResponse.json(redactAuthors(r.body, viewerId), { status: r.status })

const BODY = z.string().min(1).max(50_000)
const ATTACHMENT_IDS = z.array(z.string().uuid()).max(HUB_ATTACHMENT_LIMITS.maxPerPost).optional()
const CreateThread = z.object({
  title: z.string().min(1).max(300),
  body: BODY,
  attachmentIds: ATTACHMENT_IDS,
})
const CreateComment = z.object({
  body: BODY,
  replyToId: z.string().uuid().nullish(),
  attachmentIds: ATTACHMENT_IDS,
})
const EditBody = z.object({ body: BODY })
const ReactBody = z.object({ emoji: z.string().min(1).max(16) })
const ReportBody = z.object({ reason: z.string().min(1).max(1000) })

const ATTACHMENT_KINDS = ['image', 'pdf', 'document', 'audio', 'video'] as const
const PresignBody = z.object({
  kind: z.enum(ATTACHMENT_KINDS),
  mime: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  originalName: z.string().min(1).max(300),
})

const R2_UGC_PREFIX = 'r2ugc:'

/** Slug do servidor do Mural (kids). Fixo — o app adulto não chama esta rota. */
const MURAL_SPACE_SLUG = 'mural-dos-criadores'
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Prefixo de chave do UGC por dono (namespacing). */
function ugcKey(userId: string, ext: string): string {
  return `hub/${userId}/${randomUUID()}.${ext}`
}

/** Primeiro nome (a vitrine mostra só o 1º nome da criança como autor do projeto). */
function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? ''
  return (first || 'Criador').slice(0, 60)
}

function num(raw: string | null): number | undefined {
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null)
}

/**
 * Route handlers `/api/hub/*` dos apps de aluno (community + community-kids). A
 * lógica vive aqui; cada `route.ts` do app vira 1-3 linhas
 * (`export const { GET, POST } = shell.routes.hubThreads`). Espelha o
 * `createShellRoutes`. O ID do aluno e o acesso são resolvidos no hub (via gateway).
 */
export function createHubRoutes(deps: {
  hub: HubClient
  members: MembersClient
  media: MediaModule
  session: SessionModule
}) {
  const { hub, members, media, session } = deps
  // Id do viewer p/ redigir o autor de terceiros (null = sem sessão → tudo redigido).
  const viewerId = async (): Promise<string | null> => (await session.getSession())?.id ?? null

  const hubSpaces = {
    GET: async () => ok(await hub.listSpaces()),
  }

  const hubSpace = {
    GET: async (_req: Request, ctx: { params: Promise<{ slug: string }> }) =>
      ok(await hub.getSpace((await ctx.params).slug)),
  }

  const hubChannels = {
    GET: async (_req: Request, ctx: { params: Promise<{ slug: string }> }) =>
      ok(await hub.listChannels((await ctx.params).slug)),
  }

  const hubChannelThreads = {
    GET: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      const url = new URL(req.url)
      const [r, vid] = await Promise.all([
        hub.listThreads(id, {
          cursor: url.searchParams.get('cursor') ?? undefined,
          limit: num(url.searchParams.get('limit')),
        }),
        viewerId(),
      ])
      return okRedacted(r, vid)
    },
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = CreateThread.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const r = await hub.createThread((await ctx.params).id, {
        title: parsed.data.title,
        body: parsed.data.body,
        attachmentIds: parsed.data.attachmentIds,
      })
      return okRedacted(r, await viewerId())
    },
  }

  const hubThread = {
    GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const [r, vid] = await Promise.all([hub.getThread((await ctx.params).id), viewerId()])
      return okRedacted(r, vid)
    },
    PATCH: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = EditBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const r = await hub.editThread((await ctx.params).id, parsed.data.body)
      return okRedacted(r, await viewerId())
    },
  }

  const hubThreadComments = {
    GET: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      const url = new URL(req.url)
      const [r, vid] = await Promise.all([
        hub.listComments(id, {
          after: url.searchParams.get('after') ?? undefined,
          limit: num(url.searchParams.get('limit')),
        }),
        viewerId(),
      ])
      return okRedacted(r, vid)
    },
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = CreateComment.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const r = await hub.createComment((await ctx.params).id, {
        body: parsed.data.body,
        replyToId: parsed.data.replyToId ?? null,
        attachmentIds: parsed.data.attachmentIds,
      })
      return okRedacted(r, await viewerId())
    },
  }

  const hubComment = {
    PATCH: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = EditBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const r = await hub.editComment((await ctx.params).id, parsed.data.body)
      return okRedacted(r, await viewerId())
    },
  }

  const hubThreadReactions = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = ReactBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      return ok(await hub.react('thread', (await ctx.params).id, parsed.data.emoji))
    },
  }

  const hubThreadReactionDelete = {
    DELETE: async (_req: Request, ctx: { params: Promise<{ id: string; emoji: string }> }) => {
      const p = await ctx.params
      return ok(await hub.unreact('thread', p.id, p.emoji))
    },
  }

  const hubCommentReactions = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = ReactBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      return ok(await hub.react('comment', (await ctx.params).id, parsed.data.emoji))
    },
  }

  const hubCommentReactionDelete = {
    DELETE: async (_req: Request, ctx: { params: Promise<{ id: string; emoji: string }> }) => {
      const p = await ctx.params
      return ok(await hub.unreact('comment', p.id, p.emoji))
    },
  }

  const hubChannelSeen = {
    POST: async (_req: Request, ctx: { params: Promise<{ id: string }> }) =>
      ok(await hub.markSeen((await ctx.params).id)),
  }

  const hubThreadReport = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = ReportBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      return ok(await hub.report('thread', (await ctx.params).id, parsed.data.reason))
    },
  }

  const hubCommentReport = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const parsed = ReportBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      return ok(await hub.report('comment', (await ctx.params).id, parsed.data.reason))
    },
  }

  // ── Anexos (UGC) ───────────────────────────────────────────────────────────

  /**
   * Presign de upload DIRETO browser→R2 para arquivos grandes (PDF/documento/
   * áudio/vídeo). Valida tipo/tamanho, registra o metadado `pending_upload` no hub
   * (fonte da verdade dos limites) e mina o PUT pré-assinado com Content-Length/
   * Content-Type ASSINADOS — o cliente não consegue subir mais bytes nem outro
   * tipo do que foi autorizado. Imagens NÃO usam esta rota (vão re-encodadas).
   */
  const hubUploadPresign = {
    POST: async (req: Request) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user

      const parsed = PresignBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const { kind, mime, sizeBytes, originalName } = parsed.data
      // Imagem é re-encodada no BFF — não pode subir crua por presign (EXIF/bomba).
      if (kind === 'image') return invalid()
      if (!isAllowedMime(kind, mime)) {
        return NextResponse.json(
          {
            error: {
              code: 'ATTACHMENT_TYPE_NOT_ALLOWED',
              message: 'Tipo de arquivo não permitido.',
            },
          },
          { status: 400 },
        )
      }
      if (sizeBytes > HUB_ATTACHMENT_LIMITS.maxBytesByKind[kind]) {
        return NextResponse.json(
          { error: { code: 'ATTACHMENT_TOO_LARGE', message: 'Arquivo acima do limite.' } },
          { status: 400 },
        )
      }

      try {
        const key = ugcKey(user.id, extForMime(mime))
        const storageRef = `${R2_UGC_PREFIX}${key}`
        // Registra no hub ANTES de assinar (o hub revalida o limite); só assina se ok.
        const reg = await hub.registerAttachment({
          kind,
          mime,
          sizeBytes,
          originalName,
          storageRef,
        })
        if (reg.status !== 201 || !reg.body?.id) {
          return NextResponse.json(reg.body ?? { error: { code: 'REGISTER_FAILED' } }, {
            status: reg.status === 201 ? 502 : reg.status,
          })
        }
        const uploadUrl = await r2PresignPutUgc({
          key,
          contentType: mime,
          contentLength: sizeBytes,
        })
        return NextResponse.json({
          id: reg.body.id,
          uploadUrl,
          method: 'PUT',
          headers: { 'content-type': mime },
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  /**
   * Upload de IMAGEM via BFF: re-encoda p/ WebP (strip de EXIF/metadados + anti
   * image-bomb), sobe no R2 UGC e registra o metadado já `pending_upload`. Devolve
   * a view do anexo para o compositor pré-visualizar. Arquivo ≤ limite de imagem.
   */
  const hubUploadImage = {
    POST: async (req: Request) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user

      const maxBytes = HUB_ATTACHMENT_LIMITS.maxBytesByKind.image
      const oversized = rejectOversizedRequest(req, maxBytes)
      if (oversized) return oversized

      try {
        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File) || file.size === 0) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Envie uma imagem.' } },
            { status: 400 },
          )
        }
        if (!UGC_IMAGE_INPUT_MIME.has(file.type)) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Formato inválido. Use PNG, JPG ou WebP.',
              },
            },
            { status: 400 },
          )
        }
        if (file.size > maxBytes) {
          return NextResponse.json(
            { error: { code: 'ATTACHMENT_TOO_LARGE', message: 'Imagem acima do limite.' } },
            { status: 400 },
          )
        }

        const optimized = await optimizeImage(await file.arrayBuffer(), 'ugc')
        const key = ugcKey(user.id, optimized.extension)
        await r2PutObjectUgc({
          key,
          body: optimized.buffer,
          contentType: optimized.contentType,
        })
        const originalName = sanitizeFilename(file.name || 'imagem')
        const reg = await hub.registerAttachment({
          kind: 'image',
          mime: optimized.contentType,
          sizeBytes: optimized.sizeBytes,
          originalName,
          storageRef: `${R2_UGC_PREFIX}${key}`,
        })
        if (reg.status !== 201 || !reg.body?.id) {
          return NextResponse.json(reg.body ?? { error: { code: 'REGISTER_FAILED' } }, {
            status: reg.status === 201 ? 502 : reg.status,
          })
        }
        return NextResponse.json({
          id: reg.body.id,
          kind: 'image' as HubAttachmentKind,
          mime: optimized.contentType,
          sizeBytes: optimized.sizeBytes,
          width: optimized.width,
          height: optimized.height,
          durationSeconds: null,
          originalName,
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  /**
   * Serve um anexo: o hub autoriza (acesso ao conteúdo-pai) e devolve a
   * `storageRef` (NUNCA exposta ao browser); o BFF mina um GET pré-assinado de TTL
   * curto e responde 302 — o download vem DIRETO do R2 (sem arrastar mídia pesada
   * pelo Next). Documento vai como `attachment`; mídia/PDF, inline.
   */
  const hubAttachmentServe = {
    GET: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user

      const { id } = await ctx.params
      const resolved = await hub.resolveAttachment(id)
      if (resolved.status !== 200 || !resolved.body) {
        return NextResponse.json(
          resolved.body ?? { error: { code: 'NOT_FOUND', message: 'Anexo não encontrado' } },
          { status: resolved.status === 200 ? 502 : resolved.status },
        )
      }

      const { storageRef, mime, kind, originalName } = resolved.body
      if (!storageRef.startsWith(R2_UGC_PREFIX)) {
        return NextResponse.json(
          { error: { code: 'INVALID_ATTACHMENT', message: 'Referência de anexo inválida' } },
          { status: 502 },
        )
      }

      try {
        const key = storageRef.slice(R2_UGC_PREFIX.length)
        const safeKind = isHubAttachmentKind(kind) ? kind : 'document'
        const base = sanitizeFilename(originalName)
        const ext = extForMime(mime)
        const filename = base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`
        const disposition = isInlineKind(safeKind)
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`
        const url = await r2PresignGetUgc(key, {
          responseContentDisposition: disposition,
          responseContentType: mime,
        })
        return NextResponse.redirect(url, 302)
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  /**
   * Publica o projeto concluído no Mural dos Criadores. Multipart: `lessonId`,
   * `blockId` e (opcional) `file` = print do jogo capturado no cliente. O conteúdo
   * (título/resumo/capa padrão) é AUTORITATIVO do members (não confia no cliente); o
   * autor é o PRIMEIRO NOME da sessão. A capa do print sobe ao R2 público; sem print
   * (projeto web) ou falha → cai na capa padrão do admin. Idempotente no hub.
   */
  const hubShowcase = {
    POST: async (req: Request) => {
      // Multipart fora do matcher do proxy → guard próprio (sessão estrita + anti-CSRF).
      const sess = await media.requireUploadSession(req)
      if (sess instanceof NextResponse) return sess

      const maxBytes = HUB_ATTACHMENT_LIMITS.maxBytesByKind.image
      const oversized = rejectOversizedRequest(req, maxBytes)
      if (oversized) return oversized

      let form: FormData
      try {
        form = await req.formData()
      } catch {
        return invalid()
      }
      const lessonId = String(form.get('lessonId') ?? '')
      const blockId = String(form.get('blockId') ?? '')
      if (!UUID_RE.test(lessonId) || !UUID_RE.test(blockId)) return invalid()

      // 1. Conteúdo autoritativo + elegibilidade (o members confere acesso + entrega).
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
      const { title, summary, defaultCoverUrl, chain, courseId } = payload.body

      // 2. Capa: print do jogo (file) → R2 PÚBLICO; senão a capa padrão do admin. A
      //    capa é best-effort — falha no upload cai na capa padrão (não derruba o post).
      let coverImageUrl = defaultCoverUrl
      const file = form.get('file')
      if (
        file instanceof File &&
        file.size > 0 &&
        file.size <= maxBytes &&
        UGC_IMAGE_INPUT_MIME.has(file.type)
      ) {
        try {
          const optimized = await optimizeImage(await file.arrayBuffer(), 'ugc')
          const stored = await r2PutObject({
            key: `hub/showcase/${sess.id}/${randomUUID()}.${optimized.extension}`,
            body: optimized.buffer,
            contentType: optimized.contentType,
          })
          coverImageUrl = stored.url
        } catch {
          // best-effort: mantém a capa padrão.
        }
      }

      // 3. Autor = primeiro nome do perfil ativo (kids) ou da conta.
      const displayName = firstName(sess.activeProfile?.name ?? sess.firstName ?? 'Criador')

      // 4. Idempotência: perfil:curso:cadeia (re-conclusão/duplo-clique não duplica).
      const idempotencyKey = createHash('sha256')
        .update(`${sess.id}:${courseId}:${chain ?? ''}`)
        .digest('hex')

      const r = await hub.createShowcaseThread({
        spaceSlug: MURAL_SPACE_SLUG,
        authorDisplayName: displayName,
        title,
        summary,
        coverImageUrl,
        idempotencyKey,
      })
      return ok(r)
    },
  }

  return {
    hubSpaces,
    hubSpace,
    hubChannels,
    hubChannelThreads,
    hubThread,
    hubThreadComments,
    hubComment,
    hubThreadReactions,
    hubThreadReactionDelete,
    hubCommentReactions,
    hubCommentReactionDelete,
    hubChannelSeen,
    hubThreadReport,
    hubCommentReport,
    hubShowcase,
    hubUploadPresign,
    hubUploadImage,
    hubAttachmentServe,
  }
}
