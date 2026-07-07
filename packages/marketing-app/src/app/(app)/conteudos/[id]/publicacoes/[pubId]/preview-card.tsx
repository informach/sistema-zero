'use client'

import { FileImage } from 'lucide-react'
import { NetworkChip } from '@/components/shared/network-chip'
import { cn } from '@/lib/cn'
import { FORMAT_NETWORK, type PublicationFormat } from '@/lib/networks'
import { AssetImage } from '../../../asset-image'

const TRUNCATE_AT = 120

function aspectFor(format: PublicationFormat): string {
  if (format === 'ig_feed' || format === 'ig_carousel') return 'aspect-square'
  if (format === 'yt_video' || format === 'fb_post') return 'aspect-video'
  // Reels, Story, Short e TikTok são verticais.
  return 'aspect-[9/16]'
}

/**
 * Prévia APROXIMADA por formato: moldura na proporção da rede, capa (ou
 * placeholder), handle fictício e legenda truncada. Puramente visual — cada
 * rede renderiza do próprio jeito.
 */
export function PreviewCard({
  format,
  caption,
  title,
  coverAssetId,
}: {
  format: PublicationFormat
  caption: string
  title: string | null
  coverAssetId: string | null
}) {
  const network = FORMAT_NETWORK[format]
  const aspect = aspectFor(format)
  const vertical = aspect === 'aspect-[9/16]'
  const trimmed = caption.trim()
  const truncated = trimmed.length > TRUNCATE_AT
  const shown = truncated ? `${trimmed.slice(0, TRUNCATE_AT).trimEnd()}…` : trimmed

  return (
    <aside className="space-y-2">
      <h2 className="text-sm font-semibold">Prévia aproximada</h2>
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card',
          vertical && 'mx-auto w-full max-w-70',
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
            SZ
          </span>
          <span className="truncate text-xs font-medium">@sistemazero</span>
          <NetworkChip format={format} showLabel={false} className="ml-auto" />
        </div>
        <div className={cn('relative flex items-center justify-center bg-muted', aspect)}>
          {coverAssetId ? (
            <AssetImage
              assetId={coverAssetId}
              alt="Capa da publicação"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted-foreground">
              <FileImage className="size-8" aria-hidden />
              <span className="text-xs">Sem capa</span>
            </span>
          )}
        </div>
        <div className="space-y-1 px-3 py-2.5">
          {network === 'youtube' && title?.trim() ? (
            <p className="break-words text-sm font-semibold leading-snug">{title}</p>
          ) : null}
          {shown ? (
            <p className="whitespace-pre-line break-words text-xs leading-relaxed">
              {shown}
              {truncated ? <span className="text-muted-foreground"> mais</span> : null}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">Sem legenda ainda.</p>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        A prévia é aproximada. Cada rede renderiza do próprio jeito.
      </p>
    </aside>
  )
}
