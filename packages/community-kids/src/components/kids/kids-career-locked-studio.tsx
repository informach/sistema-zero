import { BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { KidsMascot } from './mascot'

/** Produto comprado, mas criação livre ainda não conquistada pela carreira. */
export function KidsCareerLockedStudio() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-10 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary text-sm">
        <Sparkles className="size-4" /> Próxima conquista
      </span>
      <h1 className="mt-3 sz-display text-2xl">Acenda sua Faísca primeiro!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Termine o seu primeiro curso e publique o projeto no Mural. Depois disso, o Estúdio livre
        abre com as ferramentas que você já aprendeu a usar.
      </p>
      <Link
        href="/cursos"
        className="sz-btn-gradient mt-6 inline-flex h-11 items-center gap-2 px-6"
      >
        <BookOpen className="size-4" /> Ir para os cursos
      </Link>
      <p className="mt-4 text-muted-foreground text-xs">
        Nas aulas, você continua usando o Estúdio normalmente para aprender e praticar.
      </p>
    </section>
  )
}
