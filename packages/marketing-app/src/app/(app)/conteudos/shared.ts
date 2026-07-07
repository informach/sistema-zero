/**
 * Helpers de cliente compartilhados pelas telas de conteúdo (detalhe + composer).
 * Moram DENTRO de `conteudos/` de propósito: são específicos destas telas.
 */

import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { AssetKind, AssetView } from '@/lib/types'

/**
 * Padrão ÚNICO p/ 409 CONCURRENCY_CONFLICT (alguém salvou antes): avisa e
 * recarrega a versão atual do servidor. Devolve `true` quando tratou o erro.
 */
export async function handleConflict(
  error: unknown,
  reload: () => Promise<void>,
): Promise<boolean> {
  const apiError = error as ApiError
  if (apiError.status !== 409 || apiError.code !== 'CONCURRENCY_CONFLICT') return false
  toast.error('Alguém salvou antes de você. Recarregando a versão atual.')
  await reload()
  return true
}

// Cache module-level dos presigned GET (validade de 24h no backend — sobra p/ a
// sessão). Guardar a Promise evita resolve duplicado em renders concorrentes.
const resolveCache = new Map<string, Promise<string>>()

/** URL de preview do asset (presigned GET), com cache por sessão. */
export function resolveAssetUrl(assetId: string): Promise<string> {
  const cached = resolveCache.get(assetId)
  if (cached) return cached
  const promise = apiGet<{ url: string; expiresInSeconds: number }>(
    `/api/marketing/media/${assetId}/resolve`,
  ).then((res) => res.url)
  // Falha não fica no cache (o retry do consumidor tenta de novo do zero).
  promise.catch(() => resolveCache.delete(assetId))
  resolveCache.set(assetId, promise)
  return promise
}

export interface UploadAssetInput {
  file: File
  contentId: string
  kind?: AssetKind
  onProgress?: (fraction: number) => void
}

interface PresignResponse {
  assetId: string
  uploadUrl: string
  contentType: string
}

/**
 * Upload presigned em 3 passos: presign no backend → XHR PUT direto no R2 (com
 * progresso) → confirm. O content-type do PUT precisa ser IDÊNTICO ao assinado.
 */
export async function uploadAsset({
  file,
  contentId,
  kind,
  onProgress,
}: UploadAssetInput): Promise<AssetView> {
  const presign = await apiSend<PresignResponse>('/api/marketing/media/presign', 'POST', {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    contentId,
    ...(kind ? { kind } : {}),
  })

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', presign.uploadUrl)
    xhr.setRequestHeader('content-type', presign.contentType)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        reject({
          status: xhr.status,
          code: 'UPLOAD_FAILED',
          message: `O envio falhou (HTTP ${xhr.status}). Tente de novo.`,
        } satisfies ApiError)
      }
    }
    xhr.onerror = () => {
      reject({
        status: 0,
        code: 'UPLOAD_NETWORK',
        message: 'Falha de rede durante o envio. Tente de novo.',
      } satisfies ApiError)
    }
    xhr.send(file)
  })

  return apiSend<AssetView>(`/api/marketing/media/${presign.assetId}/confirm`, 'POST')
}
