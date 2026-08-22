import type { HubAttachmentKind } from './types'

// Helpers PUROS (sem `server-only`) de anexos do hub — compartilhados pelo BFF
// (`routes/hub.ts`) e pela UI (`attachment-uploader`). Allowlist/limites num lugar
// só para BFF e cliente não divergirem.

const MB = 1024 * 1024

export interface HubAttachmentLimits {
  maxBytesByKind: Record<HubAttachmentKind, number>
  maxPerPost: number
}

/**
 * Limites de anexo — ESPELHAM os defaults do `@sistemazero/hub`
 * (`ATTACHMENT_MAX_*`). O hub revalida o tamanho no `register` (fonte da verdade);
 * aqui usamos para barrar cedo e ASSINAR o Content-Length do presigned PUT.
 */
export const HUB_ATTACHMENT_LIMITS: HubAttachmentLimits = {
  maxBytesByKind: {
    image: 10 * MB,
    pdf: 25 * MB,
    document: 25 * MB,
    audio: 25 * MB,
    video: 200 * MB,
  },
  maxPerPost: 10,
}

/** MIME permitido por tipo (o servidor NÃO confia no cliente). */
export const UGC_MIME_BY_KIND: Record<HubAttachmentKind, ReadonlySet<string>> = {
  image: new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  pdf: new Set(['application/pdf']),
  document: new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'application/zip',
    'text/plain',
    'text/csv',
    'text/markdown',
  ]),
  audio: new Set([
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/webm',
    'audio/aac',
  ]),
  video: new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']),
}

/**
 * MIME de IMAGEM PARADA que o BFF aceita NA ENTRADA (re-encoda p/ WebP via
 * sharp: strip de EXIF/metadados + anti image-bomb).
 *
 * ⚠️ GIF NÃO entra aqui, e não é esquecimento: este caminho encoda WebP, e WebP
 * a partir de um GIF fica só com o primeiro quadro — a animação sumiria em
 * silêncio. Ele tem o caminho próprio abaixo. Quem usa este conjunto para
 * decidir "posso aceitar esta imagem?" (a capa de jogo do `routes/studio.ts`,
 * por exemplo) continua recusando GIF de propósito: uma capa é parada.
 */
export const UGC_IMAGE_INPUT_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

/**
 * MIME de imagem ANIMADA aceito na entrada (re-encodado GIF → GIF preservando os
 * quadros, com teto de quadros e de pixels). Existe para o desenho animado do
 * Pinta: a criança baixa o GIF da animação dela e o anexa numa publicação.
 */
export const UGC_ANIMATED_IMAGE_MIME = new Set(['image/gif'])

/** Aceita como ANEXO de imagem (parada ou animada)? */
export function isUgcImageInput(mime: string): boolean {
  return UGC_IMAGE_INPUT_MIME.has(mime) || UGC_ANIMATED_IMAGE_MIME.has(mime)
}

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/rtf': 'rtf',
  'application/zip': 'zip',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/markdown': 'md',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'weba',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function isHubAttachmentKind(v: unknown): v is HubAttachmentKind {
  return v === 'image' || v === 'pdf' || v === 'document' || v === 'audio' || v === 'video'
}

export function isAllowedMime(kind: HubAttachmentKind, mime: string): boolean {
  return UGC_MIME_BY_KIND[kind].has(mime)
}

/** Classifica um MIME no tipo de anexo (ou `null` se não suportado). */
export function classifyMime(mime: string): HubAttachmentKind | null {
  for (const kind of ['image', 'pdf', 'document', 'audio', 'video'] as const) {
    if (UGC_MIME_BY_KIND[kind].has(mime)) return kind
  }
  return null
}

/** Extensão segura derivada do MIME (fallback `bin`). */
export function extForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin'
}

/**
 * Disposição da entrega: mídia (imagem/áudio/vídeo) e PDF abrem INLINE; documento
 * vai sempre como `attachment` (nunca inline-executável — Office/zip/etc.).
 */
export function isInlineKind(kind: HubAttachmentKind): boolean {
  return kind !== 'document'
}

/** Nome ASCII-seguro p/ o Content-Disposition (espelha o admin/community media). */
export function sanitizeFilename(filename: string): string {
  return (
    filename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove diacríticos combinantes (ã → a)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 120) || 'anexo'
  )
}

/** Atalho de tamanho legível (KB/MB) para a UI. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

/** `accept` do <input type=file> (todos os tipos suportados). */
export const HUB_UPLOAD_ACCEPT = [
  ...UGC_IMAGE_INPUT_MIME,
  ...UGC_ANIMATED_IMAGE_MIME,
  ...UGC_MIME_BY_KIND.pdf,
  ...UGC_MIME_BY_KIND.document,
  ...UGC_MIME_BY_KIND.audio,
  ...UGC_MIME_BY_KIND.video,
].join(',')
