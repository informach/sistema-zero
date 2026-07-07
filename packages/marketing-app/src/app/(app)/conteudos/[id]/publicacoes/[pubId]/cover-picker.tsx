'use client'

import { Button } from '@sistemazero/ui/button'
import { Label } from '@sistemazero/ui/label'
import { Progress } from '@sistemazero/ui/progress'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Check, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { AssetView, MarketingPage } from '@/lib/types'
import { AssetImage } from '../../../asset-image'
import { uploadAsset } from '../../../shared'

/**
 * Seletor de capa: miniaturas das IMAGENS prontas do conteúdo + upload de uma
 * imagem nova (presign kind `cover`, já vinculada e selecionada ao confirmar).
 */
export function CoverPicker({
  contentId,
  value,
  onChange,
  disabled,
}: {
  contentId: string
  value: string | null
  onChange: (assetId: string | null) => void
  disabled?: boolean
}) {
  const [images, setImages] = useState<AssetView[] | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    apiGet<MarketingPage<AssetView>>(`/api/marketing/media?contentId=${contentId}&limit=100`)
      .then((page) => {
        if (alive) {
          setImages(
            page.items.filter(
              (asset) => asset.contentType.startsWith('image/') && asset.status === 'ready',
            ),
          )
        }
      })
      .catch(() => {
        if (alive) setImages([])
      })
    return () => {
      alive = false
    }
  }, [contentId])

  async function upload(file: File) {
    setProgress(0)
    try {
      const asset = await uploadAsset({
        file,
        contentId,
        kind: 'cover',
        onProgress: setProgress,
      })
      setImages((current) => [asset, ...(current ?? [])])
      onChange(asset.id)
      toast.success('Capa enviada e selecionada.')
    } catch (error) {
      toast.error((error as ApiError).message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Capa</Label>
      {images === null ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => {
            const selected = value === image.id
            return (
              <button
                key={image.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(image.id)}
                aria-pressed={selected}
                aria-label={`Usar "${image.filename}" como capa`}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                  selected ? 'border-primary' : 'border-transparent hover:border-border',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <AssetImage assetId={image.id} alt={image.filename} className="h-full w-full" />
                {selected ? (
                  <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                    <Check className="size-3" aria-hidden />
                  </span>
                ) : null}
              </button>
            )
          })}
          <label
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors',
              disabled || progress !== null
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <Upload className="size-4" aria-hidden />
            Enviar capa
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled || progress !== null}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void upload(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}
      {progress !== null ? <Progress value={progress} /> : null}
      {value ? (
        <div>
          <Button size="xs" variant="ghost" onClick={() => onChange(null)} disabled={disabled}>
            Remover capa
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem capa selecionada.</p>
      )}
    </div>
  )
}
