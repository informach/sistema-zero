'use client'

import { Button } from '@sistemazero/ui/button'
import { Progress } from '@sistemazero/ui/progress'
import { CheckCircle2, RotateCcw, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { AssetView } from '@/lib/types'
import { ACCEPT_ATTR, formatBytes, isAllowedMime, MAX_UPLOAD_BYTES } from './media-utils'

interface PresignTarget {
  assetId: string
  uploadUrl: string
  contentType: string
}

interface QueueItem {
  localId: string
  file: File
  status: 'uploading' | 'done' | 'error'
  /** 0–1 (progresso do PUT; presign/confirm são rápidos). */
  progress: number
  error?: string
}

/**
 * PUT direto no R2 com progresso real (molde do file-uploader do admin). Usa
 * `XMLHttpRequest` (e não `fetch`) porque só o `xhr.upload.onprogress` expõe o
 * progresso de UPLOAD — essencial p/ um bruto de vídeo de 2GB. NÃO manda
 * cookies (cross-origin pro R2; a autorização é a assinatura da URL).
 */
function putToR2(
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    // Tem que casar EXATAMENTE com o content-type assinado, senão o R2 recusa.
    xhr.setRequestHeader('content-type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Falha ao enviar para o armazenamento (HTTP ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o arquivo.'))
    xhr.onabort = () => reject(new Error('Envio cancelado.'))
    xhr.send(file)
  })
}

let nextLocalId = 0

/**
 * Área de drag-drop + fila de uploads com barra de progresso por arquivo.
 * Por arquivo: validação client (MIME/2GB) → presign → XHR PUT → confirm →
 * `onUploaded(asset)`. Falha → "Tentar de novo" com presign NOVO (o antigo
 * pode ter expirado).
 */
export function UploadDropzone({
  onUploaded,
  onStorageUnavailable,
  openPickerRef,
}: {
  onUploaded: (asset: AssetView) => void
  /** 503 MEDIA_NOT_CONFIGURED no presign → o pai mostra o EmptyState global. */
  onStorageUnavailable: () => void
  /** O pai grava aqui a função que abre o seletor de arquivos (botão do topo). */
  openPickerRef: React.RefObject<(() => void) | null>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    openPickerRef.current = () => fileRef.current?.click()
    return () => {
      openPickerRef.current = null
    }
  }, [openPickerRef])

  const patchItem = useCallback((localId: string, patch: Partial<QueueItem>) => {
    setQueue((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    )
  }, [])

  const runUpload = useCallback(
    async (localId: string, file: File) => {
      patchItem(localId, { status: 'uploading', progress: 0, error: undefined })
      try {
        const target = await apiSend<PresignTarget>('/api/marketing/media/presign', 'POST', {
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        })
        await putToR2(target.uploadUrl, file, target.contentType, (fraction) =>
          patchItem(localId, { progress: fraction }),
        )
        const asset = await apiSend<AssetView>(
          `/api/marketing/media/${target.assetId}/confirm`,
          'POST',
        )
        patchItem(localId, { status: 'done', progress: 1 })
        onUploaded(asset)
      } catch (error) {
        const apiError = error as Partial<ApiError> & { message?: string }
        if (apiError.status === 503 && apiError.code === 'MEDIA_NOT_CONFIGURED') {
          toast.error('Armazenamento não configurado neste ambiente.')
          onStorageUnavailable()
        }
        patchItem(localId, {
          status: 'error',
          error: apiError.message ?? 'Falha no envio do arquivo.',
        })
      }
    },
    [onUploaded, onStorageUnavailable, patchItem],
  )

  const enqueue = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!isAllowedMime(file.type)) {
          toast.error(`"${file.name}" tem um tipo de arquivo não aceito pela biblioteca.`)
          continue
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`"${file.name}" passa do limite de 2 GB por arquivo.`)
          continue
        }
        nextLocalId += 1
        const localId = `up-${nextLocalId}`
        setQueue((current) => [...current, { localId, file, status: 'uploading', progress: 0 }])
        void runUpload(localId, file)
      }
    },
    [runUpload],
  )

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) enqueue(files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length > 0) enqueue(e.dataTransfer.files)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground',
          dragOver && 'border-ring bg-muted/60 text-foreground',
        )}
      >
        <Upload className="size-5" aria-hidden />
        <span>Arraste arquivos aqui ou clique para escolher (até 2 GB por arquivo)</span>
      </button>
      {queue.length > 0 ? (
        <ul className="space-y-2">
          {queue.map((item) => (
            <li
              key={item.localId}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </span>
                </div>
                {item.status === 'uploading' ? <Progress value={item.progress} /> : null}
                {item.status === 'error' ? (
                  <p className="text-xs text-destructive" role="alert">
                    {item.error}
                  </p>
                ) : null}
              </div>
              {item.status === 'done' ? (
                <CheckCircle2 className="size-4 shrink-0 text-success-foreground" aria-hidden />
              ) : null}
              {item.status === 'error' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runUpload(item.localId, item.file)}
                >
                  <RotateCcw aria-hidden />
                  Tentar de novo
                </Button>
              ) : null}
              {item.status !== 'uploading' ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remover da fila"
                  onClick={() =>
                    setQueue((current) => current.filter((q) => q.localId !== item.localId))
                  }
                >
                  <X aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
