'use client'

/** Player de preview no editor (params anti-branding + dnt). */
export function VimeoPreview({ embedUrl, title }: { embedUrl: string; title?: string }) {
  let src = embedUrl
  try {
    const url = new URL(embedUrl)
    url.searchParams.set('title', '0')
    url.searchParams.set('byline', '0')
    url.searchParams.set('portrait', '0')
    url.searchParams.set('dnt', '1')
    url.searchParams.set('playsinline', '1')
    src = url.toString()
  } catch {
    // embedUrl fora do padrão — usa como veio.
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      <iframe
        src={src}
        title={title ?? 'Pré-visualização do vídeo'}
        className="h-full w-full"
        allow="autoplay; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
