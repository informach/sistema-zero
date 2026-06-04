import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import type { SessionUser } from '@/lib/types'
import { type ImagePreset, optimizeImage } from './image-optimizer'
import { MediaNotConfiguredError, r2PutObject } from './r2'
import { getSession } from './session'
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
export const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50MB (anexos/áudio)
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

// ── Guard de sessão ─────────────────────────────────────────────────────────

/**
 * `/api/media/*` NÃO passa pelo gateway (fala com R2/Vimeo direto) → o guard de
 * sessão é OBRIGATÓRIO aqui. Escrita de mídia segue o `canWrite` dos editores
 * (superadmin/admin). Retorna o usuário ou uma `NextResponse` de erro pronta.
 */
export async function requireMediaSession(): Promise<SessionUser | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada — faça login novamente.' } },
      { status: 401 },
    )
  }
  if (session.role !== 'superadmin' && session.role !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Sem permissão para enviar mídia.' } },
      { status: 403 },
    )
  }
  if (session.status !== 'active') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Conta sem acesso (status).' } },
      { status: 403 },
    )
  }
  return session
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
  const message = error instanceof Error ? error.message : 'Falha na operação de mídia.'
  return NextResponse.json({ error: { code: 'MEDIA_ERROR', message } }, { status: 500 })
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

/** Extensão segura derivada do nome original (fallback `bin`). */
function safeExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
}

/** Nome ASCII-seguro p/ o Content-Disposition (PG do header HTTP). */
function sanitizeFilename(filename: string): string {
  return (
    filename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove diacríticos combinantes (ã → a)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 120) || 'arquivo'
  )
}

export interface StoredFile {
  url: string
  fileType: string
  sizeBytes: number
}

/** Armazena um anexo/áudio no R2 (download com o nome original sanitizado). */
export async function storeGenericFile(file: File): Promise<StoredFile> {
  const body = Buffer.from(await file.arrayBuffer())
  const safeName = sanitizeFilename(file.name)
  const { url } = await r2PutObject({
    key: `admin/attachments/${randomUUID()}.${safeExtension(file.name)}`,
    body,
    contentType: file.type || 'application/octet-stream',
    contentDisposition: `attachment; filename="${safeName}"`,
  })
  return { url, fileType: file.type || 'application/octet-stream', sizeBytes: body.byteLength }
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

/** Prioriza caption PT > qualquer PT > ativo > primeiro (régua da referência). */
function pickTranscriptTrack<T extends { language: string; type: string; active: boolean }>(
  tracks: T[],
): T | null {
  if (tracks.length === 0) return null
  const isPt = (lang: string) => lang.toLowerCase().startsWith('pt')
  return (
    tracks.find((t) => t.type === 'captions' && isPt(t.language)) ??
    tracks.find((t) => isPt(t.language)) ??
    tracks.find((t) => t.active) ??
    tracks[0] ??
    null
  )
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
  const lang = chosen.language.toLowerCase() || 'pt'
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

/** Sobe a capa custom no Vimeo e devolve um `posterUrl` estável no R2. */
export async function storeVideoThumbnail(
  vimeoVideoId: string,
  file: File,
): Promise<{ posterUrl: string }> {
  const bytes = await file.arrayBuffer()
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  await uploadVideoThumbnail(vimeoVideoId, bytes, mime)
  // Otimiza e guarda também no R2 → poster imediato no bloco (o Vimeo demora a processar).
  const optimized = await optimizeImage(bytes, 'course-thumb')
  const { url } = await r2PutObject({
    key: `admin/posters/${vimeoVideoId}-${randomUUID()}.webp`,
    body: optimized.buffer,
    contentType: optimized.contentType,
  })
  return { posterUrl: url }
}
