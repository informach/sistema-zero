import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/cn'

const DAY_MS = 24 * 60 * 60 * 1_000
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

export interface CourseAccessExpiryCopy {
  absolute: string
  relative: string | null
}

/**
 * Traduz o prazo efetivo enviado pelo Members. O prazo absoluto é a informação
 * principal; a contagem curta só chama atenção quando restam no máximo 7 dias.
 */
export function courseAccessExpiryCopy(
  expiresAt: string | null,
  now: Date = new Date(),
): CourseAccessExpiryCopy | null {
  if (!expiresAt) return null
  const deadline = new Date(expiresAt)
  if (!Number.isFinite(deadline.getTime())) return null

  const remainingMs = deadline.getTime() - now.getTime()
  const remainingDays = remainingMs > 0 ? Math.ceil(remainingMs / DAY_MS) : 0
  const relative =
    remainingDays === 1
      ? 'Falta 1 dia'
      : remainingDays >= 2 && remainingDays <= 7
        ? `Faltam ${remainingDays} dias`
        : null

  return {
    absolute: `Acesso até ${DATE_FORMATTER.format(deadline)}`,
    relative,
  }
}

export function CourseAccessExpiry({
  expiresAt,
  className,
}: {
  expiresAt: string | null
  className?: string
}) {
  const copy = courseAccessExpiryCopy(expiresAt)
  if (!copy) return null

  return (
    <div
      className={cn(
        'rounded-2xl bg-(--band-amarelo) px-3 py-2.5 font-semibold text-foreground text-xs',
        className,
      )}
    >
      <p className="flex min-w-0 items-center gap-2">
        <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 wrap-break-word">{copy.absolute}</span>
      </p>
      {copy.relative ? (
        <p className="mt-0.5 pl-6 font-extrabold text-primary">{copy.relative}</p>
      ) : null}
    </div>
  )
}
