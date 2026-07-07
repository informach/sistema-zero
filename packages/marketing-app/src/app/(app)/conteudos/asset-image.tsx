'use client'

import { Skeleton } from '@sistemazero/ui/skeleton'
import { FileImage } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { resolveAssetUrl } from './shared'

/**
 * Imagem de um asset via presigned GET (cache em `resolveAssetUrl`): skeleton
 * enquanto resolve, ícone de fallback quando falha. Usada nos anexos, no
 * seletor de capa e na prévia do composer.
 */
export function AssetImage({
  assetId,
  alt,
  className,
}: {
  assetId: string
  alt: string
  className?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setUrl(null)
    setFailed(false)
    resolveAssetUrl(assetId)
      .then((resolved) => {
        if (alive) setUrl(resolved)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [assetId])

  if (failed) {
    return (
      <span className={cn('flex items-center justify-center bg-muted', className)}>
        <FileImage className="size-6 text-muted-foreground" aria-hidden />
      </span>
    )
  }
  if (!url) return <Skeleton className={cn('rounded-none', className)} />
  return (
    // biome-ignore lint/performance/noImgElement: URL presigned 24h do R2 (host dinâmico) não passa pelo otimizador do next/image
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn('object-cover', className)}
      onError={() => setFailed(true)}
    />
  )
}
