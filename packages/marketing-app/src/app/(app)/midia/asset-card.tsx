'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import { File, FileText, Film, type LucideIcon, Music } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { AssetView } from '@/lib/types'
import {
  ASSET_STATUS_LABELS,
  fileExtension,
  formatBytes,
  getCachedAssetUrl,
  KIND_LABELS,
  resolveAssetUrl,
} from './media-utils'

function iconFor(contentType: string): LucideIcon {
  if (contentType.startsWith('video/')) return Film
  if (contentType.startsWith('audio/')) return Music
  if (contentType === 'application/pdf') return FileText
  return File
}

/**
 * Card do grid da Biblioteca. Imagem resolve a URL presigned LAZY (só quando o
 * card entra na viewport — IntersectionObserver) com cache module-level; os
 * demais tipos mostram ícone + extensão.
 */
export function AssetCard({ asset, onClick }: { asset: AssetView; onClick: () => void }) {
  const isImage = asset.contentType.startsWith('image/')
  const canPreview = isImage && asset.status === 'ready'
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => (canPreview && getCachedAssetUrl(asset.id)) || null,
  )
  const rootRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!canPreview || previewUrl) return
    const el = rootRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      resolveAssetUrl(asset.id)
        .then((url) => setPreviewUrl(url))
        .catch(() => {
          // Falha no resolve → fica no ícone (o detalhe tenta de novo ao abrir).
        })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [asset.id, canPreview, previewUrl])

  const Icon = iconFor(asset.contentType)
  const extension = fileExtension(asset.filename)
  const statusLabel =
    asset.status === 'ready' ? null : (ASSET_STATUS_LABELS[asset.status] ?? asset.status)

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative flex aspect-video w-full items-center justify-center bg-muted/50">
        {previewUrl ? (
          // biome-ignore lint/performance/noImgElement: URL presigned 24h do R2 (host dinâmico) não passa pelo otimizador do next/image
          <img
            src={previewUrl}
            alt={asset.filename}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Icon className="size-8" aria-hidden />
            {extension ? <span className="text-[10px] font-medium">{extension}</span> : null}
          </div>
        )}
        {statusLabel ? (
          <span
            className={cn(
              'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              asset.status === 'failed'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-background/90 text-foreground',
            )}
          >
            {asset.status === 'importing' ? <Spinner className="size-3" /> : null}
            {statusLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <p className="truncate text-sm font-medium" title={asset.filename}>
          {asset.filename}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
            {KIND_LABELS[asset.kind]}
          </span>
          <span className="text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</span>
        </div>
      </div>
    </button>
  )
}
