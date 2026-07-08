'use client'

import { Button } from '@sistemazero/ui/button'
import { Label } from '@sistemazero/ui/label'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { CAROUSEL_MAX, CAROUSEL_MIN, moveAsset, toggleAsset } from '@/lib/carousel'
import { cn } from '@/lib/cn'
import type { AssetView } from '@/lib/types'
import { AssetImage } from '../../../asset-image'

/**
 * Seleção e ORDEM do carrossel do IG: clique seleciona (badge = posição no
 * post), setas ↑↓ reordenam. Só JPEG entra (regra da Graph API) — as demais
 * imagens aparecem esmaecidas com a dica de converter.
 */
export function CarouselPicker({
  images,
  selected,
  onChange,
  disabled,
}: {
  /** Imagens PRONTAS do conteúdo (fetch é do ComposerForm). */
  images: AssetView[] | null
  /** Ids na ordem do post. */
  selected: string[]
  onChange: (assetIds: string[]) => void
  disabled?: boolean
}) {
  if (images === null) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>Imagens do carrossel</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
      </div>
    )
  }

  const byId = new Map(images.map((image) => [image.id, image]))
  const orderedSelection = selected.filter((id) => byId.has(id))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Imagens do carrossel</Label>
        <span
          className={cn(
            'text-xs tabular-nums',
            orderedSelection.length > 0 && orderedSelection.length < CAROUSEL_MIN
              ? 'text-destructive'
              : 'text-muted-foreground',
          )}
        >
          {orderedSelection.length}/{CAROUSEL_MAX}
        </span>
      </div>

      {images.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma imagem pronta neste conteúdo. Envie as artes na aba Anexos do conteúdo.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => {
            const position = orderedSelection.indexOf(image.id)
            const isJpeg = image.contentType === 'image/jpeg'
            return (
              <button
                key={image.id}
                type="button"
                disabled={disabled || !isJpeg}
                onClick={() => onChange(toggleAsset(orderedSelection, image.id))}
                aria-pressed={position !== -1}
                aria-label={
                  position !== -1
                    ? `Tirar "${image.filename}" do carrossel`
                    : `Colocar "${image.filename}" no carrossel`
                }
                title={isJpeg ? image.filename : `${image.filename} — só JPEG entra no carrossel`}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                  position !== -1 ? 'border-primary' : 'border-transparent hover:border-border',
                  (disabled || !isJpeg) && 'cursor-not-allowed opacity-50',
                )}
              >
                <AssetImage assetId={image.id} alt={image.filename} className="h-full w-full" />
                {position !== -1 ? (
                  <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {position + 1}
                  </span>
                ) : null}
                {!isJpeg ? (
                  <span className="absolute inset-x-0 bottom-0 bg-background/80 px-1 py-0.5 text-center text-[10px] text-muted-foreground">
                    só JPEG
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      {orderedSelection.length > 0 ? (
        <ul className="space-y-1">
          {orderedSelection.map((assetId, index) => {
            const image = byId.get(assetId)
            if (!image) return null
            return (
              <li
                key={assetId}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
              >
                <span className="w-4 text-center font-medium tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{image.filename}</span>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveAsset(orderedSelection, assetId, -1))}
                  aria-label={`Subir "${image.filename}" uma posição`}
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={disabled || index === orderedSelection.length - 1}
                  onClick={() => onChange(moveAsset(orderedSelection, assetId, 1))}
                  aria-label={`Descer "${image.filename}" uma posição`}
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => onChange(toggleAsset(orderedSelection, assetId))}
                  aria-label={`Tirar "${image.filename}" do carrossel`}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">
        O carrossel sai com as imagens NESTA ordem. De {CAROUSEL_MIN} a {CAROUSEL_MAX} imagens JPEG.
      </p>
    </div>
  )
}
