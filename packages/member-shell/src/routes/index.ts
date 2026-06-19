import 'server-only'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  DIRECT_DELIVERY_MIN_BYTES,
  resolveDownloadMedia,
  WATERMARK_MAX_BYTES,
} from '../lib/download-mime'
import { redactProfilesForProfileSession } from '../lib/profile-redaction'
import type { ChildDashboardView } from '../lib/types'
import type { AuthClient, MembersClient, PaymentsClient, ProfilesClient } from '../server/clients'
import type { GatewayModule, GatewayResponse } from '../server/gateway'
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  type MediaModule,
  mediaErrorResponse,
  optimizeAndStoreAvatar,
  rejectOversizedRequest,
  removeStaleAvatars,
} from '../server/media'
import { presignWatermarkedPdf } from '../server/private-delivery'
import {
  bufferFromStream,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PresignGetPrivate,
} from '../server/r2'
import type { SessionModule } from '../server/session'
import { watermarkImage, watermarkPdf } from '../server/watermark'
import { watermarkGate } from '../server/watermark-queue'

const R2_PRIVATE_PREFIX = 'r2priv:'

export interface ShellRoutesDeps {
  session: SessionModule
  gateway: GatewayModule
  auth: AuthClient
  members: MembersClient
  payments: PaymentsClient
  profiles: ProfilesClient
  media: MediaModule
}

export type ShellRoutes = ReturnType<typeof createShellRoutes>

// ── Helpers compartilhados pelos handlers ────────────────────────────────────

/** Extensão segura derivada da key do bucket (fallback: sem extensão). */
function extensionFromKey(key: string): string | null {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,8}$/.test(ext) && key.includes('.') ? ext : null
}

/** Nome ASCII-seguro p/ o Content-Disposition (espelha o admin media.ts). */
function sanitizeFilename(filename: string): string {
  return (
    filename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove diacríticos combinantes (ã → a)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 120) || 'material'
  )
}

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isInteger(n)) return def
  return Math.min(Math.max(n, min), max)
}

// ── Schemas (espelham os TypeBox dos serviços) ──────────────────────────────

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) })

const UpdateMeBody = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  // Telefone é OBRIGATÓRIO no perfil (todo comprador o cadastra na compra):
  // a borda não aceita limpar (null) e exige o formato só-dígitos BR que o
  // funil grava no auth (DDD + número). O auth segue genérico de propósito.
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .optional(),
})

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
})

const ForgotPasswordBody = z.object({ email: z.string().email() })

const ResetPasswordBody = z.object({
  token: z.string().min(10).max(512),
  newPassword: z.string().min(1).max(200),
})

const RequestOtpBody = z.object({
  email: z.string().email(),
  purpose: z.enum(['sign_in', 'password_reset']),
})

const VerifyOtpBody = z.object({ email: z.string().email(), code: z.string().min(4).max(12) })

const ResetOtpBody = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
  newPassword: z.string().min(1).max(200),
})

// ── Perfis (estilo Netflix) — espelham os DTOs do auth ──────────────────────
const ProfileName = z.string().trim().min(1).max(60)
const ProfileWhatsapp = z.string().trim().max(20).nullable().optional()
// Data de nascimento (AAAA-MM-DD; sanidade/faixa de idade são do auth). A
// autorização "só os pais" é da rota do auth — aqui é só pass-through validado.
const ProfileBirthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
const CreateProfileBody = z.object({
  name: ProfileName,
  whatsapp: ProfileWhatsapp,
  birthDate: ProfileBirthDate,
})
const UpdateProfileBody = z
  .object({
    name: ProfileName.optional(),
    whatsapp: ProfileWhatsapp,
    birthDate: ProfileBirthDate,
  })
  .refine(
    (b) => b.name !== undefined || b.whatsapp !== undefined || b.birthDate !== undefined,
    'Nada para atualizar',
  )
const ExitProfileBody = z.object({ password: z.string().min(1).max(200) })

const FeedbackAnswer = z.enum(['yes', 'no', 'unsure'])

// Espelha o TypeBox do members (CourseRatingBody): nota nos 9 valores válidos,
// comment ≤5000, feedback STRICT com as 6 chaves fixas.
const CourseRatingBody = z.object({
  rating: z.union([
    z.literal(1),
    z.literal(1.5),
    z.literal(2),
    z.literal(2.5),
    z.literal(3),
    z.literal(3.5),
    z.literal(4),
    z.literal(4.5),
    z.literal(5),
  ]),
  comment: z.string().max(5000).nullable().optional(),
  feedbackAnswers: z
    .object({
      importantInfo: FeedbackAnswer.optional(),
      clearExplanations: FeedbackAnswer.optional(),
      engagingInstructor: FeedbackAnswer.optional(),
      enoughPractice: FeedbackAnswer.optional(),
      meetsExpectations: FeedbackAnswer.optional(),
      knowledgeable: FeedbackAnswer.optional(),
    })
    .strict()
    .nullable()
    .optional(),
})

const VideoPositionBody = z.object({
  courseSlug: z.string().min(1).max(200),
  positionSeconds: z.number().int().min(0).max(100_000),
})

const QuizAttemptBody = z.object({
  // Espelha o TypeBox do members: ≤100 questões, ≤20 choices/questão, chaves/ids ≤64.
  answers: z
    .record(z.string().min(1).max(64), z.array(z.string().min(1).max(64)).max(20))
    .refine((a) => Object.keys(a).length <= 100, 'Máximo de 100 questões'),
})

/**
 * Valida o corpo da entrega do Estúdio SEM reserializar/strip — o projeto precisa
 * chegar ao members INTACTO (zod `.parse` removeria `mode`/`ir`/`blocksState`/
 * `installedExtensions`, corrompendo a entrega). Só checamos a forma mínima e
 * devolvemos a referência ORIGINAL; o shape inteiro é sanitizado no front da lib e
 * revalidado no members. Teto de tamanho é da borda (gateway 2 MB) e do members.
 */
function extractStudioProject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const project = (raw as { project?: unknown }).project
  if (!project || typeof project !== 'object' || Array.isArray(project)) return null
  const p = project as Record<string, unknown>
  if (typeof p.name !== 'string' || typeof p.files !== 'object' || p.files === null) return null
  return p
}

const invalidInput = () => NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })

/** Valida ids de path (perfil etc.) ANTES de tocar gateway/R2 — fail-fast e não
 * deixa um id forjado virar prefixo de chave no R2 (ver profileAvatar). */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Handlers dos Route Handlers `/api/*` dos apps de área do aluno — a LÓGICA
 * inteira vive aqui (community e community-kids consomem os MESMOS handlers; um
 * fix de segurança pousa num lugar só). Cada `route.ts` do app vira 1-3 linhas:
 * `export const { POST } = shell.routes.authLogin`.
 */
export function createShellRoutes(deps: ShellRoutesDeps) {
  const { session, gateway, auth, members, payments, profiles, media } = deps

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

  // ── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Login do aluno: qualquer conta ATIVA entra (inclusive `customer` — diferente
   * do admin, que filtra papel). Conta inativa → 403 do auth → INACTIVE.
   */
  const authLogin = {
    POST: async (req: Request) => {
      const parsed = LoginBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()

      const { status, body } = await gateway.loginRequest(parsed.data.email, parsed.data.password)

      if (status === 403) {
        return NextResponse.json({ error: { code: 'INACTIVE' } }, { status: 403 })
      }
      // NÃO mascarar erro de upstream como credencial inválida (já atrapalhou
      // diagnóstico): 429 = rate-limit do gateway (20/min/IP); 5xx = indisponível.
      if (status === 429) {
        return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
      }
      if (status >= 500) {
        return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
      }
      if (status !== 200 || !body?.tokens || !body?.user) {
        return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS' } }, { status: 401 })
      }

      await session.setSessionCookies(body.tokens)
      return NextResponse.json({ ok: true })
    },
  }

  const authLogout = {
    POST: async () => {
      const refresh = await session.getRefreshToken()
      if (refresh) await gateway.logoutRequest(refresh)
      await session.clearSessionCookies()
      return NextResponse.json({ ok: true })
    },
  }

  /** Edita o perfil do PRÓPRIO aluno (nome/telefone — e-mail não é editável). */
  const authMe = {
    PATCH: async (req: Request) => {
      // Sessão de IMPERSONAÇÃO (claim `act`) é SOMENTE-LEITURA p/ dados do aluno:
      // suporte não altera perfil/credenciais de quem está sendo atendido.
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = UpdateMeBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      const { status, body } = await auth.updateMe(parsed.data)
      return NextResponse.json(body, { status })
    },
  }

  /**
   * Troca a senha logado (exige a atual). O auth revoga TODAS as sessões —
   * limpamos os cookies aqui também; o cliente redireciona ao login.
   */
  const authMePassword = {
    POST: async (req: Request) => {
      // Sessão de IMPERSONAÇÃO é SOMENTE-LEITURA: suporte não troca a senha do
      // aluno (trocar credenciais alheias seria takeover).
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = ChangePasswordBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      const { status, body } = await auth.changeMyPassword(parsed.data)
      if (status === 200) await session.clearSessionCookies()
      return NextResponse.json(body, { status })
    },
  }

  /**
   * Recuperação por LINK. Anti-enumeração vale p/ a resposta do AUTH (sempre
   * 200) — NÃO p/ falha de infra: 429/5xx engolidos virariam "e-mail enviado"
   * sem e-mail nunca chegar (mesma regra do OTP).
   */
  const authForgotPassword = {
    POST: async (req: Request) => {
      const parsed = ForgotPasswordBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      let upstream: GatewayResponse | null = null
      try {
        upstream = await auth.forgotPassword(parsed.data.email)
      } catch {
        upstream = null // rede/timeout → indisponível
      }
      if (upstream?.status === 429) {
        return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
      }
      if (!upstream || upstream.status >= 500) {
        return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
      }
      return NextResponse.json({ ok: true })
    },
  }

  const authResetPassword = {
    POST: async (req: Request) => {
      const parsed = ResetPasswordBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      const { status, body } = await auth.resetPassword(parsed.data.token, parsed.data.newPassword)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /**
   * Pede um código OTP. Anti-enumeração vale p/ a resposta do AUTH (sempre 200)
   * — NÃO p/ falha de infra: 429 (rate limit do gateway, 5/min/IP) e 5xx
   * engolidos virariam "código enviado" sem código nunca chegar. A UI distingue.
   */
  const authOtpRequest = {
    POST: async (req: Request) => {
      const parsed = RequestOtpBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      let upstream: GatewayResponse | null = null
      try {
        upstream = await auth.requestOtp(parsed.data.email, parsed.data.purpose)
      } catch {
        upstream = null // rede/timeout → indisponível
      }
      if (upstream?.status === 429) {
        return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
      }
      if (!upstream || upstream.status >= 500) {
        return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
      }
      return NextResponse.json({ ok: true })
    },
  }

  /**
   * Login por OTP (passwordless): qualquer conta ATIVA entra. Código inválido/
   * expirado → 401. Em sucesso, grava os cookies de sessão (igual ao login).
   */
  const authOtpVerify = {
    POST: async (req: Request) => {
      const parsed = VerifyOtpBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()

      const { status, body } = await gateway.verifyOtpRequest(parsed.data.email, parsed.data.code)
      if (status === 403) {
        return NextResponse.json({ error: { code: 'INACTIVE' } }, { status: 403 })
      }
      // NÃO mascarar rate limit/indisponibilidade como "código inválido".
      if (status === 429) {
        return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
      }
      if (status >= 500) {
        return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
      }
      if (status !== 200 || !body?.tokens || !body?.user) {
        return NextResponse.json({ error: { code: 'INVALID_OTP' } }, { status: 401 })
      }

      await session.setSessionCookies(body.tokens)
      return NextResponse.json({ ok: true })
    },
  }

  /** Recuperação de senha por OTP: consome o código e define a nova senha. */
  const authPasswordResetOtp = {
    POST: async (req: Request) => {
      const parsed = ResetOtpBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      const { status, body } = await auth.resetPasswordWithOtp(
        parsed.data.email,
        parsed.data.code,
        parsed.data.newPassword,
      )
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

  /**
   * Troca a foto de perfil: multipart (`file`) → sharp→WebP → R2 → PATCH /auth/me
   * (via gateway) com a URL pública. O R2 é provedor externo (mesma exceção
   * consciente do admin) — o guard de sessão (ESTRITO) é feito aqui.
   */
  const meAvatar = {
    POST: async (req: Request) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user

      // ANTES do formData(): o parse materializa o corpo inteiro em memória.
      const oversized = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
      if (oversized) return oversized

      try {
        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File) || file.size === 0) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Envie um arquivo de imagem.' } },
            { status: 400 },
          )
        }
        if (!IMAGE_MIME_TYPES.has(file.type)) {
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
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'A foto deve ter no máximo 5MB.' } },
            { status: 400 },
          )
        }

        const stored = await optimizeAndStoreAvatar(file, user.id)
        const { status, body } = await auth.updateMe({ avatarUrl: stored.url })
        if (status !== 200) {
          return NextResponse.json(body ?? { error: { code: 'UPDATE_FAILED' } }, { status })
        }
        // Avatar trocado com sucesso → apaga os anteriores (best-effort; sem isso
        // cada troca deixaria um objeto órfão no R2 para sempre).
        await removeStaleAvatars(user.id, stored.key)
        return NextResponse.json({ url: stored.url, user: body?.user })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  // ── Downloads (anexos + e-book) ───────────────────────────────────────────

  /**
   * Download de material da aula com MARCA D'ÁGUA por aluno: PDFs ganham o e-mail
   * no rodapé de todas as páginas; imagens, o selo no canto. Demais formatos são
   * servidos em STREAM (sem marca e sem materializar 100MB em memória), mas só
   * por aqui (sessão + matrícula). O MIME/marca é decidido por sinais REAIS
   * (Content-Type do R2 + extensão da key — `resolveDownloadMedia`); o `fileType`
   * do anexo é texto livre do admin e não pode desligar a marca em silêncio.
   * O R2 privado é provedor externo (mesma exceção consciente do avatar) → guard
   * de sessão local ESTRITO; a AUTORIZAÇÃO real (matrícula ativa + aula
   * publicada) é do members via gateway.
   */
  const attachmentDownload = {
    GET: async (
      req: Request,
      ctx: { params: Promise<{ slug: string; lessonId: string; attachmentId: string }> },
    ) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user

      const { slug, lessonId, attachmentId } = await ctx.params
      const resolved = await members.resolveAttachment(slug, lessonId, attachmentId)
      if (resolved.status !== 200 || !resolved.body) {
        return NextResponse.json(
          resolved.body ?? { error: { code: 'NOT_FOUND', message: 'Material não encontrado' } },
          { status: resolved.status === 200 ? 502 : resolved.status },
        )
      }

      const { label, storageRef } = resolved.body

      // Anexo externo (URL colada pelo admin) ou legado público → passthrough.
      if (!storageRef.startsWith(R2_PRIVATE_PREFIX)) {
        if (!/^https?:\/\//.test(storageRef)) {
          return NextResponse.json(
            { error: { code: 'INVALID_ATTACHMENT', message: 'Referência de material inválida' } },
            { status: 502 },
          )
        }
        return NextResponse.redirect(storageRef, 302)
      }

      try {
        const key = storageRef.slice(R2_PRIVATE_PREFIX.length)
        // HEAD primeiro: arquivo GRANDE nem passa pela rota (302 p/ o R2 direto) —
        // servir 100MB+ por aqui segura buffer/stream na memória do servidor
        // enquanto a conexão do aluno escoa (incidente 10/06).
        const head = await r2HeadObjectPrivate(key)
        if (!head) {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Arquivo do material não encontrado' } },
            { status: 404 },
          )
        }
        const dlMedia = resolveDownloadMedia({
          contentType: head.contentType,
          key,
          fileType: resolved.body.fileType,
        })

        // Nome do download: label do anexo + extensão real do arquivo.
        const ext = extensionFromKey(key)
        const base = sanitizeFilename(label)
        const filename = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base
        const disposition = `attachment; filename="${filename}"`
        const len = head.contentLength

        if (len !== null && len > DIRECT_DELIVERY_MIN_BYTES) {
          // PDF marcável dentro do teto → cache do PDF marcado + 302 direto do R2.
          if (dlMedia.watermark === 'pdf' && len <= WATERMARK_MAX_BYTES) {
            const url = await presignWatermarkedPdf({
              srcKey: key,
              email: user.email,
              userId: user.id,
              responseContentDisposition: disposition,
            })
            return NextResponse.redirect(url, 302)
          }
          // Sem marca (office/zip/…), imagem gigante (não realista) ou acima do
          // teto da marca → original direto do R2 (mesma filosofia do fallback).
          if (len > WATERMARK_MAX_BYTES && dlMedia.watermark !== null) {
            console.warn(
              "[anexos] arquivo excede o teto da marca d'água — pré-assinando original",
              { key, contentLength: len },
            )
          }
          const url = await r2PresignGetPrivate(key, { responseContentDisposition: disposition })
          return NextResponse.redirect(url, 302)
        }

        const obj = await r2GetObjectPrivate(key)
        const headers = {
          'content-type': dlMedia.mime,
          'content-disposition': disposition,
          // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
          'cache-control': 'private, no-store',
        }

        // Sem marca (office/zip/áudio/…) → STREAM direto, sem bufferizar.
        if (dlMedia.watermark === null) {
          return new Response(obj.body, { headers })
        }

        // Bufferizar+marcar dentro do GATE de concorrência: materializa ≤20MB +
        // cópias do pdf-lib/sharp — sem teto, N downloads simultâneos = OOM.
        return await watermarkGate().run(async () => {
          const original = await bufferFromStream(obj.body)
          let out: Uint8Array = original
          try {
            out =
              dlMedia.watermark === 'pdf'
                ? await watermarkPdf(original, user.email)
                : await watermarkImage(original, dlMedia.mime, user.email)
          } catch (error) {
            // PDF cifrado/imagem corrompida: melhor servir o original do que falhar.
            console.warn('[anexos] watermark falhou — servindo original', { key, error })
          }
          return new Response(new Uint8Array(out), { headers })
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  /**
   * PDF do bloco e-book com MARCA D'ÁGUA por aluno (e-mail no rodapé de todas as
   * páginas — mesma pipeline dos anexos). Servido INLINE: o livro 3D busca este
   * PDF, renderiza as páginas com pdf.js e usa como texturas — a marca d'água já
   * vai estampada nas páginas. AUTORIZAÇÃO real (matrícula + aula publicada +
   * bloco e-book) é do members via gateway.
   */
  const ebookDownload = {
    GET: async (
      req: Request,
      ctx: { params: Promise<{ slug: string; lessonId: string; blockId: string }> },
    ) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user

      const { slug, lessonId, blockId } = await ctx.params
      const resolved = await members.resolveEbook(slug, lessonId, blockId)
      if (resolved.status !== 200 || !resolved.body) {
        return NextResponse.json(
          resolved.body ?? { error: { code: 'NOT_FOUND', message: 'E-book não encontrado' } },
          { status: resolved.status === 200 ? 502 : resolved.status },
        )
      }

      const { storageRef } = resolved.body

      // URL externa/legada → passthrough (sem marca; o pdf.js busca de lá direto).
      if (!storageRef.startsWith(R2_PRIVATE_PREFIX)) {
        if (!/^https?:\/\//.test(storageRef)) {
          return NextResponse.json(
            { error: { code: 'INVALID_EBOOK', message: 'Referência de e-book inválida' } },
            { status: 502 },
          )
        }
        return NextResponse.redirect(storageRef, 302)
      }

      try {
        const key = storageRef.slice(R2_PRIVATE_PREFIX.length)
        // HEAD primeiro: arquivo GRANDE nem passa pela rota (302 p/ o R2 direto).
        const head = await r2HeadObjectPrivate(key)
        if (!head) {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Arquivo do e-book não encontrado' } },
            { status: 404 },
          )
        }
        // Sinais reais (Content-Type do R2 + extensão .pdf) decidem a marca.
        const dlMedia = resolveDownloadMedia({ contentType: head.contentType, key, fileType: null })
        const len = head.contentLength

        if (len !== null && len > DIRECT_DELIVERY_MIN_BYTES) {
          if (dlMedia.watermark !== 'pdf' || len > WATERMARK_MAX_BYTES) {
            // Sem marca possível (legado raro / acima do teto) → original direto.
            if (len > WATERMARK_MAX_BYTES) {
              console.warn("[ebook] PDF excede o teto da marca d'água — pré-assinando original", {
                key,
                contentLength: len,
              })
            }
            const url = await r2PresignGetPrivate(key, { responseContentDisposition: 'inline' })
            return NextResponse.redirect(url, 302)
          }
          const url = await presignWatermarkedPdf({
            srcKey: key,
            email: user.email,
            userId: user.id,
            responseContentDisposition: 'inline',
          })
          return NextResponse.redirect(url, 302)
        }

        const obj = await r2GetObjectPrivate(key)
        const headers = {
          'content-type': 'application/pdf',
          // INLINE: é consumido pelo pdf.js do livro 3D, não baixado pelo usuário.
          'content-disposition': 'inline',
          // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
          'cache-control': 'private, no-store',
        }

        // Sem sinal de PDF (legado raro) → serve cru em stream, como antes.
        if (dlMedia.watermark !== 'pdf') {
          return new Response(obj.body, { headers })
        }

        // Bufferizar+marcar dentro do GATE de concorrência: materializa ≤20MB +
        // cópias do pdf-lib — sem teto, N livros abertos ao mesmo tempo = OOM.
        return await watermarkGate().run(async () => {
          const original = await bufferFromStream(obj.body)
          let out: Uint8Array = original
          try {
            out = await watermarkPdf(original, user.email)
          } catch (error) {
            // PDF cifrado/corrompido: melhor servir o original do que quebrar o livro.
            console.warn('[ebook] watermark de PDF falhou — servindo original', { key, error })
          }
          return new Response(new Uint8Array(out), { headers })
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  // ── Members (progresso/quiz/rating) ──────────────────────────────────────

  /**
   * Classificação do curso (estilo Udemy): cada passo do fluxo de modais persiste
   * o estado ACUMULADO via este PUT (fechar no meio não perde o que já foi salvo).
   */
  const courseRating = {
    PUT: async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { slug } = await ctx.params
      const parsed = CourseRatingBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } },
          { status: 400 },
        )
      }
      const { status, body } = await members.saveCourseRating(slug, parsed.data)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /** Única mutação do player: marca a aula como concluída (idempotente no members). */
  const lessonComplete = {
    POST: async (_req: Request, ctx: { params: Promise<{ lessonId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { lessonId } = await ctx.params
      const { status, body } = await members.markLessonComplete(lessonId)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /** Perfil de gamificação do aluno (XP/streak/badges) — widgets client-side. */
  const gamificationMe = {
    GET: async () => {
      const { status, body } = await members.getGamification()
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /**
   * Resumo de progresso dos FILHOS p/ a área dos pais (kids). Junta a IDENTIDADE dos
   * perfis (auth — nome/foto) com os STATS por perfil (members).
   *
   * ⚠️ `profiles.list()` usa o `accountContext` do auth, que ACEITA tanto sessão de
   * conta quanto de perfil (resolve pela conta) — NÃO recusa 403 numa sessão de perfil.
   * Os STATS, porém, ficam zerados p/ a criança: o members keya por `x-auth-user-id`
   * (= profileId numa sessão de perfil), que não casa nenhum `account_id` → tudo 0
   * (intencional). Mesmo assim, p/ o portão ser coerente o shim do KIDS gateia esta
   * rota com `requireParentGateAccountOnly` (recusa sessão de perfil), então a criança
   * não chega aqui — é uma tela exclusiva dos pais.
   */
  const childrenStats = {
    GET: async () => {
      const list = await profiles.list()
      if (list.status !== 200) {
        return NextResponse.json(list.body ?? { children: [] }, { status: list.status })
      }
      const accountProfiles = list.body?.profiles ?? []
      if (accountProfiles.length === 0) return NextResponse.json({ children: [] })

      const { body } = await members.getChildrenStats(accountProfiles.map((p) => p.id))
      const byId = new Map((body?.children ?? []).map((c) => [c.profileId, c]))
      const children: ChildDashboardView[] = accountProfiles.map((p) => {
        const s = byId.get(p.id)
        return {
          profileId: p.id,
          name: p.name,
          avatarUrl: p.avatarUrl,
          xp: s?.xp ?? 0,
          streak: s?.streak ?? { current: 0, best: 0 },
          badgesCount: s?.badgesCount ?? 0,
          coursesInProgress: s?.coursesInProgress ?? 0,
          coursesCompleted: s?.coursesCompleted ?? 0,
          projectsCount: s?.projectsCount ?? 0,
          rankingPosition: s?.rankingPosition ?? null,
        }
      })
      return NextResponse.json({ children })
    },
  }

  /**
   * Persiste a posição do vídeo (throttled no client). Aceita também o corpo do
   * `navigator.sendBeacon` (que pode chegar como text/plain) — por isso o parse é
   * tolerante a content-type. POST (beacon não faz PUT); o BFF repassa como PUT.
   */
  const lessonPosition = {
    POST: async (req: Request, ctx: { params: Promise<{ lessonId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { lessonId } = await ctx.params
      let parsed: z.infer<typeof VideoPositionBody>
      try {
        parsed = VideoPositionBody.parse(JSON.parse(await req.text()))
      } catch {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } },
          { status: 400 },
        )
      }
      const { status, body } = await members.saveVideoPosition(
        parsed.courseSlug,
        lessonId,
        parsed.positionSeconds,
      )
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /** Submete o quiz ao members (score no servidor; gabarito SÓ na resposta). */
  const quizAttempts = {
    POST: async (req: Request, ctx: { params: Promise<{ lessonId: string; blockId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { lessonId, blockId } = await ctx.params
      const parsed = QuizAttemptBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Respostas inválidas' } },
          { status: 400 },
        )
      }
      const { status, body } = await members.submitQuizAttempt(
        lessonId,
        blockId,
        parsed.data.answers,
      )
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /** Entrega do projeto do Estúdio ao members (destrava a conclusão da aula). */
  const studioSubmit = {
    POST: async (req: Request, ctx: { params: Promise<{ lessonId: string; blockId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { lessonId, blockId } = await ctx.params
      const raw = await req.json().catch(() => null)
      const project = extractStudioProject(raw)
      if (!project) return invalidInput()
      // Resultados das checagens rodadas no cliente (correção híbrida). Repassa como
      // veio; o members revalida o shape (DTO) e RECALCULA a estrutura no servidor.
      const results = Array.isArray((raw as { results?: unknown })?.results)
        ? (raw as { results?: unknown[] }).results
        : undefined
      const { status, body } = await members.submitStudioProject(
        lessonId,
        blockId,
        project,
        results,
      )
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /** Carrega o projeto da aula contínua anterior (cadeia) p/ semear o editor (lazy). */
  const studioCarryover = {
    GET: async (_req: Request, ctx: { params: Promise<{ lessonId: string; blockId: string }> }) => {
      const { lessonId, blockId } = await ctx.params
      const { status, body } = await members.getStudioCarryover(lessonId, blockId)
      return NextResponse.json(body ?? { project: null }, { status })
    },
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  /** Lista paginada das compras do aluno logado (filtro por e-mail é do backend). */
  const paymentsMy = {
    GET: async (req: Request) => {
      const url = new URL(req.url)
      const limit = clampInt(url.searchParams.get('limit'), 20, 1, 100)
      const offset = clampInt(url.searchParams.get('offset'), 0, 0, 1_000_000)
      const { status, body } = await payments.listMyPayments({ limit, offset })
      return NextResponse.json(body, { status })
    },
  }

  // ── Perfis (estilo Netflix) ──────────────────────────────────────────────

  /**
   * Grade de perfis da conta. A gestão (criar/editar/arquivar) exige sessão da conta
   * — o auth recusa perfil. A LISTA, porém, vale também em sessão de perfil (a criança
   * vê os rostinhos p/ TROCAR de perfil); nesse caso REDIGIMOS telefone/nascimento
   * dos irmãos, preservando os campos do perfil ativo para o "Meu perfil".
   */
  const profilesList = {
    GET: async () => {
      const { status, body } = await profiles.list()
      if (!body?.profiles) return NextResponse.json(body ?? { profiles: [] }, { status })
      const current = await session.getSession()
      const profilesOut = redactProfilesForProfileSession(
        body.profiles,
        current?.activeProfile ? current.id : null,
      )
      return NextResponse.json({ profiles: profilesOut }, { status })
    },
  }

  /** Cria um perfil de criança. O auth resolve o teto pela matrícula (409 se estourar). */
  const profileCreate = {
    POST: async (req: Request) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = CreateProfileBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      const { status, body } = await profiles.create(parsed.data)
      return NextResponse.json(body, { status })
    },
  }

  const profileUpdate = {
    PATCH: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { id } = await ctx.params
      if (!UUID_RE.test(id)) return invalidInput()
      const parsed = UpdateProfileBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      const { status, body } = await profiles.update(id, parsed.data)
      return NextResponse.json(body, { status })
    },
  }

  const profileArchive = {
    DELETE: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { id } = await ctx.params
      if (!UUID_RE.test(id)) return invalidInput()
      const { status, body } = await profiles.archive(id)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  /**
   * Entra/troca de perfil (1 clique, sem PIN): o auth emite a SESSÃO DE PERFIL e
   * trocamos os cookies aqui (igual ao exchange de impersonação). O cliente faz
   * full reload (o servidor passa a enxergar a sessão de perfil).
   */
  const profileSelect = {
    POST: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      if (!UUID_RE.test(id)) return invalidInput()
      const { status, body } = await profiles.select(id)
      if (status === 200 && body?.tokens) {
        await session.setSessionCookies(body.tokens)
        return NextResponse.json({ ok: true, profile: body.profile })
      }
      return NextResponse.json(body ?? { error: { code: 'SELECT_FAILED' } }, {
        status: status === 200 ? 502 : status,
      })
    },
  }

  /**
   * Sai do perfil para a área dos pais — gateado pela SENHA do responsável (o auth
   * valida). Em sucesso, emite a sessão da CONTA e trocamos os cookies.
   */
  const profileExit = {
    POST: async (req: Request) => {
      const parsed = ExitProfileBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalidInput()
      // Captura o refresh da SESSÃO DE PERFIL ANTES de trocar os cookies: ele tem
      // família PRÓPRIA (o exit emite uma família NOVA da conta), então sem revogá-lo
      // a sessão de perfil seguiria válida até expirar — um token órfão após voltar à
      // área dos pais (full review F3). Revoga só esse token (não toca a nova sessão).
      const profileRefresh = await session.getRefreshToken()
      const { status, body } = await profiles.exit(parsed.data.password)
      if (status === 200 && body?.tokens) {
        await session.setSessionCookies(body.tokens)
        if (profileRefresh) await gateway.logoutRequest(profileRefresh) // best-effort
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json(body ?? { error: { code: 'EXIT_FAILED' } }, {
        status: status === 200 ? 502 : status,
      })
    },
  }

  /**
   * Foto do perfil: multipart (`file`) → sharp→WebP → R2 (por profileId) → PATCH
   * /auth/profiles/:id com a URL. Mesma pipeline/guard do avatar do /me; o auth
   * recusa (403) se a sessão for de perfil (a gestão é só da conta).
   */
  const profileAvatar = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user
      const { id } = await ctx.params
      if (!UUID_RE.test(id)) return invalidInput()
      // AUTORIZA ANTES de escrever no R2: a criança (sessão de perfil) só troca a
      // PRÓPRIA foto. Sem isso, um `id` forjado viraria prefixo de chave no bucket
      // compartilhado (objeto órfão sob outro perfil) — o auth bloqueava só o PATCH
      // de metadado DEPOIS do upload. A conta (sem activeProfile) segue gerindo
      // qualquer filho próprio (o auth re-checa belongsTo no profiles.update).
      if (user.activeProfile && user.id !== id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Você só pode trocar a sua própria foto.' } },
          { status: 403 },
        )
      }
      const oversized = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
      if (oversized) return oversized
      try {
        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File) || file.size === 0 || !IMAGE_MIME_TYPES.has(file.type)) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Use uma imagem PNG, JPG ou WebP.' } },
            { status: 400 },
          )
        }
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'A foto deve ter no máximo 5MB.' } },
            { status: 400 },
          )
        }
        const stored = await optimizeAndStoreAvatar(file, id)
        const { status, body } = await profiles.update(id, { avatarUrl: stored.url })
        if (status !== 200) {
          return NextResponse.json(body ?? { error: { code: 'UPDATE_FAILED' } }, { status })
        }
        await removeStaleAvatars(id, stored.key)
        return NextResponse.json({ url: stored.url, profile: body?.profile })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  // ── Impersonação ─────────────────────────────────────────────────────────

  /**
   * Aterrissagem do "Entrar como" do painel admin (origem DIFERENTE — o admin não
   * consegue setar cookies daqui; por isso o handoff via URL). Troca o token
   * single-use (~60s) pela sessão IMPERSONADA do aluno-alvo e entra na home.
   * SUBSTITUI qualquer sessão existente neste browser. Mitigações do token na
   * URL: single-use + TTL curtíssimo + consumo atômico no auth + `X-Robots-Tag:
   * noindex` global do app. Redirects são RELATIVOS (`redirect()` do
   * next/navigation) — atrás do proxy, montar origin absoluto de `req.url`
   * apontaria para o host interno.
   */
  const impersonate = {
    GET: async (req: Request) => {
      const token = new URL(req.url).searchParams.get('token')?.trim()

      if (token) {
        const { status, body } = await gateway.exchangeImpersonation(token)
        if (status === 200 && body?.tokens) {
          await session.setSessionCookies(body.tokens)
          redirect('/')
        }
      }

      // Token ausente/expirado/já usado → login com aviso (sem vazar o motivo).
      redirect('/login?erro=impersonacao')
    },
  }

  // ── Liveness ─────────────────────────────────────────────────────────────

  /**
   * Liveness p/ o healthcheck do Railway: sem auth e sem tocar upstream — responde
   * "estou de pé" (o gateway/serviços têm os próprios `/readyz`; acoplar aqui
   * transformaria degradação deles em outage da área do aluno).
   */
  const healthz = {
    GET: () => NextResponse.json({ status: 'ok' }),
  }

  return {
    authLogin,
    authLogout,
    authMe,
    authMePassword,
    authForgotPassword,
    authResetPassword,
    authOtpRequest,
    authOtpVerify,
    authPasswordResetOtp,
    meAvatar,
    attachmentDownload,
    ebookDownload,
    courseRating,
    lessonComplete,
    gamificationMe,
    childrenStats,
    lessonPosition,
    quizAttempts,
    studioSubmit,
    studioCarryover,
    paymentsMy,
    profilesList,
    profileCreate,
    profileUpdate,
    profileArchive,
    profileSelect,
    profileExit,
    profileAvatar,
    impersonate,
    healthz,
  }
}
