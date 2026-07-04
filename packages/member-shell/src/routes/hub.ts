import 'server-only'
import { randomUUID } from 'node:crypto'
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
import { attachAuthorAvatars, collectAuthorIds, redactAuthors } from '../lib/hub-redact'
import { stripImageMarkdown } from '../lib/markdown'
import type { HubAttachmentKind } from '../lib/types'
import type { HubClient, MembersAudience, MembersClient } from '../server/clients'
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
  // Referência opcional a um jogo do Mural ("Mostrar meu jogo no Clube") — o hub valida
  // que é um /jogar de vitrine visível de verdade.
  playId: z.string().uuid().nullish(),
  attachmentIds: ATTACHMENT_IDS,
})
const CreateComment = z.object({
  body: BODY,
  replyToId: z.string().uuid().nullish(),
  attachmentIds: ATTACHMENT_IDS,
})
const EditBody = z.object({ body: BODY, version: z.number().int().nonnegative() })
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

function num(raw: string | null): number | undefined {
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null)
}

/**
 * Resolve+valida o id de path como UUID (fail-fast na borda; espelha o
 * `hubShowcase`). Não-uuid → `null` → o handler responde 400 em vez de mandar lixo
 * ao gateway. A autorização real (matrícula/role no alvo) segue no hub.
 */
async function idFrom(ctx: { params: Promise<{ id: string }> }): Promise<string | null> {
  const { id } = await ctx.params
  return UUID_RE.test(id) ? id : null
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
  /** Vitrine do app — `kids` liga rosto+aura+nome de TODOS os autores (ver `okRedactedWithAvatars`). */
  audience: MembersAudience
}) {
  const { hub, members, media, session, audience } = deps
  // Só o Clube/Mural KIDS mostra rosto+aura+nome de todos; o fórum adulto segue com a
  // redação clássica (nome só quando público, sem avatar).
  const revealAuthors = audience === 'kids'
  // Id do viewer p/ redigir o autor de terceiros (null = sem sessão → tudo redigido).
  const viewerId = async (): Promise<string | null> => (await session.getSession())?.id ?? null

  /**
   * Como `okRedacted`, mas na vitrine KIDS enriquece cada tópico/comentário com o
   * avatar+nível do autor (LOTE ao members, sem N+1) ANTES de redigir o `authorId`, e
   * revela o 1º nome de todos (`revealAuthors`). Best-effort: falha/ausência de avatar
   * NUNCA quebra o fórum (cai na redação normal). No app adulto = `okRedacted` puro.
   */
  const okRedactedWithAvatars = async (
    r: GatewayResponse,
    vid: string | null,
  ): Promise<NextResponse> => {
    if (!revealAuthors) return okRedacted(r, vid)
    const ids = [...collectAuthorIds(r.body)]
    if (ids.length > 0) {
      try {
        const res = await members.listAvatarsByProfileIds(ids)
        if (res.status === 200 && res.body?.avatars) {
          const enriched = attachAuthorAvatars(r.body, res.body.avatars)
          return NextResponse.json(redactAuthors(enriched, vid, true), { status: r.status })
        }
      } catch {
        // best-effort — segue sem avatar (nunca derruba a carga do fórum).
      }
    }
    return NextResponse.json(redactAuthors(r.body, vid, true), { status: r.status })
  }

  const impersonationReadonly = () =>
    NextResponse.json(
      {
        error: {
          code: 'IMPERSONATION_READONLY',
          message: 'Sessão de suporte é somente-leitura.',
        },
      },
      { status: 403 },
    )

  async function requireWritableSession(): Promise<NextResponse | null> {
    const user = await session.getSession()
    return user?.act ? impersonationReadonly() : null
  }

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
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const url = new URL(req.url)
      // `challenge` = prateleira do Desafio do mês (`m:YYYY-MM`); lixo → ignorado
      // (lista completa) — o hub também valida no DTO.
      const rawChallenge = url.searchParams.get('challenge') ?? ''
      const [r, vid] = await Promise.all([
        hub.listThreads(id, {
          cursor: url.searchParams.get('cursor') ?? undefined,
          limit: num(url.searchParams.get('limit')),
          challenge: /^m:\d{4}-\d{2}$/.test(rawChallenge) ? rawChallenge : undefined,
        }),
        viewerId(),
      ])
      return okRedactedWithAvatars(r, vid)
    },
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = CreateThread.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const r = await hub.createThread(id, {
        title: parsed.data.title,
        // Neutraliza imagem externa no corpo de UGC (pixel-rastreador) já na origem.
        body: stripImageMarkdown(parsed.data.body),
        // Referência a um jogo do Mural ("Mostrar meu jogo") — o hub valida a visibilidade.
        playId: parsed.data.playId ?? null,
        attachmentIds: parsed.data.attachmentIds,
      })
      return okRedactedWithAvatars(r, await viewerId())
    },
  }

  // Sino "novas respostas nas suas conversas": tópicos do PRÓPRIO aluno (sem redação —
  // são todos dele). O app diffa o `commentCount` contra um baseline local.
  const hubMyThreads = {
    GET: async () => ok(await hub.listMyThreads()),
  }

  const hubThread = {
    GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const [r, vid] = await Promise.all([hub.getThread(id), viewerId()])
      return okRedactedWithAvatars(r, vid)
    },
    PATCH: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = EditBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const r = await hub.editThread(id, stripImageMarkdown(parsed.data.body), parsed.data.version)
      return okRedacted(r, await viewerId())
    },
  }

  const hubThreadComments = {
    GET: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const url = new URL(req.url)
      const [r, vid] = await Promise.all([
        hub.listComments(id, {
          after: url.searchParams.get('after') ?? undefined,
          limit: num(url.searchParams.get('limit')),
        }),
        viewerId(),
      ])
      return okRedactedWithAvatars(r, vid)
    },
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = CreateComment.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const r = await hub.createComment(id, {
        // Neutraliza imagem externa no corpo de UGC (pixel-rastreador) já na origem.
        body: stripImageMarkdown(parsed.data.body),
        replyToId: parsed.data.replyToId ?? null,
        attachmentIds: parsed.data.attachmentIds,
      })
      return okRedacted(r, await viewerId())
    },
  }

  const hubComment = {
    PATCH: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = EditBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      const r = await hub.editComment(id, stripImageMarkdown(parsed.data.body), parsed.data.version)
      return okRedacted(r, await viewerId())
    },
  }

  const hubThreadReactions = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = ReactBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      return ok(await hub.react('thread', id, parsed.data.emoji))
    },
  }

  const hubThreadReactionDelete = {
    DELETE: async (_req: Request, ctx: { params: Promise<{ id: string; emoji: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const p = await ctx.params
      if (!UUID_RE.test(p.id)) return invalid()
      return ok(await hub.unreact('thread', p.id, p.emoji))
    },
  }

  const hubCommentReactions = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = ReactBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      return ok(await hub.react('comment', id, parsed.data.emoji))
    },
  }

  const hubCommentReactionDelete = {
    DELETE: async (_req: Request, ctx: { params: Promise<{ id: string; emoji: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const p = await ctx.params
      if (!UUID_RE.test(p.id)) return invalid()
      return ok(await hub.unreact('comment', p.id, p.emoji))
    },
  }

  const hubChannelSeen = {
    POST: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const id = await idFrom(ctx)
      if (!id) return invalid()
      return ok(await hub.markSeen(id))
    },
  }

  const hubThreadReport = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = ReportBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      return ok(await hub.report('thread', id, parsed.data.reason))
    },
  }

  const hubCommentReport = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = ReportBody.safeParse(await readJson(req))
      if (!parsed.success) return invalid()
      const id = await idFrom(ctx)
      if (!id) return invalid()
      return ok(await hub.report('comment', id, parsed.data.reason))
    },
  }

  // ── Anexos (UGC) ───────────────────────────────────────────────────────────

  /**
   * Presign de upload DIRETO browser→R2 para arquivos grandes (PDF/documento/
   * áudio/vídeo). Valida tipo/tamanho, registra o metadado `pending_upload` no hub
   * (fonte da verdade dos limites) e mina o PUT pré-assinado com Content-Length/
   * Content-Type ASSINADOS — o cliente não consegue subir mais bytes nem outro
   * tipo do que foi autorizado. Imagens NÃO usam esta rota (vão re-encodadas).
   *
   * ⚠️ Os BYTES do anexo NÃO são inspecionados (o BFF nunca os vê — vão direto ao
   * R2): o `mime` declarado é só validado contra a allowlist, então um arquivo pode
   * conter conteúdo que não casa com o tipo declarado. Sem risco de XSS — `text/html`/
   * `image/svg+xml` ficam FORA da allowlist, documentos são servidos com
   * `Content-Disposition: attachment`, e o serve é um 302 p/ origem do R2 (cross-origin,
   * fora da origem do app). Mas é content-spoofing num fórum infantil: a MODERAÇÃO
   * deve tratar os bytes do anexo como NÃO CONFIÁVEIS (pré-aprovação + report/hide).
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
      // 2. Capa: print do jogo (file) → R2 PÚBLICO; senão `null` (o hub cai na capa
      //    padrão do admin). Best-effort — falha no upload mantém `null` (não derruba).
      let coverImageUrl: string | null = null
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
          // best-effort: deixa `null` → o hub usa a capa padrão.
        }
      }

      // 3. Título/resumo/nome-do-autor/idempotência NÃO são enviados: o hub os resolve
      //    (S2S ao members + header de perfil do gateway) e re-valida a elegibilidade —
      //    a rota é alcançável na borda, confiar no corpo era o furo do full review.
      const r = await hub.createShowcaseThread({
        spaceSlug: MURAL_SPACE_SLUG,
        lessonId,
        blockId,
        coverImageUrl,
      })
      return ok(r)
    },
  }

  return {
    hubSpaces,
    hubSpace,
    hubChannels,
    hubChannelThreads,
    hubMyThreads,
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
