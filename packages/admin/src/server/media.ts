import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getEnv, isProd } from '@/lib/env'
import { safeExtension, sanitizeFilename } from '@/lib/filenames'
import type { SessionUser } from '@/lib/types'
import { pickTranscriptTrack } from '@/lib/vimeo-helpers'
import { type ImagePreset, optimizeImage } from './image-optimizer'
import { requireLocalAdminSession } from './local-admin-session'
import { MediaNotConfiguredError, r2PresignPrivatePut, r2PutObject, r2PutObjectPrivate } from './r2'
import { captureServerException } from './sentry'
import {
  addVideoToFolder,
  applyPrivacy,
  createUploadTicket,
  getTextTrackVtt,
  getVideo,
  getWhitelistDomains,
  listTextTracks,
  uploadVideoThumbnail,
  type VimeoUploadTicket,
} from './vimeo'

// ── Limites/validações ──────────────────────────────────────────────────────

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
export const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200MB (anexos/e-book)
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024 // 50MB (áudio de aula)
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024 // 5GB (Vimeo)

export const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
export const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
/** Allowlist de anexos: documentos comuns + mídia leve. */
export const FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
])
/** Áudio de aula (bloco de áudio): vai pro bucket PÚBLICO — o aluno toca direto. */
export const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/wav',
])

// ── Guard de sessão ─────────────────────────────────────────────────────────

/**
 * `/api/media/*` NÃO passa pelo gateway (fala com R2/Vimeo direto) → o guard de
 * sessão é OBRIGATÓRIO aqui — e ESTRITO: o resto do BFF é revalidado pelo gateway
 * a cada chamada, mas aqui a régua local é a única. Token expirado NÃO autoriza
 * (`getSession` tolera exp só p/ exibição): tenta UMA rotação de refresh (somos
 * Route Handlers — podemos regravar cookies) e re-verifica; falhou → 401. Escrita
 * de mídia segue o `canWrite` dos editores (superadmin/admin). Retorna o usuário
 * ou uma `NextResponse` de erro pronta.
 */
export async function requireMediaSession(): Promise<SessionUser | NextResponse> {
  return requireLocalAdminSession('Sem permissão para enviar mídia.')
}

/** Erro → resposta `{ error: { code, message } }` (503 quando falta config). */
export function mediaErrorResponse(error: unknown): NextResponse {
  if (error instanceof MediaNotConfiguredError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 503 },
    )
  }
  console.error('[media] operação falhou', error)
  // Erro inesperado da pipeline de mídia (R2/Vimeo) → Sentry, COM a cadeia de
  // `cause` (o r2.ts embrulha o erro do S3 preservando a causa). 5xx de upstream
  // não passam por aqui (esta rota não fala com o gateway).
  captureServerException(error, { area: 'media' })
  // Em prod a mensagem interna (ex.: corpo de erro da API Vimeo) não vaza ao
  // cliente — o detalhe fica no log acima.
  const message =
    !isProd() && error instanceof Error ? error.message : 'Falha na operação de mídia.'
  return NextResponse.json({ error: { code: 'MEDIA_ERROR', message } }, { status: 500 })
}

/**
 * Pre-check do Content-Length ANTES do `req.formData()` — o parse materializa o
 * corpo INTEIRO em memória, então o limite precisa barrar o upload antes disso
 * (um arquivo de GBs mandado por engano derrubaria o host). Folga p/ o envelope
 * multipart (boundary/headers). **Content-Length é OBRIGATÓRIO** nestas rotas
 * (browsers SEMPRE declaram em `FormData`): sem ele, um corpo chunked passaria
 * sem teto até o check pós-parse — fechamos a janela exigindo a declaração (411).
 */
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024

export function rejectOversizedRequest(req: Request, maxBytes: number): NextResponse | null {
  const raw = req.headers.get('content-length')
  if (!raw) {
    return NextResponse.json(
      { error: { code: 'LENGTH_REQUIRED', message: 'Content-Length obrigatório no upload.' } },
      { status: 411 },
    )
  }
  const declared = Number(raw)
  if (!Number.isFinite(declared) || declared > maxBytes + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Arquivo excede o limite da rota.' } },
      { status: 413 },
    )
  }
  return null
}

// ── Imagens (R2 + sharp→WebP) ───────────────────────────────────────────────

export interface StoredImage {
  url: string
  width: number
  height: number
  sizeBytes: number
}

/** Otimiza (WebP) e armazena no R2 sob `admin/<scope>/<uuid>.webp`. */
export async function optimizeAndStoreImage(file: File, preset: ImagePreset): Promise<StoredImage> {
  const optimized = await optimizeImage(await file.arrayBuffer(), preset)
  const scope = preset === 'course-thumb' ? 'courses' : 'blocks'
  const { url } = await r2PutObject({
    key: `admin/${scope}/${randomUUID()}.${optimized.extension}`,
    body: optimized.buffer,
    contentType: optimized.contentType,
  })
  return { url, width: optimized.width, height: optimized.height, sizeBytes: optimized.sizeBytes }
}

// ── Arquivos genéricos (anexos/áudio) ───────────────────────────────────────
// (`safeExtension`/`sanitizeFilename` são puros e vivem em `@/lib/filenames` —
// unit-testados via bun test.)

export interface StoredFile {
  /** Referência `r2priv:<key>` (bucket PRIVADO) — não é uma URL navegável. */
  url: string
  fileType: string
  sizeBytes: number
}

/**
 * Armazena um anexo/áudio no bucket R2 PRIVADO. A "url" devolvida é a referência
 * `r2priv:<key>` que o community resolve na rota autenticada de download (onde a
 * marca d'água com o e-mail do aluno e o Content-Disposition são aplicados).
 */
export async function storeGenericFile(file: File): Promise<StoredFile> {
  const body = Buffer.from(await file.arrayBuffer())
  const { key } = await r2PutObjectPrivate({
    key: `admin/attachments/${randomUUID()}.${safeExtension(file.name)}`,
    body,
    contentType: file.type || 'application/octet-stream',
  })
  return {
    url: `r2priv:${key}`,
    fileType: file.type || 'application/octet-stream',
    sizeBytes: body.byteLength,
  }
}

// ── Anexos/e-book: upload DIRETO pro R2 privado (presigned) ─────────────────

export interface PrivateUploadTarget {
  /** URL PUT pré-assinada — o browser sobe o arquivo DIRETO no R2 (sem o admin). */
  uploadUrl: string
  /** Referência `r2priv:<key>` que o cliente devolve no `onUploaded` após o PUT. */
  url: string
  /** Content-Type assinado: o PUT do browser precisa mandar exatamente este valor. */
  contentType: string
}

export interface CreatePrivateUploadInput {
  filename: string
  contentType: string
  /** Tamanho exato (bytes) — entra na assinatura p/ prender o teto no R2. */
  sizeBytes: number
}

/**
 * Prepara um upload DIRETO de anexo/e-book pro bucket R2 PRIVADO: gera a key
 * (server-side — o cliente não escolhe onde grava) e devolve a URL PUT
 * pré-assinada. Os bytes NUNCA passam pelo admin nem pela borda do Cloudflare
 * (teto de 100MB no Free), então um PDF de 200MB sobe sem estrangular a memória
 * do host nem bater no timeout de 300s da borda. A validação de MIME/tamanho é
 * feita na rota (envelope 4xx) antes de chamar aqui.
 */
export async function createPrivateUploadTarget(
  input: CreatePrivateUploadInput,
): Promise<PrivateUploadTarget> {
  const key = `admin/attachments/${randomUUID()}.${safeExtension(input.filename)}`
  const { uploadUrl } = await r2PresignPrivatePut({
    key,
    contentType: input.contentType,
    contentLength: input.sizeBytes,
  })
  return { uploadUrl, url: `r2priv:${key}`, contentType: input.contentType }
}

// ── Áudio de aula (R2 PÚBLICO) ──────────────────────────────────────────────

export interface StoredAudio {
  /** URL pública (o `<audio>` do aluno toca direto, com seek/range do CDN). */
  url: string
  fileType: string
  sizeBytes: number
}

/**
 * Armazena o áudio do bloco de aula no bucket PÚBLICO (sem transformação — o
 * arquivo já vem comprimido). Diferente dos anexos: o player do aluno consome a
 * URL direto, então bucket privado quebraria a reprodução.
 */
export async function storeAudioFile(file: File): Promise<StoredAudio> {
  const body = Buffer.from(await file.arrayBuffer())
  const { url } = await r2PutObject({
    key: `admin/audio/${randomUUID()}.${safeExtension(file.name)}`,
    body,
    contentType: file.type || 'application/octet-stream',
  })
  return {
    url,
    fileType: file.type || 'application/octet-stream',
    sizeBytes: body.byteLength,
  }
}

// ── Vídeo (Vimeo TUS + status + transcrição + capa) ─────────────────────────

/** Cria o ticket TUS e aplica whitelist de embed + pasta (best-effort, não travam o upload). */
export async function createVideoTicket(input: {
  filename: string
  sizeBytes: number
}): Promise<VimeoUploadTicket> {
  const ticket = await createUploadTicket({
    sizeBytes: input.sizeBytes,
    name: sanitizeFilename(input.filename),
  })
  const domains = getWhitelistDomains()
  if (domains.length > 0) {
    try {
      await applyPrivacy(ticket.vimeoVideoId, domains)
    } catch (error) {
      console.error('[media] applyPrivacy falhou (whitelist pendente)', {
        vimeoVideoId: ticket.vimeoVideoId,
        error,
      })
    }
  }
  const folderId = getEnv().VIMEO_FOLDER_ID
  if (folderId) {
    try {
      await addVideoToFolder(ticket.vimeoVideoId, folderId)
    } catch (error) {
      console.error('[media] addVideoToFolder falhou (vídeo fica fora da pasta)', {
        vimeoVideoId: ticket.vimeoVideoId,
        folderId,
        error,
      })
    }
  }
  return ticket
}

export type VideoProcessingStatus = 'processing' | 'ready' | 'failed'

/** Mapeia o status cru do Vimeo p/ o estado da aplicação (mesma régua da referência). */
function mapVimeoStatus(status: string): VideoProcessingStatus {
  if (status === 'available') return 'ready'
  if (['transcoding_error', 'quota_exceeded', 'unavailable'].includes(status)) return 'failed'
  return 'processing'
}

export interface VideoStatus {
  status: VideoProcessingStatus
  durationSeconds: number | null
  embedUrl: string
  /** Legendas re-hospedadas no R2 (URLs estáveis) — presentes quando ready. */
  captions?: { lang: string; url: string }[]
}

/**
 * Sincroniza a transcrição: baixa o VTT do Vimeo (link assinado, EXPIRA) e
 * re-hospeda no R2 → `captions[].url` estável p/ o bloco de vídeo do members.
 */
async function syncTranscript(vimeoVideoId: string): Promise<{ lang: string; url: string }[]> {
  const tracks = await listTextTracks(vimeoVideoId)
  const chosen = pickTranscriptTrack(tracks)
  if (!chosen) return []
  const vtt = await getTextTrackVtt(chosen.link)
  if (!vtt.trim()) return []
  // `lang` vem da API do Vimeo → sanitiza antes de entrar na key do R2 (um valor
  // com `/` ou `..` escaparia o prefixo `admin/captions/`; achado do review).
  const rawLang = chosen.language.toLowerCase()
  const lang = /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(rawLang) ? rawLang : 'pt'
  const { url } = await r2PutObject({
    key: `admin/captions/${vimeoVideoId}-${lang}.vtt`,
    body: Buffer.from(vtt, 'utf8'),
    contentType: 'text/vtt; charset=utf-8',
    // Legendas podem ser regeradas pelo Vimeo — cache curto em vez de imutável.
    cacheControl: 'public, max-age=3600',
  })
  return [{ lang, url }]
}

/**
 * Reconciliação on-demand (sem webhook): consulta o transcode no Vimeo e, quando
 * pronto, tenta sincronizar a transcrição (best-effort — legenda pode demorar
 * mais que o transcode; o editor pode re-checar depois).
 */
export async function getVideoStatus(vimeoVideoId: string): Promise<VideoStatus> {
  const video = await getVideo(vimeoVideoId)
  const status = mapVimeoStatus(video.status)
  const result: VideoStatus = {
    status,
    durationSeconds: video.duration,
    embedUrl: video.embedUrl,
  }
  if (status === 'ready') {
    try {
      result.captions = await syncTranscript(vimeoVideoId)
    } catch (error) {
      console.error('[media] syncTranscript falhou', { vimeoVideoId, error })
      result.captions = []
    }
  }
  return result
}

/**
 * Sobe a capa custom direto no Vimeo (pictures API) — o player do aluno usa a
 * capa do próprio Vimeo; não guardamos cópia no R2 (decisão da autoria v3).
 */
export async function storeVideoThumbnail(vimeoVideoId: string, file: File): Promise<{ ok: true }> {
  const bytes = await file.arrayBuffer()
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  await uploadVideoThumbnail(vimeoVideoId, bytes, mime)
  return { ok: true }
}
