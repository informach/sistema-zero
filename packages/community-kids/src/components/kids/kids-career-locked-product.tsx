import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { levelInfo } from '@/lib/level-info'
import { KidsBand } from './kids-band'
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
  const LevelIcon = level.icon
  return (
    <KidsBand
      tone="creme"
      innerClassName="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-10 text-center"
    >
      <KidsMascot expression="sleeping" className="kid-float size-24" />
      <span
        className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold text-sm"
        style={{
          color: level.colorVar,
          background: `color-mix(in oklab, ${level.colorVar} 12%, transparent)`,
        }}
      >
        <LevelIcon className="size-4" /> Abre no {level.label}
      </span>
      <h1 className="sz-display mt-3 text-[clamp(1.6rem,4vw,2.2rem)]">
        {title} faz parte da sua carreira
      </h1>
      <p className="mt-3 max-w-md font-semibold text-base text-muted-foreground">{intro}</p>
      <p className="mt-3 max-w-md font-semibold text-muted-foreground text-sm">
        Ele abre quando você chegar no nível <strong>{level.label}</strong>. Continue nos cursos e
        publicando os seus projetos. No mapa você pode ver suas próximas conquistas.
      </p>
      <Link
        href="/cursos"
        className="sz-btn-gradient mt-6 inline-flex h-11 items-center gap-2 px-6"
      >
        <BookOpen className="size-4" /> Ver a minha carreira
      </Link>
    </KidsBand>
  )
}
