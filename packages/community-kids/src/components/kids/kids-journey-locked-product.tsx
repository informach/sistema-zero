import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/** Produto comprado que ainda depende de um degrau da jornada. */
export function KidsJourneyLockedProduct({
  title,
  intro,
  heading,
  detail,
}: {
  title: string
  intro: string
  /** O título próprio da ferramenta (sem ele, "{title} faz parte da sua jornada"). */
  heading?: string
  /** A segunda frase própria (sem ela, a frase geral de continuar a jornada). */
  detail?: string
}) {
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Próxima conquista"
      chipIcon={BookOpen}
      title={heading ?? `${title} faz parte da sua jornada`}
      actions={
        <Link href="/cursos" className="sz-btn-gradient">
          <BookOpen className="size-4" aria-hidden /> Ver a minha jornada
        </Link>
      }
    >
      <p>{intro}</p>
      <p className="text-[0.9375rem]">
        {detail ??
          'Continue sua jornada para liberar esta ferramenta. No mapa você pode ver suas próximas aventuras e conquistas.'}
      </p>
    </KidsRecado>
  )
}
