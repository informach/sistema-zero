'use client'

import { parseSafeEmbedUrl } from '@/lib/vimeo-helpers'

/** Player de preview no editor (params anti-branding + dnt). */
export function VimeoPreview({ embedUrl, title }: { embedUrl: string; title?: string }) {
  // Só `https:` vira iframe — um src legado/adulterado com `javascript:`/`data:`
  // executaria no contexto (autenticado) do painel.
  const url = parseSafeEmbedUrl(embedUrl)
  if (!url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
        URL de vídeo inválida.
      </div>
    )
  }
  url.searchParams.set('title', '0')
  url.searchParams.set('byline', '0')
  url.searchParams.set('portrait', '0')
  url.searchParams.set('dnt', '1')
  url.searchParams.set('playsinline', '1')
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      <iframe
        src={url.toString()}
        title={title ?? 'Pré-visualização do vídeo'}
        className="h-full w-full"
        allow="autoplay; picture-in-picture; fullscreen"
      />
    </div>
  )
}
