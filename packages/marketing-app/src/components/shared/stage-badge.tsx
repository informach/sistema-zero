import { cn } from '@/lib/cn'
import { type ContentStage, STAGE_COLORS, STAGE_LABELS } from '@/lib/pipeline'

/** Chip da etapa do pipeline (cores/rótulos da lib pura). */
export function StageBadge({ stage, className }: { stage: ContentStage; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        STAGE_COLORS[stage],
        className,
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  )
}
