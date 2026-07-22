import { buttonVariants } from '@sistemazero/ui/button'
import { BookOpen, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { KidsMascot } from './mascot'

/** Recado amigável para um curso de uma etapa futura da carreira. */
export function KidsLockedCourse() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <h1 className="mt-4 sz-display text-2xl">Esta etapa ainda está bloqueada</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Continue sua carreira
      </div>
      <p className="mt-4 text-muted-foreground">
        Conclua os cursos da etapa atual e publique seus projetos. A próxima etapa vai abrir assim
        que você estiver preparado para ela.
      </p>
      <Link
        href="/cursos"
        className={cn(buttonVariants({ variant: 'default' }), 'mt-6 h-11 rounded-full px-6')}
      >
        <BookOpen className="size-4" /> Ver meus cursos
      </Link>
    </section>
  )
}
