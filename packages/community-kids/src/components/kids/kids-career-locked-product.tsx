import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { levelInfo } from '@/lib/level-info'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/** Produto comprado que ainda depende de um degrau da carreira. */
export function KidsCareerLockedProduct({
  title,
  intro,
  minLevelSlug,
}: {
  title: string
  intro: string
  minLevelSlug: string
}) {
  const level = levelInfo(minLevelSlug)
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      // O ícone e o nome do posto saem do LEVEL_INFO, como em toda a carreira.
      chip={`Abre no ${level.label}`}
      chipIcon={level.icon}
      title={`${title} faz parte da sua carreira`}
      actions={
        <Link href="/cursos" className="sz-btn-gradient">
          <BookOpen className="size-4" aria-hidden /> Ver a minha carreira
        </Link>
      }
    >
      <p>{intro}</p>
      <p className="text-[0.9375rem]">
        Ele abre quando você chegar no nível <strong>{level.label}</strong>. Continue nos cursos e
        publicando os seus projetos. No mapa você pode ver suas próximas conquistas.
      </p>
    </KidsRecado>
  )
}
