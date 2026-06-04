import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number
  limit: number
  offset: number
  onChange: (offset: number) => void
}) {
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  const canPrev = offset > 0
  const canNext = offset + limit < total

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={!canPrev}
          onClick={() => onChange(Math.max(0, offset - limit))}
          aria-label="Anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={!canNext}
          onClick={() => onChange(offset + limit)}
          aria-label="Próxima"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
