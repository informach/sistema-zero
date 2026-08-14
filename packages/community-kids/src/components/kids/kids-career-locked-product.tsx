import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { levelInfo } from '@/lib/level-info'
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
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-10 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <span
        className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold text-sm"
        style={{
          color: level.colorVar,
          background: `color-mix(in oklch, ${level.colorVar} 12%, transparent)`,
        }}
      >
        <LevelIcon className="size-4" /> Abre no {level.label}
      </span>
      <h1 className="mt-3 sz-display text-2xl">{title} está quase chegando!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{intro}</p>
      <p className="mt-3 max-w-md text-muted-foreground">
        Ele abre quando você chegar no nível <strong>{level.label}</strong>. Continue nos cursos e
        publicando os seus projetos. Falta pouco!
      </p>
      <Link
        href="/cursos"
        className="sz-btn-gradient mt-6 inline-flex h-11 items-center gap-2 px-6"
      >
        <BookOpen className="size-4" /> Ver a minha carreira
      </Link>
    </section>
  )
}
