import { cn } from '@/lib/cn'
import { CONTENT_TYPE_LABELS, type ContentType } from '@/lib/pipeline'

/** Chip neutro do tipo de conteúdo (Reels/Vídeo longo/Carrossel/…). */
export function ContentTypeBadge({
  contentType,
  className,
}: {
  contentType: ContentType
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground',
        className,
      )}
    >
      {CONTENT_TYPE_LABELS[contentType]}
    </span>
  )
}
