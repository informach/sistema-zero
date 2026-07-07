'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Progress } from '@sistemazero/ui/progress'
import { Skeleton } from '@sistemazero/ui/skeleton'
import {
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  type LucideIcon,
  Upload,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { AssetKind, AssetView } from '@/lib/types'
import { AssetImage } from '../asset-image'
import { uploadAsset } from '../shared'

type AssetsUpdater = (updater: (items: AssetView[]) => AssetView[]) => void

const KIND_LABELS: Record<AssetKind, string> = {
  raw: 'Bruto',
  final: 'Final',
  cover: 'Capa',
  other: 'Outro',
}

const STATUS_LABELS: Record<string, string> = {
  pending_upload: 'Aguardando envio',
  importing: 'Importando',
  ready: 'Pronto',
  archiving: 'Arquivando',
  archived: 'Arquivado',
  failed: 'Falhou',
}

function iconFor(contentType: string): LucideIcon {
  if (contentType.startsWith('image/')) return FileImage
  if (contentType.startsWith('video/')) return FileVideo
  if (contentType.startsWith('audio/')) return FileAudio
  if (contentType === 'application/pdf') return FileText
  return File
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

interface UploadEntry {
  key: string
  file: File
  progress: number
  status: 'uploading' | 'error'
  error: string
}

/**
 * Anexos do conteúdo: grid dos assets vinculados + upload presigned (arrastar
 * ou escolher, progresso por arquivo, retry com presign NOVO) + desvincular.
 */
export function AttachmentsPanel({
  contentId,
  assets,
  loadFailed,
  onAssetsChange,
}: {
  contentId: string
  assets: AssetView[] | null
  loadFailed: boolean
  onAssetsChange: AssetsUpdater
}) {
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [detachTarget, setDetachTarget] = useState<AssetView | null>(null)

  async function startUpload(file: File, key: string) {
    setUploads((prev) => [
      ...prev.filter((u) => u.key !== key),
      { key, file, progress: 0, status: 'uploading', error: '' },
    ])
    try {
      const asset = await uploadAsset({
        file,
        contentId,
        onProgress: (fraction) =>
          setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, progress: fraction } : u))),
      })
      setUploads((prev) => prev.filter((u) => u.key !== key))
      onAssetsChange((current) => [asset, ...current])
    } catch (error) {
      const apiError = error as ApiError
      setUploads((prev) =>
        prev.map((u) => (u.key === key ? { ...u, status: 'error', error: apiError.message } : u)),
      )
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      void startUpload(file, crypto.randomUUID())
    }
  }

  async function detach() {
    if (!detachTarget) return
    const target = detachTarget
    try {
      await apiSend<AssetView>(`/api/marketing/media/${target.id}`, 'PATCH', { contentId: null })
      onAssetsChange((current) => current.filter((a) => a.id !== target.id))
      setDetachTarget(null)
      toast.success('Anexo desvinculado. Ele continua na biblioteca de mídia.')
    } catch (error) {
      toast.error((error as ApiError).message)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-card/50 hover:bg-muted/50',
          )}
        >
          <Upload className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Arraste arquivos aqui ou clique para escolher</span>
          <span className="text-xs text-muted-foreground">
            Os arquivos ficam vinculados a este conteúdo.
          </span>
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>

        {uploads.length > 0 ? (
          <ul className="space-y-2">
            {uploads.map((upload) => (
              <li
                key={upload.key}
                className="space-y-1.5 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm" title={upload.file.name}>
                    {upload.file.name}
                  </span>
                  {upload.status === 'error' ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void startUpload(upload.file, upload.key)}
                    >
                      Tentar de novo
                    </Button>
                  ) : (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Math.round(upload.progress * 100)}%
                    </span>
                  )}
                </div>
                {upload.status === 'error' ? (
                  <p className="text-xs text-destructive" role="alert">
                    {upload.error}
                  </p>
                ) : (
                  <Progress value={upload.progress} />
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {loadFailed ? (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar os anexos. Recarregue a página.
          </p>
        ) : null}

        {assets === null ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : assets.length === 0 && uploads.length === 0 && !loadFailed ? (
          <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => {
              const Icon = iconFor(asset.contentType)
              const isImage = asset.contentType.startsWith('image/') && asset.status === 'ready'
              return (
                <div
                  key={asset.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex h-28 items-center justify-center overflow-hidden bg-muted/50">
                    {isImage ? (
                      <AssetImage
                        assetId={asset.id}
                        alt={asset.filename}
                        className="h-full w-full"
                      />
                    ) : (
                      <Icon className="size-8 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABELS[asset.kind]} · {STATUS_LABELS[asset.status] ?? asset.status} ·{' '}
                      {formatBytes(asset.sizeBytes)}
                    </p>
                    <div className="flex justify-end">
                      <Button size="xs" variant="ghost" onClick={() => setDetachTarget(asset)}>
                        Desvincular
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={detachTarget !== null}
        onClose={() => setDetachTarget(null)}
        title="Desvincular anexo"
        message={`"${detachTarget?.filename ?? ''}" sai deste conteúdo, mas continua na biblioteca de mídia.`}
        confirmText="Desvincular"
        onConfirm={detach}
      />
    </Card>
  )
}
