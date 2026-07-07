/**
 * Helpers LOCAIS da Biblioteca: allowlist de MIME (espelha o backend do
 * @sistemazero/marketing — mudou lá, mude aqui), formatação de bytes, rótulos
 * de kind/status e o cache module-level de URLs resolvidas (presigned GET 24h,
 * compartilhado entre cards e dialog p/ não re-resolver a cada render).
 */

import { apiGet } from '@/lib/api'
import type { AssetKind } from '@/lib/types'

/** MIME aceitos pelo presign do backend (validação client ANTES do round-trip). */
export const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
] as const

/** `accept` do input de arquivo (a mesma allowlist, em string). */
export const ACCEPT_ATTR = ALLOWED_MIME_TYPES.join(',')

/** Teto do backend: 2GB por arquivo. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

export function isAllowedMime(contentType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)
}

/** Rótulos PT por kind (badges dos cards e select do detalhe). */
export const KIND_LABELS: Record<AssetKind, string> = {
  raw: 'Bruto',
  final: 'Final',
  cover: 'Capa',
  other: 'Outro',
}

/** Rótulos PT por status ≠ ready (badge do card; desconhecido → status cru). */
export const ASSET_STATUS_LABELS: Record<string, string> = {
  uploading: 'Enviando',
  importing: 'Importando',
  failed: 'Falhou',
}

/** Bytes → "1.2 MB" (KB/MB/GB). */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** Extensão do arquivo em CAIXA ALTA ("MP4"), ou vazio quando não há. */
export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0 || dot === filename.length - 1) return ''
  return filename.slice(dot + 1).toUpperCase()
}

// Cache module-level assetId→url (a URL presigned vale 24h — mais que a sessão
// da aba) + dedupe de resolves em voo (vários cards visíveis de uma vez).
const urlCache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export function getCachedAssetUrl(assetId: string): string | undefined {
  return urlCache.get(assetId)
}

/** Resolve a URL temporária do asset (GET /media/:id/resolve), com cache. */
export function resolveAssetUrl(assetId: string): Promise<string> {
  const cached = urlCache.get(assetId)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(assetId)
  if (pending) return pending
  const promise = apiGet<{ url: string; expiresInSeconds: number }>(
    `/api/marketing/media/${assetId}/resolve`,
  )
    .then(({ url }) => {
      urlCache.set(assetId, url)
      return url
    })
    .finally(() => {
      inflight.delete(assetId)
    })
  inflight.set(assetId, promise)
  return promise
}
