import { ArrowRight, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export function LiveWorkshopShortcut() {
  return (
    <Link
      href="/oficinas"
      className="kids-carta mt-6 flex min-h-20 items-center gap-4 p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span className="rounded-2xl bg-primary/10 p-3 text-primary">
        <CalendarDays className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="sz-display block text-xl">Oficinas ao vivo</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          Veja os encontros e crie junto com a turma.
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden />
    </Link>
  )
}
