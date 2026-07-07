import { cn } from '@/lib/cn'
import { type PublicationStatus, STATUS_COLORS, STATUS_LABELS } from '@/lib/publications'

/** Chip do status da publicação (cores/rótulos da lib pura). */
export function PubStatusBadge({
  status,
  className,
}: {
  status: PublicationStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
